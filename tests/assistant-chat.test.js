// @vitest-environment jsdom
import {it,expect,vi,afterEach} from 'vitest';
const voiceHarness=vi.hoisted(()=>({callbacks:null,resume:vi.fn()}));
vi.mock('../src/services/voice-session.js',()=>({createVoiceSession:options=>{voiceHarness.callbacks=options;return {pause:vi.fn(),resume:voiceHarness.resume,start:vi.fn(),close:vi.fn()};}}));
vi.mock('../src/services/account-manager.js',()=>({listAccounts:async()=>[{id:'a',name:'Ayşe Karabut'},{id:'b',name:'Mert Sarısoy'}],getActiveAccountId:()=> 'a'}));
vi.mock('../src/services/assistant-client.js',()=>({assistantRequest:vi.fn(async()=>({connection:'ready',recipient:'905000000000',aiConfigured:true,jobs:[]})),blobBase64:vi.fn()}));
vi.mock('../src/services/report-data.js',()=>({fold:s=>String(s).toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i').trim(),summarizeRows:()=>({net:1}),matchReportGroups:groups=>groups,scanReport:vi.fn(async()=>[{name:'Harmanda',tax:'1234',rows:[]}])}));
vi.mock('../src/components/report-send.js',()=>({previewReport:vi.fn(async()=>({close:vi.fn()}))}));
import {mountAssistant} from '../src/pages/assistant.js';
import {scanReport} from '../src/services/report-data.js';
import {assistantRequest} from '../src/services/assistant-client.js';
import {previewReport} from '../src/components/report-send.js';
let app;
afterEach(()=>{app?.cleanup();document.body.replaceChildren();vi.clearAllMocks();});
it('continues the requested conversation locally and opens the single customer preview inline',async()=>{
 HTMLElement.prototype.scrollIntoView=vi.fn();
 app=await mountAssistant({context:{selected:{accountIds:['a'],direction:'both',withCollections:true}}});document.body.append(app.page);
 const send=text=>{app.page.querySelector('#assistantCommand').value=text;app.page.querySelector('#assistantInterpret').click();};
 send('seçili hesaplarda 9.ayda harmanda excelini bana gönder');
 await vi.waitFor(()=>expect(previewReport).toHaveBeenCalledOnce());
 expect(scanReport).toHaveBeenCalledWith(expect.objectContaining({start:'2026-09-01',end:'2026-09-30',direction:'both',withCollections:true,layout:'separate',accounts:[{id:'a',name:'Ayşe Karabut'},{id:'b',name:'Mert Sarısoy'}]}));
 expect(previewReport.mock.calls[0][0].target).toBe(app.page.querySelector('#assistantResults'));
 expect(assistantRequest.mock.calls.every(([url])=>url==='/status')).toBe(true);
 expect(app.page.querySelector('#assistantStatusBadge').textContent).toContain('WhatsApp hazır');
 expect(app.page.querySelector('.sv-chat-status').hidden).toBe(true);
 expect(app.page.querySelector('.sv-chat-composer').hidden).toBe(true);
});
it('discards a late model answer after starting a new conversation',async()=>{
 HTMLElement.prototype.scrollIntoView=vi.fn();let finish;
 assistantRequest.mockImplementation(async url=>url==='/interpret'?await new Promise(resolve=>{finish=resolve;}):{connection:'ready',jobs:[]});
 app=await mountAssistant({context:{}});document.body.append(app.page);
 app.page.querySelector('#assistantCommand').value='karmaşık bir istek';app.page.querySelector('#assistantInterpret').click();
 await vi.waitFor(()=>expect(finish).toBeTypeOf('function'));
 app.page.querySelector('#assistantReset').click();finish({intent:{customer:'Eski müşteri',scope:'all'}});
 await new Promise(resolve=>setTimeout(resolve,10));expect(app.page.querySelector('[name=customer]').value).toBe('');expect(scanReport).not.toHaveBeenCalled();
});
it('accepts the next spoken command as preview confirmation without preparing or sending twice',async()=>{
 HTMLElement.prototype.scrollIntoView=vi.fn();const sent=vi.fn();
 assistantRequest.mockImplementation(async url=>url==='/interpret'?{transcript:previewReport.mock.calls.length?'gönder':'eylül harmanda raporunu hazırla',intent:previewReport.mock.calls.length?{}:{customer:'Harmanda',month:9,start:'2026-09-01',end:'2026-09-30'}}:{connection:'ready',jobs:[]});
 previewReport.mockImplementation(async({target})=>{const button=document.createElement('button');button.className='sv-confirm-send';button.onclick=()=>{button.disabled=true;sent();};target.append(button);return {close:()=>button.remove()};});
 app=await mountAssistant({context:{direction:'both',withCollections:true}});document.body.append(app.page);
 app.page.querySelector('#assistantMic').click();
 await voiceHarness.callbacks.onAudio(new Blob(['first'],{type:'audio/mp4'}));
 expect(previewReport).toHaveBeenCalledOnce();expect(sent).not.toHaveBeenCalled();
 await voiceHarness.callbacks.onAudio(new Blob(['second'],{type:'audio/mp4'}));
 expect(sent).toHaveBeenCalledOnce();expect(scanReport).toHaveBeenCalledOnce();
 await voiceHarness.callbacks.onAudio(new Blob(['third'],{type:'audio/mp4'}));
 expect(sent).toHaveBeenCalledOnce();expect(voiceHarness.resume).toHaveBeenCalled();
});
