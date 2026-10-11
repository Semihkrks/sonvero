begin;
-- Serializes mutations for an account, including calls made with different intent keys.
create or replace function public.begin_nilvera_operation(p_user_id uuid,p_account_id uuid,p_key text,p_request jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare r operation_receipts; previous operation_receipts; claimed boolean:=false; document_id text; existing_id text;
begin
  perform 1 from accounts where id=p_account_id and user_id=p_user_id and disabled_at is null for update;
  if not found then raise exception 'Hesaba erişim yok' using errcode='42501'; end if;
  select * into r from operation_receipts where user_id=p_user_id and account_id=p_account_id and kind='nilvera' and idempotency_key=p_key;
  if found then
    if r.request<>p_request then raise exception 'İşlem anahtarı farklı içerikle kullanıldı' using errcode='22023'; end if;
    return to_jsonb(r)||jsonb_build_object('claimed',false);
  end if;
  document_id:=coalesce(p_request#>>'{data,InvoiceInfo,UUID}',p_request#>>'{data,EInvoice,InvoiceInfo,UUID}',p_request#>>'{data,ArchiveInvoice,InvoiceInfo,UUID}',p_request#>>'{data,DespatchInfo,UUID}',p_request#>>'{data,Despatch,DespatchInfo,UUID}',case when jsonb_typeof(p_request->'data')='array' then case when jsonb_array_length(p_request->'data')=1 then coalesce(p_request#>>'{data,0,UUID}',case when jsonb_typeof(p_request#>'{data,0}')='string' then p_request#>>'{data,0}' end) end end);
  if document_id is not null then
    for previous in select * from operation_receipts where user_id=p_user_id and account_id=p_account_id and kind='nilvera' and status in ('processing','unknown','succeeded') loop
      existing_id:=coalesce(previous.request#>>'{data,InvoiceInfo,UUID}',previous.request#>>'{data,EInvoice,InvoiceInfo,UUID}',previous.request#>>'{data,ArchiveInvoice,InvoiceInfo,UUID}',previous.request#>>'{data,DespatchInfo,UUID}',previous.request#>>'{data,Despatch,DespatchInfo,UUID}',case when jsonb_typeof(previous.request->'data')='array' then case when jsonb_array_length(previous.request->'data')=1 then coalesce(previous.request#>>'{data,0,UUID}',case when jsonb_typeof(previous.request#>'{data,0}')='string' then previous.request#>>'{data,0}' end) end end);
      if existing_id=document_id and previous.request->>'environment'=p_request->>'environment' then
        if previous.status in ('processing','unknown') then
          if previous.request=p_request then return to_jsonb(previous)||jsonb_build_object('claimed',false); end if;
          raise exception 'Bu belgenin önceki işlemi hâlâ doğrulanıyor' using errcode='22023';
        end if;
        if previous.request->>'path' ~ '/Send/Model$|/Draft/EditAndSend$|/Draft/ConfirmAndSend$' then
          if previous.request=p_request then return to_jsonb(previous)||jsonb_build_object('claimed',false); end if;
          raise exception 'Bu belge daha önce gönderildi' using errcode='22023';
        end if;
      end if;
    end loop;
  end if;
  insert into operation_receipts(user_id,account_id,kind,idempotency_key,request)
    values(p_user_id,p_account_id,'nilvera',p_key,p_request) returning * into r;
  insert into background_jobs(user_id,account_id,kind,payload,next_run_at) values(p_user_id,p_account_id,'reconcile',jsonb_build_object('operationId',r.id),now()+interval '2 minutes');
  return to_jsonb(r)||jsonb_build_object('claimed',true);
end $$;
revoke all on function public.begin_nilvera_operation(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.begin_nilvera_operation(uuid,uuid,text,jsonb) to service_role;
commit;
