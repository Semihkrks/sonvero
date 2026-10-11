import {spawn} from 'node:child_process';
// Only hashes, counts and currency-separated totals leave PostgreSQL; no customer data.
const sql=`begin isolation level repeatable read read only;
set local statement_timeout='120s';
set local timezone='UTC';
set local datestyle='ISO, YMD';
select jsonb_build_object(
 'version',1,
 'accounts',(select jsonb_build_object('count',count(*)::text,'digest',md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by id),''))) from public.accounts t),
 'collections',(select jsonb_build_object('count',count(*)::text,'digest',md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by id),''))) from public.customer_collections t),
 'archive',(select jsonb_build_object('count',count(*)::text,'digest',md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by id),''))) from public.invoice_archive t),
 'ledger',(select coalesce(jsonb_agg(to_jsonb(t) order by account_id,currency),'[]') from (
 select account_id,currency,count(*)::text as count,count(*)filter(where amount is null)::text as invalid_amounts,
 coalesce(sum(debit),0)::text as debit,coalesce(sum(credit),0)::text as credit,coalesce(sum(debit-credit),0)::text as balance
 from public.ledger_entries group by account_id,currency) t),
 'revisions',(select coalesce(jsonb_object_agg(account_id::text,revision::text),'{}') from private.ledger_revisions)
)::text;
commit;`;
export function readFinancialManifest(env=process.env){
 return new Promise((resolve,reject)=>{
  const child=spawn('psql',['--no-psqlrc','--quiet','--tuples-only','--no-align','--set=ON_ERROR_STOP=on'],{env,windowsHide:true,stdio:['pipe','pipe','ignore']});
  let output='',settled=false;
  const finish=(error,value)=>{if(settled)return;settled=true;clearTimeout(timer);error?reject(error):resolve(value);};
  const timer=setTimeout(()=>{child.kill();finish(new Error('Finansal referans okuması zaman aşımına uğradı.'));},130000);
  child.stdout.on('data',chunk=>{output+=chunk.toString();if(output.length>10000000){child.kill();finish(new Error('Finansal referans çıktısı sınırı aşıldı.'));}});
  child.on('error',()=>finish(new Error('psql başlatılamadı.')));
  child.on('close',code=>{if(code!==0)return finish(new Error('Finansal referans okunamadı; bağlantı, roller ve migration 011 kontrol edilmeli.'));try{finish(null,JSON.parse(output.trim()));}catch{finish(new Error('Finansal referans biçimi geçersiz.'));}});
  child.stdin.on('error',()=>{});child.stdin.end(sql);
 });
}
export function canonical(value){if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+canonical(value[key])).join(',')+'}';return JSON.stringify(value);}
