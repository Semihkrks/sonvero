begin;
create or replace function public.database_usage() returns jsonb language sql security definer set search_path=public,pg_temp as $$
select jsonb_build_object('bytes',pg_database_size(current_database()),'ratio',pg_database_size(current_database())::numeric/524288000);
$$;
revoke all on function public.database_usage() from public,anon,authenticated;
grant execute on function public.database_usage() to service_role;
create or replace function public.schedule_recent_sync(p_owner uuid) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare a record; doc text; start_day date:=date_trunc('month',current_date)::date;
begin
 perform pg_advisory_xact_lock(hashtext('sonvera-daily-sync'));
 for a in select id,user_id from accounts where user_id=p_owner and disabled_at is null and has_api_key loop
  foreach doc in array array['efatura_sale','efatura_purchase','earsiv','earsiv_gib'] loop
   if not exists(select 1 from background_jobs where account_id=a.id and kind='sync' and payload->>'docType'=doc and (status in ('pending','running') or created_at>now()-interval '12 hours')) then
    insert into background_jobs(user_id,account_id,kind,payload)values(a.user_id,a.id,'sync',jsonb_build_object('docType',doc,'start',start_day,'end',current_date,'page',1));
   end if;
  end loop;
 end loop;
end $$;
revoke all on function public.schedule_recent_sync(uuid) from public,anon,authenticated;
grant execute on function public.schedule_recent_sync(uuid) to service_role;
commit;
