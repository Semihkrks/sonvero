begin;
create schema if not exists private;
revoke all on schema private from public,anon,authenticated;
create extension if not exists supabase_vault with schema vault;
alter table public.accounts add column if not exists has_api_key boolean not null default false;
create table if not exists private.account_credentials(account_id uuid primary key references public.accounts(id),secret_id uuid not null);

-- One-time migration performed inside the database; keys never pass through the browser.
do $$ declare a record; s uuid; begin
  for a in select id,api_key from public.accounts where coalesce(api_key,'')<>'' loop
    if not exists(select 1 from private.account_credentials where account_id=a.id) then
      select vault.create_secret(a.api_key,'nilvera-'||a.id::text) into s;
      insert into private.account_credentials values(a.id,s);
    end if;
    update public.accounts set api_key='',has_api_key=true where id=a.id;
  end loop;
end $$;

create or replace function public.save_account(p_id uuid,p_values jsonb,p_api_key text default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid:=auth.uid(); a accounts; s uuid;
begin
  if u is null then raise exception 'Oturum gerekli' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtext(p_id::text));
  select * into a from accounts where id=p_id for update;
  if found and a.user_id<>u then raise exception 'Hesaba erişim yok' using errcode='42501'; end if;
  if found and a.environment<>coalesce(p_values->>'environment','test') and (
    exists(select 1 from customer_collections where account_id=p_id) or
    exists(select 1 from invoice_archive where account_id=p_id) or
    exists(select 1 from operation_receipts where account_id=p_id)
  ) then raise exception 'Finansal geçmişi olan hesabın ortamı değiştirilemez. Ayrı bir test/canlı hesabı oluşturun.'; end if;
  if coalesce(trim(p_values->>'name'),'')='' then raise exception 'Hesap adı gerekli'; end if;
  if not found and coalesce(trim(p_api_key),'')='' then raise exception 'API anahtarı gerekli'; end if;
  insert into accounts(id,user_id,name,api_key,environment,color,company_name,vkn,invoice_series,despatch_series)
  values(p_id,u,p_values->>'name','',coalesce(p_values->>'environment','test'),coalesce(p_values->>'color','#2563eb'),p_values->>'company_name',p_values->>'vkn',p_values->>'invoice_series',p_values->>'despatch_series')
  on conflict(id) do update set name=excluded.name,environment=excluded.environment,color=excluded.color,company_name=excluded.company_name,vkn=excluded.vkn,invoice_series=excluded.invoice_series,despatch_series=excluded.despatch_series,updated_at=now();
  if coalesce(trim(p_api_key),'')<>'' then
    select secret_id into s from private.account_credentials where account_id=p_id;
    if s is null then
      select vault.create_secret(p_api_key,'nilvera-'||p_id::text) into s;
      insert into private.account_credentials values(p_id,s);
    else perform vault.update_secret(s,p_api_key); end if;
    update accounts set has_api_key=true where id=p_id;
  end if;
  select * into a from accounts where id=p_id;
  return to_jsonb(a)-'api_key';
end $$;
revoke all on function public.save_account(uuid,jsonb,text) from public,anon;
grant execute on function public.save_account(uuid,jsonb,text) to authenticated;

create or replace function public.disable_account(p_id uuid) returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
  update accounts set disabled_at=now(),updated_at=now() where id=p_id and user_id=auth.uid();
  if not found then raise exception 'Hesaba erişim yok' using errcode='42501'; end if;
end $$;
revoke all on function public.disable_account(uuid) from public,anon;
grant execute on function public.disable_account(uuid) to authenticated;

create or replace function public.get_account_secret(p_id uuid,p_user_id uuid) returns text language plpgsql security definer set search_path=public,pg_temp as $$
declare s text; begin
  select v.decrypted_secret into s from accounts a join private.account_credentials c on c.account_id=a.id join vault.decrypted_secrets v on v.id=c.secret_id
    where a.id=p_id and a.user_id=p_user_id and a.disabled_at is null;
  if s is null then raise exception 'Hesap anahtarı bulunamadı' using errcode='42501'; end if;
  return s;
