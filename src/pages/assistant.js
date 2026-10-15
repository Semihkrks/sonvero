import {assistantRequest,blobBase64} from '../services/assistant-client.js';
import {listAccounts} from '../services/account-manager.js';
import {escapeHtml} from '../lib/html.js';
import {scanReport,fold,summarizeRows,matchReportGroups} from '../services/report-data.js';
import {previewReport} from '../components/report-send.js';
import {assistantContext} from '../services/assistant-context.js';
import {parseQuickIntent,nextQuestion,monthRange} from '../lib/assistant-intent.js';
import {createVoiceSession} from '../services/voice-session.js';

const statusLabel={disconnected:'WhatsApp bağlı değil',connecting:'WhatsApp bağlanıyor…',qr:'QR kodunu okutun',authenticated:'Hesap bağlandı, hazırlanıyor…',syncing:'WhatsApp eşitleniyor…',ready:'WhatsApp hazır · Gönderim yapılabilir',auth_failure:'Yeniden bağlantı gerekli',error:'Bağlantı kurulamadı'};
export async function mountAssistant({context=assistantContext(),compact=false}={}){
 const accounts=await listAccounts();const page=document.createElement('div');page.className='sv-assistant';
 let disposed=false,refreshBusy=false,scanVersion=0,groups=[],snapshot=null;
 const typeTimers=new Set(),conversation=[];let awaiting=null,draft={},busy=false,preview=null,voiceActive=false,commandSeq=0;
 const defaults=()=>({scope:'selected',year:2026,layout:'separate',accountIds:accounts.map(a=>a.id),direction:context.direction||context.selected?.direction,withCollections:context.withCollections??context.selected?.withCollections});
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
 page.classList.add('sv-voice-app');
 for(const selector of ['.sv-chat-heading','.sv-chat-status','.sv-chat-filters'])$(selector).hidden=true;
 const orbit=document.createElement('div');orbit.className='sv-voice-stage';orbit.innerHTML='<div class="sv-voice-caption">SONVERA</div><div class="sv-voice-orbit"><span class="sv-voice-aura" aria-hidden="true"></span><span class="sv-voice-ring" aria-hidden="true"></span><span class="sv-voice-ring" aria-hidden="true"></span><span class="sv-voice-ring" aria-hidden="true"></span></div><p class="sv-live-transcript" aria-live="polite"></p>';
 const mic=$('#assistantMic');mic.classList.add('sv-voice-orb');mic.innerHTML='<span class="sv-orb-glow" aria-hidden="true"></span><span class="sv-orb-core" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span><span class="sr-only sv-mic-label">Dinlemeye başla</span>';mic.setAttribute('aria-label','Dinlemeyi başlat veya duraklat');orbit.querySelector('.sv-voice-orbit').append(mic);orbit.append(reply);page.prepend(orbit);$('.sv-chat-composer').hidden=true;
 const live=$('.sv-live-transcript');let liveHeard='',dictateTimer=null,speech=null,targetLevel=0,displayLevel=0,levelRaf=null;
 const reduceMotion=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 function appendLiveWord(part,{animate=true,interim=false}={}){
  if(live.childNodes.length)live.append(document.createTextNode(' '));
  const word=document.createElement('span');word.className=interim?'sv-live-word sv-live-interim':'sv-live-word';
  if(!animate)word.style.animation='none';word.textContent=part;live.append(word);
 }
 function paintLive(text,{animate=true,stream=false,finalCount}={}){
  const next=String(text||'').replace(/\s+/g,' ').trim();
  clearTimeout(dictateTimer);
  if(!next){liveHeard='';live.replaceChildren();live.classList.remove('sv-live-active');return;}
  live.classList.add('sv-live-active');
  if(!animate||reduceMotion()){liveHeard=next;live.textContent=next;return;}
  const prevWords=liveHeard?liveHeard.split(/\s+/).filter(Boolean):[];
  const nextWords=next.split(/\s+/).filter(Boolean);
  let shared=0;while(shared<prevWords.length&&shared<nextWords.length&&prevWords[shared]===nextWords[shared])shared+=1;
  liveHeard=next;
  const settled=finalCount==null?nextWords.length:Math.min(finalCount,nextWords.length);
  if(stream){
   if(shared<prevWords.length||!live.childElementCount){
    live.replaceChildren();
    nextWords.forEach((part,index)=>appendLiveWord(part,{animate:index>=shared,interim:index>=settled}));
    return;
   }
   for(let index=shared;index<nextWords.length;index+=1)appendLiveWord(nextWords[index],{interim:index>=settled});
   [...live.querySelectorAll('.sv-live-word')].forEach((word,index)=>word.classList.toggle('sv-live-interim',index>=settled));
   return;
  }
  live.replaceChildren();let index=0;
  const tick=()=>{if(disposed||!live.isConnected){live.textContent=next;return;}
   if(index>=nextWords.length)return;
   appendLiveWord(nextWords[index]);index+=1;if(index<nextWords.length)dictateTimer=setTimeout(tick,42);
  };tick();
 }
 function stopSpeech(){try{speech?.stop();}catch{}speech=null;}
 function startSpeech(){
  stopSpeech();const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SpeechRecognition)return;
  const current=speech=new SpeechRecognition();current.lang='tr-TR';current.interimResults=true;current.continuous=true;let finalText='';
  current.onresult=event=>{let interim='';for(let i=event.resultIndex;i<event.results.length;i++){const piece=event.results[i][0].transcript;if(event.results[i].isFinal)finalText+=piece+' ';else interim+=piece;}
   const settled=finalText.replace(/\s+/g,' ').trim().split(/\s+/).filter(Boolean).length;
   paintLive((finalText+interim).replace(/\s+/g,' ').trim(),{stream:true,finalCount:settled});};
  current.onerror=()=>{};current.onend=()=>{if(speech===current)speech=null;};
  try{current.start();}catch{speech=null;}
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
  page.dataset.voice=state;mic.setAttribute('aria-pressed',String(state==='listening'));mic.querySelector('.sv-mic-label').textContent=state==='listening'?'Dinleniyor':'Dinlemeye başla';
  if(state==='listening')startSpeech();else stopSpeech();
  if(state==='listening')paintLive('');
  if(state!=='listening'){targetLevel=0;if(!levelRaf)levelRaf=requestAnimationFrame(pumpLevel);}
  if(!busy)reply.textContent={listening:'Dinliyorum…',thinking:'Anlıyorum…',idle:'Konuşmak için dokun',error:'Tekrar denemek için dokun'}[state]||'';
 }
 const voice=createVoiceSession({
  onAudio:async blob=>{const heard=liveHeard;try{await interpret({mime:blob.type,base64:await blobBase64(blob)},{voice:true,heard});}catch(e){message(e.message,'assistant',{instant:true});}finally{if(!disposed&&voiceActive&&!busy)voice.resume();}},
  onState:voiceState,onError:text=>message(text,'assistant',{instant:true}),
  onLevel:level=>{targetLevel=Math.min(1,Number(level)||0);if(!levelRaf)levelRaf=requestAnimationFrame(pumpLevel);},
 });
 function message(text,role='assistant',{instant=false}={}){
  const node=document.createElement('div');node.className='sv-chat-message sv-chat-'+role;$('#assistantMessages').append(node);conversation.push({role,text});if(conversation.length>16)conversation.shift();
  const done=()=>requestAnimationFrame(()=>{if(node.isConnected)node.scrollIntoView({block:'nearest',behavior:'smooth'});});
  if(role!=='assistant'||instant||reduceMotion()){node.textContent=text;done();return node;}
  const parts=text.split(/(\s+)/).filter((part,i,arr)=>part||(i&&arr[i-1]));let index=0;node.classList.add('sv-typing');
  const tick=()=>{if(disposed||!node.isConnected){node.textContent=text;node.classList.remove('sv-typing');return;}
   if(index>=parts.length){node.classList.remove('sv-typing');done();return;}
   const word=document.createElement('span');word.className='sv-type-word';word.textContent=parts[index];node.append(word);
   index+=1;const timerId=setTimeout(tick,parts[index-1]?.trim()?30:10);typeTimers.add(timerId);
  };tick();return node;
 }
 function setBusy(value,label=''){busy=value;if(value){voice.pause();voiceState('thinking');}$('#assistantInterpret').disabled=value;$('#assistantScan').disabled=value;$('#assistantMic').disabled=value;form.querySelectorAll('input,select').forEach(n=>n.disabled=value);if(!value&&draft.scope==='all')form.querySelectorAll('[name=account]').forEach(n=>n.disabled=true);reply.textContent=label;}
 function invalidate(){scanVersion++;groups=[];snapshot=null;preview?.close();preview=null;$('#assistantResults').replaceChildren();}
 function sync(){for(const key of ['scope','customer','start','end','direction','layout'])field(key).value=draft[key]||'';field('collections').value=typeof draft.withCollections==='boolean'?(draft.withCollections?'yes':'no'):'';form.querySelectorAll('[name=account]').forEach(cb=>{cb.checked=draft.scope==='all'||(draft.accountIds||[]).includes(cb.value);cb.disabled=draft.scope==='all';});$('#assistantSummary').textContent=[{selected:'Seçili Hesaplar',all:'Tüm Hesaplar',cari:'Cari'}[draft.scope],draft.customer,draft.start&&`${draft.start} → ${draft.end}`].filter(Boolean).join(' · ')||'Rapor seçimleri';}
 function merge(intent){
  if(intent.scope&&intent.scope!==draft.scope){draft.scope=intent.scope;if(intent.scope==='selected')draft.accountIds=accounts.map(a=>a.id);if(intent.scope==='cari')draft.accountIds=context.activeAccountId?[context.activeAccountId]:[];}
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
   for(const [index,a] of accounts.entries()){const b=document.createElement('button');b.type='button';b.className='sv-choice';b.textContent=a.name;b.style.setProperty('--sv-choice-i',String(index));b.setAttribute('aria-pressed',String((draft.accountIds||[]).includes(a.id)));b.onclick=()=>{if(busy)return;const ids=new Set(draft.accountIds||[]);ids.has(a.id)?ids.delete(a.id):ids.add(a.id);draft.accountIds=[...ids];sync();b.setAttribute('aria-pressed',String(ids.has(a.id)));};choices.append(b);}
   options=[['Seçtiğim hesaplarla devam',{}],['Tüm hesapları seç',{accountIds:accounts.map(a=>a.id)}]];
  }
  const base=choices.childElementCount;
  options.forEach(([label,value],index)=>{const b=document.createElement('button');b.className='sv-choice';b.type='button';b.textContent=label;b.style.setProperty('--sv-choice-i',String(base+index));b.onclick=()=>{if(busy)return;message(label,'user',{instant:true});invalidate();merge(value);void advance();};choices.append(b);});
 }
 form.addEventListener('input',()=>{if(!busy)invalidate();});
 form.addEventListener('change',()=>{if(busy)return;draft={...draft,...Object.fromEntries(['scope','customer','start','end','direction','layout'].map(k=>[k,field(k).value])),withCollections:field('collections').value?field('collections').value==='yes':undefined,accountIds:[...form.querySelectorAll('[name=account]:checked')].map(n=>n.value)};sync();});
 async function interpret(audio,{voice:spokenInput=false,heard=''}={}){
  if(audio instanceof Event)audio=undefined;if(busy)return;
  voice.pause();stopSpeech();const spoken=spokenInput;const text=$('#assistantCommand').value.trim()||String(heard||'').trim();if(!text&&!audio)return;
  const version=scanVersion,requestSeq=++commandSeq;setBusy(true,'Anlıyorum…');if(text&&!audio)message(text,'user',{instant:true});$('#assistantCommand').value='';
  try{
   const quick=parseQuickIntent(text,{awaiting,accounts,draft});let intent=quick.intent;
   if(spoken||!quick.handled||audio){
    try{
     const result=await assistantRequest('/interpret',{text,context:{draft,awaiting,accounts:accounts.map(a=>({id:a.id,name:a.name})),customers:groups.slice(0,12).map(g=>({name:g.name,tax:g.tax})),route:context.route,conversation:conversation.slice(-8)},...(audio?{audio}:{})});
     if(disposed||version!==scanVersion)return;
     const transcript=result.transcript?.trim()||text;
     if(transcript){paintLive(transcript,{animate:!liveHeard||fold(liveHeard)!==fold(transcript)});message(transcript,'user',{instant:true});}
     if(/^(yeni istek|yeni rapor|bastan basla|sifirla)$/.test(fold(transcript))){reset();return;}
     if(preview){const command=fold(transcript).replace(/[.!?]/g,'').trim();if(/^(gonder|gonder gelsin|evet gonder|onayliyorum|whatsapp.?a gonder)$/.test(command)){const send=$('#assistantResults .sv-confirm-send');if(send&&!send.disabled){send.click();message('Gönderimi takip ediyorum.','assistant',{instant:true});}return;}if(/^(iptal|vazgec|hayir)$/.test(command)){invalidate();message('Gönderim iptal edildi. Başka bir rapor söyleyebilirsin.');return;}}

     if(!preview&&snapshot&&groups.length>1){
      const answer=fold(transcript).replace(/[.!?]/g,'').trim();
      const ordinal=answer.match(/^(birinci|ikinci|ucuncu|dorduncu|besinci|altinci|[1-6])(?:yi|sini|si|i)?(?: sec| hazirla| olsun)?$/);
      const index=ordinal?(Number(ordinal[1])||['birinci','ikinci','ucuncu','dorduncu','besinci','altinci'].indexOf(ordinal[1])+1)-1:-1;
      const chosen=index>=0&&groups[index]?[groups[index]]:matchReportGroups(groups,transcript);
      if(chosen.length===1){$('#assistantResults').replaceChildren();preview=await previewReport({groups:chosen,...snapshot,target:$('#assistantResults')});message('Rapor hazır. Göndermek için “gönder” de.');return;}
     }
     const understood=Object.values(result.intent||{}).some(v=>v!==null&&v!==undefined);
     if(understood)intent=result.intent;else if(!Object.keys(quick.intent).length){message('Cari rapor hazırlayabilir, hesapları tarayabilir, Excel ve görseli WhatsApp’a gönderebilirim. Müşteriyi, hesapları ve dönemi söyleyerek başlayabilirsin.');return;}
    }catch(error){if(!Object.keys(quick.intent).length)throw error;}
   }
   if(disposed||version!==scanVersion)return;invalidate();merge(intent);setBusy(false);await advance();
  }catch(error){if(!disposed&&version===scanVersion)message(error.message,'assistant',{instant:true});}finally{if(!disposed&&requestSeq===commandSeq){setBusy(false);if(voiceActive)voice.resume();}}
 }
 $('#assistantInterpret').onclick=interpret;
 $('#assistantCommand').onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();void interpret();}};
 function reset(){commandSeq++;invalidate();conversation.length=0;draft=defaults();sync();$('#assistantMessages').replaceChildren();$('#assistantChoices').replaceChildren();$('#assistantCommand').value='';paintLive('');awaiting=null;setBusy(false);message('Hangi müşterinin raporunu hazırlayayım?');}
 $('#assistantReset').onclick=()=>{voice.pause();stopSpeech();reset();if(voiceActive)voice.resume();};
 $('#assistantMic').onclick=async()=>{if(busy)return;if(page.dataset.voice==='listening'){voiceActive=false;voice.pause();stopSpeech();voiceState('idle');return;}voiceActive=true;await voice.start();};
 const visibility=()=>{if(document.hidden){voiceActive=false;voice.pause();stopSpeech();voiceState('idle');}};document.addEventListener('visibilitychange',visibility);
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
   groups=matchReportGroups(scanned,query);snapshot={options,accounts:selected};
   const results=$('#assistantResults');results.replaceChildren();
   if(!groups.length){progress.textContent='Bu dönem ve filtrelerde müşteri bulunamadı. Adı, VKN’yi veya tarih aralığını kontrol edin.';return;}
   progress.textContent=`${groups.length} müşteri bulundu. Gönderilecek müşteriyi seç.`;
   if(groups.length===1){progress.textContent=`${groups[0].name} bulundu. Excel ve görsel hazırlanıyor…`;preview=await previewReport({groups,...snapshot,target:results});if(disposed||version!==scanVersion){preview?.close();return;}progress.textContent='Rapor hazır. Göndermek için “gönder” de.';return;}
   groups.forEach((g,index)=>{const label=document.createElement('label');label.className='sv-assistant-customer';label.innerHTML=`<input type="checkbox" value="${index}" ${groups.length===1?'checked':''}><span><strong>${escapeHtml(g.name)}</strong><small>${escapeHtml(g.tax||'VKN yok')} · ${g.rows.length} hareket · Dönem neti ${escapeHtml(summarizeRows(g.rows).net)} TL</small></span>`;results.append(label);});
   const send=document.createElement('button');send.className='btn btn-primary';send.type='button';send.textContent='Excel ve görseli önizle';results.append(send);
   send.onclick=async()=>{send.disabled=true;try{const chosen=[...results.querySelectorAll('input:checked')].map(cb=>groups[Number(cb.value)]);preview=await previewReport({groups:chosen,...snapshot,target:results});}catch(error){message(error.message,'assistant',{instant:true});}finally{send.disabled=false;}};
  }catch(error){progress.textContent=error.message;}finally{if(!disposed&&version===scanVersion){setBusy(false);if(voiceActive)voice.resume();}}
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
 return {page,title:'Asistan',cleanup(){disposed=true;voiceActive=false;voice.close();stopSpeech();clearTimeout(dictateTimer);if(levelRaf)cancelAnimationFrame(levelRaf);document.removeEventListener('visibilitychange',visibility);scanVersion++;typeTimers.forEach(clearTimeout);preview?.close();}};
}
