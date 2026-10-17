import {getSupabase} from '../lib/supabase.js';
import {matchReportGroups,fold} from './report-data.js';
import {Decimal} from '../lib/money.js';
import {listCollections} from './tahsilat-manager.js';

const PAGE_SIZE=100,MAX_ROWS=10000;
const ARCHIVE_NOTE='Arşivdeki TRY kayıtlarına göre hesaplandı; geçmişin tamlığı doğrulanmamıştır. Dövizli veya tutarı doğrulanamayan kayıtlar toplama dahil değildir.';

function checkPeriod(start,end){
 for(const value of [start,end]){
  if(!value)continue;
  const parsed=new Date(value+'T00:00:00Z');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(parsed.getTime())||parsed.toISOString().slice(0,10)!==value)throw new Error('Geçerli tarih aralığı gerekli.');
 }
 if(start&&end&&start>end)throw new Error('Geçerli tarih aralığı gerekli.');
}
function customerKey(customer){
 const value=typeof customer==='string'?customer:customer?.customer_key||customer?.key||customer?.customer_tax_no||customer?.tax;
 return value?String(value).replace(/^tax:/,''):null;
}
function matchesCustomer(row,customer){
 if(!customer)return true;
 if(typeof customer==='object'&&(customer.account_id||customer.accountId)&&(customer.account_id||customer.accountId)!==row.account_id)return false;
 const key=customerKey(customer);
 if(key){
  // The ledger gives old tax-less collections a name: identity even when their
  // persisted key is a legacy plain name. Match that exact identity, never a
  // fuzzy name or a tax-bearing customer's similar trading name.
  if(key.startsWith('name:')){
   if(String(row.customer_tax_no||'').trim())return false;
   const canonical=value=>String(value).toLowerCase().trim();
   const rowKey=String(row.customer_key||'');
   const identity=rowKey.startsWith('name:')?rowKey:'name:'+String(row.customer_name||'').trim();
   return canonical(identity)===canonical(key);
  }
  return String(row.customer_key||'')===key||String(row.customer_tax_no||'')===key;
 }
 const name=customer.customer_name||customer.name;
 return !!name&&fold(row.customer_name)===fold(name);
}
function decimal(value){
 try{
  if(value==null||String(value).trim()==='')throw new Error();
  const result=new Decimal(String(value));
  if(!result.isFinite())throw new Error();
  return result;
 }catch{throw new Error('Kayıt tutarı doğrulanamadı.');}
}
async function ledgerRpc(name,args){
 const {data,error}=await getSupabase().rpc(name,args);
 if(error)throw new Error('Hesabın kayıtları okunamadı. '+(error.message||''));
 if(!data||!Array.isArray(data.rows))throw new Error('Hesabın kayıtları doğrulanamadı.');
 return data;
}

/** Actual persisted collection identities and versions, never fuzzy mutation candidates. */
export async function findAssistantCollections({accountId,customer=null,start=null,end=null,includeCancelled=false}={}){
 if(!accountId)throw new Error('Tahsilat için hesap gerekli.');
 checkPeriod(start,end);
 const rows=await listCollections({accountId,startDate:start||'',endDate:end||'',includeCancelled});
 return rows.filter(row=>row.account_id===accountId&&matchesCustomer(row,customer)&&
  (!start||row.date>=start)&&(!end||row.date<=end)&&(includeCancelled||!row.cancelled_at))
  .sort((a,b)=>String(b.date).localeCompare(String(a.date))||String(b.created_at||'').localeCompare(String(a.created_at||''))||String(b.id).localeCompare(String(a.id)));
}

/** Last inserted collection, independently of its possibly backdated payment date. */
export async function readLatestAssistantCollection({accountIds,customer=null,start=null,end=null}={}){
 const ids=[...new Set((accountIds||[]).filter(id=>typeof id==='string'&&id))];
 if(!ids.length)throw new Error('Son tahsilat için hesap seçmelisin.');
 if(customer&&!customerKey(customer))throw new Error('Önce hesabın gerçek müşteri kaydını seçmelisin.');
 checkPeriod(start,end);
 const rows=(await Promise.all(ids.map(accountId=>findAssistantCollections({accountId,customer,start,end,includeCancelled:true})))).flat();
 for(const row of rows){
  if(!row.id||!row.created_at||!Number.isFinite(Date.parse(row.created_at)))throw new Error('Tahsilatın eklenme zamanı doğrulanamadı.');
  if(row.currency!=='TRY')throw new Error('Tahsilatın para birimi desteklenmiyor.');
  decimal(row.amount);
 }
 return rows.sort((a,b)=>Date.parse(b.created_at)-Date.parse(a.created_at)||String(b.created_at).localeCompare(String(a.created_at))||String(b.id).localeCompare(String(a.id)))[0]||null;
}

