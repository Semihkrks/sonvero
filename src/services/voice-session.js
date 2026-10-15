/** One microphone grant and stream per open assistant. Each utterance gets a fresh recorder. */
export function createVoiceSession({onAudio,onState,onError,mediaDevices=navigator.mediaDevices,Recorder=globalThis.MediaRecorder,Audio=globalThis.AudioContext||globalThis.webkitAudioContext}){
 let stream,context,source,analyser,recorder,frame,closed=false,paused=true,opening=null,sequence=0;
 const stopLoop=()=>{cancelAnimationFrame(frame);frame=null;};
 async function start(){
  if(closed)return;
  if(opening)return opening;
  opening=(async()=>{
   if(!mediaDevices?.getUserMedia||!Recorder||!Audio)throw new Error('Sesli asistan bu tarayıcıda desteklenmiyor. Güncel Safari veya Chrome ile aç.');
   if(!stream||!stream.getAudioTracks().some(t=>t.readyState==='live'))stream=await mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
   if(closed){stream.getTracks().forEach(t=>t.stop());return;}
   if(!context){context=new Audio();source=context.createMediaStreamSource(stream);analyser=context.createAnalyser();analyser.fftSize=1024;source.connect(analyser);}
   await context.resume();if(closed)return;resume();
  })().catch(error=>{if(closed)return;onState('error');onError(error.name==='NotAllowedError'?'Mikrofona izin verilmedi. Cihazın site ayarlarından izin verip tekrar dokun.':error.message);}).finally(()=>{opening=null;});
  return opening;
 }
 function resume(){
  if(closed||!stream||!context)return;
  if(recorder?.state==='recording')return;
  paused=false;stream.getAudioTracks().forEach(t=>t.enabled=true);
  const mime=['audio/webm;codecs=opus','audio/mp4','audio/ogg;codecs=opus','audio/webm'].find(m=>Recorder.isTypeSupported(m));
  if(!mime){onError('Ses kaydı biçimi desteklenmiyor.');return;}
  const current=++sequence,chunks=[];let started=performance.now(),lastSound=started,voiced=0,previous=started;
  recorder=new Recorder(stream,{mimeType:mime});const active=recorder;
  active.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
  active.onstop=()=>{if(closed||current!==sequence||voiced<250)return;onState('thinking');void onAudio(new Blob(chunks,{type:mime.split(';')[0]}));};
  active.onerror=()=>{pause();onState('error');onError('Ses kaydı kesildi. Yeniden dokunarak deneyebilirsin.');};
  active.start();onState('listening');const samples=new Float32Array(analyser.fftSize);
  const tick=()=>{if(closed||paused||current!==sequence)return;const now=performance.now();analyser.getFloatTimeDomainData(samples);const rms=Math.sqrt(samples.reduce((sum,n)=>sum+n*n,0)/samples.length);if(rms>0.018){voiced+=Math.min(now-previous,100);lastSound=now;}previous=now;
   if((voiced>=250&&now-lastSound>1400)||now-started>25000){paused=true;stopLoop();stream.getAudioTracks().forEach(t=>t.enabled=false);active.stop();if(voiced<250){onState('idle');}return;}
   frame=requestAnimationFrame(tick);
  };frame=requestAnimationFrame(tick);
 }
 function pause(){paused=true;sequence++;stopLoop();if(recorder?.state==='recording')recorder.stop();stream?.getAudioTracks().forEach(t=>t.enabled=false);}
 function finish(){if(recorder?.state!=='recording')return;paused=true;stopLoop();stream?.getAudioTracks().forEach(t=>t.enabled=false);recorder.stop();}
 function close(){closed=true;pause();source?.disconnect();stream?.getTracks().forEach(t=>t.stop());void context?.close();}
 return {start,resume,pause,finish,close};
}
