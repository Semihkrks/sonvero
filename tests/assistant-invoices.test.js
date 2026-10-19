// @vitest-environment jsdom
import {beforeEach,describe,expect,it,vi} from 'vitest';
vi.mock('../src/lib/supabase.js',()=>({getSupabase:vi.fn()}));
vi.mock('../src/services/tahsilat-manager.js',()=>({listCollections:vi.fn(),addCollection:vi.fn(),updateCollection:vi.fn(),deleteCollection:vi.fn()}));
vi.mock('../src/services/invoice-archive.js',()=>({fetchInvoicesSmart:vi.fn()}));
vi.mock('../src/api/nilvera.js',()=>({EInvoiceWithAccount:{},EArchiveWithAccount:{}}));
import {getSupabase} from '../src/lib/supabase.js';
import {readAssistantInvoices} from '../src/services/assistant-ledger.js';
import {parseInvoiceQuery} from '../src/lib/assistant-invoices.js';
import {createBusinessAssistant} from '../src/services/assistant-business.js';
import {resolveFollowUp,normalizeTopic,describeTopic} from '../src/lib/assistant-memory.js';
import {capabilityReply} from '../services/assistant/capabilities.mjs';

const accounts=[{id:'a',name:'Ayşe Karabut'},{id:'b',name:'Serkan Bingöl'}];
const now=new Date('2026-10-17T12:00:00+03:00');
const parse=text=>parseInvoiceQuery(text,{accounts,now});

describe('invoice questions',()=>{
 it.each([
  ['bu ay kaç satış faturası kestik',{action:'invoices',direction:'satis',order:'latest',limit:3,period:{start:'2026-10-01',end:'2026-10-31'},customer:null}],
  ['Harmanda’ya kestiğimiz son fatura ne',{direction:'satis',limit:1,customer:'Harmanda'}],
  ['Ayşe hesabında eylülde gelen faturalar neler',{accountIds:['a'],direction:'alis',period:{start:'2026-09-01',end:'2026-09-30'},customer:null}],
  ['en büyük fatura hangisi',{order:'largest',direction:'both'}],
  ['Yapı Market’e kestiğimiz faturalar',{customer:'Yapı Market',direction:'satis'}],
  ['tüm hesaplarda geçen ay kaç fatura var',{scope:'all',period:{start:'2026-09-01',end:'2026-09-30'}}],
 ])('%s',(text,expected)=>expect(parse(text)).toMatchObject(expected));
 it.each(['Harmanda’ya fatura kes','fatura kesebilir misin','yeni fatura oluştur'])('opens the invoice screen instead of issuing one: %s',text=>{
  expect(parse(text)).toEqual({action:'navigate',route:'/create',reason:'invoice_create'});
 });
 it('refuses invoice cancellations and leaves plain screen commands to navigation',()=>{
  expect(parse('son faturayı iptal et')).toEqual({action:'invoice_unsupported'});
  expect(parse('giden faturaları aç')).toBe(null);expect(parse('gelen faturaları göster')).toBe(null);
  expect(parse('Harmanda bakiyesi ne')).toBe(null);
 });
 it('uses the model fields when the wording is unusual',()=>{
  expect(parseInvoiceQuery('şu belgelere bir bak',{accounts,now,remote:{action:'invoices',direction:'alis',start:'2026-09-01',end:'2026-09-30'}})).toMatchObject({action:'invoices',direction:'alis',period:{start:'2026-09-01',end:'2026-09-30'}});
 });
 it('describes invoice abilities in help answers',()=>{
  expect(capabilityReply('fatura için ne sorabilirim')).toContain('faturalarını');
 });
});

