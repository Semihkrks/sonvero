import {PGlite} from '@electric-sql/pglite';
import fs from 'node:fs';
const db=new PGlite(),user='11111111-1111-4111-8111-111111111111',account='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
try{
 await db.exec("create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create function auth.uid()returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;grant usage on schema auth to authenticated;");
 await db.exec(fs.readFileSync('supabase/schema.sql','utf8').replace('CREATE EXTENSION IF NOT EXISTS pgcrypto;',''));
 await db.exec(fs.readFileSync('supabase/migrations/202610100001_reliability.sql','utf8'));
 await db.exec("create schema private;");
 await db.exec(fs.readFileSync('supabase/migrations/202610100003_ledger.sql','utf8'));
 await db.query('insert into auth.users values($1)',[user]);await db.query("insert into accounts(id,user_id,name,api_key)values($1,$2,'Synthetic','')",[account,user]);
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user]);
 await db.exec('grant select on accounts,customer_collections,invoice_archive,invoice_archive_sync to authenticated;');
 const results=[];
 let existing=0;
 for(const count of [10000,100000]){
  await db.query("insert into customer_collections(user_id,account_id,customer_key,customer_name,customer_tax_no,date,amount,type,description) select $1,$2,'1234567890','Synthetic '||(n%100),'1234567890','2026-01-01',120.15,'Tahsilat','Synthetic test' from generate_series($3::int,$4::int)n",[user,account,existing+1,count]);existing=count;
  await db.exec('analyze customer_collections;set role authenticated;');
  const timings=[];
  for(let i=0;i<3;i++){
   const start=performance.now();const {rows}=await db.query("select ledger_page($1,'',null,null,null,0,50) as result",[account]);
   const page=rows[0].result;if(page.rows.length!==50||page.totals.count!==count||Number(page.totals.credit)!==count*120.15)throw new Error('Count or total mismatch');
   timings.push(Math.round(performance.now()-start));
  }
  await db.exec('reset role');results.push({count,rows:50,latencyMs:timings,scope:'Local PGlite; no network or production data'});
 }
 fs.mkdirSync('.gstack',{recursive:true});fs.writeFileSync('.gstack/ledger-benchmark.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));
}finally{await db.close();}
