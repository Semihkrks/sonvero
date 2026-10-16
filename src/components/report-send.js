import {showModal} from './modal.js';
import {escapeHtml} from '../lib/html.js';
import {assistantRequest,blobBase64} from '../services/assistant-client.js';
import {prepareCariFile} from '../services/cari-export-worker-client.js';
import {exportArguments,allCustomersExportArguments} from '../services/report-data.js';
import {createReportImage} from '../services/report-image.js';
import {getSupabase} from '../lib/supabase.js';
import {stableJson,singleFlight} from '../lib/operations.js';
import {formatLabel} from '../lib/assistant-dialogue.js';

export function chooseExportLayout(){
 return new Promise(resolve=>{
  const body=document.createElement('div');body.className='sv-export-choice';
  body.innerHTML='<p>Excel nasıl hazırlansın?</p><label><input type="radio" name="export-layout" value="ayri" checked><span><strong>Hesaplar ayrı</strong><small>Her firma kendi sayfasında</small></span></label><label><input type="radio" name="export-layout" value="tum"><span><strong>Tek sayfa</strong><small>Tüm firmalar aynı sayfada</small></span></label><button class="btn btn-primary" type="button">Önizle</button>';
  const modal=showModal({title:'WhatsApp’a gönder',body,onClose:()=>resolve(null)});
  if(!modal){resolve(null);return;}
  body.querySelector('button').onclick=()=>{resolve(body.querySelector('input:checked').value);modal.close();};
 });
}

