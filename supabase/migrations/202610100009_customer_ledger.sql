begin;
create or replace function public.customer_ledger_page(p_accounts uuid[],p_search text default '',p_start date default null,p_end date default null,p_offset integer default 0,p_limit integer default 50)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare result jsonb;
begin
 if auth.uid() is null then raise exception 'Oturum gerekli' using errcode='42501'; end if;
 if p_accounts is null or cardinality(p_accounts)=0 then return jsonb_build_object('rows','[]'::jsonb,'count',0,'debit','0','credit','0','balance','0'); end if;
 if exists(select 1 from unnest(p_accounts) requested(account_id) where not exists(select 1 from accounts a where a.id=requested.account_id and a.user_id=auth.uid() and a.disabled_at is null)) then raise exception 'Hesaba erişim yok' using errcode='42501'; end if;
 if p_start is not null and p_end is not null and p_start>p_end then raise exception 'Geçersiz tarih aralığı'; end if;
 with grouped as (
  select e.account_id,a.name as account_name,e.customer_key,max(e.customer_name) as customer_name,max(e.customer_tax_no) as customer_tax_no,
   count(*)filter(where (p_start is null or e.date>=p_start) and(p_end is null or e.date<=p_end)) as movement_count,
   coalesce(sum(e.debit-e.credit)filter(where e.currency='TRY' and e.amount is not null and e.date<p_start),0) as opening,
   coalesce(sum(e.debit)filter(where e.currency='TRY' and e.amount is not null and(p_start is null or e.date>=p_start) and(p_end is null or e.date<=p_end)),0) as debit,
   coalesce(sum(e.credit)filter(where e.currency='TRY' and e.amount is not null and(p_start is null or e.date>=p_start) and(p_end is null or e.date<=p_end)),0) as credit,
   count(*)filter(where (e.currency<>'TRY' or e.amount is null) and(p_start is null or e.date>=p_start) and(p_end is null or e.date<=p_end)) as excluded
  from ledger_entries e join accounts a on a.id=e.account_id and a.user_id=e.user_id
  where e.user_id=auth.uid() and e.account_id=any(p_accounts) and(p_end is null or e.date<=p_end)
   and(p_search='' or e.customer_name ilike '%'||p_search||'%' or e.customer_tax_no ilike '%'||p_search||'%')
  group by e.account_id,a.name,e.customer_key
 ), page as (
  select * from grouped order by customer_name,account_id,customer_key limit least(greatest(p_limit,1),100) offset greatest(p_offset,0)
 )select jsonb_build_object('count',(select count(*) from grouped),'debit',coalesce((select sum(debit) from grouped),0)::text,'credit',coalesce((select sum(credit) from grouped),0)::text,
 'balance',coalesce((select sum(opening+debit-credit) from grouped),0)::text,
 'rows',coalesce((select jsonb_agg(to_jsonb(p)||jsonb_build_object('opening',p.opening::text,'debit',p.debit::text,'credit',p.credit::text,'balance',(p.opening+p.debit-p.credit)::text))from page p),'[]'::jsonb)) into result;
 return result;
end $$;
revoke all on function public.customer_ledger_page(uuid[],text,date,date,integer,integer) from public,anon;
grant execute on function public.customer_ledger_page(uuid[],text,date,date,integer,integer) to authenticated;
commit;
