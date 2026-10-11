import {beforeAll,afterAll,it,expect} from 'vitest';
import {PGlite} from '@electric-sql/pglite';
import fs from 'node:fs';
let db;const owner='11111111-1111-4111-8111-111111111111',account='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const request={method:'POST',path:'/einvoice/Send/Model',environment:'test',data:{InvoiceInfo:{UUID:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'}}};
beforeAll(async()=>{
 db=new PGlite();
 await db.exec("create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create function auth.uid()returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;grant usage on schema auth to authenticated;");
 await db.exec(fs.readFileSync('supabase/schema.sql','utf8').replace('CREATE EXTENSION IF NOT EXISTS pgcrypto;',''));
 // Supabase grants table privileges to authenticated by default; RLS and migrations narrow them.
 await db.exec('grant select on invoice_archive,invoice_archive_sync,customer_collections to authenticated;');
 await db.exec(fs.readFileSync('supabase/migrations/202610100001_reliability.sql','utf8'));
 // Test-only Vault API stand-in tests SQL permissions and migration behavior, not encryption.
 await db.exec("create schema vault;create table vault.decrypted_secrets(id uuid primary key default gen_random_uuid(),decrypted_secret text,name text);create function vault.create_secret(s text,n text)returns uuid language sql as $$ insert into vault.decrypted_secrets(decrypted_secret,name)values(s,n)returning id $$;create function vault.update_secret(i uuid,s text)returns void language sql as $$ update vault.decrypted_secrets set decrypted_secret=s where id=i $$;");
 await db.exec(fs.readFileSync('supabase/migrations/202610100002_private_api.sql','utf8').replace('create extension if not exists supabase_vault with schema vault;',''));
 for(const name of ['202610100003_ledger.sql','202610100004_scheduling.sql','202610100005_document_guard.sql','202610100006_job_retry.sql','202610100007_despatch_guard.sql','202610100008_sync_coverage.sql','202610100009_customer_ledger.sql','202610100010_document_batch_guard.sql','202610100011_ledger_export.sql','202610100012_backup_history.sql','202610100013_restore_verification.sql','202610100014_document_operation_index.sql','202610100015_resolve_operation.sql'])await db.exec(fs.readFileSync('supabase/migrations/'+name,'utf8'));
 await db.query('insert into auth.users values($1)',[owner]);
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[owner]);
 await db.exec('set role authenticated');
});
afterAll(async()=>{await db?.close();});
it('account command stores secret outside normal account responses',async()=>{
 const {rows}=await db.query('select save_account($1,$2,$3) as result',[account,{name:'Test',environment:'test'},'fake-test-key']);
 expect(rows[0].result.has_api_key).toBe(true);expect(rows[0].result.api_key).toBeUndefined();
 await expect(db.query('select api_key from accounts')).rejects.toThrow(/permission/i);
 await expect(db.query('select * from private.account_credentials')).rejects.toThrow(/permission/i);
 await expect(db.query('select get_account_secret($1,$2)',[account,owner])).rejects.toThrow(/permission/i);
});
it('account metadata update preserves the existing secret',async()=>{
 await db.query('select save_account($1,$2)',[account,{name:'Changed',environment:'test'}]);
 await db.exec('set role service_role');
 expect((await db.query('select get_account_secret($1,$2) as secret',[account,owner])).rows[0].secret).toBe('fake-test-key');
});
it('unknown document cannot be resent with a new key or changed contents',async()=>{
 const begin=(key,payload)=>db.query('select begin_nilvera_operation($1,$2,$3,$4) as result',[owner,account,key,payload]).then(r=>r.rows[0].result);
 const first=await begin('document-first-key',request);expect(first.claimed).toBe(true);
 const repeat=await begin('document-different-key',request);expect(repeat.id).toBe(first.id);expect(repeat.claimed).toBe(false);
 await expect(begin('changed-document-key',{...request,data:{...request.data,Notes:['changed']}})).rejects.toThrow(/doğrulanıyor/);
 await db.query("select finish_nilvera_operation($1,'succeeded',$2)",[first.id,{success:true}]);
 expect((await begin('document-third-key',request)).claimed).toBe(false);
 await expect(begin('changed-success-key',{...request,data:{...request.data,Notes:['changed']}})).rejects.toThrow(/gönderildi/);
});
it('despatch UUID prevents a second write with a different operation key',async()=>{
 await db.exec('set role service_role');
 const payload={method:'POST',path:'/edespatch/Send/Model',environment:'test',data:{DespatchInfo:{UUID:'cccccccc-cccc-4ccc-8ccc-cccccccccccc'}}};
 const begin=key=>db.query('select begin_nilvera_operation($1,$2,$3,$4) as result',[owner,account,key,payload]).then(r=>r.rows[0].result);
 const first=await begin('despatch-first');const second=await begin('despatch-second');
 expect(first.claimed).toBe(true);expect(second.claimed).toBe(false);expect(second.id).toBe(first.id);
 await expect(db.query('select begin_nilvera_operation($1,$2,$3,$4)',[owner,account,'despatch-changed',{...payload,data:{...payload.data,Notes:['changed']}}])).rejects.toThrow(/doğrulanıyor/);
});
it('financial history prevents changing the provider environment',async()=>{
 await db.exec('set role authenticated');
 await expect(db.query('select save_account($1,$2)',[account,{name:'Changed',environment:'live'}])).rejects.toThrow();
 expect((await db.query('select environment from accounts where id=$1',[account])).rows[0].environment).toBe('test');
});
it('only the owner can retry a failed job, and a pending job cannot be queued twice',async()=>{
 await db.exec('reset role');
 const {rows}=await db.query("insert into background_jobs(user_id,account_id,kind,status,attempts,last_error)values($1,$2,'reconcile','failed',8,'test failure')returning id",[owner,account]);
 const id=rows[0].id;
 await db.exec('set role authenticated');
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",['22222222-2222-4222-8222-222222222222']);
 await expect(db.query('select retry_background_job($1)',[id])).rejects.toThrow(/erişim/);
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[owner]);
 await db.query('select retry_background_job($1)',[id]);
 const job=(await db.query('select status,attempts,last_error from background_jobs where id=$1',[id])).rows[0];
 expect(job).toEqual({status:'pending',attempts:0,last_error:null});
 await expect(db.query('select retry_background_job($1)',[id])).rejects.toThrow(/başarısız/);
});
it('soft deactivation retains financial account and denies subsequent writes',async()=>{
 await db.exec('set role authenticated');await db.query('select disable_account($1)',[account]);
 expect((await db.query('select id,disabled_at from accounts')).rows[0].disabled_at).toBeTruthy();
 await db.exec('set role service_role');
 await expect(db.query('select begin_nilvera_operation($1,$2,$3,$4)',[owner,account,'disabled-account',request])).rejects.toThrow(/erişim/);
});
const second='dddddddd-dddd-4ddd-8ddd-dddddddddddd',stranger='22222222-2222-4222-8222-222222222222';
const as=async(role,sub=owner)=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[sub]);await db.exec('set role '+role);};
const beginOn=(key,payload)=>db.query('select begin_nilvera_operation($1,$2,$3,$4) as result',[owner,second,key,payload]).then(r=>r.rows[0].result);
it('single-document batch commands are serialized and only sends block a later send',async()=>{
 await as('authenticated');await db.query('select save_account($1,$2,$3)',[second,{name:'Second',environment:'test'},'second-key']);
 await as('service_role');
 const uuid='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',send={method:'POST',path:'/einvoice/Draft/ConfirmAndSend',environment:'test',data:[uuid]};
 const first=await beginOn('batch-send',send);expect(first.claimed).toBe(true);
 expect((await beginOn('batch-send-repeat',send)).id).toBe(first.id);
 await expect(beginOn('batch-send-model',{...send,data:[{UUID:uuid}]})).rejects.toThrow(/doğrulanıyor/);
 await db.query("select finish_nilvera_operation($1,'succeeded',$2)",[first.id,{success:true}]);
 await expect(beginOn('batch-resend',{...send,data:[{UUID:uuid}]})).rejects.toThrow(/gönderildi/);
 expect((await beginOn('batch-archive',{method:'POST',path:'/einvoice/Sale/Operation/Archive',environment:'test',data:[uuid]})).claimed).toBe(true);
});
it('owner resolves an uncertain operation only to an honest outcome',async()=>{
 await as('service_role');
 const send=await beginOn('resolve-send',{...request,data:{InvoiceInfo:{UUID:'99999999-9999-4999-8999-999999999999'}}});
 const resolve=(id,status,note)=>db.query('select resolve_nilvera_operation($1,$2,$3)',[id,status,note]);
 await as('authenticated',stranger);
 await expect(resolve(send.id,'failed','Sağlayıcıda belge yok')).rejects.toThrow(/erişim/);
 await as('authenticated');
 await expect(resolve(send.id,'failed','kısa')).rejects.toThrow(/8 karakter/);
 await expect(resolve(send.id,'succeeded','Sağlayıcıda belge görüldü')).rejects.toThrow(/elle/);
 await resolve(send.id,'failed','Sağlayıcıda belge yok');
 const receipt=(await db.query('select status,result from operation_receipts where id=$1',[send.id])).rows[0];
 expect(receipt.status).toBe('failed');expect(receipt.result).toMatchObject({resolvedBy:'owner',note:'Sağlayıcıda belge yok'});
 expect((await db.query("select status from background_jobs where kind='reconcile' and payload->>'operationId'=$1",[send.id])).rows).toEqual([{status:'done'}]);
 await expect(resolve(send.id,'failed','Sağlayıcıda belge yok')).rejects.toThrow(/belirsiz/);
});
it('backup history and restore evidence are written only by the service role',async()=>{
 const id='ffffffff-ffff-4fff-8fff-ffffffffffff',sha='a'.repeat(64),now=new Date().toISOString();
 const backup=[owner,id,'sonvera-2026-10-12T00-00-00.svb',1024,sha,new Date(Date.now()-60000).toISOString()];
 await as('authenticated');
 await expect(db.query('select record_backup_result($1,$2,$3,$4,$5,$6)',backup)).rejects.toThrow(/permission/i);
 await expect(db.query('select record_restore_verification($1,$2,$3,$4)',[owner,id,sha,now])).rejects.toThrow(/permission/i);
 await as('service_role');
 await db.query('select record_backup_result($1,$2,$3,$4,$5,$6)',backup);
 await expect(db.query('select record_restore_verification($1,$2,$3,$4)',[owner,id,'b'.repeat(64),now])).rejects.toThrow(/eşleşmedi/);
 await db.query('select record_restore_verification($1,$2,$3,$4)',[owner,id,sha,now]);
 await as('authenticated');
 const row=(await db.query('select restore_verified_at,restore_verification_scope from backup_history where id=$1',[id])).rows[0];
 expect(row.restore_verified_at).toBeTruthy();expect(row.restore_verification_scope).toBe('accounts-collections-archive-ledger');
});
it('archive coverage is owner-scoped and queue scheduling is reserved for the service role',async()=>{
 await as('authenticated');
 const coverage=(id,start,end)=>db.query('select archive_coverage($1,$2,$3) as c',[id,start,end]).then(r=>r.rows[0].c);
 const c=await coverage(second,'2026-08-01','2026-09-30');
 expect(c).toMatchObject({bounded:true,scanned:false,fresh:false,checked:0,expected:8});expect(c.periods).toHaveLength(8);
 expect(await coverage(second,null,null)).toMatchObject({bounded:false,scanned:false});
 await expect(coverage(account,'2026-08-01','2026-09-30')).rejects.toThrow(/erişim/);
 await expect(db.query('select claim_background_jobs(1)')).rejects.toThrow(/permission/i);
 await expect(db.query('select schedule_recent_sync($1)',[owner])).rejects.toThrow(/permission/i);
 await as('authenticated',stranger);
 await expect(coverage(second,'2026-08-01','2026-09-30')).rejects.toThrow(/erişim/);
 await as('service_role');await db.query('select schedule_recent_sync($1)',[owner]);
 await as('authenticated');
 const jobs=(await db.query("select coalesce(payload->>'historical','false') as historical,count(*)::int as n from background_jobs where account_id=$1 and kind='sync' group by 1 order by 1",[second])).rows;
 expect(jobs).toEqual([{historical:'false',n:4},{historical:'true',n:1}]);
});
it('customer ledger and export pages are owner-scoped and revision-checked',async()=>{
 await as('authenticated');
 const empty={rows:[],count:0,debit:'0',credit:'0',balance:'0'};
 expect((await db.query('select customer_ledger_page($1::uuid[]) as r',[[second]])).rows[0].r).toEqual(empty);
 expect((await db.query('select customer_ledger_page($1::uuid[]) as r',[[]])).rows[0].r).toEqual(empty);
 await expect(db.query('select customer_ledger_page($1::uuid[])',[[account]])).rejects.toThrow(/erişim/);
 const revision=(await db.query('select ledger_revision($1::uuid[]) as r',[[second]])).rows[0].r;
 expect(revision).toEqual({[second]:'0'});
 const page=rev=>db.query('select ledger_export_page($1::uuid[],$2) as r',[[second],rev]).then(r=>r.rows[0].r);
 expect(await page(revision)).toEqual({rows:[],hasMore:false});
 await db.exec('reset role');
 await db.query("insert into invoice_archive(user_id,account_id,doc_type,invoice_uuid,issue_date)values($1,$2,'efatura_sale','ledger-revision-doc','2026-09-01')",[owner,second]);
 await as('authenticated');
 await expect(page(revision)).rejects.toThrow(/değişti/);
 expect((await db.query('select ledger_revision($1::uuid[]) as r',[[second]])).rows[0].r).toEqual({[second]:'1'});
});
