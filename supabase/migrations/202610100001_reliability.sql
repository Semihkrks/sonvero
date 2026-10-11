-- Run after schema.sql. Additive data migration; no historical rows are deleted.
begin;
alter table public.accounts add column if not exists disabled_at timestamptz;
alter table public.customer_collections add column if not exists version integer not null default 1;
alter table public.customer_collections add column if not exists cancelled_at timestamptz;
alter table public.customer_collections add column if not exists updated_at timestamptz not null default now();
alter table public.customer_collections add column if not exists currency text not null default 'TRY' check (currency = 'TRY');
alter table public.customer_collections add column if not exists source_key text;
create unique index if not exists collections_source_unique on public.customer_collections(user_id, account_id, source_key) where source_key is not null;

create table if not exists public.operation_receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  account_id uuid not null references public.accounts(id),
  kind text not null,
  idempotency_key text not null check(length(idempotency_key) between 8 and 200),
  request jsonb not null,
  status text not null default 'processing' check(status in ('processing','succeeded','failed','unknown')),
  result jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,account_id,kind,idempotency_key),
  foreign key(account_id,user_id) references public.accounts(id,user_id)
);
create table if not exists public.collection_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  account_id uuid not null references public.accounts(id),
  collection_id uuid not null references public.customer_collections(id),
  operation_id uuid not null references public.operation_receipts(id),
  action text not null,
  reason text not null default '',
  before_value jsonb,
  after_value jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.operation_receipts enable row level security;
alter table public.collection_history enable row level security;
create policy receipts_read on public.operation_receipts for select to authenticated using(user_id=auth.uid());
create policy history_read on public.collection_history for select to authenticated using(user_id=auth.uid());
revoke all on public.operation_receipts, public.collection_history from anon, authenticated;
grant select on public.operation_receipts, public.collection_history to authenticated;

