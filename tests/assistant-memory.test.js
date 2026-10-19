// @vitest-environment jsdom
// Multi-turn conversations: follow-up questions must reuse the previous topic,
// customer, account and period instead of starting the report flow over.
import {it,expect,vi,afterEach,beforeEach} from 'vitest';
vi.mock('../src/services/voice-session.js',()=>({createVoiceSession:()=>({pause:vi.fn(),resume:vi.fn(),start:vi.fn(),close:vi.fn(),finish:vi.fn()})}));
vi.mock('../src/services/account-manager.js',()=>({listAccounts:async()=>[{id:'a',name:'Ayşe Karabut'},{id:'b',name:'Serkan Bingöl'}],getActiveAccountId:()=> 'a'}));
vi.mock('../src/services/assistant-client.js',()=>({assistantRequest:vi.fn(),blobBase64:vi.fn()}));
vi.mock('../src/services/report-data.js',()=>({fold:s=>String(s).toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/ı/g,'i').trim(),summarizeRows:()=>({net:1}),matchReportGroups:vi.fn(groups=>groups),scanReport:vi.fn()}));
vi.mock('../src/components/report-send.js',()=>({previewReport:vi.fn()}));
vi.mock('../src/services/assistant-ledger.js',()=>({findAssistantCustomers:vi.fn(),findAssistantCollections:vi.fn(),readAssistantSummary:vi.fn(),readLatestAssistantCollection:vi.fn(),readAssistantInvoices:vi.fn()}));
vi.mock('../src/services/tahsilat-manager.js',()=>({addCollection:vi.fn(),updateCollection:vi.fn(),deleteCollection:vi.fn()}));
import {mountAssistant} from '../src/pages/assistant.js';
import {scanReport} from '../src/services/report-data.js';
import {assistantRequest} from '../src/services/assistant-client.js';
import {previewReport} from '../src/components/report-send.js';
import {findAssistantCustomers,readAssistantSummary,readLatestAssistantCollection} from '../src/services/assistant-ledger.js';
import {addCollection} from '../src/services/tahsilat-manager.js';

const harmanda={name:'Harmanda Tekstil',tax:'1234567890',key:'1234567890',balance:'125000.00'};
const totals={sales:'100000.00',purchases:'20000.00',collections:'60000.00',net:'20000.00',salesCollections:'40000.00',balance:'125000.00'};
let app;
beforeEach(()=>{
 vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-10-17T12:00:00+03:00'));
 sessionStorage.clear();HTMLElement.prototype.scrollIntoView=vi.fn();
 window.matchMedia=query=>({matches:query.includes('reduce'),addEventListener(){},removeEventListener(){}});
 assistantRequest.mockImplementation(async url=>url==='/interpret'?{intent:{},transcript:'',reply:''}:{connection:'ready',jobs:[]});
 scanReport.mockImplementation(async()=>[{name:'Harmanda Tekstil',tax:'1234567890',rows:[{accountId:'b'}]}]);
 previewReport.mockImplementation(async()=>({close:vi.fn()}));
 findAssistantCustomers.mockImplementation(async(account,query)=>String(query).toLocaleLowerCase('tr-TR').includes('harmanda')?[harmanda]:[]);
 readAssistantSummary.mockImplementation(async()=>({totals,rows:[],excluded:0,complete:true}));
 readLatestAssistantCollection.mockImplementation(async()=>({id:'r1',account_id:'b',customer_name:harmanda.name,customer_tax_no:harmanda.tax,customer_key:harmanda.key,amount:'60000.00',date:'2026-10-15',created_at:'2026-10-15T09:00:00Z'}));
 addCollection.mockImplementation(async payload=>({id:'r9',version:1,...payload}));
});
afterEach(ctx=>{if(process.env.PROBE&&app)console.log('['+ctx.task.name+']\n'+messages().join('\n'));app?.cleanup();app=null;document.body.replaceChildren();vi.clearAllMocks();vi.useRealTimers();});
async function mount(){app=await mountAssistant({context:{}});document.body.append(app.page);return app;}
const messages=()=>[...app.page.querySelectorAll('#assistantMessages .sv-chat-message')].map(node=>node.textContent);
async function say(text){
 const before=messages().length;
 app.page.querySelector('#assistantCommand').value=text;app.page.querySelector('#assistantInterpret').click();
 await vi.waitFor(()=>{expect(app.page.dataset.busy).toBe('false');expect(messages().length).not.toBe(before);expect(messages().at(-1)).not.toBe(text);});
 await new Promise(resolve=>setTimeout(resolve,5));
 return messages().at(-1);
}

