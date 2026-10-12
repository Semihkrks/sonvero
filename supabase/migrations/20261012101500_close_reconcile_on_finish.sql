begin;
-- A reconcile job only exists to confirm an operation whose outcome may be unknown.
-- Once the operation is terminal, the job has nothing left to check.
create or replace function public.finish_nilvera_operation(p_id uuid,p_status text,p_result jsonb) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if p_status not in ('succeeded','failed','unknown') then raise exception 'Geçersiz durum'; end if;
  update operation_receipts set status=p_status,result=p_result,updated_at=now() where id=p_id and kind='nilvera' and status in ('processing','unknown');
  if p_status in ('succeeded','failed') then
    update background_jobs
      set status='done',last_error=null,lease_until=null,lease_token=null,updated_at=now()
    where kind='reconcile' and payload->>'operationId'=p_id::text and status in ('pending','running','failed');
  end if;
end $$;
revoke all on function public.finish_nilvera_operation(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.finish_nilvera_operation(uuid,text,jsonb) to service_role;

update background_jobs j
  set status='done',last_error=null,lease_until=null,lease_token=null,updated_at=now()
from operation_receipts o
where j.kind='reconcile' and j.status in ('pending','running','failed')
  and o.id::text=j.payload->>'operationId' and o.status in ('succeeded','failed');
commit;