describe('archived invoice reads',()=>{
 let rpc;
 const row=(changes={})=>({account_id:'a',source:'invoice',currency:'TRY',date:'2026-10-05',description:'SAT2026000001',type:'Satış Faturası',customer_name:'Harmanda Tekstil',customer_tax_no:'123',customer_key:'123',debit:'1200.00',credit:'0',...changes});
 beforeEach(()=>{vi.resetAllMocks();rpc=vi.fn();getSupabase.mockReturnValue({rpc});});
 it('counts, totals and orders invoices without collections or other currencies',async()=>{
  rpc.mockResolvedValue({data:{rows:[row(),row({description:'SAT2026000002',date:'2026-10-09',debit:'300.00'}),row({description:'ALI1',type:'Alım Faturası',debit:'0',credit:'800.00',date:'2026-10-07'}),row({source:'collection',debit:'0',credit:'50'}),row({currency:'USD'}),row({account_id:'zz'})],totals:{count:6},excluded:1},error:null});
  const latest=await readAssistantInvoices({accountIds:['a'],start:'2026-10-01',end:'2026-10-31'});
  expect(latest).toMatchObject({count:3,salesCount:2,purchaseCount:1,totals:{sales:'1500.00',purchases:'800.00'},excluded:1});
  expect(latest.rows.map(r=>r.number)).toEqual(['SAT2026000002','ALI1','SAT2026000001']);
  const largest=await readAssistantInvoices({accountIds:['a'],direction:'satis',order:'largest',limit:1});
  expect(largest.rows).toEqual([expect.objectContaining({number:'SAT2026000001',amount:'1200.00',kind:'satis'})]);
  expect(rpc).toHaveBeenLastCalledWith('ledger_page',expect.objectContaining({p_account_id:'a',p_customer:null}));
 });
 it('rejects unscoped or malformed requests',async()=>{
  await expect(readAssistantInvoices({accountIds:[]})).rejects.toThrow('hesap');
  await expect(readAssistantInvoices({accountIds:['a'],direction:'x'})).rejects.toThrow('yönü');
  await expect(readAssistantInvoices({accountIds:['a'],start:'2026-10-31',end:'2026-10-01'})).rejects.toThrow('tarih');
 });
});

describe('invoice conversation',()=>{
 function harness(){
  const message=vi.fn(),navigate=vi.fn(),topics=[];
  const readInvoices=vi.fn(async({direction})=>({count:2,salesCount:direction==='alis'?0:2,purchaseCount:direction==='alis'?2:0,totals:{sales:'1500.00',purchases:'800.00'},rows:[{number:'SAT2',customer:'Harmanda Tekstil',amount:'300.00',date:'2026-10-09',kind:'satis'}],excluded:0}));
  const assistant=createBusinessAssistant({accounts,message,choices:document.createElement('div'),run:fn=>fn(),readInvoices,navigate,onTopic:value=>topics.push(value),
   findCustomers:vi.fn(async()=>[{name:'Harmanda Tekstil',tax:'123',key:'123'}])});
  return {assistant,message,navigate,readInvoices,topics};
 }
 it('answers with real totals, remembers the topic and continues with a short follow-up',async()=>{
  const h=harness();
  await h.assistant.handle('Serkan Bingöl hesabında bu ay kaç satış faturası kestik');
  expect(h.readInvoices).toHaveBeenCalledWith(expect.objectContaining({accountIds:['b'],direction:'satis',start:'2026-10-01',end:'2026-10-31'}));
  expect(h.message.mock.calls.at(-1)[0]).toContain('2 satış (giden) faturası; toplam 1.500,00 TL');
  const topic=normalizeTopic(h.topics.at(-1),accounts);
  expect(describeTopic(topic,accounts)).toBe('Serkan Bingöl · Tüm müşteriler · Ekim 2026 · satış faturaları');
  const next=resolveFollowUp('ya gelenler?',{topic,accounts,now});
  expect(next).toMatchObject({kind:'invoices',command:{direction:'alis',accountIds:['b'],period:{start:'2026-10-01',end:'2026-10-31'}}});
  await h.assistant.execute(next.command);
  expect(h.readInvoices).toHaveBeenLastCalledWith(expect.objectContaining({direction:'alis',accountIds:['b']}));
  expect(resolveFollowUp('peki geçen ay?',{topic,accounts,now}).command.period).toEqual({start:'2026-09-01',end:'2026-09-30'});
 });
 it('resolves a named customer in a single account before reading',async()=>{
  const h=harness();
  await h.assistant.handle('Ayşe hesabında Harmanda’ya kestiğimiz son fatura ne');
  expect(h.readInvoices).toHaveBeenCalledWith(expect.objectContaining({accountIds:['a'],customer:expect.objectContaining({tax:'123'}),limit:1}));
 });
 it('never issues an invoice and asks for no confirmation it cannot honour',async()=>{
  const h=harness();
  await h.assistant.handle('Harmanda’ya fatura kes');
  expect(h.navigate).toHaveBeenCalledWith('/create');expect(h.readInvoices).not.toHaveBeenCalled();
  expect(h.message.mock.calls.at(-1)[0]).toContain('kendin onaylayarak');
 });
});
