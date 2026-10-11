import {clearDocumentBatch,readDocumentBatch,refreshDocumentBatch} from '../services/document-batch.js';
import {showToast} from './toast.js';
const labels={succeeded:'Tamamlandı',unknown:'Sonucu doğrulanıyor',processing:'İşleniyor',failed:'Başarısız','not-started':'Başlatılmadı'};
export function renderBatchResults(page,{accountId,kind,results,total=results.length,onClear}){
 let panel=page.querySelector('#batchResults');
 if(!panel){panel=document.createElement('section');panel.id='batchResults';panel.className='sv-section';panel.setAttribute('aria-live','polite');page.append(panel);}
 panel.replaceChildren();
 const heading=document.createElement('div');heading.className='sv-section-head';
 const title=document.createElement('h3');title.textContent=results.filter(row=>row.status==='succeeded').length+' / '+total+' belge tamamlandı';heading.append(title);
 const refresh=document.createElement('button');refresh.className='btn btn-secondary';refresh.textContent='Durumları kontrol et';
 refresh.onclick=async()=>{refresh.disabled=true;try{const saved=await refreshDocumentBatch(accountId,kind);if(saved&&page.isConnected)renderBatchResults(page,{accountId,kind,results:saved.results,total,onClear});}catch(error){showToast(error.message,'error');}finally{refresh.disabled=false;}};
 heading.append(refresh);panel.append(heading);
 const note=document.createElement('p');note.className='sv-section-body';note.textContent='Başarılı belgeler tekrar işlenmez. Durum kontrolü yeni gönderim yapmaz. Sonucu belirsiz belgeler için aynı bilgilerle devam edin.';panel.append(note);
 for(const result of results){const row=document.createElement('div');row.className='sv-history-row';const info=document.createElement('span'),id=document.createElement('strong'),detail=document.createElement('small'),status=document.createElement('span');id.textContent=result.id;detail.textContent=result.error||result.operationId||'';info.append(id,detail);status.className='sv-status '+result.status;status.textContent=labels[result.status]||result.status;row.append(info,status);panel.append(row);}
 if(!results.some(row=>['unknown','processing'].includes(row.status))){const clear=document.createElement('button');clear.className='btn btn-secondary';clear.textContent='Sonuçları temizle';clear.onclick=()=>{try{clearDocumentBatch(accountId,kind);panel.remove();onClear?.();}catch(error){showToast(error.message,'warning');}};panel.append(clear);}
 return panel;
}
export function restoreBatchResults(page,accountId,kind){const journal=readDocumentBatch(accountId,kind);if(journal)renderBatchResults(page,{accountId,kind,results:journal.results});}
