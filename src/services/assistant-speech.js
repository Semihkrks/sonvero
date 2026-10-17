/** Keep device speech brief; the complete response remains in the conversation. */
export function spokenReply(text){
 const value=String(text||'').replace(/Kayıt [a-f\d-]{32,36}/gi,'Kayıt kimliği ekranda').replace(/\s+/g,' ').trim();
 // A financial preview must keep the account, customer, amount and approval instruction together.
 // Never clip it at a character/word boundary, especially in an amount or date.
 if(/onaylıyorum|onayla|onayına/i.test(value))return value;
 const sentences=value.split(/(?<=[.!?])\s+/u);
 if(sentences.length<=3&&value.length<=420)return value;
 const selected=[];let length=0;
 for(const sentence of sentences){
  if(selected.length>=3||(selected.length&&length+sentence.length>420))break;
  selected.push(sentence);length+=sentence.length+1;
 }
 // A single unbroken sentence stays intact: cutting it could change a financial fact.
 return selected.length<sentences.length?selected.join(' ')+' Ayrıntılar ekranda.':value;
}

/** Device/browser speech only: no API key, paid provider, or audio request. */
export function createAssistantSpeech({
 onSpeaking,onDone,onUnavailable,
 synthesis=globalThis.speechSynthesis,Utterance=globalThis.SpeechSynthesisUtterance,
 voiceWaitMs=200,startTimeoutMs=2000,maxSpeechMs=20000,
}={}){
 let current=null,disposed=false,prime=null,primeTimer=null;
 const supported=()=>!disposed&&typeof synthesis?.speak==='function'&&typeof Utterance==='function';
 const notify=(callback,value)=>{try{callback?.(value);}catch{/* UI callbacks must not strand speech cleanup. */}};
 const cancel=()=>{try{synthesis?.cancel();}catch{/* Some browsers expose an unavailable speech service. */}};
 const voices=()=>{try{return synthesis?.getVoices?.()||[];}catch{return [];}};
 const turkishVoice=()=>{
  const available=voices().filter(voice=>/^tr(?:[-_]|$)/i.test(voice.lang||''));
  return available.find(voice=>voice.localService===true)||available.find(voice=>voice.default)||available[0];
 };
 function clearPrime(){
  clearTimeout(primeTimer);primeTimer=null;
  if(prime){prime.onend=null;prime.onerror=null;prime=null;}
 }
 function finish(reply,reason,shouldCancel=false){
  if(reply.finished)return;
  reply.finished=true;clearTimeout(reply.waitTimer);clearTimeout(reply.timer);
  if(reply.utterance){reply.utterance.onstart=null;reply.utterance.onend=null;reply.utterance.onerror=null;}
  if(current===reply)current=null;
  if(shouldCancel)cancel();
  const result={reason,spoken:reply.started};
  reply.resolve(result);
  if(['unavailable','error','timeout'].includes(reason))notify(onUnavailable,result);
  notify(onDone,result);
 }
 function start(reply){
  if(disposed||current!==reply||reply.finished||reply.utterance)return;
  clearTimeout(reply.waitTimer);
  try{
   const utterance=reply.utterance=new Utterance(reply.text);
   utterance.lang='tr-TR';utterance.rate=1;utterance.pitch=1;utterance.volume=1;
   const voice=turkishVoice();if(voice)utterance.voice=voice;
   utterance.onstart=()=>{
    if(current!==reply||reply.finished)return;
    reply.started=true;clearTimeout(reply.timer);
    reply.timer=setTimeout(()=>finish(reply,'timeout',true),maxSpeechMs);
   };
   // Explicitly release the browser's playback queue before the microphone is resumed.
   utterance.onend=()=>finish(reply,'ended',true);
   utterance.onerror=()=>finish(reply,'error',true);
   // A refusal can be silent (including iOS without a user gesture). Never leave the mic paused.
   reply.timer=setTimeout(()=>finish(reply,'timeout',true),startTimeoutMs);
   synthesis.resume?.();synthesis.speak(utterance);
  }catch{finish(reply,'error',true);}
 }
 function voiceChanged(){if(current&&!current.utterance&&turkishVoice())start(current);}
 try{synthesis?.addEventListener?.('voiceschanged',voiceChanged);}catch{/* Default language still works. */}
 function activate(){
  if(!supported())return false;
  if(current)return true;
  clearPrime();cancel();
  try{
   // Call synchronously from the SonAI tap, before microphone/network awaits. WebKit
   // removes its speech user-gesture restriction when speak() is called in a gesture.
   prime=new Utterance(' ');prime.lang='tr-TR';prime.volume=0;
   const pending=prime;
   const done=()=>{if(prime===pending)clearPrime();};pending.onend=done;pending.onerror=done;
   primeTimer=setTimeout(()=>{if(prime===pending){clearPrime();cancel();}},500);
   synthesis.resume?.();synthesis.speak(pending);return true;
  }catch{clearPrime();cancel();return false;}
 }
 function speak(text){
  if(current)finish(current,'superseded',true);
  clearPrime();
  const value=typeof text==='string'?text.trim():'';
  let resolve;const promise=new Promise(done=>{resolve=done;});
  const reply={text:value,resolve,finished:false,started:false,utterance:null,timer:null,waitTimer:null};
  current=reply;
  if(disposed){finish(reply,'disposed');return promise;}
  if(!value){finish(reply,'empty');return promise;}
  if(!supported()){finish(reply,'unavailable');return promise;}
  cancel();
  // The pending voice-selection phase also owns the microphone; pause before audio is queued.
  try{onSpeaking?.();}catch{finish(reply,'error',true);return promise;}
  if(current!==reply||reply.finished)return promise;
  if(turkishVoice()||voiceWaitMs<=0)start(reply);
  else reply.waitTimer=setTimeout(()=>start(reply),voiceWaitMs);
  return promise;
 }
 function stop(){clearPrime();if(current)finish(current,'cancelled',true);else cancel();}
 function dispose(){
  if(disposed)return;
  disposed=true;clearPrime();
  if(current)finish(current,'disposed',true);else cancel();
  try{synthesis?.removeEventListener?.('voiceschanged',voiceChanged);}catch{/* Already unavailable. */}
 }
 return {activate,speak,stop,dispose,isSpeaking:()=>Boolean(current)};
}
