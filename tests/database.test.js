import {beforeAll,afterAll,describe,it,expect} from 'vitest';
import {PGlite} from '@electric-sql/pglite';
import fs from 'node:fs';
let db;
const user='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222',account='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const record={customer_key:'1234567890',customer_name:'Deneme Firma',customer_tax_no:'1234567890',date:'2026-10-01',amount:'1234.56',currency:'TRY',description:'Test',type:'Tahsilat'};
const command=(key,action,payload=record)=>db.query('select public.collection_command($1,$2,$3,$4) as result',[account,key,action,payload]).then(r=>r.rows[0].result);
beforeAll(async()=>{
 db=new PGlite();
 await db.exec("create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;");
 await db.exec(fs.readFileSync('supabase/schema.sql','utf8').replace('CREATE EXTENSION IF NOT EXISTS pgcrypto;',''));
 await db.exec(fs.readFileSync('supabase/migrations/202610100001_reliability.sql','utf8'));
 await db.exec("create schema private;create function public.get_account_secret(uuid,uuid) returns text language sql as $$ select 'test'::text $$;");
 // Ledger tests do not emulate Vault encryption. Migration 002 is exercised separately in deployed Supabase.
 await db.exec(fs.readFileSync('supabase/migrations/202610100003_ledger.sql','utf8'));
 await db.query('insert into auth.users values($1),($2)',[user,other]);
 await db.query("insert into accounts(id,user_id,name,api_key)values($1,$2,'Test','')",[account,user]);
 await db.exec("grant select on customer_collections,invoice_archive,invoice_archive_sync,accounts to authenticated;");
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user]);
 await db.exec('set role authenticated');
});
afterAll(async()=>{await db?.close();});
describe('PostgreSQL transactional behavior',()=>{
 it('returns the same row for concurrent repeat requests',async()=>{
  const rows=await Promise.all(Array.from({length:20},()=>command('same-key-0001','create')));
  expect(new Set(rows.map(r=>r.id)).size).toBe(1);
  const count=await db.query('select count(*)::int as n from customer_collections');expect(count.rows[0].n).toBe(1);
  const history=await db.query('select count(*)::int as n from collection_history');expect(history.rows[0].n).toBe(1);
 });
 it('rejects same key with different contents',async()=>{await expect(command('same-key-0001','create',{...record,amount:'2.00'})).rejects.toThrow(/farklı/);});
 it('allows separate legitimate payments of identical amounts',async()=>{const one=await command('different-key-0002','create');const two=await command('different-key-0003','create');expect(one.id).not.toBe(two.id);});
 it('rejects direct writes by old clients',async()=>{await expect(db.query('delete from customer_collections')).rejects.toThrow(/permission/i);});
 it('rejects cross-account access',async()=>{
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[other]);
  await expect(command('other-user-0001','create')).rejects.toThrow(/erişim/);
  const rows=await db.query('select * from ledger_entries');expect(rows.rows).toHaveLength(0);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user]);
 });
 it('uses version checks and preserves correction/cancellation history',async()=>{
  const row=await command('update-original','create');
  const changed=await command('update-version1','update',{id:row.id,version:1,...record,amount:'50.00'});
  expect(changed.version).toBe(2);
  await expect(command('update-stale-v1','update',{id:row.id,version:1,...record,amount:'10.00'})).rejects.toThrow(/başka/);
  const cancelled=await command('cancel-version2','cancel',{id:row.id,version:2,reason:'Yanlış müşteri'});
  expect(cancelled.cancelled_at).toBeTruthy();
  const history=await db.query('select action from collection_history where collection_id=$1 order by created_at',[row.id]);
  expect(history.rows.map(r=>r.action)).toEqual(['create','update','cancel']);
 });
 it('deduplicates bank source references across import keys',async()=>{
  await command('source-first-key','create',{...record,source_key:'bank:123'});
  await expect(command('source-next-key','create',{...record,source_key:'bank:123'})).rejects.toThrow(/unique/i);
 });
 it('preserves archive when a full batch contains an invalid row',async()=>{
  const payload={invoice_uuid:'inv-1',issue_date:'2026-01-05',payload:{UUID:'inv-1',IssueDate:'2026-01-05',CurrencyCode:'TRY',PayableAmount:100,ReceiverName:'Müşteri',ReceiverTaxNumber:'1234567890'}};
  await db.query("select replace_invoice_archive($1,'efatura_sale','2026-01-01','2026-01-31',$2,'{2026-01-01}')",[account,[payload]]);
  await expect(db.query("select replace_invoice_archive($1,'efatura_sale','2026-01-01','2026-01-31',$2,'{2026-01-01}')",[account,[{...payload,payload:{...payload.payload,PayableAmount:999}},{invoice_uuid:'broken',issue_date:'2026-02-01',payload:{}}]])).rejects.toThrow();
  const rows=await db.query("select payload->>'PayableAmount' as amount from invoice_archive where invoice_uuid='inv-1'");expect(rows.rows[0].amount).toBe('100');
 });
 it('does not silently remove records missing from later API lists',async()=>{
  await db.query("select replace_invoice_archive($1,'efatura_sale','2026-01-01','2026-01-31','[]','{2026-01-01}')",[account]);
  expect((await db.query("select * from invoice_archive where invoice_uuid='inv-1'")).rows).toHaveLength(1);
 });
 it('computes totals over all matching rows, independently of pagination',async()=>{
  const {rows}=await db.query('select ledger_page($1,\'\',null,null,null,0,1) as result',[account]);
  const page=rows[0].result;expect(page.rows.length).toBe(1);expect(page.totals.count).toBeGreaterThan(1);expect(page.complete).toBe(false);
 });
});
