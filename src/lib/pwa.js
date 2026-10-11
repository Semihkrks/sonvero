import { hasPendingMutation } from './operations.js';
export function startPwa() {
  const updateOnline = () => {
    let banner = document.getElementById('connection-banner');
    if (!navigator.onLine && !banner) {
      banner = document.createElement('div'); banner.id = 'connection-banner'; banner.className = 'connection-banner';
      banner.setAttribute('role','status'); banner.textContent = 'Çevrimdışısınız. Yeni kayıtlar bağlantı geldiğinde gönderilebilir.'; document.body.append(banner);
    } else if (navigator.onLine) banner?.remove();
  };
  window.addEventListener('online',updateOnline); window.addEventListener('offline',updateOnline); updateOnline();
  let dirty = false;
  let reloadApproved = false;
  const hadController = !!navigator.serviceWorker?.controller;
  document.addEventListener('input', () => { dirty = true; }, { capture: true });
  window.addEventListener('sonvera:update-required',()=>{
    if(document.getElementById('client-update-required'))return;
    const box=document.createElement('div');box.id='client-update-required';box.className='app-update';box.setAttribute('role','alert');
    const text=document.createElement('span');text.textContent='Bu sürüm artık işlem yapamıyor. Kaydedilmemiş formunuz varsa koruyup Sonvera’yı güncelleyin.';
    const button=document.createElement('button');button.className='btn btn-primary';button.textContent='Güncellemeyi yükle';
    button.onclick=async()=>{
      if(hasPendingMutation()){text.textContent='Devam eden işlemin bitmesini bekleyin; ardından güncelleyin.';return;}
      if(dirty&&!confirm('Kaydedilmemiş formunuz olabilir. Fatura ve tahsilat formları bu sekmede korunur. Diğer kaydedilmemiş bilgileri kontrol ettiniz mi?'))return;
      button.disabled=true;
      try{
        const registration=await navigator.serviceWorker?.getRegistration();
        if(registration){
          await registration.update();
          const installing=registration.installing;
          if(installing&&installing.state!=='installed')await new Promise((resolve,reject)=>{
            const timer=setTimeout(()=>{installing.removeEventListener('statechange',changed);reject(new Error('Güncelleme henüz hazır değil. Biraz sonra yeniden deneyin.'));},20000);
            function changed(){if(['installed','redundant'].includes(installing.state)){clearTimeout(timer);installing.removeEventListener('statechange',changed);resolve();}}
            installing.addEventListener('statechange',changed);changed();
          });
          reloadApproved=true;
          if(registration.waiting){registration.waiting.postMessage({type:'ACTIVATE_UPDATE'});return;}
        }
        location.reload();
      }catch(error){text.textContent=error.message||'Güncelleme alınamadı; bağlantınızı kontrol edin.';button.disabled=false;}
    };
    box.append(text,button);document.body.append(box);
  });
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return;
  navigator.serviceWorker.register('/sw.js').then(reg => {
    const offerUpdate = () => {
      if (!reg.waiting || document.getElementById('app-update')) return;
      const box = document.createElement('div'); box.id='app-update'; box.className='app-update'; box.setAttribute('role','status');
      const text = document.createElement('span'); text.textContent='Sonvera’nın yeni sürümü hazır.';
      const button = document.createElement('button'); button.className='btn btn-primary'; button.textContent='Güncelle';
      button.onclick = () => {
        if (hasPendingMutation()) { text.textContent='Önce devam eden işlemin bitmesini bekleyin.'; return; }
        if (dirty && !confirm('Kaydedilmemiş alanlar olabilir. Yeni sürüme geçilsin mi?')) return;
        reloadApproved = true;
        if (reg.waiting) reg.waiting.postMessage({ type:'ACTIVATE_UPDATE' });
        else location.reload();
      };
      box.append(text,button); document.body.append(box);
    };
    offerUpdate();
    reg.addEventListener('updatefound',()=>reg.installing?.addEventListener('statechange',offerUpdate));
  }).catch(()=>{ /* Application remains usable without PWA installation. */ });
  navigator.serviceWorker.addEventListener('controllerchange',()=>{
    if (!hadController) return;
    if (reloadApproved || (!dirty && !hasPendingMutation())) { location.reload(); return; }
    const box=document.createElement('div'); box.className='app-update'; box.setAttribute('role','status');
    box.textContent='Yeni sürüm başka bir sekmede açıldı. Bu formu tamamlayıp sayfayı yenileyebilirsiniz.';
    document.body.append(box);
  });
}