export async function previewReport({groups,accounts,options,exportSpec,target,onStatus}){
 ({groups,accounts,options,exportSpec}=structuredClone({groups,accounts,options,exportSpec}));
 if(!groups.length)throw new Error('Gönderilecek müşteri seçilmedi.');
 if(groups.length>6&&!(options.allCustomers&&options.format==='excel'))throw new Error('6’dan fazla müşteriyi tek dosyada hazırlamak için “sadece Excel” de. Fotoğraflı gönderimde en fazla 6 müşteri seçilebilir.');
 if(options.allCustomers&&!exportSpec)exportSpec=allCustomersExportArguments(groups,accounts,options);
 // Preparing/downloading a workbook must not depend on WhatsApp being reachable.
 const state=await assistantRequest('/status').catch(()=>({connection:'error',recipient:''}));
 const content=document.createElement('div');content.className='sv-report-preview';
 const format=options.format||'both',withExcel=format!=='image',withImage=format!=='excel';
 content.innerHTML=`<p role="status">${formatLabel(format)} hazırlanıyor…</p>`;
 const urls=[];let closed=false,jobTimer,sending=false,sendAction,ready=false,submitted=false,deliveryState='preview';
 const report=(status,text)=>{deliveryState=status;if(!closed)onStatus?.({status,text});};
 const cleanup=()=>{closed=true;clearTimeout(jobTimer);urls.forEach(URL.revokeObjectURL);};
 const modal=target?{close:()=>{cleanup();content.remove();}}:showModal({title:'WhatsApp gönderim önizlemesi',body:content,size:'lg',onClose:cleanup});
 if(target)target.append(content);
 const files=[];
 try{
  const revision=async()=>{const {data,error}=await getSupabase().rpc('ledger_revision',{p_accounts:accounts.map(a=>a.id)});if(error)throw new Error('Rapor verilerinin güncelliği doğrulanamadı. Yeniden deneyin.');return stableJson(data);};
  const before=await revision();
  if(withExcel&&exportSpec){const file=await prepareCariFile(exportSpec.name,exportSpec.args);files.push({name:file.fileName,blob:file.blob});}
  for(const group of groups){
   if(withExcel&&!exportSpec){const spec=exportArguments(group,accounts,options);const file=await prepareCariFile(spec.name,spec.args);files.push({name:file.fileName,blob:file.blob});}
   if(withImage){const blob=await createReportImage(group,accounts,options);
    files.push({name:`${group.name.replace(/[\\/:*?"<>|]/g,'_').slice(0,80)}_${options.start}_${options.end}.png`,blob});}
  }
  if(before!==await revision())throw new Error('Rapor hazırlanırken kayıtlar değişti. Verileri yenileyip tekrar önizleyin.');
  if(closed)return;
  const id=crypto.randomUUID();
  const title=options.allCustomers?`${groups.length} müşteri · ${accounts.map(a=>a.name).join(', ')}`:groups.map(g=>g.name).join(', ');
  const caption=`${title} | ${options.start} – ${options.end} | ${options.direction==='both'?'Satış + alış':options.direction==='satis'?'Satış':'Alış'} | Tahsilat ${options.withCollections?'dahil':'hariç'}`;
  content.innerHTML=`<p class="sv-report-customer">${escapeHtml(title)}</p><p class="sv-muted">${escapeHtml(options.start)} – ${escapeHtml(options.end)}</p><div class="sv-report-files"></div><p role="status" class="sv-send-status"></p><button type="button" class="btn btn-primary sv-confirm-send">WhatsApp’a gönder</button>`;
  const fileList=content.querySelector('.sv-report-files');
  for(const file of files){const url=URL.createObjectURL(file.blob);urls.push(url);if(file.blob.type==='image/png'){const img=document.createElement('img');img.src=url;img.alt='Gönderilecek cari hesap özeti';fileList.append(img);}else{const link=document.createElement('a');link.href=url;link.download=file.name;link.textContent='Excel’i incele ↗';fileList.append(link);}}
  const button=content.querySelector('.sv-confirm-send'),status=content.querySelector('.sv-send-status');
  if(state.connection!=='ready'||!state.recipient){button.disabled=true;status.textContent='Gönderim için Ayarlar sayfasından WhatsApp hesabını bağlayın ve alıcıyı kaydedin.';}
  let payload;
  const track=async(id)=>{if(closed)return;try{const job=await assistantRequest('/jobs/'+id);if(closed)return;if(job.status==='sent'){status.textContent=`${job.sent.length} dosya WhatsApp’a gönderildi.`;button.textContent='Gönderildi ✓';button.disabled=true;report('sent',status.textContent);return;}if(['failed','unknown'].includes(job.status)){status.textContent=job.error||'Gönderim tamamlanamadı.';button.disabled=false;sending=false;button.textContent='Eksik dosyaları kontrol et ve gönder';report(job.status,status.textContent);return;}status.textContent=`Dosyalar WhatsApp’a gönderiliyor… ${job.sent.length}/${files.length}`;report('sending',status.textContent);}catch{status.textContent='Gönderim durumu kontrol edilemiyor. Bağlantı gelince tekrar kontrol edilecek.';}jobTimer=setTimeout(()=>void track(id),3000);};
  sendAction=()=>{if(closed||button.disabled)return false;return singleFlight('assistant-send:'+id,async()=>{
   button.disabled=true;sending=true;status.textContent='Gönderim kaydediliyor…';report('sending',status.textContent);
   try{
    const current=await assistantRequest('/status');
    if(closed)return false;
    if(current.recipient!==state.recipient)throw new Error('Alıcı numarası değişti. Önizlemeyi kapatıp yeniden açın.');
    payload||={id,recipient:state.recipient,confirmed:true,caption,files:await Promise.all(files.map(async file=>({name:file.name,mime:file.blob.type,base64:await blobBase64(file.blob)})))};
    if(closed)return false;
    submitted=true;const job=await assistantRequest('/send',payload);
    if(closed)return true;
    status.textContent=job.status==='sent'?'Dosyalar WhatsApp’a gönderildi.':['failed','unknown'].includes(job.status)?(job.error||'Gönderim tamamlanamadı.'):'Gönderim kuyruğa alındı. Sonuç Ayarlar’daki gönderim geçmişinde de görünür.';
    button.textContent=['failed','unknown'].includes(job.status)?'Eksik dosyaları kontrol et ve gönder':'Gönderim kaydedildi';
    button.disabled=['queued','sending','sent'].includes(job.status);
    sending=button.disabled;report(job.status,status.textContent);
    if(['queued','sending'].includes(job.status))jobTimer=setTimeout(()=>void track(job.id),1500);
    return true;
   }catch(error){status.textContent=error.message;button.disabled=false;sending=false;button.textContent='Eksik dosyaları kontrol et ve gönder';report('unknown',error.message);return false;}
  });};
  button.onclick=sendAction;
  ready=true;
 }catch(error){if(!closed){content.textContent=error.message;report('failed',error.message);}}
 return {close:()=>modal?.close(),send:()=>sendAction?.()??false,ready,get sending(){return sending;},get formatLocked(){return submitted;},get status(){return deliveryState;}};
}
