-- Archive end-date guard must use Istanbul calendar (UTC current_date breaks near midnight TR).
create or replace function public.replace_invoice_archive(p_account_id uuid,p_doc_type text,p_start date,p_end date,p_invoices jsonb,p_months date[] default '{}')
returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid:=auth.uid(); item jsonb; total integer:=0;
  today_tr date:=(timezone('Europe/Istanbul', now()))::date;
begin
  if u is null or not exists(select 1 from accounts where id=p_account_id and user_id=u and disabled_at is null) then raise exception 'Hesaba erişim yok' using errcode='42501'; end if;
  if p_start>p_end or p_end>today_tr or jsonb_typeof(p_invoices)<>'array' then raise exception 'Geçersiz arşiv aralığı'; end if;
  perform pg_advisory_xact_lock(hashtext(p_account_id::text||p_doc_type));
  for item in select value from jsonb_array_elements(p_invoices) loop
    if coalesce(item->>'invoice_uuid','')='' or (item->>'issue_date')::date not between p_start and p_end then raise exception 'Eksik veya aralık dışı belge'; end if;
    insert into invoice_archive(user_id,account_id,doc_type,invoice_uuid,issue_date,payload)
      values(u,p_account_id,p_doc_type,item->>'invoice_uuid',(item->>'issue_date')::date,item->'payload')
      on conflict(account_id,doc_type,invoice_uuid) do update set payload=excluded.payload,issue_date=excluded.issue_date,updated_at=now();
    total:=total+1;
  end loop;
  insert into invoice_archive_sync(user_id,account_id,doc_type,month)
    select u,p_account_id,p_doc_type,m from unnest(p_months) m
    where m>=p_start and (m+interval '1 month'-interval '1 day')::date<=p_end
    on conflict(account_id,doc_type,month) do update set synced_at=now();
  return total;
end; $$;
revoke all on function public.replace_invoice_archive(uuid,text,date,date,jsonb,date[]) from public,anon;
grant execute on function public.replace_invoice_archive(uuid,text,date,date,jsonb,date[]) to authenticated;
