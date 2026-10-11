begin;
create or replace function public.safe_decimal(value text) returns numeric language sql immutable as $$
  select case when value ~ '^-?[0-9]{1,16}(\.[0-9]{1,6})?$' then value::numeric else null end;
$$;
create or replace view public.ledger_entries with(security_invoker=true) as
with documents as (
 select distinct on(account_id,invoice_uuid,(doc_type in ('efatura_purchase','earsiv_gib')))
 id,user_id,account_id,invoice_uuid,issue_date,payload,doc_type,
 doc_type in ('efatura_purchase','earsiv_gib') as purchase
 from invoice_archive where doc_type in ('efatura_sale','efatura_purchase','earsiv','earsiv_gib')
 order by account_id,invoice_uuid,(doc_type in ('efatura_purchase','earsiv_gib')),updated_at desc,id
), normalized as (
 select *,
 coalesce(payload->>'CurrencyCode',payload->>'currencyCode',payload#>>'{InvoiceInfo,CurrencyCode}','UNKNOWN') as currency,
 case when purchase then coalesce(payload->>'SenderName',payload->>'senderName',payload->>'SupplierName',payload#>>'{SenderInfo,Name}','Bilinmeyen')
 else coalesce(payload->>'ReceiverName',payload->>'receiverName',payload->>'CustomerName',payload#>>'{CustomerInfo,Name}','Bilinmeyen') end as customer_name,
 case when purchase then coalesce(payload->>'SenderTaxNumber',payload->>'senderTaxNumber',payload#>>'{SenderInfo,TaxNumber}','')
 else coalesce(payload->>'ReceiverTaxNumber',payload->>'receiverTaxNumber',payload->>'TaxNumber',payload#>>'{CustomerInfo,TaxNumber}','') end as tax_no,
 safe_decimal(coalesce(payload->>'PayableAmount',payload->>'payableAmount',payload->>'TotalAmount',payload->>'totalAmount')) as amount,
 case when upper(coalesce(payload->>'InvoiceType',payload->>'Type',payload#>>'{InvoiceInfo,InvoiceType}','')) in ('IADE','İADE','RETURN') then -1 else 1 end as sign,
 lower(coalesce(payload#>>'{Answer,AnswerCode}',payload->>'AnswerCode',payload#>>'{Answer,AnswerNote}',payload#>>'{InvoiceStatus,Code}',payload->>'StatusCode',payload->>'Status','')) as status
 from documents
)
select id,user_id,account_id,coalesce(nullif(tax_no,''),'name:'||lower(trim(customer_name))) as customer_key,customer_name,tax_no as customer_tax_no,
 issue_date as date,coalesce(payload->>'InvoiceNumber',payload->>'InvoiceSerieOrNumber',invoice_uuid) as description,
 case when purchase then 'Alım Faturası' else 'Satış Faturası' end as type,
 currency,amount,case when not purchase then amount*sign else 0 end as debit,case when purchase then amount*sign else 0 end as credit,
 'invoice'::text as source,1 as version,null::timestamptz as cancelled_at
from normalized where status not in ('rejected','red','reddedildi','2005','rejectall','cancelled','canceled','iptal')
 and coalesce(payload->>'IsCancelled',payload->>'IsCanceled','false')<>'true'
union all
select id,user_id,account_id,coalesce(nullif(customer_tax_no,''),case when customer_key like 'name:%' then customer_key else 'name:'||lower(trim(customer_name)) end),customer_name,customer_tax_no,
date,description,type,currency,amount,0,amount,'collection',version,cancelled_at from customer_collections where cancelled_at is null;
grant select on public.ledger_entries to authenticated;

create or replace function public.ledger_page(p_account_id uuid,p_search text default '',p_start date default null,p_end date default null,p_customer text default null,p_offset integer default 0,p_limit integer default 50)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare rows jsonb; totals jsonb; opening numeric; excluded integer;
begin
 if auth.uid() is null then raise exception 'Oturum gerekli' using errcode='42501'; end if;
 select coalesce(jsonb_agg(to_jsonb(r)||jsonb_build_object('amount',r.amount::text,'debit',r.debit::text,'credit',r.credit::text)),'[]') into rows from (
  select * from ledger_entries where user_id=auth.uid() and account_id=p_account_id and currency='TRY' and amount is not null
   and(p_start is null or date>=p_start) and(p_end is null or date<=p_end) and(p_customer is null or customer_key=p_customer)
   and(p_search='' or customer_name ilike '%'||p_search||'%' or customer_tax_no ilike '%'||p_search||'%' or description ilike '%'||p_search||'%')
  order by date desc,id desc limit least(greatest(p_limit,1),100) offset greatest(p_offset,0)
 ) r;
 select jsonb_build_object('count',count(*),'debit',coalesce(sum(debit),0)::text,'credit',coalesce(sum(credit),0)::text,'balance',coalesce(sum(debit-credit),0)::text) into totals
 from ledger_entries where user_id=auth.uid() and account_id=p_account_id and currency='TRY' and amount is not null
 and(p_start is null or date>=p_start) and(p_end is null or date<=p_end) and(p_customer is null or customer_key=p_customer)
 and(p_search='' or customer_name ilike '%'||p_search||'%' or customer_tax_no ilike '%'||p_search||'%' or description ilike '%'||p_search||'%');
 select coalesce(sum(debit-credit),0) into opening from ledger_entries where user_id=auth.uid() and account_id=p_account_id and currency='TRY' and date<p_start
 and(p_customer is null or customer_key=p_customer) and(p_search='' or customer_name ilike '%'||p_search||'%' or customer_tax_no ilike '%'||p_search||'%' or description ilike '%'||p_search||'%');
 select count(*) into excluded from ledger_entries where user_id=auth.uid() and account_id=p_account_id and(currency<>'TRY' or amount is null);
 return jsonb_build_object('rows',rows,'totals',totals,'opening',coalesce(opening,0)::text,'excluded',excluded,'complete',false,
  'lastSync',(select max(synced_at) from invoice_archive_sync where account_id=p_account_id and user_id=auth.uid()));
end $$;
revoke all on function public.ledger_page(uuid,text,date,date,text,integer,integer) from public,anon;
grant execute on function public.ledger_page(uuid,text,date,date,text,integer,integer) to authenticated;

create or replace function public.queue_sync(p_account_id uuid,p_start date,p_end date)
returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare doc text; start_day date; end_day date; count_jobs integer:=0;
begin
 if auth.uid() is null or not exists(select 1 from accounts where id=p_account_id and user_id=auth.uid() and disabled_at is null) then raise exception 'Hesaba erişim yok' using errcode='42501'; end if;
 if p_start is null or p_end is null or p_start>p_end or p_end>current_date or p_end-p_start>3660 then raise exception 'Geçersiz tarih aralığı'; end if;
 perform pg_advisory_xact_lock(hashtext(p_account_id::text||'sync'));
 foreach doc in array array['efatura_sale','efatura_purchase','earsiv','earsiv_gib'] loop
  start_day:=p_start;
  while start_day<=p_end loop
   end_day:=least((date_trunc('month',start_day)+interval '1 month'-interval '1 day')::date,p_end);
   if not exists(select 1 from background_jobs where account_id=p_account_id and kind='sync' and status in ('pending','running') and payload->>'docType'=doc and payload->>'start'=start_day::text and payload->>'end'=end_day::text) then
    insert into background_jobs(user_id,account_id,kind,payload) values(auth.uid(),p_account_id,'sync',jsonb_build_object('docType',doc,'start',start_day,'end',end_day,'page',1));
    count_jobs:=count_jobs+1;
   end if;
   start_day:=end_day+1;
  end loop;
 end loop;
 return count_jobs;
end $$;
revoke all on function public.queue_sync(uuid,date,date) from public,anon;
grant execute on function public.queue_sync(uuid,date,date) to authenticated;

create table if not exists private.archive_staging(job_id uuid not null references background_jobs(id) on delete cascade,invoice_uuid text not null,issue_date date not null,payload jsonb not null,primary key(job_id,invoice_uuid));
create or replace function public.stage_archive_page(p_job_id uuid,p_lease uuid,p_items jsonb,p_next_page integer,p_complete boolean)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare j background_jobs; item jsonb;
begin
 select * into j from background_jobs where id=p_job_id and lease_token=p_lease and status='running' and lease_until>now() for update;
 if not found then raise exception 'İş sahipliği süresi doldu'; end if;
 for item in select value from jsonb_array_elements(p_items) loop
  if coalesce(item->>'uuid','')='' or (item->>'date')::date not between (j.payload->>'start')::date and(j.payload->>'end')::date then raise exception 'Geçersiz belge'; end if;
  insert into private.archive_staging values(j.id,item->>'uuid',(item->>'date')::date,item->'payload') on conflict(job_id,invoice_uuid) do update set payload=excluded.payload,issue_date=excluded.issue_date;
 end loop;
 if p_complete then
  perform pg_advisory_xact_lock(hashtext(j.account_id::text||(j.payload->>'docType')));
  insert into invoice_archive(user_id,account_id,doc_type,invoice_uuid,issue_date,payload)
   select j.user_id,j.account_id,j.payload->>'docType',s.invoice_uuid,s.issue_date,s.payload from private.archive_staging s where s.job_id=j.id
   on conflict(account_id,doc_type,invoice_uuid) do update set payload=excluded.payload,issue_date=excluded.issue_date,updated_at=now();
  if (j.payload->>'start')::date=date_trunc('month',(j.payload->>'start')::date)::date and (j.payload->>'end')::date=(date_trunc('month',(j.payload->>'start')::date)+interval '1 month'-interval '1 day')::date then
   insert into invoice_archive_sync(user_id,account_id,doc_type,month) values(j.user_id,j.account_id,j.payload->>'docType',(j.payload->>'start')::date)
   on conflict(account_id,doc_type,month) do update set synced_at=now();
  end if;
  delete from private.archive_staging where job_id=j.id;
 end if;
 update background_jobs set status=case when p_complete then 'done' else 'pending' end,payload=jsonb_set(payload,'{page}',to_jsonb(p_next_page)),attempts=0,lease_until=null,lease_token=null,next_run_at=now(),updated_at=now() where id=j.id;
end $$;
revoke all on function public.stage_archive_page(uuid,uuid,jsonb,integer,boolean) from public,anon,authenticated;
grant execute on function public.stage_archive_page(uuid,uuid,jsonb,integer,boolean) to service_role;
commit;
