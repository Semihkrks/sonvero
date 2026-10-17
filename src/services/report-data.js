import {Decimal} from '../lib/money.js';
import {invoiceLedgerAmount} from '../lib/ledger-finance.js';
import {getSupabase} from '../lib/supabase.js';
import {fetchInvoicesSmart} from './invoice-archive.js';
import {listCollections} from './tahsilat-manager.js';
import {EInvoiceWithAccount,EArchiveWithAccount} from '../api/nilvera.js';
import {forEachLimited} from '../lib/concurrency.js';

export const fold=value=>String(value||'').toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i').trim();
export function matchReportGroups(groups,query,{accountIds}={}){
 const key=fold(query).replace(/[^a-z0-9]/g,'');if(!key)return [];
 const scoped=accountIds?groups.map(g=>({...g,rows:(g.rows||[]).filter(row=>accountIds.includes(row.accountId))})).filter(g=>g.rows.length):groups;
 // Rebuild names after scoping: one tax identity can have different trading names across accounts.
 const candidates=accountIds?scoped.map(g=>({...g,name:g.rows[0].name||g.name})):scoped;
 if(/^\d+$/.test(key))return candidates.filter(g=>String(g.tax||'')===key);
 const nameKey=g=>fold(g.name).replace(/[^a-z0-9]/g,'');
 const exact=candidates.filter(g=>nameKey(g)===key);
 return exact.length?exact:candidates.filter(g=>nameKey(g).includes(key));
}
export function normalizeReportItem(item,account){
 const raw=item.raw||item;
 const collection=item._isCollection===true||item._type==='tahsilat';
 const purchase=raw._direction==='gelen'||item._direction==='gelen';
 const name=collection?raw.customer_name:purchase?(raw.SenderName||raw.senderName||raw.SupplierName||raw.SenderInfo?.Name):(raw.ReceiverName||raw.receiverName||raw.CustomerName||raw.customerName||raw.CustomerInfo?.Name||raw.ReceiverInfo?.Name);
 const tax=collection?raw.customer_tax_no:purchase?(raw.SenderTaxNumber||raw.senderTaxNumber||raw.TaxNumber||raw.taxNumber||raw.SenderInfo?.TaxNumber):(raw.ReceiverTaxNumber||raw.receiverTaxNumber||raw.TaxNumber||raw.taxNumber||raw.CustomerInfo?.TaxNumber||raw.ReceiverInfo?.TaxNumber);
 const amount=collection?new Decimal(raw.amount||0).toFixed(2):invoiceLedgerAmount(raw);
 if(amount===null)return null;
 return {raw:{...raw,...(collection?{_type:'tahsilat'}:{}),_accountId:item._accountId||account?.id,_accountName:item._accountName||account?.name,_accountColor:item._accountColor||account?.color},
  name:name||'Bilinmeyen',tax:tax&&tax!=='—'?String(tax):'',amount,
  kind:collection?'tahsilat':purchase?'alis':'satis',
  date:String(collection?raw.date:raw.IssueDate||raw.issueDate||raw.CreateDate||raw.CreatedDate||'').slice(0,10),
  accountId:item._accountId||account?.id,accountName:item._accountName||account?.name||'Hesap'};
}
export function groupReportItems(items,accounts){
 const rows=items.flatMap(item=>{
  const id=item._accountId||item.raw?._accountId;
  const account=id?accounts.find(a=>a.id===id):accounts.length===1?accounts[0]:null;
  if(!account)return [];
  const row=normalizeReportItem({...item,_accountId:account.id},account);
  return row?[row]:[];
 });
 const groups=new Map(),identities=new Map();
 for(const row of rows){if(!row.tax)continue;const key=row.accountId+':'+fold(row.name);if(!identities.has(key))identities.set(key,new Set());identities.get(key).add(row.tax);}
 for(const row of rows){
  // Resolve a tax-less collection only when exactly one tax identity matches within its account.
  const matches=row.tax?[]:[...(identities.get(row.accountId+':'+fold(row.name))||[])];
  const tax=row.tax||(matches.length===1?matches[0]:'');
  const key=tax?'tax:'+tax:'name:'+row.accountId+':'+fold(row.name);
  if(!groups.has(key))groups.set(key,{key,name:row.name,tax,rows:[]});
  groups.get(key).rows.push(row);
 }
 return [...groups.values()];
}
export function summarizeRows(rows){
 const totals={satis:new Decimal(0),alis:new Decimal(0),tahsilat:new Decimal(0)};
 for(const row of rows)totals[row.kind]=totals[row.kind].plus(row.amount);
 return {...Object.fromEntries(Object.entries(totals).map(([k,v])=>[k,v.toFixed(2)])),net:totals.satis.minus(totals.alis).minus(totals.tahsilat).toFixed(2)};
}
export async function archivedOpening(group,accounts,period){
 // The existing ledger contains archived records, not a guaranteed full trading history.
 // Never silently turn a failed query or ambiguous identity into a zero opening balance.
 if(!period.start)return {value:null,note:'Devir için başlangıç tarihi gerekli.'};
 try{
  let opening=new Decimal(0),matched=0;
  const ids=accounts.map(a=>a.id);
  for(let offset=0;;offset+=100){
   const {data,error}=await getSupabase().rpc('customer_ledger_page',{p_accounts:ids,p_search:group.tax||group.name,p_start:period.start,p_end:period.end,p_offset:offset,p_limit:100});
   if(error)throw error;
   for(const row of data.rows||[]){
    if(group.tax?String(row.customer_tax_no)!==group.tax:fold(row.customer_name)!==fold(group.name))continue;
    opening=opening.plus(row.opening||0);matched++;
   }
   if(offset+100>=Number(data.count||0))break;
   if(offset>=9900)throw new Error('Çok fazla kayıt');
  }
  return matched?{value:opening.toFixed(2),note:'Devir arşivdeki tüm yön ve tahsilat kayıtlarına göredir; geçmişin tamlığı doğrulanmamıştır.'}:{value:null,note:'Bu müşteri için geçmiş bakiye doğrulanamadı.'};
 }catch{return {value:null,note:'Devir bilgisi alınamadı; dönem neti genel borç değildir.'};}
}
function invoiceUuid(row){return String(row?.UUID||row?.uuid||row?.InvoiceUUID||row?.invoiceUuid||row?.Id||row?.id||'').trim();}
function issueDate(row){return String(row?.IssueDate||row?.issueDate||row?.CreateDate||row?.CreatedDate||'').slice(0,10);}
export async function scanReport({accounts,start,end,direction,withCollections,onProgress}){
 if(!accounts.length)throw new Error('En az bir hesap seçin.');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(start)||!/^\d{4}-\d{2}-\d{2}$/.test(end)||start>end)throw new Error('Geçerli tarih aralığı seçin.');
 const items=[],failures=[];let done=0;
 await forEachLimited(accounts,3,async account=>{
  try{
  const params={StartDate:start,EndDate:end};const tasks=[];
  const invoices=async(api,type)=>{const stats={failed:false};const rows=await fetchInvoicesSmart(api,account,type,params,{stats});if(stats.failed)throw new Error('Fatura kaynağı eksik yanıt verdi.');return rows;};
  if(direction!=='alis'){
   tasks.push(invoices(EInvoiceWithAccount.listSales,'efatura_sale').then(rows=>rows.map(r=>({...r,_type:'efatura',_direction:'giden'}))));
   tasks.push(invoices(EArchiveWithAccount.listInvoices,'earsiv').then(rows=>rows.map(r=>({...r,_type:'earsiv',_direction:'giden'}))));
  }
  if(direction!=='satis')tasks.push(invoices(EInvoiceWithAccount.listPurchases,'efatura_purchase').then(rows=>rows.map(r=>({...r,_type:'alis',_direction:'gelen'}))));
  if(withCollections)tasks.push(listCollections({accountId:account.id,startDate:start,endDate:end}).then(rows=>rows.map(r=>({...r,_type:'tahsilat'}))));
  const result=await Promise.allSettled(tasks);
  if(result.some(r=>r.status==='rejected'))throw new Error(`${account.name} verileri eksik. Gönderim için tüm kaynakların yüklenmesi gerekiyor.`);
  const seen=new Set();
  for(const r of result)for(const row of r.value){
   if(row._type!=='tahsilat'){
    const date=issueDate(row);if(date&&(date<start||date>end))continue;
    if(invoiceLedgerAmount(row)===null)continue;
    const uuid=invoiceUuid(row);if(uuid){const key=account.id+':'+uuid;if(seen.has(key))continue;seen.add(key);}
   }
   items.push({...row,_accountId:account.id,_accountName:account.name,_accountColor:account.color});
  }
  }catch(error){failures.push(error.message||`${account.name} yüklenemedi.`);}
  onProgress?.(++done,accounts.length);
 });
 if(failures.length)throw new Error(failures.join(' '));
 return groupReportItems(items,accounts);
}
export function exportArguments(group,accounts,options){
 const items=group.rows.map(r=>r.raw),period={start:options.start,end:options.end};
 if(options.scope==='cari'){
  const movements=group.rows.map(r=>({_isCollection:r.kind==='tahsilat',date:r.date,type:r.kind==='satis'?'Satış Faturası':r.kind==='alis'?'Alım Faturası':'Tahsilat',amount:Number(r.amount),borc:r.kind==='satis'?Number(r.amount):0,alacak:r.kind==='satis'?0:Number(r.amount),raw:r.raw,description:r.raw.InvoiceNumber||r.raw.description||group.name}));
  return {name:'exportCustomerCari',args:[movements,group.name,options.direction==='satis'?'giden':options.direction==='alis'?'gelen':'tumu',{dateRange:period}]};
 }
 if(options.scope==='all'&&options.direction==='satis'){
  const breakdown={};
  for(const a of accounts){const rows=group.rows.filter(r=>r.accountId===a.id),totals=summarizeRows(rows);breakdown[a.id]={name:a.name,color:a.color,invoiceCount:rows.filter(r=>r.kind!=='tahsilat').length,totalAmount:Number(totals.satis),totalTahsilat:Number(totals.tahsilat)};}
  return {name:'exportMultiAccountCari',args:[items,group.name,breakdown,{dateRange:period}]};
 }
 return {name:'exportAllTransactions',args:[items,accounts,{name:group.name,layout:options.layout==='separate'?'ayri':'tum',direction:options.direction,withTahsilat:options.withCollections,dateRange:period}]};
}
/** One workbook for every matched customer; reuse the screen's summary/detail sheets. */
export function allCustomersExportArguments(groups,accounts,options){
 return {name:'exportAllTransactions',args:[groups.flatMap(group=>group.rows.map(row=>row.raw)),accounts,{
  name:(accounts.length===1?accounts[0].name+' — ':'')+'Tüm Müşteriler',
  layout:options.layout==='separate'?'ayri':'tum',direction:options.direction,withTahsilat:options.withCollections,
  dateRange:{start:options.start,end:options.end},
 }]};
}
