begin;
-- Keep current-period work ahead of bounded historical refreshes.
create or replace function public.claim_background_jobs(p_limit integer default 3)
returns setof public.background_jobs language sql security definer set search_path=public,pg_temp as $$
 update background_jobs set status='running',attempts=attempts+1,lease_until=now()+interval '90 seconds',lease_token=gen_random_uuid(),updated_at=now()
 where id in(select id from background_jobs where next_run_at<=now() and (status='pending' or(status='running' and lease_until<now()))
 order by case when kind='reconcile' then 0 when coalesce(payload->>'historical','false')='true' then 2 else 1 end,next_run_at
 for update skip locked limit least(greatest(p_limit,1),5)) returning *;
$$;

create or replace function public.schedule_recent_sync(p_owner uuid) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare a record; doc text; candidate record; today date:=(now() at time zone 'Europe/Istanbul')::date; start_day date;
begin
 start_day:=date_trunc('month',today)::date;
 perform pg_advisory_xact_lock(hashtext('sonvera-daily-sync'));
 -- Do not create an ever-growing queue when storage is already full.
 if pg_database_size(current_database())::numeric/524288000>=0.85 then return; end if;
 for a in select id,user_id from accounts where user_id=p_owner and disabled_at is null and has_api_key loop
  foreach doc in array array['efatura_sale','efatura_purchase','earsiv','earsiv_gib'] loop
   if not exists(select 1 from background_jobs where account_id=a.id and kind='sync' and payload->>'docType'=doc
    and payload->>'start'=start_day::text and (status in ('pending','running') or created_at>now()-interval '12 hours')) then
    insert into background_jobs(user_id,account_id,kind,payload)values(a.user_id,a.id,'sync',jsonb_build_object('docType',doc,'start',start_day,'end',today,'page',1));
   end if;
  end loop;
  -- One historical month/type per account at a time, at most one new historical job/hour.
  if exists(select 1 from background_jobs where account_id=a.id and kind='sync' and payload->>'historical'='true'
    and(status in ('pending','running') or created_at>now()-interval '1 hour')) then continue; end if;
  select periods.month,types.doc_type into candidate from (
   select distinct date_trunc('month',issue_date)::date as month from invoice_archive where account_id=a.id and user_id=a.user_id
   union select month from invoice_archive_sync where account_id=a.id and user_id=a.user_id
   union select (start_day-interval '1 month')::date
  )periods cross join unnest(array['efatura_sale','efatura_purchase','earsiv','earsiv_gib'])types(doc_type)
  left join invoice_archive_sync s on s.account_id=a.id and s.doc_type=types.doc_type and s.month=periods.month
  where periods.month<start_day and coalesce(s.synced_at,'epoch'::timestamptz)<now()-interval '7 days'
   and not exists(select 1 from background_jobs j where j.account_id=a.id and j.kind='sync' and j.payload->>'docType'=types.doc_type and j.payload->>'start'=periods.month::text
    and(j.status in ('pending','running') or j.created_at>now()-interval '1 day'))
  order by s.synced_at nulls first,periods.month desc,types.doc_type limit 1;
  if found then
   insert into background_jobs(user_id,account_id,kind,payload)values(a.user_id,a.id,'sync',jsonb_build_object('docType',candidate.doc_type,'start',candidate.month,'end',(candidate.month+interval '1 month'-interval '1 day')::date,'page',1,'historical',true));
  end if;
 end loop;
end $$;

-- Evidence for the requested range, not a promise that every historic document is available.
create or replace function public.archive_coverage(p_account_id uuid,p_start date,p_end date) returns jsonb
language plpgsql security invoker set search_path=public,pg_temp as $$
declare result jsonb; today date:=(now() at time zone 'Europe/Istanbul')::date;
begin
 if not exists(select 1 from accounts where id=p_account_id and user_id=auth.uid() and disabled_at is null) then raise exception 'Hesaba erişim yok' using errcode='42501'; end if;
 if p_start is null or p_end is null then return jsonb_build_object('bounded',false,'scanned',false,'fresh',false,'periods','[]'::jsonb); end if;
 if p_start>p_end or p_end>today or p_end-p_start>3660 then raise exception 'Geçersiz tarih aralığı'; end if;
 with periods as (
  select m::date as month,greatest(m::date,p_start) as first_day,least((m+interval '1 month'-interval '1 day')::date,p_end) as last_day
  from generate_series(date_trunc('month',p_start),date_trunc('month',p_end),interval '1 month') m
 ), evidence as (
  select p.month,t.doc_type,greatest(s.synced_at,j.completed_at) as completed_at
  from periods p cross join unnest(array['efatura_sale','efatura_purchase','earsiv','earsiv_gib'])t(doc_type)
  left join invoice_archive_sync s on s.account_id=p_account_id and s.user_id=auth.uid() and s.doc_type=t.doc_type and s.month=p.month
  left join lateral(select max(updated_at) as completed_at from background_jobs
   where account_id=p_account_id and user_id=auth.uid() and kind='sync' and status='done' and payload->>'docType'=t.doc_type
   and(payload->>'start')::date<=p.first_day and(payload->>'end')::date>=p.last_day)j on true
 ), classified as (
  select *,completed_at is not null as scanned,coalesce(completed_at>now()-case when month>=date_trunc('month',today)::date then interval '12 hours' else interval '7 days' end,false) as fresh from evidence
 )select jsonb_build_object('bounded',true,'scanned',bool_and(scanned),'fresh',bool_and(fresh),'checked',count(*)filter(where scanned),'expected',count(*),
 'periods',jsonb_agg(jsonb_build_object('month',month,'type',doc_type,'lastSync',completed_at,'scanned',scanned,'fresh',fresh)order by month,doc_type)) into result from classified;
 return result;
end $$;
revoke all on function public.archive_coverage(uuid,date,date) from public,anon;
grant execute on function public.archive_coverage(uuid,date,date) to authenticated;
revoke all on function public.schedule_recent_sync(uuid) from public,anon,authenticated;
grant execute on function public.schedule_recent_sync(uuid) to service_role;
revoke all on function public.claim_background_jobs(integer) from public,anon,authenticated;
grant execute on function public.claim_background_jobs(integer) to service_role;
commit;
