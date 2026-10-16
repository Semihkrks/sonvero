/** Native recognition owns the microphone; never run a second recorder beside it on iOS. */
export function createLiveSpeechSession({Recognition,onText,onFinalText,onState,onError,onLevel}){
 let current=null,closed=false,sequence=0,finishing=false,silenceTimer,limitTimer,startTimer,endTimer;
 const clearTimers=()=>{clearTimeout(silenceTimer);clearTimeout(limitTimer);clearTimeout(startTimer);clearTimeout(endTimer);};
 function pause(){
  sequence++;clearTimers();const recognition=current;current=null;finishing=false;onLevel?.(0);
  if(recognition){recognition.onresult=null;recognition.onend=null;recognition.onerror=null;recognition.onstart=null;try{recognition.abort();}catch{}}
 }
 function finish(){if(!current||finishing)return;finishing=true;clearTimeout(silenceTimer);endTimer=setTimeout(()=>{if(!current)return;pause();onState('error');onError('Konuşma tanıma tamamlanamadı. Yeniden dokunarak deneyebilirsin.');},5000);try{current.stop();}catch{pause();onState('idle');}}
 function start(){
  if(closed||current)return;
  const version=++sequence,recognition=current=new Recognition();finishing=false;let transcript='',failed=false;
  const active=()=>!closed&&version===sequence&&current===recognition;
  recognition.lang='tr-TR';recognition.continuous=true;recognition.interimResults=true;recognition.maxAlternatives=1;
  recognition.onstart=()=>{if(!active())return;clearTimeout(startTimer);onState('listening');limitTimer=setTimeout(finish,25000);};
  recognition.onspeechstart=()=>{if(active()){clearTimeout(silenceTimer);onLevel?.(.4);}};
  recognition.onspeechend=()=>{if(active()){onLevel?.(0);clearTimeout(silenceTimer);silenceTimer=setTimeout(finish,1200);}};
  recognition.onresult=event=>{
   if(!active())return;let final='',interim='';
   // resultIndex is only the changed suffix; results contains the full current utterance.
   for(let index=0;index<event.results.length;index++){
    const result=event.results[index],part=result[0]?.transcript||'';
    if(result.isFinal)final+=part+' ';else interim+=part+' ';
   }
   transcript=(final+interim).replace(/\s+/g,' ').trim();
   onText?.(transcript,{finalCount:final.trim().split(/\s+/).filter(Boolean).length});
   onLevel?.(interim.trim()? .4:.15);
   // A slow interim update is not silence. Finish on speechend or a settled phrase.
   clearTimeout(silenceTimer);if(!finishing&&!interim.trim())silenceTimer=setTimeout(finish,1500);
  };
  recognition.onerror=event=>{
   if(!active())return;failed=true;
   const code=event.error;
   pause();onState(code==='no-speech'?'idle':'error');
   if(code==='no-speech'||code==='aborted')return;
   onError(code==='not-allowed'||code==='service-not-allowed'
    ?'Konuşma tanıma izni verilmedi. iPhone’da mikrofon ve Siri/Dikte izinlerini kontrol edip yeniden dokun.'
    :code==='language-not-supported'?'Türkçe konuşma tanıma bu cihazda kullanılamıyor. Cihazın dil ve dikte ayarlarını kontrol et.'
    :'Canlı konuşma tanıma bağlantısı kesildi. İnternet bağlantını kontrol edip tekrar dokun.');
  };
  recognition.onend=()=>{
   if(!active())return;clearTimers();current=null;finishing=false;onLevel?.(0);
   if(failed||!transcript){onState('idle');return;}
   onState('thinking');void onFinalText(transcript);
  };
  onState('requesting');
  startTimer=setTimeout(()=>{if(!active())return;pause();onState('error');onError('Konuşma tanıma başlatılamadı. Mikrofon izinlerini kontrol edip tekrar dokun.');},12000);
  try{recognition.start();}
  catch{pause();onState('error');onError('Konuşma tanıma açılamadı. Tekrar dokunarak deneyebilirsin.');}
 }
 function close(){if(closed)return;closed=true;pause();}
 return {start,resume:start,pause,finish,close};
}
