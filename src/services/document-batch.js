import {getActiveAccountId} from './account-manager.js';
import {getSupabase} from '../lib/supabase.js';
import {singleFlight,requireOnline} from '../lib/operations.js';
const journalKey=(accountId,kind)=>'sonvera:draft:batch:'+accountId+':'+kind;
export function readDocumentBatch(accountId,kind){
 try{const saved=JSON.parse(sessionStorage.getItem(journalKey(accountId,kind))||'null');return saved?.accountId===accountId&&saved?.kind===kind&&Array.isArray(saved.results)?saved:null;}catch{return null;}
}
export function listDocumentBatchKinds(accountId){
 const prefix='sonvera:draft:batch:'+accountId+':',kinds=[];
 for(let index=0;index<sessionStorage.length;index++){const key=sessionStorage.key(index);if(key?.startsWith(prefix))kinds.push(key.slice(prefix.length));}
 return kinds;
}
function saveDocumentBatch(journal){try{sessionStorage.setItem(journalKey(journal.accountId,journal.kind),JSON.stringify({...journal,updatedAt:new Date().toISOString()}));}catch{/* The database still protects every write. */}}
export function clearDocumentBatch(accountId,kind){
 const journal=readDocumentBatch(accountId,kind);
 if(journal?.results.some(row=>['unknown','processing'].includes(row.status)))throw new Error('Sonucu belirsiz satırlar varken işlem geçmişi temizlenemez. Önce durumlarını kontrol edin.');
 sessionStorage.removeItem(journalKey(accountId,kind));
}
export async function refreshDocumentBatch(accountId,kind){
 const journal=readDocumentBatch(accountId,kind);if(!journal)return null;
 for(const result of journal.results){
  if(!['unknown','processing'].includes(result.status))continue;
  if(!result.operationId&&!result.requestKey)continue;
  let query=getSupabase().from('operation_receipts').select('id,status,result').eq('account_id',accountId).eq('kind','nilvera');
  query=result.operationId?query.eq('id',result.operationId):query.eq('idempotency_key',result.requestKey);
  const {data,error}=await query.maybeSingle();
  if(error)throw new Error('İşlem durumu okunamadı. Belgeler tekrar gönderilmedi.');
  if(data){result.operationId=data.id;result.status=data.status==='processing'?'unknown':data.status;result.error=data.result?.error||'';}
 }
 saveDocumentBatch(journal);return journal;
}
// Only document identifiers and result metadata are stored; no document bodies or keys.
export function runDocumentBatch({accountId,kind,items,execute,onProgress}){
 return singleFlight('document-batch:'+accountId+':'+kind,async()=>{
  requireOnline();
  const previous=await refreshDocumentBatch(accountId,kind);
  const results=items.map(item=>previous?.results.find(row=>row.id===item.uuid&&row.source===(item.source||''))||{id:item.uuid,source:item.source||'',status:'not-started',error:''});
  const journal={accountId,kind,results};
  const publish=()=>{saveDocumentBatch(journal);onProgress?.(results.map(row=>({...row})));};
  publish();
  for(let index=0;index<items.length;index++){
   const item=items[index],result=results[index];
   if(result.status==='succeeded')continue;
   if(getActiveAccountId()!==accountId||!navigator.onLine){for(const pending of results.slice(index)){if(pending.status==='not-started')pending.error='Firma değişti veya bağlantı kesildi; işlem başlatılmadı.';}publish();break;}
   result.status='unknown';result.error='İşleniyor; kesin sonuç bekleniyor.';publish();
   try{
    const response=await execute(item);
    result.status=response?.success?'succeeded':response?.operationStatus==='unknown'||response?.operationStatus==='processing'||response?.status===202||!response?.status?'unknown':'failed';
    result.error=response?.error||'';result.operationId=response?.operationId||result.operationId;result.requestKey=response?.requestKey||result.requestKey;
   }catch(error){result.status='unknown';result.error=error.message||'Sonuç doğrulanamadı.';}
   publish();
  }
  return results;
 });
}
