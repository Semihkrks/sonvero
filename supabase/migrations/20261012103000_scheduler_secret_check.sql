begin;
-- job-runner verifies the pg_cron header against Vault, so the secret is generated
-- in the database and never has to be copied into Edge env or a terminal.
create or replace function public.scheduler_secret_matches(p_secret text) returns boolean
language sql stable security definer set search_path='' as $$
  select coalesce(length(p_secret)>=32 and exists(
    select 1 from vault.decrypted_secrets s
    where s.name='sonvera_scheduler_secret'
      and extensions.digest(s.decrypted_secret,'sha256')=extensions.digest(p_secret,'sha256')
  ),false);
$$;
revoke all on function public.scheduler_secret_matches(text) from public,anon,authenticated;
grant execute on function public.scheduler_secret_matches(text) to service_role;
commit;
