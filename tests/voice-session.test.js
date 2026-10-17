// @vitest-environment jsdom
import {it,expect,vi,afterEach} from 'vitest';
import {createVoiceSession,createMicrophoneLease,activateVoiceAudio} from '../src/services/voice-session.js';
afterEach(()=>vi.restoreAllMocks());
function harness({spectrum=false}={}){
 let now=0,nextFrame,sound=0;
 vi.spyOn(performance,'now').mockImplementation(()=>now);
 vi.stubGlobal('requestAnimationFrame',fn=>{nextFrame=fn;return 1;});
 vi.stubGlobal('cancelAnimationFrame',()=>{nextFrame=null;});
 const track={readyState:'live',enabled:true,stop:vi.fn()},stream={getAudioTracks:()=>[track],getTracks:()=>[track]};
 const mediaDevices={getUserMedia:vi.fn(async()=>stream)},recorders=[];
 class Recorder{
  static isTypeSupported(mime){return mime==='audio/mp4';}
  constructor(){recorders.push(this);this.state='inactive';}
  start(){this.state='recording';}
  stop(){this.state='inactive';this.ondataavailable({data:new Blob(['audio'])});this.onstop();}
 }
 const disconnect=vi.fn(),close=vi.fn();
 class Audio{
  createMediaStreamSource(){return {connect:vi.fn(),disconnect};}
  createAnalyser(){return {fftSize:1024,frequencyBinCount:512,getFloatTimeDomainData:array=>array.fill(sound),...(spectrum?{getByteFrequencyData:array=>{array.fill(0);for(let bin=2;bin<7;bin++)array[bin]=160;}}:{})};}
  async resume(){} close(){close();}
 }
 const onAudio=vi.fn(),onError=vi.fn(),onState=vi.fn(),onLevel=vi.fn();
 const voice=createVoiceSession({mediaDevices,Recorder,Audio,onAudio,onError,onState,onLevel});
 const tick=(ms,level)=>{now+=ms;sound=level;const run=nextFrame;nextFrame=null;run?.();};
 const utterance=()=>{for(let i=0;i<4;i++)tick(100,.1);tick(1600,0);};
 return {voice,track,stream,Audio,Recorder,mediaDevices,recorders,onAudio,onError,onState,onLevel,utterance,close,disconnect};
}
afterEach(()=>vi.unstubAllGlobals());
it('does not request microphone access until listening is explicitly started',()=>{
 const h=harness();expect(h.mediaDevices.getUserMedia).not.toHaveBeenCalled();h.voice.close();
});
it('keeps a late permission grant muted when listening was paused',async()=>{
 const h=harness();let grant;h.mediaDevices.getUserMedia.mockImplementation(()=>new Promise(resolve=>{grant=resolve;}));
 const opening=h.voice.start();h.voice.pause();grant(h.stream);await opening;
 expect(h.recorders).toHaveLength(0);expect(h.track.enabled).toBe(false);
 await h.voice.resume();expect(h.recorders).toHaveLength(1);expect(h.mediaDevices.getUserMedia).toHaveBeenCalledOnce();h.voice.close();
});
it('ignores an old permission rejection after listening was cancelled',async()=>{
 const h=harness();let reject;h.mediaDevices.getUserMedia.mockImplementation(()=>new Promise((resolve,fail)=>{reject=fail;}));
 const opening=h.voice.start();h.voice.pause();reject(new Error('permission cancelled'));await opening;
 expect(h.onError).not.toHaveBeenCalled();expect(h.recorders).toHaveLength(0);h.voice.close();
});
it('can request a fresh microphone while a cancelled permission request is unresolved',async()=>{
 const h=harness();let firstGrant;h.mediaDevices.getUserMedia.mockImplementationOnce(()=>new Promise(resolve=>{firstGrant=resolve;}));
 const lease=createMicrophoneLease({mediaDevices:h.mediaDevices,idleMs:0});
 const first=lease.acquire();const cancelled=expect(first).rejects.toThrow('iptal');lease.releaseAll();
 const secondStream={getAudioTracks:()=>[],getTracks:()=>[]};h.mediaDevices.getUserMedia.mockResolvedValueOnce(secondStream);
 const second=lease.acquire();expect(h.mediaDevices.getUserMedia).toHaveBeenCalledTimes(2);
 firstGrant(h.stream);await cancelled;expect(await second).toBe(secondStream);expect(h.track.stop).toHaveBeenCalledOnce();lease.releaseAll();
});
it('records two utterances with one permission request and releases the mic on close',async()=>{
 const h=harness();await h.voice.start();h.utterance();
 expect(h.onAudio).toHaveBeenCalledOnce();expect(h.onAudio.mock.calls[0][0].type).toBe('audio/mp4');
 expect(h.track.enabled).toBe(false);
 h.voice.pause();await h.voice.resume();h.utterance();
 expect(h.onAudio).toHaveBeenCalledTimes(2);expect(h.mediaDevices.getUserMedia).toHaveBeenCalledOnce();expect(h.recorders).toHaveLength(2);
 h.voice.close();expect(h.track.stop).toHaveBeenCalledOnce();expect(h.close).toHaveBeenCalledOnce();
});
it('reuses a disabled microphone lease across panel opens with a fresh audio graph',async()=>{
 vi.useFakeTimers();const h=harness();const lease=createMicrophoneLease({mediaDevices:h.mediaDevices,idleMs:30000});
 const create=()=>createVoiceSession({microphone:lease,Audio:h.Audio,Recorder:h.Recorder,onAudio:h.onAudio,onState:h.onState,onError:h.onError});
 const first=create();await first.start();first.close();expect(h.track.enabled).toBe(false);expect(h.track.stop).not.toHaveBeenCalled();
 const second=create();await second.start();expect(h.track.enabled).toBe(true);h.utterance();expect(h.onAudio).toHaveBeenCalledOnce();expect(h.mediaDevices.getUserMedia).toHaveBeenCalledOnce();
 second.close();vi.advanceTimersByTime(30001);expect(h.track.stop).toHaveBeenCalledOnce();vi.useRealTimers();
});
it('does not start recording when permission arrives after close',async()=>{
 const h=harness();let grant;h.mediaDevices.getUserMedia.mockImplementation(()=>new Promise(resolve=>{grant=resolve;}));
 const opening=h.voice.start();h.voice.close();grant(h.stream);await opening;
 expect(h.recorders).toHaveLength(0);expect(h.track.stop).toHaveBeenCalledOnce();expect(h.onAudio).not.toHaveBeenCalled();
});
it('rebuilds its graph when iOS ends the old track',async()=>{
 const h=harness();await h.voice.start();h.track.readyState='ended';h.track.onended();
 const next={readyState:'live',enabled:true,stop:vi.fn()};h.mediaDevices.getUserMedia.mockResolvedValue({getAudioTracks:()=>[next],getTracks:()=>[next]});
 await h.voice.resume();h.utterance();expect(h.mediaDevices.getUserMedia).toHaveBeenCalledTimes(2);expect(h.onAudio).toHaveBeenCalledOnce();h.voice.close();
});
it('discards an interrupted utterance and ignores recording after closing',async()=>{
 const h=harness();await h.voice.start();h.voice.pause();expect(h.onAudio).not.toHaveBeenCalled();
 await h.voice.start();expect(h.mediaDevices.getUserMedia).toHaveBeenCalledOnce();
 h.voice.close();h.utterance();await h.voice.start();expect(h.onAudio).not.toHaveBeenCalled();expect(h.mediaDevices.getUserMedia).toHaveBeenCalledOnce();
});
it('reports voice level while listening and resets on pause',async()=>{
 const h=harness();await h.voice.start();
 h.utterance();
 expect(h.onLevel.mock.calls.some(([level])=>level>0)).toBe(true);
 expect(h.onLevel).toHaveBeenLastCalledWith(0);
 h.voice.pause();
 expect(h.onLevel).toHaveBeenLastCalledWith(0);
});
it('reports five independent frequency bands and silences them when voice ends',async()=>{
 const h=harness({spectrum:true});await h.voice.start();h.utterance();
 const spoken=h.onLevel.mock.calls.find(([level,bands])=>level>0&&bands?.length===5);
 expect(spoken[1][0]).toBeGreaterThan(0);expect(spoken[1][4]).toBe(0);
 const silence=h.onLevel.mock.calls.find(([level,bands])=>level===0&&bands?.length===5);
 expect(silence[1]).toEqual([0,0,0,0,0]);h.voice.close();
});
it('uses recording for consecutive utterances even when browser live recognition is available',async()=>{
 const recognition=vi.fn(()=>{throw new Error('Live recognition must not be started');});
 vi.stubGlobal('SpeechRecognition',recognition);vi.stubGlobal('webkitSpeechRecognition',recognition);
 const h=harness();vi.stubGlobal('AudioContext',h.Audio);const activation=activateVoiceAudio();expect(activation).toBeInstanceOf(h.Audio);activation.close();
 await h.voice.start();h.utterance();await h.voice.resume();h.utterance();await h.voice.resume();h.utterance();
 expect(h.onAudio).toHaveBeenCalledTimes(3);expect(h.mediaDevices.getUserMedia).toHaveBeenCalledOnce();expect(recognition).not.toHaveBeenCalled();h.voice.close();
});
