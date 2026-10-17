import {useEffect,useState} from 'react';
import {getPwaInstallController} from '../lib/pwa-install.js';

export function PwaSettings(){
 const controller=getPwaInstallController();
 const [state,setState]=useState(()=>controller.getState()),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 useEffect(()=>controller.subscribe(setState),[controller]);
 async function install(){
  if(busy)return;setBusy(true);setNotice('');
  try{const result=await controller.install();setNotice(result==='accepted'?'Kurulum kabul edildi. Sonvera ikonundan açabilirsin.':result==='dismissed'?'Kurulum kapatıldı; istediğinde yeniden ekleyebilirsin.':'Bu tarayıcıda aşağıdaki ana ekrana ekleme adımlarını kullan.');}
  catch{setNotice('Kurulum penceresi açılamadı. Tarayıcının ana ekrana ekleme menüsünü kullanabilirsin.');}finally{setBusy(false);}
 }
 return <section className="sv-section" aria-labelledby="pwaSettingsTitle"><div className="sv-section-head"><h2 id="pwaSettingsTitle">Ana ekran uygulaması</h2><span className={'sv-status '+(state.installed?'succeeded':'unknown')}>{state.standalone?'Uygulama modunda':state.installed?'Kurulum kabul edildi':'Tarayıcıda açık'}</span></div>
  <div className="sv-section-body"><div className="sv-pwa-brand"><img src="/icons/sonvera-touch-v2.png" width={56} height={56} alt="Sonvera’nın mavi uygulama ikonu"/><p>Sonvera’yı ana ekrana ekleyerek kendi ikonundan, ayrı bir uygulama penceresinde açabilirsin.</p></div>
   {state.canInstall&&<button className="btn btn-secondary" type="button" disabled={busy} onClick={()=>void install()}>{busy?'Kurulum açılıyor…':'Sonvera’yı yükle'}</button>}
   <details className="sv-pwa-guide"><summary>iPhone ve iPad’de ana ekrana ekleme</summary><ol><li>Safari’de Sonvera’yı aç ve bu sayfanın yüklenmesini bekle.</li><li>Paylaş menüsünden “Ana Ekrana Ekle”yi seç.</li><li>“Web Uygulaması Olarak Aç” seçeneği varsa açık bırak. Önizlemede yukarıdaki mavi Sonvera ikonunu kontrol et.</li><li>Ekledikten sonra Sonvera’yı ana ekrandaki ikonundan aç.</li></ol><p>Eski ikon hâlâ düz “S” ise önce açık formlarını kaydet. Ardından eski ana ekran kısayolunu kaldırıp bu adımlarla yeniden ekleyebilirsin; yeniden giriş gerekebilir.</p></details>
   <details className="sv-pwa-guide"><summary>Mikrofon izni neden tekrar sorulabilir?</summary><p>SonAI’ye dokunduğunda mikrofon açılır; uygulamaya girişte kendiliğinden açılmaz. Açık konuşmada aynı mikrofon bağlantısı tekrar kullanılır.</p><p>iOS, uygulama tamamen kapatılıp açıldığında mikrofon iznini yeniden sorabilir. Bu izin iOS tarafından yönetilir; uygulamanın “izin verildi” bilgisini saklaması bu pencereyi kaldıramaz. Safari’nin Sonvera için site ayarlarında mikrofon seçeneği varsa “İzin Ver” olarak kontrol edebilirsin; ana ekran uygulamasındaki davranış iOS sürümüne bağlıdır.</p></details>
   {notice&&<p role="status">{notice}</p>}
  </div></section>;
}
