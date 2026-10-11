begin;
alter table public.backup_history add column if not exists restore_verification_scope text;
create or replace function public.record_restore_verification(p_owner uuid,p_backup_id uuid,p_sha256 text,p_verified_at timestamptz)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if p_verified_at is null or p_verified_at>now()+interval '5 minutes' or p_verified_at<now()-interval '1 day' then raise exception 'Geçersiz doğrulama zamanı'; end if;
 update backup_history set restore_verified_at=p_verified_at,restore_verification_scope='accounts-collections-archive-ledger'
 where id=p_backup_id and user_id=p_owner and sha256=p_sha256 and completed_at<=p_verified_at;
 if not found then raise exception 'Yedek kaydı veya dosya özeti eşleşmedi'; end if;
end $$;
revoke all on function public.record_restore_verification(uuid,uuid,text,timestamptz) from public,anon,authenticated;
grant execute on function public.record_restore_verification(uuid,uuid,text,timestamptz) to service_role;
commit;
