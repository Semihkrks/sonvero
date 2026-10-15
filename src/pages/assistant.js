import {assistantRequest,blobBase64} from '../services/assistant-client.js';
import {listAccounts} from '../services/account-manager.js';
import {escapeHtml} from '../lib/html.js';
import {scanReport,fold,summarizeRows} from '../services/report-data.js';
import {previewReport} from '../components/report-send.js';
import {assistantContext} from '../services/assistant-context.js';
import {parseQuickIntent,nextQuestion,monthRange} from '../lib/assistant-intent.js';

const statusLabel={disconnected:'WhatsApp bağlı değil',connecting:'WhatsApp bağlanıyor…',qr:'QR kodunu okutun',authenticated:'Hesap bağlandı, hazırlanıyor…',syncing:'WhatsApp eşitleniyor…',ready:'WhatsApp hazır · Gönderim yapılabilir',auth_failure:'Yeniden bağlantı gerekli',error:'Bağlantı kurulamadı'};
export async function mountAssistant({context=assistantContext(),compact=false}={}){
 const accounts=await listAccounts();const page=document.createElement('div');page.className='sv-assistant';
 let disposed=false,recognition=null,recording=null,stream=null,recordTimer,silenceTimer,dictateTimer,timer,refreshBusy=false,scanVersion=0,groups=[],snapshot=null,heard=false,heardText='';
 const typeTimers=new Set(),conversation=[];let awaiting=null,draft={layout:'single'},busy=false,preview=null;
 page.classList.add('sv-chat-app');if(compact)page.classList.add('sv-chat-compact');
 page.innerHTML=`<div class="sv-chat-heading"><div><span class="sv-eyebrow">ASİSTAN</span><h2>Ne hazırlayalım?</h2></div><button class="btn btn-sm" id="assistantReset" type="button">Yeni sohbet</button></div>
 <div class="sv-chat-status"><span class="sv-connection-dot"></span><span id="assistantStatusBadge" role="status">Bağlantı kontrol ediliyor…</span><a href="#/settings">Ayarlar</a></div>
 <div id="assistantMessages" class="sv-chat-log" role="log" aria-label="Asistan konuşması" aria-live="polite"></div>
 <div id="assistantResults"></div><div id="assistantChoices" class="sv-chat-choices"></div>
 <details class="sv-chat-filters"><summary id="assistantSummary">Rapor seçimleri</summary> <form id="assistantFilters"><div class="sv-assistant-fields">
 <label>Rapor kapsamı<select name="scope" required><option value="">Seçin</option><option value="cari">Cari ekranı (tek hesap)</option><option value="selected">Seçili Hesaplar</option><option value="all">Tüm hesaplarda ara</option></select></label>
 <label>Müşteri adı / VKN<input name="customer" required placeholder="Müşteri ara"></label>
 <label>Başlangıç<input name="start" type="date" required></label><label>Bitiş<input name="end" type="date" required></label>
 <label>İşlem yönü<select name="direction" required><option value="">Satış mı, alış mı?</option><option value="satis">Satış</option><option value="alis">Alış</option><option value="both">Her ikisi</option></select></label>
 <label>Tahsilatlar<select name="collections" required><option value="">Dahil edilsin mi?</option><option value="yes">Dahil</option><option value="no">Hariç</option></select></label>
 <label>Excel düzeni<select name="layout"><option value="single">Tek sayfa</option><option value="separate">Hesaplar ayrı</option></select></label>
 </div><fieldset><legend>Raporun alınacağı hesaplar</legend><div class="sv-assistant-accounts">${accounts.map(a=>`<label><input type="checkbox" name="account" value="${escapeHtml(a.id)}"> ${escapeHtml(a.name)}</label>`).join('')||'<p>Önce hesap ekleyin.</p>'}</div></fieldset>
 <button class="btn btn-primary" type="submit" id="assistantScan">Müşteriyi bul ve raporu hazırla</button></form>
</details>
 <div class="sv-chat-composer"><label class="sr-only" for="assistantCommand">Asistana mesajın</label><textarea id="assistantCommand" rows="2" maxlength="2500" placeholder="Konuş veya yaz. Örn. seçili hesaplarda eylül Harmanda"></textarea><div class="sv-composer-actions"><button class="sv-mic-button" id="assistantMic" type="button" aria-pressed="false"><span class="sv-mic-label">Konuş</span></button><span id="assistantReply" role="status"></span><button class="btn btn-primary" id="assistantInterpret" type="button">Gönder</button></div></div>`;
 const $=selector=>page.querySelector(selector),form=$('#assistantFilters'),reply=$('#assistantReply');
 const field=name=>form.elements.namedItem(name);
 function setMic(listening){const button=$('#assistantMic');button.setAttribute('aria-pressed',String(listening));button.querySelector('.sv-mic-label').textContent=listening?'Dinleniyor':'Konuş';}
 function dictate(target){heardText=target;clearTimeout(dictateTimer);const step=()=>{const box=$('#assistantCommand');if(!box||box.value===heardText)return;if(!heardText.startsWith(box.value)){box.value=heardText;return;}const word=heardText.slice(box.value.length).match(/^\s*\S+/)?.[0];if(!word){box.value=heardText;return;}box.value+=word;if(box.value!==heardText)dictateTimer=setTimeout(step,42);};step();}
 function message(text,role='assistant',{instant=false}={}){
  const node=document.createElement('div');node.className='sv-chat-message sv-chat-'+role;$('#assistantMessages').append(node);conversation.push({role,text});if(conversation.length>16)conversation.shift();
  const done=()=>requestAnimationFrame(()=>{if(node.isConnected)node.scrollIntoView({block:'nearest',behavior:'smooth'});});
  const reduce=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if(role!=='assistant'||instant||reduce){node.textContent=text;done();return node;}
  const parts=text.split(/(\s+)/);let index=0;
  const tick=()=>{if(disposed||!node.isConnected){node.textContent=text;return;}index+=1;node.textContent=parts.slice(0,index).join('');if(index<parts.length){const timerId=setTimeout(tick,28);typeTimers.add(timerId);}else done();};
  tick();return node;
 }
 function setBusy(value,label=''){busy=value;$('#assistantInterpret').disabled=value;$('#assistantScan').disabled=value;$('#assistantMic').disabled=value;form.querySelectorAll('input,select').forEach(n=>n.disabled=value);if(!value&&draft.scope==='all')form.querySelectorAll('[name=account]').forEach(n=>n.disabled=true);reply.textContent=label;}
 function invalidate(){scanVersion++;groups=[];snapshot=null;preview?.close();preview=null;$('#assistantResults').replaceChildren();}
 function sync(){for(const key of ['scope','customer','start','end','direction','layout'])field(key).value=draft[key]||'';field('collections').value=typeof draft.withCollections==='boolean'?(draft.withCollections?'yes':'no'):'';form.querySelectorAll('[name=account]').forEach(cb=>{cb.checked=draft.scope==='all'||(draft.accountIds||[]).includes(cb.value);cb.disabled=draft.scope==='all';});$('#assistantSummary').textContent=[{selected:'Seçili Hesaplar',all:'Tüm Hesaplar',cari:'Cari'}[draft.scope],draft.customer,draft.start&&`${draft.start} → ${draft.end}`].filter(Boolean).join(' · ')||'Rapor seçimleri';}
 function merge(intent){
  if(intent.scope&&intent.scope!==draft.scope){draft.scope=intent.scope;if(intent.scope==='selected'&&context.selected?.accountIds)Object.assign(draft,{accountIds:context.selected.accountIds,direction:context.selected.direction,withCollections:context.selected.withCollections});if(intent.scope==='cari')draft.accountIds=context.activeAccountId?[context.activeAccountId]:[];}
  for(const [key,value] of Object.entries(intent))if(value!==null&&value!==undefined&&key!=='account')draft[key]=value;
  if(intent.account){const exact=accounts.filter(a=>fold(a.name)===fold(intent.account));const matches=exact.length?exact:accounts.filter(a=>fold(a.name).includes(fold(intent.account)));draft.accountIds=matches.length===1?[matches[0].id]:[];if(!draft.scope)draft.scope='cari';}
  if(intent.start&&!intent.year)draft.year=Number(intent.start.slice(0,4));
  if(intent.month){draft.start=null;draft.end=null;Object.assign(draft,monthRange(draft.month,draft.year));}
  if(intent.year&&draft.month)Object.assign(draft,monthRange(draft.month,draft.year));
  if(draft.start){draft.year=Number(draft.start.slice(0,4));draft.month=Number(draft.start.slice(5,7));}sync();
 }
 async function advance(){
  const choices=$('#assistantChoices');choices.replaceChildren();const question=nextQuestion(draft);awaiting=question?.key||null;
  if(!question){await form.onsubmit({preventDefault(){}});return;}
  message(question.text);let options=question.choices||[];
  if(question.key==='period'&&draft.month)options=[new Date().getFullYear(),new Date().getFullYear()-1].map(year=>[String(year),{year}]);
  if(question.key==='accounts'){
   for(const a of accounts){const b=document.createElement('button');b.type='button';b.className='sv-choice';b.textContent=a.name;b.setAttribute('aria-pressed',String((draft.accountIds||[]).includes(a.id)));b.onclick=()=>{if(busy)return;const ids=new Set(draft.accountIds||[]);ids.has(a.id)?ids.delete(a.id):ids.add(a.id);draft.accountIds=[...ids];sync();b.setAttribute('aria-pressed',String(ids.has(a.id)));};choices.append(b);}
   options=[['Seçtiğim hesaplarla devam',{}],['Tüm hesapları seç',{accountIds:accounts.map(a=>a.id)}]];
  }
  for(const [label,value] of options){const b=document.createElement('button');b.className='sv-choice';b.type='button';b.textContent=label;b.onclick=()=>{if(busy)return;message(label,'user',{instant:true});invalidate();merge(value);void advance();};choices.append(b);}
 }
 form.addEventListener('input',()=>{if(!busy)invalidate();});
 form.addEventListener('change',()=>{if(busy)return;draft={...draft,...Object.fromEntries(['scope','customer','start','end','direction','layout'].map(k=>[k,field(k).value])),withCollections:field('collections').value?field('collections').value==='yes':undefined,accountIds:[...form.querySelectorAll('[name=account]:checked')].map(n=>n.value)};sync();});
 function releaseRecognition(send){const current=recognition;if(!current)return;current._send=send;recognition=null;clearTimeout(silenceTimer);setMic(false);current.stop();}
 async function interpret(audio,{voice=false}={}){
  if(audio instanceof Event)audio=undefined;releaseRecognition(false);clearTimeout(dictateTimer);if(heardText&&($('#assistantCommand').value===''||heardText.startsWith($('#assistantCommand').value)))$('#assistantCommand').value=heardText;heardText='';if(busy)return;
  const spoken=voice||heard;heard=false;const text=$('#assistantCommand').value.trim();if(!text&&!audio)return;invalidate();const version=scanVersion;setBusy(true,'Anlıyorum…');if(text)message(text,'user',{instant:true});$('#assistantCommand').value='';
  try{
   const quick=parseQuickIntent(text,{awaiting,accounts,draft});let intent=quick.intent;
   if(spoken||!quick.handled||audio){
    try{
     const result=await assistantRequest('/interpret',{text,context:{draft,awaiting,accounts:accounts.map(a=>({id:a.id,name:a.name})),route:context.route,conversation:conversation.slice(-8)},...(audio?{audio}:{})});
     if(disposed||version!==scanVersion)return;if(result.transcript&&result.transcript.trim()&&result.transcript.trim()!==text)message(result.transcript,'user',{instant:true});
     const understood=Object.values(result.intent).some(v=>v!==null&&v!==undefined);
     if(understood)intent=result.intent;else if(!Object.keys(quick.intent).length){message('Cari rapor hazırlayabilir, hesapları tarayabilir, Excel ve görseli WhatsApp’a gönderebilirim. Müşteriyi, hesapları ve dönemi söyleyerek başlayabilirsin.');return;}
    }catch(error){if(!Object.keys(quick.intent).length)throw error;}
   }
   if(disposed||version!==scanVersion)return;merge(intent);setBusy(false);await advance();
  }catch(error){if(!disposed&&version===scanVersion)message(error.message,'assistant',{instant:true});}finally{if(!disposed&&version===scanVersion)setBusy(false);}
 }
 $('#assistantInterpret').onclick=interpret;
 $('#assistantCommand').onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();void interpret();}};
 function reset(){invalidate();conversation.length=0;draft={layout:'single'};heard=false;heardText='';clearTimeout(dictateTimer);if(context.scope)merge(context);sync();$('#assistantMessages').replaceChildren();$('#assistantChoices').replaceChildren();$('#assistantCommand').value='';awaiting=null;setBusy(false);message('Merhaba! Hesaplarını ve rapor ekranlarını kullanarak carini hazırlayabilirim. Ne hazırlayalım?'+(context.scope?' Açık ekrandaki hesap ve filtre seçimlerini aldım.':''));}
 $('#assistantReset').onclick=()=>{if(recognition)recognition._send=false;releaseRecognition(false);recording?.stop();reset();};
 const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
 $('#assistantMic').onclick=async()=>{
  if(busy)return;
  if(recognition){recognition.stop();return;}
  if(recording){recording.stop();return;}
  if(!SpeechRecognition){
   if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){reply.textContent='Bu tarayıcıda mikrofon desteklenmiyor; komutunu yazabilirsin.';return;}
   try{
    $('#assistantMic').disabled=true;stream=await navigator.mediaDevices.getUserMedia({audio:true});$('#assistantMic').disabled=false;if(disposed){stream.getTracks().forEach(t=>t.stop());return;}
    const mime=['audio/webm','audio/mp4','audio/ogg'].find(m=>MediaRecorder.isTypeSupported(m));
    if(!mime)throw new Error('Ses biçimi desteklenmiyor. Komutunu yazabilirsin.');
    const chunks=[];recording=new MediaRecorder(stream,{mimeType:mime});recording.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
    recording.onstop=async()=>{clearTimeout(recordTimer);recording=null;stream?.getTracks().forEach(t=>t.stop());setMic(false);if(disposed)return;try{await interpret({mime,base64:await blobBase64(new Blob(chunks,{type:mime}))},{voice:true});}catch(error){reply.textContent=error.message;}};
    recording.start();recordTimer=setTimeout(()=>recording?.stop(),60000);setMic(true);reply.textContent='Dinliyorum. Bitirince tekrar bas. En fazla 60 saniye.';
   }catch(error){$('#assistantMic').disabled=false;stream?.getTracks().forEach(t=>t.stop());reply.textContent=error.name==='NotAllowedError'?'Mikrofon izni verilmedi. Komutunu yazabilirsin.':error.message;}
   return;
  }
  const current=recognition=new SpeechRecognition();current.lang='tr-TR';current.interimResults=true;current.continuous=true;current._send=true;let finalText='',failed=false;
  current.onresult=event=>{let interim='';for(let i=event.resultIndex;i<event.results.length;i++){const piece=event.results[i][0].transcript;if(event.results[i].isFinal)finalText+=piece+' ';else interim+=piece;}heard=true;dictate((finalText+interim).replace(/\s+/g,' ').trim());clearTimeout(silenceTimer);silenceTimer=setTimeout(()=>current.stop(),1400);};
  current.onerror=event=>{if(event.error==='aborted'||event.error==='no-speech')return;failed=true;reply.textContent=event.error==='not-allowed'?'Mikrofon izni verilmedi. Tarayıcı ayarlarından izin verebilir veya yazabilirsin.':'Konuşma alınamadı. Tekrar dene veya komutunu yaz.';};
  current.onend=()=>{if(recognition!==current)return;clearTimeout(silenceTimer);clearTimeout(dictateTimer);if(heardText)$('#assistantCommand').value=heardText;const text=$('#assistantCommand').value.trim();const send=current._send!==false&&!failed&&text;recognition=null;setMic(false);if(!disposed&&send)void interpret(undefined,{voice:true});else if(!text&&!failed)reply.textContent='';};
  try{current.start();setMic(true);reply.textContent='Dinliyorum…';}catch{if(recognition===current)recognition=null;setMic(false);reply.textContent='Mikrofon başlatılamadı.';}
 };
 form.onsubmit=async event=>{
  event.preventDefault();if(busy)return;invalidate();const version=scanVersion;
  const selected=field('scope').value==='all'?accounts:accounts.filter(a=>[...form.querySelectorAll('[name=account]:checked')].some(cb=>cb.value===a.id));
  const options={scope:field('scope').value,start:field('start').value,end:field('end').value,direction:field('direction').value,withCollections:field('collections').value==='yes',layout:field('layout').value};
  if(options.scope==='cari'&&selected.length!==1){reply.textContent='Cari şablonu için tek hesap seçin.';return;}
  const button=$('#assistantScan');setBusy(true,'Hesaplar taranıyor…');
  const progress=message(`${selected.length} hesapta ${field('customer').value} için ${options.start} – ${options.end} dönemini tarıyorum.`,'assistant',{instant:true});
  try{
   const query=fold(field('customer').value);const scanned=await scanReport({...options,accounts:selected,onProgress:(done,total)=>reply.textContent=`${done}/${total} hesap tarandı…`});
   if(disposed||version!==scanVersion)return;
   groups=scanned.filter(g=>fold(g.name).includes(query)||g.tax.includes(query));snapshot={options,accounts:selected};
   const results=$('#assistantResults');results.replaceChildren();
   if(!groups.length){progress.textContent='Bu dönem ve filtrelerde müşteri bulunamadı. Adı, VKN’yi veya tarih aralığını kontrol edin.';return;}
   progress.textContent=`${groups.length} müşteri bulundu. Gönderilecek müşteriyi seç.`;
   if(groups.length===1){progress.textContent=`${groups[0].name} bulundu. Excel ve görsel hazırlanıyor…`;preview=await previewReport({groups,...snapshot,target:results});if(disposed||version!==scanVersion){preview?.close();return;}progress.textContent='Önizleme hazır. Dosyaları inceleyip gönderimi onaylayabilirsin.';return;}
   groups.forEach((g,index)=>{const label=document.createElement('label');label.className='sv-assistant-customer';label.innerHTML=`<input type="checkbox" value="${index}" ${groups.length===1?'checked':''}><span><strong>${escapeHtml(g.name)}</strong><small>${escapeHtml(g.tax||'VKN yok')} · ${g.rows.length} hareket · Dönem neti ${escapeHtml(summarizeRows(g.rows).net)} TL</small></span>`;results.append(label);});
   const send=document.createElement('button');send.className='btn btn-primary';send.type='button';send.textContent='Excel ve görseli önizle';results.append(send);
   send.onclick=async()=>{send.disabled=true;try{const chosen=[...results.querySelectorAll('input:checked')].map(cb=>groups[Number(cb.value)]);preview=await previewReport({groups:chosen,...snapshot,target:results});}catch(error){message(error.message,'assistant',{instant:true});}finally{send.disabled=false;}};
  }catch(error){progress.textContent=error.message;}finally{if(!disposed&&version===scanVersion)setBusy(false);}
 };
 async function refresh(){
  if(disposed||refreshBusy)return;refreshBusy=true;
  try{
   const state=await assistantRequest('/status');if(disposed)return;
   const label=(statusLabel[state.connection]||state.connection)+(state.connection==='syncing'&&state.loadingPercent!=null?` %${state.loadingPercent}`:'');
   $('#assistantStatusBadge').textContent=label;page.dataset.connection=state.connection;
  }catch(error){if(!disposed){$('#assistantStatusBadge').textContent=error.message;page.dataset.connection='error';}}finally{refreshBusy=false;}
 }
 reset();void refresh();timer=setInterval(refresh,8000);
 return {page,title:'Asistan',cleanup(){disposed=true;scanVersion++;clearInterval(timer);clearTimeout(recordTimer);clearTimeout(silenceTimer);clearTimeout(dictateTimer);typeTimers.forEach(clearTimeout);if(recognition)recognition._send=false;recognition?.abort();recording?.stop();stream?.getTracks().forEach(track=>track.stop());preview?.close();}};
}
