begin;
create table if not exists public.backup_history(
 id uuid primary key,user_id uuid not null references auth.users(id),file_name text not null,
 bytes bigint not null check(bytes>0),sha256 text not null check(sha256~'^[a-f0-9]{64}$'),
 completed_at timestamptz not null,reported_at timestamptz not null default now(),restore_verified_at timestamptz
);
alter table public.backup_history enable row level security;
create policy backup_history_read on public.backup_history for select to authenticated using(user_id=auth.uid());
revoke all on public.backup_history from anon,authenticated;
grant select on public.backup_history to authenticated;
create or replace function public.record_backup_result(p_owner uuid,p_id uuid,p_file_name text,p_bytes bigint,p_sha256 text,p_completed_at timestamptz)returns void
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if p_file_name !~ '^sonvera-[a-zA-Z0-9T.-]+\.svb$' or length(p_file_name)>150 then raise exception 'Geçersiz yedek dosya adı'; end if;
 if p_completed_at>now()+interval '5 minutes' then raise exception 'Geçersiz yedek zamanı'; end if;
 insert into backup_history(id,user_id,file_name,bytes,sha256,completed_at)values(p_id,p_owner,p_file_name,p_bytes,p_sha256,p_completed_at)on conflict(id)do nothing;
end $$;
revoke all on function public.record_backup_result(uuid,uuid,text,bigint,text,timestamptz) from public,anon,authenticated;
grant execute on function public.record_backup_result(uuid,uuid,text,bigint,text,timestamptz) to service_role;
commit;