it('keeps the metric and account when only the period changes',async()=>{
 await mount();
 await say('Serkan Bingöl hesabında bu ay tahsilat toplamı ne kadar');
 expect(readAssistantSummary).toHaveBeenLastCalledWith(expect.objectContaining({accountIds:['b'],metric:'collections',start:'2026-10-01',end:'2026-10-31'}));
 await say('peki geçen ayki?');
 expect(readAssistantSummary).toHaveBeenCalledTimes(2);
 expect(readAssistantSummary).toHaveBeenLastCalledWith(expect.objectContaining({accountIds:['b'],metric:'collections',start:'2026-09-01',end:'2026-09-30'}));
 expect(scanReport).not.toHaveBeenCalled();
});

it('keeps account and period when only the metric changes',async()=>{
 await mount();
 await say('Serkan Bingöl hesabında eylül tahsilat toplamı ne kadar');
 await say('ya satışlar?');
 expect(readAssistantSummary).toHaveBeenLastCalledWith(expect.objectContaining({accountIds:['b'],metric:'sales',start:'2026-09-01',end:'2026-09-30'}));
 await say('peki alışlar ne kadar');
 expect(readAssistantSummary).toHaveBeenLastCalledWith(expect.objectContaining({accountIds:['b'],metric:'purchases',start:'2026-09-01',end:'2026-09-30'}));
});

it('turns the customer under discussion into a report without asking for it again',async()=>{
 await mount();
 await say('Serkan Bingöl hesabındaki Harmanda bakiyesi ne');
 expect(messages().at(-1)).toContain('125.000,00 TL');
 await say('onun bu ayki excelini hazırla');
 await vi.waitFor(()=>expect(previewReport).toHaveBeenCalledOnce());
 expect(scanReport).toHaveBeenCalledWith(expect.objectContaining({start:'2026-10-01',end:'2026-10-31',format:'excel',accounts:[{id:'b',name:'Serkan Bingöl'}]}));
 expect(app.page.querySelector('[name=customer]').value).toBe('Harmanda Tekstil');
});

it('makes an Excel of the summary that was just read',async()=>{
 await mount();
 await say('Serkan Bingöl hesabında Harmanda eylül satış toplamı ne kadar');
 await say('onu excel yap');
 await vi.waitFor(()=>expect(previewReport).toHaveBeenCalledOnce());
 expect(scanReport).toHaveBeenCalledWith(expect.objectContaining({start:'2026-09-01',end:'2026-09-30',format:'excel',direction:'satis',accounts:[{id:'b',name:'Serkan Bingöl'}]}));
});

it('adds a collection to the customer of the prepared report and still asks for confirmation',async()=>{
 await mount();
 await say('Serkan Bingöl hesabında eylül satış alış tahsilat dahil Harmanda excelini hazırla');
 await vi.waitFor(()=>expect(previewReport).toHaveBeenCalledOnce());
 const draftText=await say('aynı müşteriye 5 bin tahsilat ekle');
 expect(draftText).toContain('Harmanda Tekstil');expect(draftText).toContain('5.000,00 TL');
 expect(addCollection).not.toHaveBeenCalled();
 await say('onaylıyorum');
 expect(addCollection).toHaveBeenCalledWith(expect.objectContaining({account_id:'b',customer_name:'Harmanda Tekstil',amount:'5000.00'}));
});

