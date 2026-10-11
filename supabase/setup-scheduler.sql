-- After deploying job-runner, create Vault secrets sonvera_project_url and
-- sonvera_scheduler_secret. The latter must match the Edge SCHEDULER_SECRET.
-- Never use an anon/publishable key to authorize background jobs.
create extension if not exists pg_cron;
create extension if not exists pg_net;
do $$ begin
 if not exists(select 1 from vault.decrypted_secrets where name='sonvera_project_url')
 or not exists(select 1 from vault.decrypted_secrets where name='sonvera_scheduler_secret') then
 raise exception 'Scheduler secrets must be provisioned first'; end if;
end $$;
select cron.schedule('sonvera-jobs','*/5 * * * *',$job$
select net.http_post(
 url:=(select decrypted_secret from vault.decrypted_secrets where name='sonvera_project_url')||'/functions/v1/job-runner',
 headers:=jsonb_build_object('Content-Type','application/json','x-scheduler-secret',(select decrypted_secret from vault.decrypted_secrets where name='sonvera_scheduler_secret')),
 body:='{}'::jsonb,timeout_milliseconds:=65000
);
$job$);
