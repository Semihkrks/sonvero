begin;
-- Re-fetching an unchanged range used to rewrite every archive row (plus a
-- ledger_revisions bump per row via trigger). Only write rows whose content changed.
create or replace function public.replace_invoice_archive(p_account_id uuid,p_doc_type text,p_start date,p_end date,p_invoices jsonb,p_months date[] default '{}')
returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid:=auth.uid(); item jsonb; total integer:=0;
  today_tr date:=(timezone('Europe/Istanbul', now()))::date;
begin
  if u is null or not exists(select 1 from accounts where id=p_account_id and user_id=u and disabled_at is null) then raise exception 'Hesaba erişim yok' using errcode='42501'; end if;
  if p_start>p_end or p_end>today_tr or jsonb_typeof(p_invoices)<>'array' then raise exception 'Geçersiz arşiv aralığı'; end if;
  perform pg_advisory_xact_lock(hashtext(p_account_id::text||p_doc_type));
  for item in select value from jsonb_array_elements(p_invoices) loop
    if coalesce(item->>'invoice_uuid','')='' or (item->>'issue_date')::date not between p_start and p_end then raise exception 'Eksik veya aralık dışı belge'; end if;
    insert into invoice_archive(user_id,account_id,doc_type,invoice_uuid,issue_date,payload)
      values(u,p_account_id,p_doc_type,item->>'invoice_uuid',(item->>'issue_date')::date,item->'payload')
      on conflict(account_id,doc_type,invoice_uuid) do update set payload=excluded.payload,issue_date=excluded.issue_date,updated_at=now()
      where invoice_archive.payload is distinct from excluded.payload or invoice_archive.issue_date is distinct from excluded.issue_date;
    total:=total+1;
  end loop;
  insert into invoice_archive_sync(user_id,account_id,doc_type,month)
    select u,p_account_id,p_doc_type,m from unnest(p_months) m
    where m>=p_start and (m+interval '1 month'-interval '1 day')::date<=p_end
    on conflict(account_id,doc_type,month) do update set synced_at=now();
  return total;
end; $$;
revoke all on function public.replace_invoice_archive(uuid,text,date,date,jsonb,date[]) from public,anon;
grant execute on function public.replace_invoice_archive(uuid,text,date,date,jsonb,date[]) to authenticated;

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
   on conflict(account_id,doc_type,invoice_uuid) do update set payload=excluded.payload,issue_date=excluded.issue_date,updated_at=now()
   where invoice_archive.payload is distinct from excluded.payload or invoice_archive.issue_date is distinct from excluded.issue_date;
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
