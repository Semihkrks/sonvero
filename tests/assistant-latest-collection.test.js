// @vitest-environment jsdom
import {expect,it,vi} from 'vitest';
import {parseBusinessCommand} from '../src/lib/assistant-actions.js';
import {createBusinessAssistant} from '../src/services/assistant-business.js';

const accounts=[{id:'a',name:'Serkan Bingöl'},{id:'b',name:'Mustafa Yılmaz'}];
const record={id:'r1',account_id:'a',customer_name:'Harmanda Tekstil',customer_tax_no:'1234567890',customer_key:'1234567890',amount:'60000.00',currency:'TRY',date:'2026-10-16',created_at:'2026-10-17T12:00:00Z',version:1};
function harness(){
 const message=vi.fn(),choices=document.createElement('div'),readLatest=vi.fn(async()=>record),findCustomers=vi.fn(async()=>[{name:record.customer_name,tax:record.customer_tax_no,key:record.customer_key}]);
 const save=vi.fn(),update=vi.fn(),cancel=vi.fn();
 const assistant=createBusinessAssistant({accounts,message,choices,run:fn=>fn(),readLatest,findCustomers,save,update,cancel});
 return {assistant,message,choices,readLatest,findCustomers,save,update,cancel};
}
it('classifies latest-payment questions as reads even when the model incorrectly says create',()=>{
 for(const text of ['en son eklediğim tahsilat ne?','son kaydettiğim tahsilatı göster','az önce eklediğim tahsilat kaç liraydı?','son tahsilat ne kadar?'])
  expect(parseBusinessCommand(text,{accounts,remote:{action:'collection',amount:65000,customer:'Uydurma'}})).toMatchObject({action:'latest_collection',customer:null});
 expect(parseBusinessCommand('son tahsilatı 65 bin olarak düzelt',{accounts})).toMatchObject({action:'update_collection'});
 expect(parseBusinessCommand('son tahsilatı iptal et',{accounts})).toMatchObject({action:'cancel_collection'});
});
it('never treats past-tense mentions or hypothetical collection questions as write imperatives',()=>{
 for(const text of ['hangi tahsilatı ekledim?','tahsilat eklemek ister misin?','tahsilat ekledim','tahsilat kaydettiğim yer','tahsilat ne?'])
  expect(parseBusinessCommand(text,{accounts,remote:{action:'collection'}})?.action).not.toBe('collection');
 expect(parseBusinessCommand('Harmanda’nın son tahsilatı ne?',{accounts})).toMatchObject({action:'latest_collection',customer:'harmanda'});
 expect(parseBusinessCommand('son bir ayın tahsilatı ne kadar?',{accounts})).toMatchObject({action:'summary',metric:'collections'});
});
it('asks only for the account when scope is missing and then reads without any write',async()=>{
 const h=harness();await h.assistant.handle('en son eklediğim tahsilat ne?');
 expect(h.assistant.getContext()).toMatchObject({action:'latest_collection',phase:'account'});
 expect(h.readLatest).not.toHaveBeenCalled();expect(h.choices.children).toHaveLength(2);
 await h.assistant.handle('Serkan Bingöl');
 expect(h.readLatest).toHaveBeenCalledWith(expect.objectContaining({accountIds:['a'],customer:null}));
 expect(h.message.mock.calls.at(-1)[0]).toMatch(/Harmanda Tekstil.*60\.000,00 TL/);
 expect(h.assistant.getContext()).toBeNull();expect(h.save).not.toHaveBeenCalled();expect(h.update).not.toHaveBeenCalled();expect(h.cancel).not.toHaveBeenCalled();
});
it('uses remembered account but only uses its customer for an explicit customer followup',async()=>{
 const h=harness();h.assistant.remember({accountIds:['a'],customer:{name:record.customer_name,tax:record.customer_tax_no,key:record.customer_key}});
 await h.assistant.handle('en son eklediğim tahsilat ne?');
 expect(h.readLatest).toHaveBeenLastCalledWith(expect.objectContaining({accountIds:['a'],customer:null}));
 await h.assistant.handle('onun son tahsilatı ne?');
 expect(h.readLatest).toHaveBeenLastCalledWith(expect.objectContaining({customer:expect.objectContaining({key:record.customer_key})}));
});
it('never substitutes a remembered account for an unknown explicit account',async()=>{
 const h=harness();h.assistant.remember({accountIds:['a']});await h.assistant.handle('Ahmet hesabındaki son tahsilat ne?');
 expect(h.readLatest).not.toHaveBeenCalled();expect(h.assistant.getContext().phase).toBe('account');
});
it('reads all requested accounts and reports missing data without suggesting a write',async()=>{
 const h=harness();h.readLatest.mockResolvedValue(null);await h.assistant.handle('tüm hesaplarda son tahsilat ne?');
 expect(h.readLatest).toHaveBeenCalledWith(expect.objectContaining({accountIds:['a','b']}));
 expect(h.message.mock.calls.at(-1)[0]).toMatch(/tahsilat bulunamadı/);
 expect(h.message.mock.calls.at(-1)[0]).not.toMatch(/ekle|kaydet|65/);expect(h.save).not.toHaveBeenCalled();
});
it('honors an explicit selected-accounts scope over a remembered single account',async()=>{
 const h=harness();h.assistant.remember({accountIds:['a']});
 await h.assistant.handle('seçili hesaplarda son tahsilat ne?',{draft:{accountIds:['a','b']}});
 expect(h.readLatest).toHaveBeenCalledWith(expect.objectContaining({accountIds:['a','b'],customer:null}));
});
it('ignores late record reads after conversation reset',async()=>{
 const h=harness();let finish;h.readLatest.mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));
 const task=h.assistant.handle('Serkan Bingöl hesabındaki son tahsilat ne?');
 h.assistant.reset();h.message.mockClear();finish(record);await task;
 expect(h.message).not.toHaveBeenCalled();expect(h.assistant.getMemory()).toBeNull();
});
it('resolves an explicitly named customer in the chosen account before reading',async()=>{
 const h=harness();await h.assistant.handle('Serkan Bingöl hesabındaki Harmanda’nın son tahsilatı ne?');
 expect(h.findCustomers).toHaveBeenCalledWith('a','harmanda');
 expect(h.readLatest).toHaveBeenCalledWith(expect.objectContaining({accountIds:['a'],customer:expect.objectContaining({key:record.customer_key})}));
 expect(h.save).not.toHaveBeenCalled();
});
it('does not replace a confirmation-ready payment with a read or save it implicitly',async()=>{
 const h=harness();await h.assistant.handle('bugün Serkan Bingöl hesabındaki Harmanda müşterisine 60 bin tahsilat ekle');
 await h.assistant.handle('en son eklediğim tahsilat ne?');expect(h.assistant.getContext()).toMatchObject({action:'collection',phase:'confirm',amount:'60000.00'});
 expect(h.readLatest).not.toHaveBeenCalled();expect(h.save).not.toHaveBeenCalled();
});
it('asks for the actual missing amount without fabricated numeric examples',async()=>{
 const h=harness();await h.assistant.handle('bugün Serkan Bingöl hesabındaki Harmanda müşterisine tahsilat ekle');
 expect(h.message.mock.calls.at(-1)[0]).toMatch(/harmanda/i);expect(h.message.mock.calls.at(-1)[0]).not.toMatch(/65|65000|örnek/);
 expect(h.save).not.toHaveBeenCalled();
});
