-- Run once per project after deploying job-runner and applying
-- 20261012103000_scheduler_secret_check.sql. Requires the Vault secret
-- sonvera_project_url (https://<project-ref>.supabase.co). The scheduler secret
-- is generated here inside the database; never copy or print it.
-- Never use an anon/publishable key to authorize background jobs.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
do $$ begin
 if not exists(select 1 from vault.secrets where name='sonvera_project_url') then
  raise exception 'Vault secret sonvera_project_url must be provisioned first'; end if;
 if not exists(select 1 from vault.secrets where name='sonvera_scheduler_secret') then
  perform vault.create_secret(encode(extensions.gen_random_bytes(32),'hex'),'sonvera_scheduler_secret','pg_cron -> job-runner');
 end if;
end $$;
select cron.schedule('sonvera-jobs','*/5 * * * *',$job$
select net.http_post(
 url:=(select decrypted_secret from vault.decrypted_secrets where name='sonvera_project_url')||'/functions/v1/job-runner',
 headers:=jsonb_build_object('Content-Type','application/json','x-scheduler-secret',(select decrypted_secret from vault.decrypted_secrets where name='sonvera_scheduler_secret')),
 body:='{}'::jsonb,timeout_milliseconds:=65000
);
$job$);