end $$;
revoke all on function public.get_account_secret(uuid,uuid) from public,anon,authenticated;
grant execute on function public.get_account_secret(uuid,uuid) to service_role;

revoke all on public.accounts from anon,authenticated;
grant select(id,user_id,name,environment,color,is_active,company_name,vkn,invoice_series,despatch_series,created_at,updated_at,disabled_at,has_api_key) on public.accounts to authenticated;

create or replace function public.begin_nilvera_operation(p_user_id uuid,p_account_id uuid,p_key text,p_request jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare r operation_receipts; claimed boolean:=false;
begin
  if not exists(select 1 from accounts where id=p_account_id and user_id=p_user_id and disabled_at is null) then raise exception 'Hesaba erişim yok' using errcode='42501'; end if;
  insert into operation_receipts(user_id,account_id,kind,idempotency_key,request)
    values(p_user_id,p_account_id,'nilvera',p_key,p_request) on conflict do nothing returning * into r;
  claimed:=found;
  if not claimed then
    select * into r from operation_receipts where user_id=p_user_id and account_id=p_account_id and kind='nilvera' and idempotency_key=p_key;
    if r.request<>p_request then raise exception 'İşlem anahtarı farklı içerikle kullanıldı' using errcode='22023'; end if;
  else
    -- Created before contacting the provider: crashes cannot lose the reconciliation job.
    insert into background_jobs(user_id,account_id,kind,payload,next_run_at) values(p_user_id,p_account_id,'reconcile',jsonb_build_object('operationId',r.id),now()+interval '2 minutes');
  end if;
  return to_jsonb(r)||jsonb_build_object('claimed',claimed);
end $$;
revoke all on function public.begin_nilvera_operation(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.begin_nilvera_operation(uuid,uuid,text,jsonb) to service_role;

create or replace function public.finish_nilvera_operation(p_id uuid,p_status text,p_result jsonb) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if p_status not in ('succeeded','failed','unknown') then raise exception 'Geçersiz durum'; end if;
  update operation_receipts set status=p_status,result=p_result,updated_at=now() where id=p_id and kind='nilvera' and status in ('processing','unknown');
end $$;
revoke all on function public.finish_nilvera_operation(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.finish_nilvera_operation(uuid,text,jsonb) to service_role;

create table if not exists private.rate_windows(user_id uuid not null,window_start timestamptz not null,requests integer not null,primary key(user_id,window_start));
create or replace function public.take_api_budget(p_user_id uuid) returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare n integer; begin
  insert into private.rate_windows values(p_user_id,date_trunc('minute',now()),1)
  on conflict(user_id,window_start) do update set requests=private.rate_windows.requests+1 returning requests into n;
  delete from private.rate_windows where window_start<now()-interval '1 hour';
  return n<=120;
end $$;
revoke all on function public.take_api_budget(uuid) from public,anon,authenticated;
grant execute on function public.take_api_budget(uuid) to service_role;

create or replace function public.system_health() returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if auth.uid() is null then raise exception 'Oturum gerekli' using errcode='42501'; end if;
  return jsonb_build_object('databaseBytes',pg_database_size(current_database()),'databaseLimitBytes',524288000,
    'pendingJobs',(select count(*) from background_jobs where user_id=auth.uid() and status in ('pending','running')),
    'failedJobs',(select count(*) from background_jobs where user_id=auth.uid() and status='failed'),
    'unknownOperations',(select count(*) from operation_receipts where user_id=auth.uid() and status in ('unknown','processing')),
    'lastSync',(select max(synced_at) from invoice_archive_sync where user_id=auth.uid()));
end $$;
revoke all on function public.system_health() from public,anon;
grant execute on function public.system_health() to authenticated;
commit;
