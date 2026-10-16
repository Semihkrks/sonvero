/** Reuse a disabled stream briefly between panel opens; never record outside the panel. */
export function createMicrophoneLease({mediaDevices=globalThis.navigator?.mediaDevices,idleMs=30000}={}){
 let stream,pending,timer,users=0,generation=0;
 function releaseAll(){generation++;clearTimeout(timer);stream?.getTracks().forEach(track=>track.stop());stream=null;}
 async function acquire(){
  clearTimeout(timer);users++;
  try{
   if(!stream?.getAudioTracks().some(track=>track.readyState==='live')){
    if(!mediaDevices?.getUserMedia)throw new Error('Mikrofon bu tarayıcıda desteklenmiyor.');
    if(!pending){const current=generation;pending=mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}}).then(value=>{
     if(current!==generation){value.getTracks().forEach(track=>track.stop());throw new Error('Mikrofon açılışı iptal edildi.');}
     stream=value;return value;
    }).finally(()=>{pending=null;});}
    await pending;
   }
   return stream;
  }catch(error){users=Math.max(0,users-1);throw error;}
 }
 function release(){users=Math.max(0,users-1);if(users)return;stream?.getAudioTracks().forEach(track=>track.enabled=false);clearTimeout(timer);if(!idleMs)releaseAll();else timer=setTimeout(releaseAll,idleMs);}
 return {acquire,release,releaseAll};
}
const sharedMicrophone=createMicrophoneLease();
export function activateVoiceAudio(){
 const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;
 if(!Audio)return;
 const context=new Audio();void context.resume().catch(()=>{});return context;
}
if(typeof window!=='undefined'){
 window.addEventListener('pagehide',()=>sharedMicrophone.releaseAll());
 document.addEventListener('visibilitychange',()=>{if(document.hidden)sharedMicrophone.releaseAll();});
}

/** Each session owns its audio graph and each utterance owns its recorder. */
export function createVoiceSession({onAudio,onState,onError,onLevel,mediaDevices=globalThis.navigator?.mediaDevices,Recorder=globalThis.MediaRecorder,Audio=globalThis.AudioContext||globalThis.webkitAudioContext,microphone,audioContext}={}){
 const lease=microphone||(mediaDevices===globalThis.navigator?.mediaDevices?sharedMicrophone:createMicrophoneLease({mediaDevices,idleMs:0}));
 let stream,context=audioContext,source,analyser,recorder,frame,closed=false,paused=true,opening=null,sequence=0,leased=false;
 const stopLoop=()=>{cancelAnimationFrame(frame);frame=null;};
 const notifyError=error=>{if(closed)return;pause();onState('error');onError(error?.name==='NotAllowedError'?'Mikrofon izni gerekli. iPhone’da Safari site ayarlarından mikrofonu İzin Ver olarak ayarlayabilirsin.':error?.message||'Mikrofon açılamadı. Yeniden dokunarak deneyebilirsin.');};
 function disconnect(){source?.disconnect();source=null;analyser=null;}
 async function start(){
  if(closed)return;
  if(opening)return opening;
  // Resume in the user's tap, before any permission/network await (important on iOS).
  let activation;
  try{if(!Recorder||!Audio)throw new Error('Sesli asistan bu tarayıcıda desteklenmiyor.');if(!context||context.state==='closed')context=new Audio();activation=Promise.resolve(context.resume());activation.catch(()=>{});}catch(error){notifyError(error);return;}
  const requestedSequence=sequence;
  opening=(async()=>{
   if(!stream?.getAudioTracks().some(track=>track.readyState==='live')){
    onState('requesting');
    disconnect();if(leased){lease.release();leased=false;}
    stream=await lease.acquire();leased=true;
    if(closed){lease.release();leased=false;return;}
    source=context.createMediaStreamSource(stream);analyser=context.createAnalyser();analyser.fftSize=1024;source.connect(analyser);
    for(const track of stream.getAudioTracks())track.onended=()=>{if(!closed&&!paused){pause();onState('idle');}};
   }
   await activation;if(closed||requestedSequence!==sequence)return;
   if(context.state==='suspended'||context.state==='interrupted')await context.resume();
   record();
  })().catch(notifyError).finally(()=>{opening=null;});
  return opening;
 }
 function resume(){if(!closed)return start();}
 function record(){
  if(closed||!stream||!analyser||recorder?.state==='recording')return;
  paused=false;stream.getAudioTracks().forEach(track=>track.enabled=true);
  const mime=['audio/webm;codecs=opus','audio/mp4','audio/ogg;codecs=opus','audio/webm'].find(type=>Recorder.isTypeSupported(type));
  if(!mime)throw new Error('Ses kaydı biçimi desteklenmiyor.');
  const current=++sequence,chunks=[];const started=performance.now();let lastSound=started,voiced=0,previous=started;
  const active=recorder=new Recorder(stream,{mimeType:mime});
  active.ondataavailable=event=>{if(event.data.size)chunks.push(event.data);};
  active.onstop=()=>{onLevel?.(0);if(closed||current!==sequence)return;if(voiced<250||!chunks.length){onState('idle');return;}onState('thinking');void onAudio(new Blob(chunks,{type:mime.split(';')[0]}));};
  active.onerror=()=>notifyError(new Error('Ses kaydı kesildi. Yeniden dokunarak deneyebilirsin.'));
  active.start();onState('listening');const samples=new Float32Array(analyser.fftSize);
  const tick=()=>{
   if(closed||paused||current!==sequence)return;
   if(context.state==='suspended'||context.state==='interrupted'){pause();onState('idle');return;}
   const now=performance.now();analyser.getFloatTimeDomainData(samples);const rms=Math.sqrt(samples.reduce((sum,n)=>sum+n*n,0)/samples.length);
   onLevel?.(Math.min(1,rms*8));if(rms>0.018){voiced+=Math.min(now-previous,100);lastSound=now;}previous=now;
   if(voiced>=250&&now-lastSound>1500){finish();return;}
   if(now-started>25000){if(voiced>=250)finish();else{pause();onState('idle');}return;}
   frame=requestAnimationFrame(tick);
  };frame=requestAnimationFrame(tick);
 }
 function pause(){paused=true;sequence++;stopLoop();onLevel?.(0);if(recorder?.state==='recording')recorder.stop();stream?.getAudioTracks().forEach(track=>track.enabled=false);}
 function finish(){if(recorder?.state!=='recording')return;paused=true;stopLoop();onLevel?.(0);stream?.getAudioTracks().forEach(track=>track.enabled=false);recorder.stop();}
 function close(){if(closed)return;closed=true;pause();disconnect();if(leased){lease.release();leased=false;}void context?.close();}
 return {start,resume,pause,finish,close};
}