it('answers a pronoun latest-collection question for the remembered customer',async()=>{
 await mount();
 await say('Serkan Bingöl hesabındaki Harmanda bakiyesi ne');
 await say('peki onun son tahsilatı ne');
 expect(readLatestAssistantCollection).toHaveBeenLastCalledWith(expect.objectContaining({accountIds:['b'],customer:expect.objectContaining({tax:harmanda.tax})}));
});

it('survives closing and reopening the panel in the same browser session',async()=>{
 await mount();
 await say('Serkan Bingöl hesabındaki Harmanda bakiyesi ne');
 app.cleanup();app.page.remove();
 await mount();
 expect(messages().join('\n')).toContain('125.000,00 TL');
 await say('peki bu ay ne kadar tahsilat yapmışız');
 expect(readAssistantSummary).toHaveBeenLastCalledWith(expect.objectContaining({accountIds:['b'],metric:'collections',customer:expect.objectContaining({tax:harmanda.tax}),start:'2026-10-01'}));
});

it('sends the model a role-tagged history and the active topic',async()=>{
 await mount();
 await say('Serkan Bingöl hesabında bu ay tahsilat toplamı ne kadar');
 await say('bunu nasıl yorumlarsın');
 const call=assistantRequest.mock.calls.findLast(([url])=>url==='/interpret');
 expect(call[1].context.conversation.length).toBeGreaterThanOrEqual(3);
 expect(call[1].context.conversation).toEqual(expect.arrayContaining([expect.objectContaining({role:'user',text:expect.stringContaining('tahsilat toplamı')}),expect.objectContaining({role:'assistant',text:expect.stringContaining('60.000,00 TL')})]));
 expect(call[1].context.topic).toMatchObject({action:'summary',metric:'collections',accounts:['Serkan Bingöl'],period:{start:'2026-10-01',end:'2026-10-31'}});
});

it('forgets everything after a new conversation command',async()=>{
 await mount();
 await say('Serkan Bingöl hesabındaki Harmanda bakiyesi ne');
 await say('yeni sohbet');
 expect(messages()).toHaveLength(1);
 expect(JSON.stringify(Object.values(sessionStorage))).not.toContain('Harmanda');
 await say('peki bu ay ne kadar tahsilat yapmışız');
 expect(readAssistantSummary).not.toHaveBeenCalledWith(expect.objectContaining({customer:expect.objectContaining({tax:harmanda.tax})}));
});

it('keeps a pending collection draft out of storage until it is confirmed',async()=>{
 await mount();
 await say('Serkan Bingöl hesabındaki Harmanda bakiyesi ne');
 await say('aynı müşteriye 5 bin tahsilat ekle');
 const stored=()=>sessionStorage.getItem('sonvera:sonai-session:v1');
 expect(stored()).not.toContain('5.000,00 TL tahsilat');
 await say('onaylıyorum');
 expect(addCollection).toHaveBeenCalledOnce();expect(stored()).toContain('kaydedildi');
});

it('does not write the conversation back after the panel is closed',async()=>{
 let finish;readAssistantSummary.mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));
 await mount();
 app.page.querySelector('#assistantCommand').value='Serkan Bingöl hesabında bu ay tahsilat toplamı ne kadar';app.page.querySelector('#assistantInterpret').click();
 await vi.waitFor(()=>expect(finish).toBeTypeOf('function'));
 app.cleanup();sessionStorage.clear();
 finish({totals,rows:[],excluded:0,complete:true});await new Promise(resolve=>setTimeout(resolve,20));
 expect(sessionStorage.getItem('sonvera:sonai-session:v1')).toBe(null);
});

it('follows up a general latest-collection question in the scope that was asked',async()=>{
 await mount();
 await say('Serkan Bingöl hesabında en son eklediğim tahsilat ne');
 await say('peki Ayşe hesabında?');
 expect(readLatestAssistantCollection).toHaveBeenLastCalledWith(expect.objectContaining({accountIds:['a'],customer:null}));
});
