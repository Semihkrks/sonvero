// @vitest-environment jsdom
import {it,expect,vi,afterEach} from 'vitest';
const h=vi.hoisted(()=>({callbacks:null,start:vi.fn(),pause:vi.fn(),resume:vi.fn(),close:vi.fn()}));
vi.mock('../src/services/voice-session.js',()=>({createVoiceSession:options=>{h.callbacks=options;return h;}}));
vi.mock('../src/services/account-manager.js',()=>({listAccounts:async()=>[{id:'a',name:'Serkan Bingöl'}]}));
vi.mock('../src/services/assistant-client.js',()=>({assistantRequest:vi.fn(async()=>({connection:'ready'})),blobBase64:vi.fn()}));
import {mountAssistant} from '../src/pages/assistant.js';
import {createAssistantSpeech} from '../src/services/assistant-speech.js';
import {assistantRequest,blobBase64} from '../src/services/assistant-client.js';
let app;
afterEach(()=>{app?.cleanup();vi.restoreAllMocks();vi.clearAllMocks();document.body.replaceChildren();});
async function setup(){
 HTMLElement.prototype.scrollIntoView=vi.fn();const utterances=[];
 class Utterance{constructor(text){this.text=text;}}
 const synthesis={getVoices:()=>[{lang:'tr-TR',localService:true}],speak:u=>utterances.push(u),cancel:vi.fn(),resume:vi.fn()};
 const speech=createAssistantSpeech({synthesis,Utterance,voiceWaitMs:0,onSpeaking:()=>app.pauseForSpeech(),onDone:()=>app.resumeAfterSpeech()});
 app=await mountAssistant({context:{},speech});document.body.append(app.page);app.page.querySelector('#assistantMic').click();
 const send=text=>{app.page.querySelector('#assistantCommand').value=text;app.page.querySelector('#assistantInterpret').click();};
 return {utterances,synthesis,send};
}
it('pauses the microphone for a spoken response, ignores echoed audio, and resumes on end',async()=>{
 const t=await setup();t.send('nasılsın');await vi.waitFor(()=>expect(t.utterances.filter(u=>u.text.trim())).toHaveLength(1));
 const reply=t.utterances.find(u=>u.text.trim());reply.onstart();expect(app.page.dataset.voice).toBe('speaking');expect(h.resume).not.toHaveBeenCalled();
 await h.callbacks.onAudio(new Blob(['echo'],{type:'audio/mp4'}));expect(blobBase64).not.toHaveBeenCalled();expect(assistantRequest.mock.calls.some(([url])=>url==='/interpret')).toBe(false);
 reply.onend();expect(h.resume).toHaveBeenCalled();
});
it('cancels spoken audio on hide without restarting the microphone',async()=>{
 const t=await setup();t.send('nasılsın');await vi.waitFor(()=>expect(t.utterances.filter(u=>u.text.trim())).toHaveLength(1));
 h.resume.mockClear();vi.spyOn(document,'hidden','get').mockReturnValue(true);document.dispatchEvent(new Event('visibilitychange'));
 expect(t.synthesis.cancel).toHaveBeenCalled();expect(h.resume).not.toHaveBeenCalled();expect(app.page.dataset.voice).toBe('idle');
});
it('supports tapping the orb to interrupt a reply and closes without late microphone resumption',async()=>{
 const t=await setup();t.send('nasılsın');await vi.waitFor(()=>expect(t.utterances.filter(u=>u.text.trim())).toHaveLength(1));
 app.page.querySelector('#assistantMic').click();expect(h.start).toHaveBeenCalledTimes(2);h.resume.mockClear();app.cleanup();expect(h.resume).not.toHaveBeenCalled();expect(h.close).toHaveBeenCalled();
});
