begin;
-- Owner may close a stuck unknown/processing Nilvera receipt after manual provider check.
-- Never invents success: only failed or (when path is non-send) a confirmed succeeded outcome.
create or replace function public.resolve_nilvera_operation(p_id uuid, p_status text, p_note text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare r operation_receipts;
begin
  if p_status not in ('failed','succeeded') then raise exception 'Geçersiz çözüm durumu' using errcode='22023'; end if;
  if p_note is null or length(btrim(p_note))<8 or length(p_note)>500 then raise exception 'En az 8 karakterlik gerekçe gerekli' using errcode='22023'; end if;
  select * into r from operation_receipts where id=p_id and user_id=auth.uid() and kind='nilvera' for update;
  if not found then raise exception 'İşleme erişim yok' using errcode='42501'; end if;
  if r.status not in ('unknown','processing') then raise exception 'Yalnızca sonucu belirsiz işlemler kapatılabilir' using errcode='22023'; end if;
  if not exists(select 1 from accounts where id=r.account_id and user_id=auth.uid() and disabled_at is null) then raise exception 'Hesap devre dışı' using errcode='42501'; end if;
  -- Send-like paths cannot be marked succeeded by hand; that would hide a possible double-send risk.
  if p_status='succeeded' and coalesce(r.request->>'path','') ~ '/Send/Model$|/Draft/EditAndSend$|/Draft/ConfirmAndSend$' then
    raise exception 'Gönderim işlemi elle başarılı işaretlenemez. Sağlayıcıda yoksa başarısız kapatın; varsa yeni gönderim yapmayın.' using errcode='22023';
  end if;
  update operation_receipts
    set status=p_status,
        result=coalesce(result,'{}'::jsonb)||jsonb_build_object('resolvedBy','owner','note',btrim(p_note),'resolvedAt',now()),
        updated_at=now()
  where id=p_id;
  update background_jobs
    set status='done', last_error=null, lease_until=null, lease_token=null, updated_at=now()
  where user_id=auth.uid() and kind='reconcile' and payload->>'operationId'=p_id::text
    and status in ('pending','running','failed');
end $$;
revoke all on function public.resolve_nilvera_operation(uuid,text,text) from public,anon;
grant execute on function public.resolve_nilvera_operation(uuid,text,text) to authenticated;
commit;