/** Read-only summaries from the same authenticated ledger used by the Cari screens. */
export async function readAssistantSummary({accountIds,metric='net',start=null,end=null,customer=null,limit=5}={}){
 let ids=[...new Set((accountIds||[]).filter(id=>typeof id==='string'&&id))];
 if(!ids.length)throw new Error('Özet için en az bir hesap gerekli.');
 const customerAccount=customer&&typeof customer==='object'&&(customer.account_id||customer.accountId);
 if(customerAccount){
  ids=ids.filter(id=>id===customerAccount);
  if(!ids.length)throw new Error('Müşteri seçili hesaba ait değil.');
 }
 if(customer&&!customerKey(customer))throw new Error('Önce hesabın gerçek müşteri kaydını seçmelisin.');
 if(!['collections','sales','purchases','net','sales_collections','debtors'].includes(metric))throw new Error('Bu özet türü desteklenmiyor.');
 checkPeriod(start,end);
 const totals={sales:new Decimal(0),purchases:new Decimal(0),collections:new Decimal(0),opening:new Decimal(0)};
 let rows=[],excluded=0;
 const lastSync=[];
 if(metric==='collections'){
  for(const accountId of ids){
   const collections=await findAssistantCollections({accountId,customer,start,end});
   for(const row of collections){
    if(row.currency!=='TRY'){excluded++;continue;}
    totals.collections=totals.collections.plus(decimal(row.amount));
    rows.push(row);
   }
  }
 }else if(metric==='debtors'){
  for(let offset=0;;offset+=PAGE_SIZE){
   const data=await ledgerRpc('customer_ledger_page',{p_accounts:ids,p_search:'',p_start:start,p_end:end,p_offset:offset,p_limit:PAGE_SIZE});
   for(const row of data.rows){
    if(!ids.includes(row.account_id)||!matchesCustomer(row,customer))continue;
    excluded+=Number(row.excluded||0);
    if(decimal(row.balance).lte(0))continue;
    rows.push({accountId:row.account_id,name:row.customer_name,tax:row.customer_tax_no||'',key:row.customer_key,balance:decimal(row.balance).toFixed(2)});
   }
   if(offset+PAGE_SIZE>=Number(data.count||0))break;
   if(offset+PAGE_SIZE>=MAX_ROWS)throw new Error('Çok fazla müşteri var. Hesap veya müşteri seçerek daraltabilirsin.');
  }
  rows.sort((a,b)=>decimal(b.balance).comparedTo(a.balance)||a.name.localeCompare(b.name,'tr'));
  // This total covers every positive debtor, even when only the first five are shown.
  totals.opening=rows.reduce((sum,row)=>sum.plus(row.balance),new Decimal(0));
 }else{
  for(const accountId of ids){
   for(let offset=0;;offset+=PAGE_SIZE){
    const data=await ledgerRpc('ledger_page',{p_account_id:accountId,p_search:'',p_start:start,p_end:end,p_customer:customerKey(customer),p_offset:offset,p_limit:PAGE_SIZE});
    if(offset===0){
     totals.opening=totals.opening.plus(decimal(data.opening));
     excluded+=Number(data.excluded||0);
     lastSync.push({accountId,lastSync:data.lastSync||null});
    }
    for(const row of data.rows){
     if(row.account_id!==accountId||!matchesCustomer(row,customer)||row.cancelled_at||row.currency!=='TRY'||!row.date||
      (start&&row.date<start)||(end&&row.date>end))continue;
     decimal(row.amount);
     if(row.source==='collection')totals.collections=totals.collections.plus(decimal(row.credit));
     else if(row.source==='invoice'){
      totals.sales=totals.sales.plus(decimal(row.debit));
      totals.purchases=totals.purchases.plus(decimal(row.credit));
     }else continue;
     rows.push(row);
    }
    if(offset+PAGE_SIZE>=Number(data.totals?.count||0))break;
    if(offset+PAGE_SIZE>=MAX_ROWS)throw new Error('Çok fazla hareket var. Tarih aralığını daraltabilirsin.');
   }
  }
 }
 const net=totals.sales.minus(totals.purchases).minus(totals.collections);
 const resultTotals={...Object.fromEntries(Object.entries(totals).map(([key,value])=>[key,value.toFixed(2)])),net:net.toFixed(2),salesCollections:totals.sales.minus(totals.collections).toFixed(2),balance:totals.opening.plus(net).toFixed(2)};
 const count=rows.length;
 if(metric==='debtors')rows=rows.slice(0,Math.min(50,Math.max(1,Math.trunc(Number(limit)||5))));
 return {metric,accountIds:ids,start,end,currency:'TRY',totals:resultTotals,rows,count,excluded,
  excludedScope:metric==='debtors'||metric==='collections'?'period':'account_history',
  source:metric==='collections'?'customer_collections':'archived_ledger',complete:metric==='collections',
  completeness:{complete:metric==='collections',lastSync,note:metric==='collections'?'Uygulamada kayıtlı, iptal edilmemiş TRY tahsilatları.':ARCHIVE_NOTE}};
}

/** Search only the chosen account's real ledger identities, independently of report dates. */
export async function findAssistantCustomers(accountId,query){
 const rows=[];
 for(let offset=0;offset<10000;offset+=100){
  const {data,error}=await getSupabase().rpc('customer_ledger_page',{p_accounts:[accountId],p_search:'',p_start:null,p_end:null,p_offset:offset,p_limit:100});
  if(error)throw new Error('Hesabın müşteri kayıtları okunamadı. '+(error.message||''));
  rows.push(...(data?.rows||[]).filter(row=>row.account_id===accountId));
  if(offset+100>=Number(data?.count||0))return matchReportGroups(rows.map(row=>({...row,name:row.customer_name,tax:row.customer_tax_no})),query);
 }
 throw new Error('Bu hesapta çok fazla müşteri var. Cari ekranından VKN ile arayabilirsin.');
}
