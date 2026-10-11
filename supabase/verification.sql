-- Read-only baseline. Run before and after migration, keep output with encrypted backup.
select count(*) as accounts from public.accounts;
select account_id,count(*) as collection_count,sum(amount) as collection_total from public.customer_collections group by account_id order by account_id;
select account_id,doc_type,count(*) as archive_count,min(issue_date),max(issue_date) from public.invoice_archive group by account_id,doc_type order by account_id,doc_type;
-- Similarity candidates only. Do NOT delete: identical real payments are legitimate.
select account_id,customer_key,date,amount,count(*) as candidates
from public.customer_collections group by account_id,customer_key,date,amount having count(*)>1 order by count(*) desc;
