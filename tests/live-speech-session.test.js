// @vitest-environment jsdom
import {it,expect,vi,afterEach} from 'vitest';
import {createVoiceSession} from '../src/services/voice-session.js';
afterEach(()=>vi.useRealTimers());
function harness(){
 vi.useFakeTimers();const recognizers=[];
 class Recognition{
  constructor(){recognizers.push(this);this.stop=vi.fn();this.abort=vi.fn();}
  start(){this.onstart();}
 }
 const onText=vi.fn(),onFinalText=vi.fn(),onState=vi.fn(),onError=vi.fn(),onLevel=vi.fn();
 const mediaDevices={getUserMedia:vi.fn()},Recorder=vi.fn();
 const voice=createVoiceSession({Recognition,onText,onFinalText,onState,onError,onLevel,mediaDevices,Recorder});
 const result=(recognizer,parts)=>recognizer.onresult({resultIndex:0,results:parts.map(([text,final=false])=>({0:{transcript:text},isFinal:final}))});
 return {voice,recognizers,result,onText,onFinalText,onState,onError,mediaDevices,Recorder};
}
it('streams interim Turkish text before a sentence ends and owns only one microphone path',()=>{
 const h=harness();h.voice.start();const recognition=h.recognizers[0];
 expect(recognition.lang).toBe('tr-TR');expect(recognition.interimResults).toBe(true);
 h.result(recognition,[['Ayşe']]);expect(h.onText).toHaveBeenLastCalledWith('Ayşe',{finalCount:0});expect(h.onFinalText).not.toHaveBeenCalled();
 h.result(recognition,[['Ayşe Karabut']]);expect(h.onText.mock.calls.at(-1)[0]).toBe('Ayşe Karabut');
 expect(h.mediaDevices.getUserMedia).not.toHaveBeenCalled();expect(h.Recorder).not.toHaveBeenCalled();
 h.voice.close();
});
it('accepts corrected partial results and commits the final command once',()=>{
 const h=harness();h.voice.start();const recognition=h.recognizers[0];
 h.result(recognition,[['Ayşe Kara']]);h.result(recognition,[['Ayşe Karabut',true],['eylül müşterileri']]);
 expect(h.onText).toHaveBeenLastCalledWith('Ayşe Karabut eylül müşterileri',{finalCount:2});
 h.voice.finish();h.voice.finish();expect(recognition.stop).toHaveBeenCalledOnce();expect(h.onFinalText).not.toHaveBeenCalled();
 h.result(recognition,[['Ayşe Karabut eylül müşterilerini getir',true]]);const ended=recognition.onend;ended();ended();
 expect(h.onFinalText).toHaveBeenCalledExactlyOnceWith('Ayşe Karabut eylül müşterilerini getir');h.voice.close();
});
it('ignores stale recognition events after closing or reopening the panel',()=>{
 const h=harness();h.voice.start();const recognition=h.recognizers[0],oldResult=recognition.onresult,oldEnd=recognition.onend;
 h.voice.pause();h.voice.start();oldResult({results:[{0:{transcript:'gönder'},isFinal:true}]});oldEnd();
 expect(h.onFinalText).not.toHaveBeenCalled();expect(h.onText).not.toHaveBeenCalled();expect(h.recognizers).toHaveLength(2);
 const latest=h.recognizers[1],latestResult=latest.onresult;h.voice.close();latestResult({results:[{0:{transcript:'gönder'},isFinal:true}]});
 expect(h.onFinalText).not.toHaveBeenCalled();expect(h.onText).not.toHaveBeenCalled();
});
it('does not execute partial text or open another microphone after an error',()=>{
 const h=harness();h.voice.start();h.result(h.recognizers[0],[['WhatsApp’a gönder']]);const ended=h.recognizers[0].onend;
 h.recognizers[0].onerror({error:'not-allowed'});ended();
 expect(h.onError).toHaveBeenCalledOnce();expect(h.onFinalText).not.toHaveBeenCalled();expect(h.mediaDevices.getUserMedia).not.toHaveBeenCalled();h.voice.close();
});
it('allows permission to start synchronously and waits for silence before stopping',()=>{
 const h=harness();h.voice.start();vi.advanceTimersByTime(13000);expect(h.onError).not.toHaveBeenCalled();
 h.result(h.recognizers[0],[['ilkini seç',true]]);vi.advanceTimersByTime(1499);expect(h.recognizers[0].stop).not.toHaveBeenCalled();
 vi.advanceTimersByTime(2);expect(h.recognizers[0].stop).toHaveBeenCalledOnce();h.voice.close();
});
it('does not mistake a delayed interim result for the end of speech',()=>{
 const h=harness();h.voice.start();h.result(h.recognizers[0],[['Ayşe']]);vi.advanceTimersByTime(2000);
 expect(h.recognizers[0].stop).not.toHaveBeenCalled();expect(h.onFinalText).not.toHaveBeenCalled();h.voice.close();
});