create or replace function public.collection_command(p_account_id uuid, p_key text, p_action text, p_record jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
  u uuid := auth.uid(); receipt public.operation_receipts; current_row public.customer_collections;
  old_value jsonb; result_value jsonb; request_value jsonb; n numeric; source text;
begin
  if u is null or not exists(select 1 from accounts where id=p_account_id and user_id=u and disabled_at is null) then
    raise exception 'Hesaba erişim yok' using errcode='42501';
  end if;
  if p_action not in ('create','update','cancel') then raise exception 'Geçersiz işlem'; end if;
  request_value := jsonb_build_object('action',p_action,'record',p_record);
  insert into operation_receipts(user_id,account_id,kind,idempotency_key,request)
    values(u,p_account_id,'collection',p_key,request_value) on conflict do nothing;
  select * into receipt from operation_receipts where user_id=u and account_id=p_account_id and kind='collection' and idempotency_key=p_key for update;
  if receipt.request <> request_value then raise exception 'İşlem anahtarı farklı içerikle kullanıldı' using errcode='22023'; end if;
  if receipt.status='succeeded' then return receipt.result; end if;
  if p_action <> 'cancel' then
    n := (p_record->>'amount')::numeric;
    if n is null or n <= 0 or n >= 10000000000000000 or n<>round(n,2) or n::text='NaN' then raise exception 'Geçersiz tutar'; end if;
    if coalesce(p_record->>'date','') !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'Geçersiz tarih'; end if;
    if coalesce(p_record->>'currency','TRY') <> 'TRY' then raise exception 'Yalnızca TL destekleniyor'; end if;
  end if;
  if p_action='create' then
    if coalesce(trim(p_record->>'customer_key'),'')='' then raise exception 'Müşteri zorunludur'; end if;
    source := nullif(p_record->>'source_key','');
    insert into customer_collections(user_id,account_id,customer_key,customer_name,customer_tax_no,type,description,amount,date,source_key)
      values(u,p_account_id,p_record->>'customer_key',coalesce(p_record->>'customer_name',''),coalesce(p_record->>'customer_tax_no',''),coalesce(p_record->>'type','Tahsilat'),coalesce(p_record->>'description',''),n,(p_record->>'date')::date,source)
      returning * into current_row;
  else
    select * into current_row from customer_collections where id=(p_record->>'id')::uuid and account_id=p_account_id and user_id=u for update;
    if not found then raise exception 'Tahsilat bulunamadı'; end if;
    if current_row.version is distinct from (p_record->>'version')::integer then raise exception 'Kayıt başka bir sekmede değişti. Yenileyin.' using errcode='40001'; end if;
    if current_row.cancelled_at is not null then raise exception 'Kayıt zaten iptal edilmiş'; end if;
    old_value:=to_jsonb(current_row);
    if p_action='cancel' then
      if coalesce(trim(p_record->>'reason'),'')='' then raise exception 'İptal gerekçesi zorunludur'; end if;
      update customer_collections set cancelled_at=now(),version=version+1,updated_at=now() where id=current_row.id returning * into current_row;
    else
      update customer_collections set amount=n,date=(p_record->>'date')::date,type=coalesce(p_record->>'type','Tahsilat'),description=coalesce(p_record->>'description',''),version=version+1,updated_at=now() where id=current_row.id returning * into current_row;
    end if;
  end if;
  result_value:=to_jsonb(current_row)||jsonb_build_object('operationId',receipt.id);
  insert into collection_history(user_id,account_id,collection_id,operation_id,action,reason,before_value,after_value)
    values(u,p_account_id,current_row.id,receipt.id,p_action,coalesce(p_record->>'reason',''),old_value,to_jsonb(current_row));
  update operation_receipts set status='succeeded',result=result_value,updated_at=now() where id=receipt.id;
  return result_value;
end; $$;
revoke all on function public.collection_command(uuid,text,text,jsonb) from public,anon;
grant execute on function public.collection_command(uuid,text,text,jsonb) to authenticated;
-- Old clients must update. There is deliberately no unsafe fallback insert.
revoke insert,update,delete on public.customer_collections from anon,authenticated;

-- Atomic full-window replacement. A failed insert rolls back the entire transaction.
create or replace function public.replace_invoice_archive(p_account_id uuid,p_doc_type text,p_start date,p_end date,p_invoices jsonb,p_months date[] default '{}')
returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid:=auth.uid(); item jsonb; total integer:=0;
begin
  if u is null or not exists(select 1 from accounts where id=p_account_id and user_id=u and disabled_at is null) then raise exception 'Hesaba erişim yok' using errcode='42501'; end if;
  if p_start>p_end or p_end>current_date or jsonb_typeof(p_invoices)<>'array' then raise exception 'Geçersiz arşiv aralığı'; end if;
  perform pg_advisory_xact_lock(hashtext(p_account_id::text||p_doc_type));
  -- Keep prior rows that disappeared from a list. Missing is not proof of cancellation.
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
revoke insert,update,delete on public.invoice_archive,public.invoice_archive_sync from anon,authenticated;

create table if not exists public.background_jobs(
  id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id),account_id uuid not null references accounts(id),
  kind text not null check(kind in ('sync','reconcile')),payload jsonb not null default '{}',
  status text not null default 'pending' check(status in ('pending','running','done','failed')),
  attempts integer not null default 0,next_run_at timestamptz not null default now(),
  lease_until timestamptz,lease_token uuid,last_error text,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
  foreign key(account_id,user_id) references accounts(id,user_id)
);
alter table public.background_jobs enable row level security;
create policy jobs_read on public.background_jobs for select to authenticated using(user_id=auth.uid());
revoke all on public.background_jobs from anon,authenticated;
grant select on public.background_jobs to authenticated;
create index jobs_ready on background_jobs(next_run_at) where status in ('pending','running');

create or replace function public.claim_background_jobs(p_limit integer default 3)
returns setof public.background_jobs language sql security definer set search_path=public,pg_temp as $$
  update background_jobs set status='running',attempts=attempts+1,lease_until=now()+interval '90 seconds',lease_token=gen_random_uuid(),updated_at=now()
  where id in(select id from background_jobs where next_run_at<=now() and (status='pending' or(status='running' and lease_until<now()))
    order by next_run_at for update skip locked limit least(greatest(p_limit,1),5)) returning *;
$$;
revoke all on function public.claim_background_jobs(integer) from public,anon,authenticated;
grant execute on function public.claim_background_jobs(integer) to service_role;
commit;
