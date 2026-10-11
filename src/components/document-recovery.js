import {getSupabase} from '../lib/supabase.js';
import {getActiveAccountId} from '../services/account-manager.js';
import {showToast} from './toast.js';
/** Keep the same form locked until the server has a definitive result. Never resubmit from this panel. */
export function documentRecovery({page,recoveryKey,accountId,onSuccess}){
 const key=recoveryKey+':operation';let pending=null,busy=false;const disabled=new Map();
 try{const value=JSON.parse(sessionStorage.getItem(key)||'null');if(value?.accountId===accountId&&typeof value.requestKey==='string')pending=value;}catch{}
 const panel=document.createElement('section');panel.className='sv-section sv-recovery';panel.hidden=true;panel.setAttribute('aria-live','polite');
 const heading=document.createElement('h2');heading.textContent='İşlem sonucu doğrulanıyor';
 const detail=document.createElement('p'),button=document.createElement('button');button.type='button';button.className='btn btn-secondary';button.textContent='Sonucu kontrol et';
 panel.append(heading,detail,button);page.prepend(panel);
 function paint(){
  panel.hidden=!pending;
  for(const element of page.querySelectorAll('input,select,textarea,button')){
   if(panel.contains(element))continue;
   if(pending){if(!disabled.has(element))disabled.set(element,element.disabled);element.disabled=true;}
   else if(disabled.has(element)){element.disabled=disabled.get(element);disabled.delete(element);}
  }
  if(pending)detail.textContent='Formunuz korunuyor. Bu kontrol faturayı yeniden göndermez. İşlem anahtarı: '+pending.requestKey;
 }
 function clear(){pending=null;sessionStorage.removeItem(key);paint();}
 button.addEventListener('click',async()=>{
  if(busy||!pending)return;busy=true;button.disabled=true;button.textContent='Kontrol ediliyor…';
  const current=pending;
  try{
   const {data,error}=await getSupabase().from('operation_receipts').select('id,status').eq('account_id',accountId).eq('kind','nilvera').eq('idempotency_key',current.requestKey).maybeSingle();
   if(error)throw new Error('İşlem durumu alınamadı. Oturum ve bağlantınızı kontrol edin.');
   if(!page.isConnected||getActiveAccountId()!==accountId)return;
   if(data?.status==='succeeded'){const destination=current.destination;clear();sessionStorage.removeItem(recoveryKey);onSuccess(destination);}
   else if(data?.status==='failed'){clear();showToast('Önceki işlem kesin hata ile sonuçlandı. Bilgileri kontrol ederek yeniden deneyebilirsiniz.','warning');}
   else if(data)detail.textContent='Sunucu henüz kesin sonucu doğrulamadı. Ayarlar ekranından da takip edebilirsiniz.';
   else{
    detail.textContent='İşlem kaydı bulunamadı. İstek sunucuya ulaşmamış olabilir. Formu kilidi açmadan önce aynı belgeyi yeniden göndermeyin.';
    release.hidden=false;
   }
  }catch(error){detail.textContent=error.message||'Durum sorgulanamadı.';}
  finally{busy=false;button.disabled=false;button.textContent='Sonucu kontrol et';}
 });
 const release=document.createElement('button');release.type='button';release.className='btn btn-secondary';release.hidden=true;release.textContent='Kaydı bulamadım, formu aç';
 release.addEventListener('click',()=>{if(!pending||busy)return;if(!confirm('İşlem kaydı yoksa belge gönderilmemiş olabilir. Formu açmak aynı belgeyi yeniden göndermenize izin verir. Devam edilsin mi?'))return;clear();release.hidden=true;showToast('Form kilidi açıldı. Sonucu doğrulamadan aynı belgeyi yeniden göndermeyin.','warning');});
 panel.append(release);
 return {
  get blocked(){return !!pending;},
  track({key:requestKey},destination){
   const next={accountId,requestKey,destination};
   // A persistence failure stops the request before it reaches the provider.
   sessionStorage.setItem(key,JSON.stringify(next));pending=next;release.hidden=true;
  },
  settle(result){
   const definite=result?.success||result?.operationStatus==='failed'||(!['unknown','processing'].includes(result?.operationStatus)&&result?.status>=400&&result?.status<500&&result?.status!==408);
   if(definite)clear();
  },
  refresh:paint
 };
}
