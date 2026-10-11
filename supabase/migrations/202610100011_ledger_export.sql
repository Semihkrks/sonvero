begin;
create table if not exists private.ledger_revisions(account_id uuid primary key references accounts(id),revision bigint not null default 0);
create or replace function private.bump_ledger_revision() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if tg_op='DELETE' then
  insert into private.ledger_revisions(account_id,revision)values(old.account_id,1)on conflict(account_id)do update set revision=private.ledger_revisions.revision+1;
 else
  insert into private.ledger_revisions(account_id,revision)values(new.account_id,1)on conflict(account_id)do update set revision=private.ledger_revisions.revision+1;
  if tg_op='UPDATE' and old.account_id<>new.account_id then
   insert into private.ledger_revisions(account_id,revision)values(old.account_id,1)on conflict(account_id)do update set revision=private.ledger_revisions.revision+1;
  end if;
 end if;
 return null;
end $$;
drop trigger if exists archive_revision on public.invoice_archive;
create trigger archive_revision after insert or update or delete on public.invoice_archive for each row execute function private.bump_ledger_revision();
drop trigger if exists collection_revision on public.customer_collections;
create trigger collection_revision after insert or update or delete on public.customer_collections for each row execute function private.bump_ledger_revision();

create or replace function public.ledger_revision(p_accounts uuid[])returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is null or p_accounts is null or cardinality(p_accounts)=0 then raise exception 'Firma seçimi gerekli'; end if;
 if exists(select 1 from unnest(p_accounts) requested(id) where not exists(select 1 from accounts a where a.id=requested.id and a.user_id=auth.uid() and a.disabled_at is null)) then raise exception 'Hesaba erişim yok' using errcode='42501'; end if;
 return(select jsonb_object_agg(a.id::text,coalesce(r.revision,0)::text)from accounts a left join private.ledger_revisions r on r.account_id=a.id where a.id=any(p_accounts) and a.user_id=auth.uid());
end $$;

create or replace function public.ledger_export_page(p_accounts uuid[],p_revision jsonb,p_start date default null,p_end date default null,p_customer text default null,p_offset integer default 0,p_search text default '')returns jsonb
language plpgsql security invoker set search_path=public,pg_temp as $$
declare output jsonb;
begin
 if ledger_revision(p_accounts)<>p_revision then raise exception 'Dışa aktarma sırasında kayıtlar değişti. Dosya üretilmedi; yeniden deneyin.' using errcode='40001'; end if;
 if p_start is not null and p_end is not null and p_start>p_end then raise exception 'Geçersiz tarih aralığı'; end if;
 select coalesce(jsonb_agg(to_jsonb(r)||jsonb_build_object('amount',r.amount::text,'debit',r.debit::text,'credit',r.credit::text)),'[]'::jsonb) into output from (
  select e.*,a.name as account_name from ledger_entries e join accounts a on a.id=e.account_id and a.user_id=e.user_id
  where e.account_id=any(p_accounts) and e.user_id=auth.uid() and e.currency='TRY' and e.amount is not null
   and(p_start is null or e.date>=p_start) and(p_end is null or e.date<=p_end) and(p_customer is null or e.customer_key=p_customer)
   and(p_search='' or e.customer_name ilike '%'||p_search||'%' or e.customer_tax_no ilike '%'||p_search||'%' or e.description ilike '%'||p_search||'%')
  order by e.date,e.account_id,e.source,e.id limit 1000 offset greatest(p_offset,0)
 )r;
 if ledger_revision(p_accounts)<>p_revision then raise exception 'Dışa aktarma sırasında kayıtlar değişti. Yeniden deneyin.' using errcode='40001'; end if;
 return jsonb_build_object('rows',output,'hasMore',jsonb_array_length(output)=1000);
end $$;
revoke all on function public.ledger_revision(uuid[]) from public,anon;
revoke all on function public.ledger_export_page(uuid[],jsonb,date,date,text,integer,text) from public,anon;
grant execute on function public.ledger_revision(uuid[]) to authenticated;
grant execute on function public.ledger_export_page(uuid[],jsonb,date,date,text,integer,text) to authenticated;
commit;
