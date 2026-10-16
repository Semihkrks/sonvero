// @vitest-environment jsdom
import {it,expect,vi,afterEach} from 'vitest';
import {createVoiceSession,createMicrophoneLease} from '../src/services/voice-session.js';
afterEach(()=>vi.restoreAllMocks());
function harness(){
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
  createAnalyser(){return {fftSize:1024,getFloatTimeDomainData:array=>array.fill(sound)};}
  async resume(){} close(){close();}
 }
 const onAudio=vi.fn(),onError=vi.fn(),onState=vi.fn(),onLevel=vi.fn();
 const voice=createVoiceSession({mediaDevices,Recorder,Audio,onAudio,onError,onState,onLevel});
 const tick=(ms,level)=>{now+=ms;sound=level;const run=nextFrame;nextFrame=null;run?.();};
 const utterance=()=>{for(let i=0;i<4;i++)tick(100,.1);tick(1600,0);};
 return {voice,track,stream,Audio,Recorder,mediaDevices,recorders,onAudio,onError,onState,onLevel,utterance,close,disconnect};
}
afterEach(()=>vi.unstubAllGlobals());
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
