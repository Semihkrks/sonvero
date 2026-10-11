begin;
-- Indexable extraction covers singleton and multi-document commands and UUID paths.
create or replace function public.nilvera_document_ids(p_request jsonb) returns text[]
language sql immutable parallel safe set search_path=pg_catalog,public as $$
 select coalesce(array_agg(distinct value order by value),'{}'::text[]) from (
  select unnest(array[
   p_request#>>'{data,InvoiceInfo,UUID}',p_request#>>'{data,EInvoice,InvoiceInfo,UUID}',
   p_request#>>'{data,ArchiveInvoice,InvoiceInfo,UUID}',p_request#>>'{data,DespatchInfo,UUID}',
   p_request#>>'{data,Despatch,DespatchInfo,UUID}',p_request#>>'{data,UUID}',
   substring(p_request->>'path' from '/([a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12})(?:/|$)')
  ]) as value
  union all
  select case when jsonb_typeof(item)='string' then item#>>'{}' else coalesce(item->>'UUID',item->>'uuid') end
  from jsonb_array_elements(case when jsonb_typeof(p_request->'data')='array' then p_request->'data' else '[]'::jsonb end) item
  union all
  select item#>>'{}' from jsonb_array_elements(case when jsonb_typeof(p_request#>'{data,UUIDS}')='array' then p_request#>'{data,UUIDS}' else '[]'::jsonb end) item
 ) ids where value is not null and value<>'';
$$;
revoke all on function public.nilvera_document_ids(jsonb) from public,anon,authenticated;
grant execute on function public.nilvera_document_ids(jsonb) to service_role;
create index if not exists operation_receipts_document_ids on public.operation_receipts using gin(public.nilvera_document_ids(request)) where kind='nilvera' and status in ('processing','unknown','succeeded');
create index if not exists operation_receipts_account_environment on public.operation_receipts(account_id,(request->>'environment')) where kind='nilvera' and status in ('processing','unknown','succeeded');
create or replace function public.begin_nilvera_operation(p_user_id uuid,p_account_id uuid,p_key text,p_request jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare r operation_receipts; previous operation_receipts; claimed boolean:=false; document_ids text[];
begin
  perform 1 from accounts where id=p_account_id and user_id=p_user_id and disabled_at is null for update;
  if not found then raise exception 'Hesaba erişim yok' using errcode='42501'; end if;
  select * into r from operation_receipts where user_id=p_user_id and account_id=p_account_id and kind='nilvera' and idempotency_key=p_key;
  if found then
    if r.request<>p_request then raise exception 'İşlem anahtarı farklı içerikle kullanıldı' using errcode='22023'; end if;
    return to_jsonb(r)||jsonb_build_object('claimed',false);
  end if;
  document_ids:=public.nilvera_document_ids(p_request);
  if cardinality(document_ids)>0 then
    for previous in select * from operation_receipts
      where user_id=p_user_id and account_id=p_account_id and kind='nilvera'
      and status in ('processing','unknown','succeeded')
      and request->>'environment'=p_request->>'environment'
      and public.nilvera_document_ids(request) && document_ids
      order by created_at desc,id desc
    loop
      if previous.status in ('processing','unknown') then
        if previous.request=p_request then return to_jsonb(previous)||jsonb_build_object('claimed',false); end if;
        raise exception 'Bu belgenin önceki işlemi hâlâ doğrulanıyor' using errcode='22023';
      end if;
      -- A completed send blocks another send, not subsequent archive/tag operations.
      if previous.request->>'path' ~ '/Send/Model$|/Draft/EditAndSend$|/Draft/ConfirmAndSend$'
         and p_request->>'path' ~ '/Send/Model$|/Draft/EditAndSend$|/Draft/ConfirmAndSend$' then
        if previous.request=p_request then return to_jsonb(previous)||jsonb_build_object('claimed',false); end if;
        raise exception 'Bu belge daha önce gönderildi' using errcode='22023';
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
