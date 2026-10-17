import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {createAssistantSpeech} from '../src/services/assistant-speech.js';

class Utterance {
 constructor(text){this.text=text;}
}
function harness(options={}){
 const listeners=new Set();
 const synthesis={
  getVoices:vi.fn(()=>[{lang:'tr-TR',localService:true,name:'Turkish'}]),
  speak:vi.fn(),cancel:vi.fn(),resume:vi.fn(),
  addEventListener:vi.fn((name,listener)=>listeners.add(listener)),
  removeEventListener:vi.fn((name,listener)=>listeners.delete(listener)),
 };
 const onSpeaking=vi.fn(),onDone=vi.fn(),onUnavailable=vi.fn();
 const speech=createAssistantSpeech({synthesis,Utterance,onSpeaking,onDone,onUnavailable,...options});
 return {speech,synthesis,onSpeaking,onDone,onUnavailable,voicesChanged:()=>listeners.forEach(fn=>fn()),last:()=>synthesis.speak.mock.calls.at(-1)?.[0]};
}
beforeEach(()=>vi.useFakeTimers());
afterEach(()=>vi.useRealTimers());

describe('native Turkish spoken replies',()=>{
 it('primes synchronously from the initial tap without starting the reply lifecycle',()=>{
  const h=harness();expect(h.speech.activate()).toBe(true);
  expect(h.last()).toMatchObject({lang:'tr-TR',volume:0});
  expect(h.onSpeaking).not.toHaveBeenCalled();expect(h.onDone).not.toHaveBeenCalled();
  expect(h.speech.isSpeaking()).toBe(false);h.speech.dispose();
 });
 it('prefers a local Turkish voice and pauses microphone before submitting speech',async()=>{
  const h=harness();h.synthesis.getVoices.mockReturnValue([{lang:'en-US',localService:true},{lang:'tr-TR',localService:false},{lang:'tr-TR',localService:true,name:'Local'}]);
  const result=h.speech.speak('İşlem tamamlandı.');
  expect(h.onSpeaking).toHaveBeenCalledOnce();expect(h.last()).toMatchObject({lang:'tr-TR',voice:{name:'Local'}});
  expect(h.onSpeaking.mock.invocationCallOrder[0]).toBeLessThan(h.synthesis.speak.mock.invocationCallOrder[0]);
  const utterance=h.last(),end=utterance.onend,error=utterance.onerror;utterance.onstart();end();error({error:'interrupted'});
  expect(await result).toEqual({reason:'ended',spoken:true});expect(h.onDone).toHaveBeenCalledOnce();expect(h.speech.isSpeaking()).toBe(false);h.speech.dispose();
 });
 it('waits briefly for voices and falls back to the platform Turkish language',async()=>{
  const h=harness({voiceWaitMs:200});h.synthesis.getVoices.mockReturnValue([]);
  const result=h.speech.speak('Bakiye 60 bin lira.');expect(h.speech.isSpeaking()).toBe(true);expect(h.synthesis.speak).not.toHaveBeenCalled();
  vi.advanceTimersByTime(200);expect(h.last()).toMatchObject({lang:'tr-TR'});expect(h.last().voice).toBeUndefined();
  h.last().onstart();h.last().onend();await result;h.speech.dispose();
 });
 it('uses voiceschanged without waiting the full timeout',async()=>{
  const h=harness();h.synthesis.getVoices.mockReturnValue([]);const result=h.speech.speak('Tamam.');
  h.synthesis.getVoices.mockReturnValue([{lang:'tr-TR',localService:true}]);h.voicesChanged();
  expect(h.synthesis.speak).toHaveBeenCalledOnce();vi.advanceTimersByTime(300);expect(h.synthesis.speak).toHaveBeenCalledOnce();
  h.last().onstart();h.last().onend();await result;h.speech.dispose();
 });
 it('supersedes a reply still waiting for voices and never queues stale audio',async()=>{
  const h=harness();h.synthesis.getVoices.mockReturnValue([]);const old=h.speech.speak('Eski yanıt');const current=h.speech.speak('Yeni yanıt');
  expect(await old).toEqual({reason:'superseded',spoken:false});vi.advanceTimersByTime(200);
  expect(h.synthesis.speak).toHaveBeenCalledOnce();expect(h.last().text).toBe('Yeni yanıt');
  h.speech.stop();expect(await current).toEqual({reason:'cancelled',spoken:false});expect(h.onDone).toHaveBeenCalledTimes(2);h.speech.dispose();
 });
 it('ignores delayed events after stopping active audio',async()=>{
  const h=harness();const result=h.speech.speak('Tamam');const utterance=h.last(),end=utterance.onend;utterance.onstart();h.speech.stop();end();
  expect(await result).toEqual({reason:'cancelled',spoken:true});expect(h.onDone).toHaveBeenCalledOnce();h.speech.dispose();
 });
 it('unblocks the microphone when the browser silently refuses or fails speech',async()=>{
  const h=harness({startTimeoutMs:100});const result=h.speech.speak('Tamam');vi.advanceTimersByTime(100);
  expect(await result).toEqual({reason:'timeout',spoken:false});expect(h.onDone).toHaveBeenCalledOnce();expect(h.onUnavailable).toHaveBeenCalledOnce();
  const next=h.speech.speak('Sonraki');h.last().onerror({error:'synthesis-failed'});expect(await next).toEqual({reason:'error',spoken:false});h.speech.dispose();
 });
 it('bounds a started utterance that never sends an end event',async()=>{
  const h=harness({maxSpeechMs:500});const result=h.speech.speak('Tamam');h.last().onstart();vi.advanceTimersByTime(500);
  expect(await result).toEqual({reason:'timeout',spoken:true});expect(h.onDone).toHaveBeenCalledOnce();h.speech.dispose();
 });
 it('falls back gracefully when unsupported and never requires a network provider',async()=>{
  const h=harness({synthesis:null});expect(h.speech.activate()).toBe(false);
  expect(await h.speech.speak('Tamam')).toEqual({reason:'unavailable',spoken:false});expect(h.onUnavailable).toHaveBeenCalledOnce();expect(h.onDone).toHaveBeenCalledOnce();h.speech.dispose();
 });
 it('cancels pending work and removes voice listeners on disposal',async()=>{
  const h=harness();h.synthesis.getVoices.mockReturnValue([]);const result=h.speech.speak('Tamam');h.speech.dispose();h.voicesChanged();vi.runAllTimers();
  expect(await result).toEqual({reason:'disposed',spoken:false});expect(h.synthesis.speak).not.toHaveBeenCalled();expect(h.synthesis.removeEventListener).toHaveBeenCalledOnce();expect(h.speech.activate()).toBe(false);
 });
 it('handles thrown platform errors without leaving a pending reply',async()=>{
  const h=harness();h.synthesis.speak.mockImplementation(()=>{throw new Error('Unavailable');});
  expect(await h.speech.speak('Tamam')).toEqual({reason:'error',spoken:false});expect(h.speech.isSpeaking()).toBe(false);expect(h.onDone).toHaveBeenCalledOnce();h.speech.dispose();
 });
});
