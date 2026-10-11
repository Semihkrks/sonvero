import {getSupabase} from '../lib/supabase.js';
import {stableJson} from '../lib/operations.js';
/**
 * @param {{accountIds:string[],name:string,start?:string,end?:string,customerKey?:string|null,search?:string,onProgress?:(n:number)=>void,signal?:AbortSignal}} opts
 */
export async function exportLedger({accountIds,name,start,end,customerKey=null,search='',onProgress,signal}){
 const request=async(fn,args)=>{let query=getSupabase().rpc(fn,args);if(signal)query=query.abortSignal(signal);const {data,error}=await query;if(error)throw new Error(error.message||'Dışa aktarma verisi alınamadı.');return data;};
 const revision=await request('ledger_revision',{p_accounts:accountIds}),rows=[];
 for(let offset=0;;offset+=1000){
  if(signal?.aborted)throw new DOMException('İşlem iptal edildi','AbortError');
  const page=await request('ledger_export_page',{p_accounts:accountIds,p_revision:revision,p_start:start||null,p_end:end||null,p_customer:customerKey,p_offset:offset,p_search:search});
  for(const row of page.rows)rows.push(row);onProgress?.(rows.length);
  if(rows.length>100000)throw new Error('Tek dosyada en fazla 100 bin hareket aktarılabilir. Tarih aralığını daraltın.');
  if(!page.hasMore)break;
 }
 if(!rows.length)throw new Error('Seçilen filtrelerde aktarılacak TL hareketi yok.');
 const finalRevision=await request('ledger_revision',{p_accounts:accountIds});
 if(stableJson(finalRevision)!==stableJson(revision))throw new Error('Kayıtlar dışa aktarma sırasında değişti. Yeniden deneyin.');
 if(signal?.aborted)throw new DOMException('İşlem iptal edildi','AbortError');
 const {exportLedgerRows}=await import('./cari-export-worker-client.js');
 return exportLedgerRows(rows,{name,dateRange:{start,end}},{signal});
}
