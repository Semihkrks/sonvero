// @vitest-environment jsdom
import {it,expect,vi,afterEach} from 'vitest';
vi.mock('../src/services/account-manager.js',()=>({listAccounts:async()=>[{id:'a',name:'Ayşe Karabut'}],getActiveAccountId:()=> 'a'}));
vi.mock('../src/services/assistant-client.js',()=>({assistantRequest:vi.fn(async()=>({connection:'ready',recipient:'905000000000',aiConfigured:true,jobs:[]})),blobBase64:vi.fn()}));
vi.mock('../src/services/report-data.js',()=>({fold:s=>String(s).toLowerCase(),summarizeRows:()=>({net:1}),scanReport:vi.fn(async()=>[{name:'Harmanda',tax:'1234',rows:[]}])}));
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
 await vi.waitFor(()=>expect(app.page.querySelector('#assistantMessages').textContent).toContain('hangi yıla'));
 send('2026');await vi.waitFor(()=>expect(previewReport).toHaveBeenCalledOnce());
 expect(scanReport).toHaveBeenCalledWith(expect.objectContaining({start:'2026-09-01',end:'2026-09-30',direction:'both',withCollections:true}));
 expect(previewReport.mock.calls[0][0].target).toBe(app.page.querySelector('#assistantResults'));
 expect(assistantRequest.mock.calls.every(([url])=>url==='/status')).toBe(true);
 expect(app.page.querySelector('#assistantStatusBadge').textContent).toContain('WhatsApp hazır');
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
