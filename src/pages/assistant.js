import {assistantRequest,blobBase64} from '../services/assistant-client.js';
import {listAccounts} from '../services/account-manager.js';
import {escapeHtml} from '../lib/html.js';
import {scanReport,fold,summarizeRows,matchReportGroups} from '../services/report-data.js';
import {previewReport} from '../components/report-send.js';
import {assistantContext} from '../services/assistant-context.js';
import {parseQuickIntent,nextQuestion,monthRange,matchSpokenAccounts} from '../lib/assistant-intent.js';
import {createBusinessAssistant} from '../services/assistant-business.js';
import {parseBusinessCommand} from '../lib/assistant-actions.js';
import {createVoiceSession} from '../services/voice-session.js';
import {createAssistantSpeech,spokenReply} from '../services/assistant-speech.js';
import {dialogueCommand,requestedFormat,formatLabel} from '../lib/assistant-dialogue.js';
import {sonaiMark} from '../components/sonai-mark.js';

const statusLabel={disconnected:'WhatsApp bağlı değil',connecting:'WhatsApp bağlanıyor…',qr:'QR kodunu okutun',authenticated:'Hesap bağlandı, hazırlanıyor…',syncing:'WhatsApp eşitleniyor…',ready:'WhatsApp hazır · Gönderim yapılabilir',auth_failure:'Yeniden bağlantı gerekli',error:'Bağlantı kurulamadı'};
export async function mountAssistant({context=assistantContext(),compact=false,audioContext,speech:providedSpeech}={}){
 const accounts=await listAccounts();const page=document.createElement('div');page.className='sv-assistant';
 let disposed=false,refreshBusy=false,scanVersion=0,groups=[],snapshot=null;
 const typeTimers=new Set(),conversation=[];let awaiting=null,draft={},busy=false,preview=null,voiceActive=false,commandSeq=0,chosenGroups=null,previewVersion=0;
 let pendingSpeech='',speechTimer=null,speechResumeTimer=null,speechTransition=false,voiceRecoveryNeeded=false;
 const speech=providedSpeech||createAssistantSpeech({onSpeaking:pauseForSpeech,onDone:resumeAfterSpeech});
 const defaults=()=>({scope:context.scope||'selected',year:new Date().getFullYear(),layout:'separate',format:'both',accountIds:context.accountIds||context.selected?.accountIds||accounts.map(a=>a.id),direction:context.direction||context.selected?.direction,withCollections:context.withCollections??context.selected?.withCollections});
 page.classList.add('sv-chat-app');if(compact)page.classList.add('sv-chat-compact');
 page.innerHTML=`<div class="sv-chat-heading"><div><span class="sv-eyebrow">KİŞİSEL İŞ ASİSTANIN</span><h2>SonAI</h2></div><button class="btn btn-sm" id="assistantReset" type="button">Yeni sohbet</button></div>
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
 const business=createBusinessAssistant({accounts,message,choices:$('#assistantChoices'),isCurrent:()=>!disposed,run:async callback=>{if(busy||disposed)return;setBusy(true,'İşlemi hazırlıyorum…');try{await callback();}catch(error){message(error.message,'assistant',{instant:true});}finally{if(!disposed){setBusy(false);continueVoice();}}}});
 const field=name=>form.elements.namedItem(name);
 page.classList.add('sv-voice-app');
 for(const selector of ['.sv-chat-heading','.sv-chat-status','.sv-chat-filters'])$(selector).hidden=true;
 const orbit=document.createElement('div');orbit.className='sv-voice-stage';orbit.innerHTML='<div class="sv-voice-caption">SONAI</div><div class="sv-voice-orbit"><span class="sv-voice-aura" aria-hidden="true"></span><span class="sv-voice-ring" aria-hidden="true"></span><span class="sv-voice-ring" aria-hidden="true"></span><span class="sv-voice-ring" aria-hidden="true"></span></div><p class="sv-live-transcript" aria-live="polite"></p>';
 const mic=$('#assistantMic');mic.classList.add('sv-voice-orb');mic.innerHTML='<span class="sv-orb-glow" aria-hidden="true"></span><span class="sv-orb-core" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span><span class="sr-only sv-mic-label">Dinlemeye başla</span>';mic.setAttribute('aria-label','Dinlemeyi başlat veya duraklat');orbit.querySelector('.sv-voice-orbit').append(mic);orbit.append(reply);$('.sv-chat-heading').after(orbit);$('.sv-chat-composer').hidden=true;
 const thinking=document.createElement('div');thinking.className='sonai-thinking';thinking.setAttribute('aria-hidden','true');thinking.innerHTML='<i></i><i></i><i></i>';reply.before(thinking);
 const formatChoices=document.createElement('div');formatChoices.className='sonai-formats';formatChoices.setAttribute('aria-label','Gönderim biçimi');formatChoices.hidden=true;$('#assistantResults').before(formatChoices);
 const delivery=document.createElement('div');delivery.className='sonai-delivery';delivery.setAttribute('role','status');delivery.hidden=true;formatChoices.after(delivery);
 for(const [value,label] of [['excel','Excel'],['image','Fotoğraf'],['both','İkisi de']]){const button=document.createElement('button');button.type='button';button.textContent=label;button.dataset.format=value;button.onclick=()=>{if(!busy&&!preview?.sending)void changeFormat(value);};formatChoices.append(button);}
 const live=$('.sv-live-transcript');let liveHeard='',dictateTimer=null,targetLevel=0,displayLevel=0,levelRaf=null;
 let soundUntil=0;page.dataset.sound='quiet';
 const pauseButton=document.createElement('button');pauseButton.className='sonai-pause';pauseButton.type='button';pauseButton.textContent='Dinlemeyi durdur';pauseButton.hidden=true;
 pauseButton.onclick=()=>{if(speech.isSpeaking()||page.dataset.voice==='speaking'){void startListening();return;}voiceActive=false;pendingSpeech='';speech.stop();voice.pause();voiceState('idle');};orbit.append(pauseButton);
 const symbol=document.createElement('span');symbol.className='sonai-orb-symbol';symbol.innerHTML=sonaiMark;mic.prepend(symbol);
 const reduceMotion=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 function paintLive(text,{animate=true}={}){
  const next=String(text||'').replace(/\s+/g,' ').trim();liveHeard=next;clearTimeout(dictateTimer);
  if(!next){live.replaceChildren();live.classList.remove('sv-live-active','sv-live-typing');return;}
  live.classList.add('sv-live-active');
  if(!animate||reduceMotion()){live.textContent=next;live.classList.remove('sv-live-typing');return;}
  const displayed=Array.from(live.textContent),characters=Array.from(next);
  let shared=0;while(shared<displayed.length&&shared<characters.length&&displayed[shared]===characters[shared])shared++;
  live.replaceChildren(document.createTextNode(characters.slice(0,shared).join('')));
  let index=shared;
  live.classList.add('sv-live-typing');
  const tick=()=>{
   if(disposed)return;
   if(index>=characters.length){live.classList.remove('sv-live-typing');return;}
   const char=document.createElement('span');char.className='sv-live-char';char.textContent=characters[index++];live.append(char);
   dictateTimer=setTimeout(tick,14);
  };tick();
 }
 function pumpLevel(){
  if(disposed){levelRaf=null;return;}
  displayLevel+=(targetLevel-displayLevel)*(reduceMotion()?1:.18);
  if(Math.abs(targetLevel-displayLevel)<0.004)displayLevel=targetLevel;
  page.style.setProperty('--sv-voice-level',String(displayLevel));
  if(targetLevel>0.002||displayLevel>0.002)levelRaf=requestAnimationFrame(pumpLevel);
  else{page.style.setProperty('--sv-voice-level','0');levelRaf=null;}
 }
 function voiceState(state){
  if(disposed)return;
  page.dataset.voice=state;page.dataset.sound='quiet';soundUntil=0;mic.setAttribute('aria-pressed',String(state==='listening'));mic.querySelector('.sv-mic-label').textContent=state==='listening'?'Dinleniyor':'Dinlemeye başla';
  mic.setAttribute('aria-label',state==='listening'?'Konuşmayı tamamla':state==='speaking'?'Yanıtı kes ve konuş':'SonAI ile konuş');pauseButton.hidden=!['listening','speaking'].includes(state);pauseButton.textContent=state==='speaking'?'Araya gir':'Dinlemeyi durdur';
  if(state==='listening')liveHeard='';
  if(state!=='listening'){targetLevel=0;if(!levelRaf)levelRaf=requestAnimationFrame(pumpLevel);}
  if(!busy)reply.textContent={listening:'Dinliyorum · Bitirince göndermek için dokun',thinking:'Söylediklerini anlıyorum…',speaking:'Yanıtlıyorum · Araya girmek için dokun',idle:'Konuşmak için dokun',requesting:'Mikrofon iznini bekliyorum…',error:'Tekrar denemek için dokun'}[state]||'';
 }
 const voice=createVoiceSession({
  audioContext,
  onAudio:async blob=>{if(disposed||speech.isSpeaking())return;const heard=liveHeard;try{await interpret({mime:blob.type,base64:await blobBase64(blob)},{voice:true,heard});}catch(e){message(e.message,'assistant',{instant:true});}finally{continueVoice();}},
  onState:state=>{if(!disposed)voiceState(state);},onError:text=>{voiceActive=false;if(!disposed)message(text,'assistant',{instant:true});},
  onLevel:level=>{targetLevel=Math.min(1,Math.max(0,Number(level)||0));const now=performance.now();if(targetLevel>=.144)soundUntil=now+180;const sound=page.dataset.voice==='listening'&&now<soundUntil?'active':'quiet';if(page.dataset.sound!==sound)page.dataset.sound=sound;if(!levelRaf)levelRaf=requestAnimationFrame(pumpLevel);},
 });
 function clearSpeechResume(){clearTimeout(speechResumeTimer);speechResumeTimer=null;}
 function pauseForSpeech(){if(disposed)return;clearSpeechResume();voiceRecoveryNeeded=true;voice.pause();voiceState('speaking');}
 function resumeAfterSpeech(){
  if(disposed||speechTransition)return;
  clearSpeechResume();
  // WebKit can retain its playback audio route briefly after synthesis ends. Give it
  // time to release that route; an intentional tap still starts capture immediately.
  speechResumeTimer=setTimeout(()=>{speechResumeTimer=null;continueVoice();},180);
 }
 function resumeVoice(){const afterSpeech=voiceRecoveryNeeded;voiceRecoveryNeeded=false;void voice.resume({afterSpeech});}
 function continueVoice(){
  if(disposed||busy||speechTransition||speechResumeTimer!==null)return;
  if(pendingSpeech&&voiceActive){const text=pendingSpeech;pendingSpeech='';clearTimeout(speechTimer);speechTransition=true;
   try{void speech.speak(spokenReply(text));}finally{speechTransition=false;}
   if(!speech.isSpeaking()&&voiceActive&&speechResumeTimer===null)resumeVoice();return;
  }
  if(speech.isSpeaking())return;
  if(voiceActive)resumeVoice();else voiceState('idle');
 }
 function message(text,role='assistant',{instant=false}={}){
  if(role==='assistant'&&voiceActive){pendingSpeech=text;clearTimeout(speechTimer);speechTimer=setTimeout(continueVoice,0);}
  const node=document.createElement('div');node.className='sv-chat-message sv-chat-'+role;$('#assistantMessages').append(node);conversation.push({role,text});if(conversation.length>16)conversation.shift();
  const done=()=>requestAnimationFrame(()=>{if(node.isConnected)node.scrollIntoView({block:'nearest',behavior:'smooth'});});
  if(instant||reduceMotion()){node.textContent=text;done();return node;}
  const parts=Array.from(text);let index=0;node.classList.add('sv-typing');
  const tick=()=>{
   if(disposed||!node.isConnected){node.textContent=text;node.classList.remove('sv-typing');return;}
   if(index>=parts.length){node.classList.remove('sv-typing');done();return;}
   node.append(document.createTextNode(parts.slice(index,index+2).join('')));index+=2;
   const timerId=setTimeout(()=>{typeTimers.delete(timerId);tick();},14);typeTimers.add(timerId);
  };tick();return node;
 }
 function setBusy(value,label=''){busy=value;page.dataset.busy=String(value);if(value){voice.pause();voiceState('thinking');}$('#assistantInterpret').disabled=value;$('#assistantScan').disabled=value;$('#assistantMic').disabled=value;form.querySelectorAll('input,select').forEach(n=>n.disabled=value);if(!value&&draft.scope==='all')form.querySelectorAll('[name=account]').forEach(n=>n.disabled=true);reply.textContent=label;}
 function invalidate(){delete page.dataset.delivery;scanVersion++;previewVersion++;groups=[];snapshot=null;chosenGroups=null;preview?.close();preview=null;formatChoices.hidden=true;delivery.hidden=true;$('#assistantResults').replaceChildren();}
 function sync(){field('customer').required=!draft.allCustomers;for(const key of ['scope','customer','start','end','direction','layout'])field(key).value=draft[key]||'';field('collections').value=typeof draft.withCollections==='boolean'?(draft.withCollections?'yes':'no'):'';form.querySelectorAll('[name=account]').forEach(cb=>{cb.checked=draft.scope==='all'||(draft.accountIds||[]).includes(cb.value);cb.disabled=draft.scope==='all';});$('#assistantSummary').textContent=[{selected:'Seçili Hesaplar',all:'Tüm Hesaplar',cari:'Cari'}[draft.scope],draft.allCustomers?'Tüm müşteriler':draft.customer,draft.start&&`${draft.start} → ${draft.end}`].filter(Boolean).join(' · ')||'Rapor seçimleri';}
 function merge(intent){
  if(intent.customer&&intent.allCustomers!==true)draft.allCustomers=false;
  if(intent.scope&&intent.scope!==draft.scope){draft.scope=intent.scope;if(intent.scope==='selected')draft.accountIds=accounts.map(a=>a.id);if(intent.scope==='cari')draft.accountIds=context.activeAccountId?[context.activeAccountId]:[];}
  for(const [key,value] of Object.entries(intent))if(value!==null&&value!==undefined&&key!=='account')draft[key]=value;
  if(intent.account){const matches=matchSpokenAccounts(intent.account,accounts);draft.accountIds=matches.length===1?[matches[0].id]:[];draft.scope='cari';}
  if(intent.start&&!intent.year)draft.year=Number(intent.start.slice(0,4));
  if(intent.month&&!intent.start&&!intent.end){draft.start=null;draft.end=null;Object.assign(draft,monthRange(draft.month,draft.year));}
  if(intent.year&&draft.month&&!intent.start&&!intent.end)Object.assign(draft,monthRange(draft.month,draft.year));
  if(draft.start){draft.year=Number(draft.start.slice(0,4));draft.month=Number(draft.start.slice(5,7));}sync();
 }
 async function advance(){
  const choices=$('#assistantChoices');choices.replaceChildren();const question=nextQuestion(draft);awaiting=question?.key||null;
  if(!question){await form.onsubmit({preventDefault(){}});return;}
  message(question.text);let options=question.choices||[];
  if(question.key==='period'&&draft.month)options=[new Date().getFullYear(),new Date().getFullYear()-1].map(year=>[String(year),{year}]);
  if(question.key==='accounts'){
   for(const [index,a] of accounts.entries()){const b=document.createElement('button');b.type='button';b.className='sv-choice';b.textContent=a.name;b.style.setProperty('--sv-choice-i',String(index));b.setAttribute('aria-pressed',String((draft.accountIds||[]).includes(a.id)));b.onclick=()=>{if(busy)return;const ids=new Set(draft.accountIds||[]);ids.has(a.id)?ids.delete(a.id):ids.add(a.id);draft.accountIds=[...ids];sync();b.setAttribute('aria-pressed',String(ids.has(a.id)));};choices.append(b);}
   options=[['Seçtiğim hesaplarla devam',{}],['Tüm hesapları seç',{accountIds:accounts.map(a=>a.id)}]];
  }
  const base=choices.childElementCount;
  options.forEach(([label,value],index)=>{const b=document.createElement('button');b.className='sv-choice';b.type='button';b.textContent=label;b.style.setProperty('--sv-choice-i',String(base+index));b.onclick=()=>{if(busy)return;message(label,'user',{instant:true});invalidate();merge(value);void advance();};choices.append(b);});
 }
 form.addEventListener('input',()=>{if(!busy)invalidate();});
 form.addEventListener('change',()=>{if(busy)return;draft={...draft,...Object.fromEntries(['scope','customer','start','end','direction','layout'].map(k=>[k,field(k).value])),withCollections:field('collections').value?field('collections').value==='yes':undefined,accountIds:[...form.querySelectorAll('[name=account]:checked')].map(n=>n.value)};sync();});
 function updateFormats(){
  formatChoices.hidden=!chosenGroups;for(const button of formatChoices.children){button.setAttribute('aria-pressed',String(button.dataset.format===draft.format));button.disabled=busy||!!preview?.sending||!!preview?.formatLocked;}
 }
 async function preparePreview(chosen){
  if(preview?.sending)return;
  const version=++previewVersion,scan=scanVersion;chosenGroups=chosen;preview?.close();preview=null;
  if(chosen.length===1){const ids=[...new Set(chosen[0].rows.map(row=>row.accountId))].filter(Boolean);if(ids.length)business.remember({accountIds:ids,customer:{name:chosen[0].name,tax:chosen[0].tax,...(ids.length===1?{accountId:ids[0]}:{})},period:{start:snapshot.options.start,end:snapshot.options.end}});}
  $('#assistantResults').replaceChildren();setBusy(true,formatLabel(draft.format)+' hazırlanıyor…');updateFormats();
  try{
   const result=await previewReport({groups:chosen,...snapshot,options:{...snapshot.options,format:draft.format},target:$('#assistantResults'),onStatus:({status,text})=>{
    if(disposed||version!==previewVersion)return;page.dataset.delivery=status;reply.textContent=text;delivery.hidden=false;delivery.dataset.state=status;delivery.textContent=text;updateFormats();
    if(['sent','failed','unknown'].includes(status))message(text,'assistant',{instant:true});
   }});
   if(disposed||version!==previewVersion||scan!==scanVersion){result?.close();return;}
   preview=result;if(result?.ready===false)return;message((snapshot.options.allCustomers&&draft.format==='excel'?chosen.length+' müşterinin Excel’i':formatLabel(draft.format))+' hazır. Dosyayı önizlemeden alabilir veya “WhatsApp’a gönder” diyebilirsin.');
  }finally{if(!disposed&&version===previewVersion){setBusy(false);updateFormats();}}
 }
 async function changeFormat(format){
  if(preview?.sending||preview?.formatLocked){message('Bu gönderim zaten başladı. Önce aynı gönderimin sonucunu doğrulayalım; yeni biçim için yeni bir rapor hazırlayabiliriz.');return;}
  draft.format=format;updateFormats();if(chosenGroups&&snapshot)await preparePreview(chosenGroups);
 }
 async function handleDialogue(text,modelReply){
  const command=dialogueCommand(text,{awaiting,candidates:!preview&&snapshot?groups:[],hasPreview:!!preview});
  if(!command)return false;
  if(command.action==='reset'){reset();return true;}
  if(command.action==='cancel'){
   if(preview?.sending)message('Gönderim WhatsApp’a iletildi; bu aşamada geri çekemiyorum.');
   else{invalidate();message('Tamam, iptal ettim. Ne yapmak istersin?');}
   return true;
  }
  if(command.action==='chat'){message(typeof modelReply==='string'&&modelReply.trim()?modelReply.trim():command.reply);return true;}
  if(command.action==='needs_report'){if(command.format)draft.format=command.format;message(groups.length>1?'Önce müşteriyi seçelim. “İlki olsun” veya “ikincisi olsun” diyebilirsin.':'Önce raporu hazırlayalım. Hangi müşterinin, hangi aydaki carisini göndereyim?');return true;}
  if(command.action==='choose'){
   if(command.format)draft.format=command.format;
   message((command.index+1)+'. müşteriyi seçtim: '+groups[command.index].name);
   await preparePreview([groups[command.index]]);return true;
  }
  if(command.action==='format'){await changeFormat(command.format);return true;}
  if(command.action==='send'){
   if(preview?.status==='sent'){message('Bu rapor WhatsApp’a zaten gönderildi. Yeni bir rapor hazırlamamı istersen söyleyebilirsin.');return true;}
   if(command.format&&command.format!==draft.format&&preview?.formatLocked){message('Gönderimin sonucu henüz kesinleşmedi. “Gönder” diyerek aynı işlemi kontrol edebiliriz; bu sırada dosya türünü değiştirmiyorum.');return true;}
   if(preview?.sending){message('Gönderim devam ediyor; sonucunu takip ediyorum.');return true;}
   if(command.format&&command.format!==draft.format)await changeFormat(command.format);
   const button=$('#assistantResults .sv-confirm-send');
   if(preview?.send){const accepted=await preview.send();if(!accepted)message('Gönderim başlatılamadı. Önizlemedeki bağlantı veya hata mesajını kontrol edebilirsin.');}
   else if(button&&!button.disabled){button.click();message('Gönderimi takip ediyorum.');}
   else message('Gönderim için Ayarlar’daki WhatsApp bağlantısını ve alıcı numarasını kontrol edelim.');
   return true;
  }
  return false;
 }
 async function interpret(audio,{voice:spokenInput=false,heard=''}={}){
  if(audio instanceof Event)audio=undefined;if(busy||disposed)return;
  voice.pause();speechTransition=true;speech.stop();speechTransition=false;pendingSpeech='';const text=$('#assistantCommand').value.trim()||String(heard||'').trim();if(!text&&!audio)return;
  const version=scanVersion,requestSeq=++commandSeq;setBusy(true,'Söylediklerini anlıyorum…');$('#assistantCommand').value='';
  try{
   let transcript=text,result;
   if(audio){
    result=await assistantRequest('/interpret',{text,context:{draft,awaiting,business:business.getContext(),remembered:business.getMemory(),accounts:accounts.map(a=>({id:a.id,name:a.name})),route:context.route,conversation:conversation.slice(-8)},audio});
    if(disposed||version!==scanVersion||requestSeq!==commandSeq)return;
    transcript=result.transcript?.trim()||text;
    if(!transcript){message('Söylediklerini seçemedim. Biraz daha yakından konuşup tekrar söyleyebilir misin?');return;}
    paintLive(transcript,{animate:!liveHeard||fold(liveHeard)!==fold(transcript)});
   }
   message(transcript,'user',{instant:!audio});
   const quick=parseQuickIntent(transcript,{awaiting,accounts,draft});
   const businessCommand=parseBusinessCommand(transcript,{accounts,draft});
   const reportAnswer=!!awaiting&&(!businessCommand||businessCommand.action==='select_customer');
   if(!reportAnswer&&await business.handle(transcript,{draft,remote:result?.intent||{}})){awaiting=null;return;}
   if(await handleDialogue(transcript,result?.reply))return;
   if(!result&&!quick.handled){
    try{result=await assistantRequest('/interpret',{text:transcript,context:{draft,awaiting,business:business.getContext(),remembered:business.getMemory(),accounts:accounts.map(a=>({id:a.id,name:a.name})),route:context.route,conversation:conversation.slice(-8)}});}
    catch(error){if(!Object.keys(quick.intent).length)throw error;}
   }
   if(disposed||version!==scanVersion||requestSeq!==commandSeq)return;
   if(!reportAnswer&&result?.intent?.action&&await business.handle(transcript,{draft,remote:result.intent})){awaiting=null;return;}
   const remote=Object.fromEntries(Object.entries(result?.intent||{}).filter(([,value])=>value!=null));
   if(result?.reply&&!Object.keys(remote).length&&!quick.handled){message(result.reply);return;}
   const intent={...remote,...quick.intent};
   if(Object.hasOwn(quick.intent,'accountIds'))delete intent.account;
   const explicit=requestedFormat(transcript);if(explicit)intent.format=explicit;
   if(!Object.keys(intent).length){message(result?.reply||'Cari rapor, satış, alış, tahsilat ve WhatsApp gönderiminde yardımcı olabilirim. Ne yapmak istersin?');return;}
   if(Object.keys(intent).every(key=>key==='format')){await changeFormat(intent.format);message(formatLabel(intent.format)+' olarak hazırlayacağım. Hangi müşteri için olsun?');return;}
   invalidate();merge(intent);setBusy(false);await advance();
  }catch(error){if(!disposed&&version===scanVersion)message(error.message,'assistant',{instant:true});}
  finally{if(!disposed&&requestSeq===commandSeq){setBusy(false);updateFormats();continueVoice();}}
 }

 $('#assistantInterpret').onclick=interpret;
 $('#assistantCommand').onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();void interpret();}};
 function reset(){commandSeq++;speechTransition=true;speech.stop();speechTransition=false;pendingSpeech='';business.reset();invalidate();conversation.length=0;draft=defaults();sync();$('#assistantMessages').replaceChildren();$('#assistantChoices').replaceChildren();$('#assistantCommand').value='';paintLive('');awaiting=null;setBusy(false);message('Merhaba. Hesap ve müşteri adını söyle; tahsilat ekleyebilir, düzeltebilir veya iptal edebilir, bakiye ve hesap özeti sorgulayabilir, rapor hazırlayabilirim.');}
 $('#assistantReset').onclick=()=>{voice.pause();reset();continueVoice();};
 async function startListening({activateSpeech=false}={}){
  if(disposed||busy)return;
  voiceActive=true;pendingSpeech='';clearTimeout(speechTimer);clearSpeechResume();speechTransition=true;
  try{speech.stop();if(activateSpeech)speech.activate();}finally{speechTransition=false;}
  // start() resumes the audio context synchronously in this tap. Do not queue a silent
  // TTS primer here: interrupting should give the audio route straight back to the mic.
  const afterSpeech=voiceRecoveryNeeded;voiceRecoveryNeeded=false;await voice.start({afterSpeech});
 }
 $('#assistantMic').onclick=async()=>{if(busy)return;if(page.dataset.voice==='listening'){voice.finish();return;}await startListening({activateSpeech:!speech.isSpeaking()&&!voiceRecoveryNeeded});};
 const visibility=()=>{if(document.hidden){voiceActive=false;pendingSpeech='';speech.stop();clearSpeechResume();voice.pause();voiceState('idle');}};document.addEventListener('visibilitychange',visibility);
 form.onsubmit=async event=>{
  event.preventDefault();if(busy)return;invalidate();const version=scanVersion;
  const selected=field('scope').value==='all'?accounts:accounts.filter(a=>[...form.querySelectorAll('[name=account]:checked')].some(cb=>cb.value===a.id));
  const options={allCustomers:!!draft.allCustomers,format:draft.format,scope:field('scope').value,start:field('start').value,end:field('end').value,direction:field('direction').value,withCollections:field('collections').value==='yes',layout:field('layout').value};
  if(options.scope==='cari'&&selected.length!==1){reply.textContent='Cari şablonu için tek hesap seçin.';return;}
  const button=$('#assistantScan');setBusy(true,'Hesaplar taranıyor…');
  const progress=message(`${selected.length} hesapta ${draft.allCustomers?'tüm müşteriler':field('customer').value} için ${options.start} – ${options.end} dönemini tarıyorum.`,'assistant',{instant:true});
  try{
   const query=fold(field('customer').value);const scanned=await scanReport({...options,accounts:selected,onProgress:(done,total)=>reply.textContent=`${done}/${total} hesap tarandı…`});
   if(disposed||version!==scanVersion)return;
   groups=options.allCustomers?scanned:matchReportGroups(scanned,query,{accountIds:selected.map(a=>a.id)});snapshot={options,accounts:selected};
   const results=$('#assistantResults');results.replaceChildren();
   if(!groups.length){awaiting='customer';progress.remove();message('Seçtiğin hesap ve dönemde bu adla hareket bulamadım. Müşterinin kısa adını tekrar söyleyebilir veya dönemi değiştirebilirsin; diğer seçimlerini koruyorum.','assistant',{instant:true});return;}
   if(options.allCustomers){progress.textContent=groups.length+' müşterinin kayıtlarını tek Excel’de topluyorum…';await preparePreview(groups);return;}
   if(groups.length===1){progress.textContent=groups[0].name+' bulundu.';await preparePreview(groups);return;}
   progress.remove();message(groups.length+' müşteri buldum. “İlki olsun”, “ikincisi olsun” diyebilir veya aşağıdan seçebilirsin.','assistant',{instant:true});
   groups.forEach((g,index)=>{const label=document.createElement('label');label.className='sv-assistant-customer';label.innerHTML=`<input type="checkbox" value="${index}" ${groups.length===1?'checked':''}><span><strong>${index+1}. ${escapeHtml(g.name)}</strong><small>${escapeHtml(g.tax||'VKN yok')} · ${g.rows.length} hareket · Dönem neti ${escapeHtml(summarizeRows(g.rows).net)} TL</small></span>`;results.append(label);});
   const send=document.createElement('button');send.className='btn btn-primary';send.type='button';send.textContent='Seçilen müşteriyi hazırla';results.append(send);
   send.onclick=async()=>{send.disabled=true;try{const chosen=[...results.querySelectorAll('input:checked')].map(cb=>groups[Number(cb.value)]);if(!chosen.length){message('Bir müşteri seç veya “ilki olsun” de.');return;}await preparePreview(chosen);}catch(error){message(error.message,'assistant',{instant:true});}finally{send.disabled=false;}};
  }catch(error){progress.textContent=error.message;message(error.message,'assistant',{instant:true});}finally{if(!disposed&&version===scanVersion){setBusy(false);continueVoice();}}
 };
 async function refresh(){
  if(disposed||refreshBusy)return;refreshBusy=true;
  try{
   const state=await assistantRequest('/status');if(disposed)return;
   const label=(statusLabel[state.connection]||state.connection)+(state.connection==='syncing'&&state.loadingPercent!=null?` %${state.loadingPercent}`:'');
   $('#assistantStatusBadge').textContent=label;page.dataset.connection=state.connection;
  }catch(error){if(!disposed){$('#assistantStatusBadge').textContent=error.message;page.dataset.connection='error';}}finally{refreshBusy=false;}
 }
 reset();voiceState('idle');void refresh();
 return {page,title:'SonAI',pauseForSpeech,resumeAfterSpeech,cleanup(){disposed=true;business.reset();previewVersion++;voiceActive=false;speech.dispose();voice.close();clearTimeout(speechTimer);clearTimeout(speechResumeTimer);clearTimeout(dictateTimer);if(levelRaf)cancelAnimationFrame(levelRaf);document.removeEventListener('visibilitychange',visibility);scanVersion++;typeTimers.forEach(clearTimeout);preview?.close();}};
}
