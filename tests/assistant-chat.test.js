// @vitest-environment jsdom
import {it,expect,vi,afterEach,beforeEach} from 'vitest';
const voiceHarness=vi.hoisted(()=>({callbacks:null,resume:vi.fn()}));
vi.mock('../src/services/voice-session.js',()=>({createVoiceSession:options=>{voiceHarness.callbacks=options;return {pause:vi.fn(),resume:voiceHarness.resume,start:vi.fn(),close:vi.fn()};}}));
vi.mock('../src/services/account-manager.js',()=>({listAccounts:async()=>[{id:'a',name:'Ayşe Karabut'},{id:'b',name:'Mert Sarısoy'}],getActiveAccountId:()=> 'a'}));
vi.mock('../src/services/assistant-client.js',()=>({assistantRequest:vi.fn(async()=>({connection:'ready',recipient:'905000000000',aiConfigured:true,jobs:[]})),blobBase64:vi.fn()}));
vi.mock('../src/services/report-data.js',()=>({fold:s=>String(s).toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i').trim(),summarizeRows:()=>({net:1}),matchReportGroups:vi.fn(groups=>groups),scanReport:vi.fn(async()=>[{name:'Harmanda',tax:'1234',rows:[]}])}));
vi.mock('../src/components/report-send.js',()=>({previewReport:vi.fn(async()=>({close:vi.fn()}))}));
import {mountAssistant} from '../src/pages/assistant.js';
import {scanReport,matchReportGroups} from '../src/services/report-data.js';
import {assistantRequest} from '../src/services/assistant-client.js';
import {previewReport} from '../src/components/report-send.js';
let app;
beforeEach(()=>{
 HTMLElement.prototype.scrollIntoView=vi.fn();
 assistantRequest.mockImplementation(async()=>({connection:'ready',recipient:'905000000000',jobs:[]}));
 scanReport.mockImplementation(async()=>[{name:'Harmanda',tax:'1234',rows:[]}]);
 previewReport.mockImplementation(async()=>({close:vi.fn()}));
 matchReportGroups.mockImplementation(groups=>groups);
});
afterEach(()=>{app?.cleanup();document.body.replaceChildren();vi.clearAllMocks();});
it('continues the requested conversation locally and opens the single customer preview inline',async()=>{
 HTMLElement.prototype.scrollIntoView=vi.fn();
 app=await mountAssistant({context:{selected:{accountIds:['a'],direction:'both',withCollections:true}}});document.body.append(app.page);
 const send=text=>{app.page.querySelector('#assistantCommand').value=text;app.page.querySelector('#assistantInterpret').click();};
 send('seçili hesaplarda 9.ayda harmanda excelini bana gönder');
 await vi.waitFor(()=>expect(previewReport).toHaveBeenCalledOnce());
 expect(scanReport).toHaveBeenCalledWith(expect.objectContaining({start:'2026-09-01',end:'2026-09-30',direction:'both',withCollections:true,layout:'separate',format:'excel',accounts:[{id:'a',name:'Ayşe Karabut'}]}));
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
it('selects the first of two customers by voice and sends only the requested format',async()=>{
 scanReport.mockResolvedValue([{name:'Volkan Tekstil',tax:'111',rows:[]},{name:'Volkan Kumaş',tax:'222',rows:[]}]);
 const send=vi.fn(async()=>true);previewReport.mockImplementation(async()=>({close:vi.fn(),send}));
 let transcript='';assistantRequest.mockImplementation(async url=>url==='/interpret'?{transcript,intent:{}}:{connection:'ready',jobs:[]});
 app=await mountAssistant({context:{direction:'both',withCollections:true}});document.body.append(app.page);
 app.page.querySelector('#assistantCommand').value='seçili hesaplarda 9.ay Volkan carisini hazırla';app.page.querySelector('#assistantInterpret').click();
 await vi.waitFor(()=>expect(app.page.querySelectorAll('.sv-assistant-customer')).toHaveLength(2));
 transcript='ilki olsun';await voiceHarness.callbacks.onAudio(new Blob(['first'],{type:'audio/mp4'}));
 expect(previewReport.mock.calls[0][0].groups.map(group=>group.name)).toEqual(['Volkan Tekstil']);
 transcript='sadece fotoğrafını WhatsApp’a gönder';await voiceHarness.callbacks.onAudio(new Blob(['second'],{type:'audio/mp4'}));
 expect(previewReport.mock.calls.at(-1)[0].options.format).toBe('image');expect(send).toHaveBeenCalledOnce();expect(scanReport).toHaveBeenCalledOnce();
});
it('answers small talk while retaining the unfinished report',async()=>{
 app=await mountAssistant({context:{}});document.body.append(app.page);
 app.page.querySelector('#assistantCommand').value='nasılsın';app.page.querySelector('#assistantInterpret').click();
 await vi.waitFor(()=>expect(app.page.querySelector('#assistantMessages').textContent).toContain('Sen nasılsın?'));
 expect(scanReport).not.toHaveBeenCalled();expect(assistantRequest.mock.calls.some(([url])=>url==='/interpret')).toBe(false);
});
it('ignores audio delivered from a disposed assistant',async()=>{
 app=await mountAssistant({context:{}});app.cleanup();await voiceHarness.callbacks.onAudio(new Blob(['old'],{type:'audio/mp4'}));
 expect(assistantRequest.mock.calls.some(([url])=>url==='/interpret')).toBe(false);
});
it('resumes recording after an interpretation failure and accepts the next utterance',async()=>{
 assistantRequest.mockImplementation(async url=>url==='/interpret'?Promise.reject(new Error('Geçici bağlantı hatası')):{connection:'ready',jobs:[]});
 app=await mountAssistant({context:{}});document.body.append(app.page);app.page.querySelector('#assistantMic').click();
 await voiceHarness.callbacks.onAudio(new Blob(['first'],{type:'audio/mp4'}));
 expect(voiceHarness.resume).toHaveBeenCalled();expect(app.page.querySelector('#assistantMic').disabled).toBe(false);
 assistantRequest.mockImplementation(async url=>url==='/interpret'?{transcript:'nasılsın',intent:{}}:{connection:'ready',jobs:[]});
 await voiceHarness.callbacks.onAudio(new Blob(['second'],{type:'audio/mp4'}));
 await vi.waitFor(()=>expect(app.page.querySelector('#assistantMessages').textContent).toContain('Sen nasılsın?'));
 expect(app.page.querySelector('#assistantMic').disabled).toBe(false);
});
it('prepares every customer for a named account without asking to pick a person',async()=>{
 const customers=Array.from({length:9},(_,index)=>({name:'Müşteri '+index,tax:String(1000+index),rows:[]}));scanReport.mockResolvedValue(customers);
 assistantRequest.mockImplementation(async url=>url==='/interpret'?{transcript:'Ayşe Karabutun 9.ayki müşterilerin excelini getir bana',intent:{customer:'müşteriler'}}:{connection:'ready',jobs:[]});
 app=await mountAssistant({context:{selected:{accountIds:['a','b']}}});document.body.append(app.page);
 await voiceHarness.callbacks.onAudio(new Blob(['bulk'],{type:'audio/mp4'}));
 expect(scanReport).toHaveBeenCalledWith(expect.objectContaining({accounts:[{id:'a',name:'Ayşe Karabut'}],start:'2026-09-01',end:'2026-09-30',allCustomers:true,direction:'both',withCollections:true,format:'excel'}));
 expect(previewReport).toHaveBeenCalledOnce();expect(previewReport.mock.calls[0][0].groups).toEqual(customers);expect(previewReport.mock.calls[0][0].options.allCustomers).toBe(true);
 expect(app.page.querySelectorAll('.sv-assistant-customer')).toHaveLength(0);
});
it('uses the current account selection for all customers when no account name is spoken',async()=>{
 app=await mountAssistant({context:{selected:{accountIds:['b']}}});document.body.append(app.page);
 app.page.querySelector('#assistantCommand').value='9.ayın tüm müşterilerinin excelini ver';app.page.querySelector('#assistantInterpret').click();
 await vi.waitFor(()=>expect(previewReport).toHaveBeenCalledOnce());
 expect(scanReport.mock.calls[0][0].accounts.map(a=>a.id)).toEqual(['b']);expect(previewReport.mock.calls[0][0].options).toMatchObject({allCustomers:true,format:'excel'});
});
it('prepares the spoken compound report with the short customer name scoped to the named account',async()=>{
 const real=await vi.importActual('../src/services/report-data.js');matchReportGroups.mockImplementation(real.matchReportGroups);
 scanReport.mockResolvedValue([{name:'Mustafa Harmanda',tax:'9876',rows:[{accountId:'b',name:'Mustafa Harmanda'}]},{name:'Harmanda Tekstil',tax:'1234',rows:[{accountId:'a',name:'Harmanda Tekstil'}]}]);
 assistantRequest.mockImplementation(async url=>url==='/interpret'?{transcript:'ayşe karabut hesabından 9.ay satışalış tahsilatdahil harmanda müşterisinin excelini ver',intent:{customer:'satışalış tahsilatdahil harmanda'}}:{connection:'ready',jobs:[]});
 app=await mountAssistant();document.body.append(app.page);
 await voiceHarness.callbacks.onAudio(new Blob(['report'],{type:'audio/mp4'}));
 expect(scanReport).toHaveBeenCalledOnce();expect(scanReport.mock.calls[0][0]).toMatchObject({accounts:[{id:'a',name:'Ayşe Karabut'}],direction:'both',withCollections:true,start:'2026-09-01',format:'excel'});
 expect(previewReport.mock.calls[0][0].groups.map(g=>g.name)).toEqual(['Harmanda Tekstil']);
 expect(app.page.querySelectorAll('.sv-assistant-customer')).toHaveLength(0);
});
it('keeps report filters after a failed lookup and treats the short retry as the report customer',async()=>{
 scanReport.mockResolvedValueOnce([]).mockResolvedValue([{name:'Harmanda Tekstil',tax:'1234',rows:[]}]);
 app=await mountAssistant();document.body.append(app.page);
 const send=text=>{app.page.querySelector('#assistantCommand').value=text;app.page.querySelector('#assistantInterpret').click();};
 send('Ayşe hesabından 9.ay satış alış tahsilat dahil yanlışisim müşterisinin excelini ver');
 await vi.waitFor(()=>expect(app.page.querySelector('#assistantMessages').textContent).toContain('kısa adını tekrar'));
 send('Harmanda');await vi.waitFor(()=>expect(previewReport).toHaveBeenCalledOnce());
 expect(matchReportGroups.mock.calls.at(-1)[1]).toBe('harmanda');
 expect(scanReport.mock.calls.at(-1)[0]).toMatchObject({direction:'both',withCollections:true,start:'2026-09-01',format:'excel',accounts:[{id:'a',name:'Ayşe Karabut'}]});
});
it('accepts customer and all remaining report answers together instead of starting customer selection',async()=>{
 app=await mountAssistant();document.body.append(app.page);
 const send=text=>{app.page.querySelector('#assistantCommand').value=text;app.page.querySelector('#assistantInterpret').click();};
 send('Ayşe hesabından excel hazırla');
 await vi.waitFor(()=>expect(app.page.querySelector('#assistantChoices').childElementCount).toBe(0));
 await vi.waitFor(()=>expect(app.page.querySelector('#assistantInterpret').disabled).toBe(false));
 send('Harmanda eylül satış alış tahsilat dahil');
 await vi.waitFor(()=>expect(previewReport).toHaveBeenCalledOnce());
 expect(matchReportGroups.mock.calls.at(-1)[1]).toBe('harmanda');expect(scanReport.mock.calls[0][0]).toMatchObject({direction:'both',withCollections:true,start:'2026-09-01',format:'excel'});
});
it('preserves an explicit date window instead of replacing it with a whole month',async()=>{
 assistantRequest.mockImplementation(async url=>url==='/interpret'?{transcript:'Ayşe hesabından Harmanda satış alış tahsilat dahil 5 Eylül ile 20 Eylül arası excel',intent:{start:'2026-09-05',end:'2026-09-20',year:2026,month:9}}:{connection:'ready',jobs:[]});
 app=await mountAssistant();document.body.append(app.page);
 await voiceHarness.callbacks.onAudio(new Blob(['dates'],{type:'audio/mp4'}));
 expect(scanReport.mock.calls[0][0]).toMatchObject({start:'2026-09-05',end:'2026-09-20'});
});
