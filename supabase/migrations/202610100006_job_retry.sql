begin;
create or replace function public.retry_background_job(p_job_id uuid) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare job background_jobs;
begin
 select * into job from background_jobs where id=p_job_id and user_id=auth.uid() for update;
 if not found then raise exception 'İşe erişim yok' using errcode='42501'; end if;
 if job.status<>'failed' then raise exception 'Yalnızca başarısız işler yeniden kontrol edilebilir'; end if;
 if not exists(select 1 from accounts where id=job.account_id and user_id=auth.uid() and disabled_at is null) then raise exception 'Hesap devre dışı'; end if;
 -- Reconciliation remains read-only: never re-submit an uncertain provider mutation.
 update background_jobs set status='pending',attempts=0,next_run_at=now(),lease_until=null,lease_token=null,last_error=null,updated_at=now() where id=p_job_id;
end $$;
revoke all on function public.retry_background_job(uuid) from public,anon;
grant execute on function public.retry_background_job(uuid) to authenticated;
commit;
