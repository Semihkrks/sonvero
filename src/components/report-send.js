import {showModal} from './modal.js';
import {escapeHtml} from '../lib/html.js';
import {assistantRequest,blobBase64} from '../services/assistant-client.js';
import {prepareCariFile} from '../services/cari-export-worker-client.js';
import {archivedOpening,exportArguments} from '../services/report-data.js';
import {createReportImage} from '../services/report-image.js';
import {getSupabase} from '../lib/supabase.js';
import {stableJson,singleFlight} from '../lib/operations.js';

export async function previewReport({groups,accounts,options,exportSpec,target}){
 ({groups,accounts,options,exportSpec}=structuredClone({groups,accounts,options,exportSpec}));
 if(!groups.length)throw new Error('Gönderilecek müşteri seçilmedi.');
 if(groups.length>6)throw new Error('Tek gönderimde en fazla 6 müşteri seçin.');
 const state=await assistantRequest('/status');
 const content=document.createElement('div');content.className='sv-report-preview';
 content.innerHTML='<p role="status">Excel ve görsel hazırlanıyor…</p>';
 const urls=[];let closed=false,jobTimer;
 const cleanup=()=>{closed=true;clearTimeout(jobTimer);urls.forEach(URL.revokeObjectURL);};
 const modal=target?{close:()=>{cleanup();content.remove();}}:showModal({title:'WhatsApp gönderim önizlemesi',body:content,size:'lg',onClose:cleanup});
 if(target)target.append(content);
 const files=[];
 try{
  const revision=async()=>{const {data,error}=await getSupabase().rpc('ledger_revision',{p_accounts:accounts.map(a=>a.id)});if(error)throw new Error('Rapor verilerinin güncelliği doğrulanamadı. Yeniden deneyin.');return stableJson(data);};
  const before=await revision();
  if(exportSpec){const file=await prepareCariFile(exportSpec.name,exportSpec.args);files.push({name:file.fileName,blob:file.blob});}
  for(const group of groups){
   if(!exportSpec){const spec=exportArguments(group,accounts,options);const file=await prepareCariFile(spec.name,spec.args);files.push({name:file.fileName,blob:file.blob});}
   const opening=await archivedOpening(group,accounts,options);
   const blob=await createReportImage(group,accounts,options,opening);
   files.push({name:`${group.name.replace(/[\\/:*?"<>|]/g,'_').slice(0,80)}_${options.start}_${options.end}.png`,blob});
  }
  if(before!==await revision())throw new Error('Rapor hazırlanırken kayıtlar değişti. Verileri yenileyip tekrar önizleyin.');
  if(closed)return;
  const id=crypto.randomUUID();
  const caption=`${groups.map(g=>g.name).join(', ')} | ${options.start} – ${options.end} | ${options.direction==='both'?'Satış + alış':options.direction==='satis'?'Satış':'Alış'} | Tahsilat ${options.withCollections?'dahil':'hariç'}`;
  const template=exportSpec?.name||exportArguments(groups[0],accounts,options).name;
  const templateLabel={exportCustomerCari:'Cari ekranı',exportAllTransactions:'Seçili Hesaplar',exportMultiAccountCari:'Tüm Hesaplar (satış)'}[template];
  content.innerHTML=`<p><strong>Alıcı:</strong> +${escapeHtml(state.recipient||'Ayarlanmamış')}</p><p>${escapeHtml(caption)}</p><p><strong>Excel şablonu:</strong> ${escapeHtml(templateLabel)}</p><p class="sv-muted">Excel mevcut ekran şablonuyla hazırlanmıştır. Görseldeki devir yalnız arşiv kayıtlarına dayanır.</p><div class="sv-report-files"></div><p role="status" class="sv-send-status"></p><button type="button" class="btn btn-primary sv-confirm-send">Onayla ve WhatsApp’tan gönder</button>`;
  const fileList=content.querySelector('.sv-report-files');
  for(const file of files){const url=URL.createObjectURL(file.blob);urls.push(url);const link=document.createElement('a');link.href=url;link.download=file.name;link.textContent=file.name;fileList.append(link);if(file.blob.type==='image/png'){const img=document.createElement('img');img.src=url;img.alt='Gönderilecek cari hesap özeti';fileList.append(img);}}
  const button=content.querySelector('.sv-confirm-send'),status=content.querySelector('.sv-send-status');
  if(state.connection!=='ready'||!state.recipient){button.disabled=true;status.textContent='Gönderim için Ayarlar sayfasından WhatsApp hesabını bağlayın ve alıcıyı kaydedin.';}
  let payload;
  const track=async(id)=>{if(closed)return;try{const job=await assistantRequest('/jobs/'+id);if(closed)return;if(job.status==='sent'){status.textContent=`${job.sent.length} dosya WhatsApp’a gönderildi.`;button.textContent='Gönderildi ✓';button.disabled=true;return;}if(['failed','unknown'].includes(job.status)){status.textContent=job.error||'Gönderim tamamlanamadı.';button.disabled=false;button.textContent='Eksik dosyaları kontrol et ve gönder';return;}status.textContent=`Dosyalar WhatsApp’a gönderiliyor… ${job.sent.length}/${files.length}`;}catch{status.textContent='Gönderim durumu kontrol edilemiyor. Bağlantı gelince tekrar kontrol edilecek.';}jobTimer=setTimeout(()=>void track(id),3000);};
  button.onclick=()=>singleFlight('assistant-send:'+id,async()=>{
   button.disabled=true;status.textContent='Gönderim kaydediliyor…';
   try{
    const current=await assistantRequest('/status');
    if(current.recipient!==state.recipient)throw new Error('Alıcı numarası değişti. Önizlemeyi kapatıp yeniden açın.');
    payload||={id,recipient:state.recipient,confirmed:true,caption,files:await Promise.all(files.map(async file=>({name:file.name,mime:file.blob.type,base64:await blobBase64(file.blob)})))};
    const job=await assistantRequest('/send',payload);
    status.textContent=job.status==='sent'?'Dosyalar WhatsApp’a gönderildi.':['failed','unknown'].includes(job.status)?(job.error||'Gönderim tamamlanamadı.'):'Gönderim kuyruğa alındı. Sonuç Ayarlar’daki gönderim geçmişinde de görünür.';
    button.textContent=['failed','unknown'].includes(job.status)?'Eksik dosyaları kontrol et ve gönder':'Gönderim kaydedildi';
    button.disabled=['queued','sending','sent'].includes(job.status);
    if(['queued','sending'].includes(job.status))jobTimer=setTimeout(()=>void track(job.id),1500);
   }catch(error){status.textContent=error.message;button.disabled=false;button.textContent='Eksik dosyaları kontrol et ve gönder';}
  });
 }catch(error){if(!closed)content.textContent=error.message;}
 return modal;
}
