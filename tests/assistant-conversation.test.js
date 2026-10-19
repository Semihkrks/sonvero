// @vitest-environment jsdom
import {it,expect,vi,beforeEach,afterEach} from 'vitest';
// Relative dates such as "dün" are asserted against 17 Oct 2026.
beforeEach(()=>{vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-10-17T12:00:00+03:00'));});
afterEach(()=>vi.useRealTimers());
import {createBusinessAssistant} from '../src/services/assistant-business.js';
const accounts=[{id:'a',name:'Serkan Bingöl'},{id:'b',name:'Mustafa Yılmaz'}];
const customer={name:'Harmanda Tekstil',tax:'1234567890',balance:'125000.00'};
const record={id:'r1',account_id:'a',customer_name:customer.name,customer_tax_no:customer.tax,customer_key:customer.tax,amount:'60000.00',date:'2026-10-17',version:3,created_at:'2026-10-17T09:00:00Z'};
function harness(){
 const message=vi.fn(),choices=document.createElement('div'),save=vi.fn(async payload=>({...record,...payload}));
 const update=vi.fn(async(id,account,values)=>({...record,...values,id,account_id:account,version:4}));
 const cancel=vi.fn(async()=>({...record,cancelled_at:'2026-10-17T10:00:00Z',version:4}));
 const findCustomers=vi.fn(async()=>[customer]),findCollections=vi.fn(async()=>[record]);
 const readSummary=vi.fn(async()=>({totals:{sales:'100000.00',purchases:'0.00',collections:'60000.00',net:'40000.00'},rows:[],excluded:0,complete:false}));
 const assistant=createBusinessAssistant({accounts,message,choices,run:fn=>fn(),findCustomers,findCollections,readSummary,save,update,cancel});
 return {assistant,message,choices,save,update,cancel,findCustomers,findCollections,readSummary};
}
const create='bugün Serkan Bingöl hesabındaki Harmanda müşterisine 60 bin tahsilat ekle';
it('corrects pending amount and date then requires a new explicit confirmation',async()=>{
 const h=harness();await h.assistant.handle(create);await h.assistant.handle('60 değil 65 bin olsun');await h.assistant.handle('bugüne değil düne yaz');
 expect(h.save).not.toHaveBeenCalled();expect(h.assistant.getContext()).toMatchObject({amount:'65000.00',date:'2026-10-16'});
 await h.assistant.handle('onaylıyorum');expect(h.save).toHaveBeenCalledWith(expect.objectContaining({amount:'65000.00',date:'2026-10-16'}));
});
it('re-resolves the actual customer when a pending account is corrected',async()=>{
 const h=harness();await h.assistant.handle(create);await h.assistant.handle('Serkan değil Mustafa Yılmaz olsun');
 expect(h.findCustomers).toHaveBeenLastCalledWith('b','harmanda');await h.assistant.handle('onaylıyorum');expect(h.save.mock.calls[0][0].account_id).toBe('b');
});
it('retains customer and account for read followups, with exact totals from the tool',async()=>{
 const h=harness();await h.assistant.handle('Serkan Bingöl hesabındaki Harmanda bakiyesi ne?');
 await h.assistant.handle('Peki bu ay ne kadar tahsilat yapmışız?');
 expect(h.readSummary).toHaveBeenCalledWith(expect.objectContaining({accountIds:['a'],metric:'collections',customer:expect.objectContaining({tax:customer.tax})}));
 expect(h.save).not.toHaveBeenCalled();expect(h.message.mock.calls.at(-1)[0]).toContain('60.000');
});
it('updates the last real collection with version and preserves unchanged fields',async()=>{
 const h=harness();await h.assistant.handle(create);await h.assistant.handle('onaylıyorum');
 await h.assistant.handle('az önce eklediğim tahsilatı 65 bin olarak düzelt');expect(h.update).not.toHaveBeenCalled();
 await h.assistant.handle('onaylıyorum');expect(h.update).toHaveBeenCalledWith('r1','a',expect.objectContaining({version:3,amount:'65000.00',date:record.date}));
});
it('cancels the last collection only after displaying and confirming its actual identity',async()=>{
 const h=harness();await h.assistant.handle(create);await h.assistant.handle('onaylıyorum');
 await h.assistant.handle('az önce eklediğim tahsilatı iptal et');expect(h.cancel).not.toHaveBeenCalled();
 expect(h.message.mock.calls.at(-1)[0]).toContain('Harmanda Tekstil');await h.assistant.handle('onaylıyorum');
 expect(h.cancel).toHaveBeenCalledWith('r1','a',expect.objectContaining({version:3}));
});
it('never silently chooses the newest of multiple historical collections',async()=>{
 const h=harness();h.findCollections.mockResolvedValue([record,{...record,id:'r2',amount:'20000.00'}]);
 await h.assistant.handle('Serkan Bingöl hesabındaki Harmanda tahsilatını iptal et');
 expect(h.choices.querySelectorAll('button')).toHaveLength(2);expect(h.cancel).not.toHaveBeenCalled();
 await h.assistant.handle('ikincisi');await h.assistant.handle('onaylıyorum');expect(h.cancel.mock.calls[0][0]).toBe('r2');
});
it('queues two collection requests and confirms each separately',async()=>{
 const h=harness();await h.assistant.handle('bugün Serkan Bingöl hesabındaki Harmanda’ya 60 bin, Cihan’a 20 bin tahsilat ekle');
 expect(h.save).not.toHaveBeenCalled();await h.assistant.handle('onaylıyorum');expect(h.save).toHaveBeenCalledTimes(1);
 await h.assistant.handle('onaylıyorum');expect(h.save).toHaveBeenCalledTimes(2);expect(h.save.mock.calls.map(([value])=>value.amount)).toEqual(['60000.00','20000.00']);
});
it('does not allow a correction to mutate a payload after an uncertain save',async()=>{
 const h=harness();h.save.mockRejectedValueOnce(Object.assign(new Error('Sonuç belirsiz'),{uncertain:true}));
 await h.assistant.handle(create);await h.assistant.handle('onaylıyorum');await h.assistant.handle('60 değil 65 bin olsun');await h.assistant.handle('onaylıyorum');
 expect(h.save.mock.calls[0][0]).toEqual(h.save.mock.calls[1][0]);
});
it('cancelling a draft also clears queued writes without undoing completed work',async()=>{
 const h=harness();await h.assistant.handle('bugün Serkan Bingöl hesabındaki Harmanda’ya 60 bin, Cihan’a 20 bin tahsilat ekle');
 await h.assistant.handle('onaylıyorum');await h.assistant.handle('iptal');await h.assistant.handle('onaylıyorum');expect(h.save).toHaveBeenCalledTimes(1);
});
it('clears remembered context on new chat and ignores late summary results',async()=>{
 const h=harness();await h.assistant.handle('Serkan Bingöl hesabındaki Harmanda bakiyesi ne?');let finish;
 h.readSummary.mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));const task=h.assistant.handle('bugün toplam ne topladık?');h.assistant.reset();h.message.mockClear();
 finish({totals:{collections:'999.00'},rows:[]});await task;expect(h.message).not.toHaveBeenCalled();expect(h.assistant.getContext()).toBeNull();
});
it('uses business context rather than the report defaults during a followup',async()=>{
 const h=harness();await h.assistant.handle('Serkan Bingöl hesabındaki Harmanda bakiyesi ne?');
 await h.assistant.handle('Peki bu ay ne kadar tahsilat yapmışız?',{draft:{accountIds:['a','b'],customer:'Başka müşteri'}});
 expect(h.readSummary).toHaveBeenLastCalledWith(expect.objectContaining({accountIds:['a'],customer:expect.objectContaining({tax:customer.tax})}));
});
it('clears the customer for an explicit account total or debt ranking',async()=>{
 const h=harness();await h.assistant.handle('Serkan Bingöl hesabındaki Harmanda bakiyesi ne?');await h.assistant.handle('bugün toplam ne topladık?');
 expect(h.readSummary).toHaveBeenLastCalledWith(expect.objectContaining({customer:null}));
 await h.assistant.handle('bu ay en çok borcu olan beş müşteri kim?');expect(h.readSummary).toHaveBeenLastCalledWith(expect.objectContaining({metric:'debtors',customer:null}));
});
it('refreshes a concurrently changed record and requires a new confirmation',async()=>{
 const h=harness();await h.assistant.handle(create);await h.assistant.handle('onaylıyorum');
 await h.assistant.handle('az önce eklediğim tahsilatı 65 bin olarak düzelt');
 h.update.mockRejectedValueOnce(Object.assign(new Error('Kayıt başka bir sekmede değişti'),{code:'40001',uncertain:false}));
 h.findCollections.mockResolvedValue([{...record,version:9,amount:'62000.00'}]);await h.assistant.handle('onaylıyorum');expect(h.update).toHaveBeenCalledOnce();
 expect(h.message.mock.calls.at(-1)[0]).toContain('62.000');await h.assistant.handle('onaylıyorum');expect(h.update.mock.calls[1][2].version).toBe(9);
});
it('protects later batch items when the first write is uncertain',async()=>{
 const h=harness();h.save.mockRejectedValueOnce(Object.assign(new Error('Belirsiz'),{uncertain:true}));
 await h.assistant.handle('bugün Serkan Bingöl hesabındaki Harmanda’ya 60 bin, Cihan’a 20 bin tahsilat ekle');await h.assistant.handle('onaylıyorum');
 expect(h.save).toHaveBeenCalledOnce();await h.assistant.handle('onaylıyorum');expect(h.save).toHaveBeenCalledTimes(2);
 expect(h.save.mock.calls[0][0]).toEqual(h.save.mock.calls[1][0]);await h.assistant.handle('onaylıyorum');expect(h.save.mock.calls[2][0].amount).toBe('20000.00');
});
it('refuses an explicitly unknown account instead of falling back to remembered account',async()=>{
 const h=harness();await h.assistant.handle('Serkan Bingöl hesabındaki Harmanda bakiyesi ne?');h.findCustomers.mockClear();
 await h.assistant.handle('bugün Ahmet hesabındaki Harmanda müşterisine 60 bin tahsilat ekle');expect(h.findCustomers).not.toHaveBeenCalled();expect(h.save).not.toHaveBeenCalled();
});
it('reads a fresh balance instead of reusing the remembered money value',async()=>{
 const h=harness();await h.assistant.handle('Serkan Bingöl hesabındaki Harmanda bakiyesi ne?');
 h.findCustomers.mockResolvedValue([{...customer,balance:'99000.00'}]);await h.assistant.handle('onun bakiyesi ne?');
 expect(h.findCustomers).toHaveBeenCalledTimes(2);expect(h.message.mock.calls.at(-1)[0]).toContain('99.000');
});
it('offers a confirmed update when correcting the immediately saved payment',async()=>{
 const h=harness();await h.assistant.handle(create);await h.assistant.handle('onaylıyorum');await h.assistant.handle('60 değil 65 bin olsun');
 expect(h.update).not.toHaveBeenCalled();await h.assistant.handle('onaylıyorum');expect(h.update.mock.calls[0][2]).toMatchObject({amount:'65000.00',version:3});
});
it('asks again for an invalid update correction rather than silently keeping the old amount',async()=>{
 const h=harness();await h.assistant.handle(create);await h.assistant.handle('onaylıyorum');await h.assistant.handle('az önce eklediğim tahsilatı 65 bin olarak düzelt');
 await h.assistant.handle('65 değil 60.50 olsun');await h.assistant.handle('onaylıyorum');expect(h.update).not.toHaveBeenCalled();expect(h.assistant.getContext().phase).toBe('amount');
 await h.assistant.handle('70 bin');await h.assistant.handle('onaylıyorum');expect(h.update.mock.calls[0][2].amount).toBe('70000.00');
});
it('does not read all accounts for an explicitly unknown account summary',async()=>{
 const h=harness();await h.assistant.handle('Serkan Bingöl hesabındaki Harmanda bakiyesi ne?');await h.assistant.handle('Ahmet hesabındaki Harmanda bu ay ne kadar tahsilat yapmış?');
 expect(h.readSummary).not.toHaveBeenCalled();expect(h.assistant.getContext().phase).toBe('account');
});
it('retains the requested period for a customer summary followup',async()=>{
 const h=harness();await h.assistant.handle('Serkan Bingöl hesabındaki Harmanda bakiyesi ne?');await h.assistant.handle('peki bu ay ne kadar tahsilat yapmışız?');
 const {start,end}=h.readSummary.mock.calls[0][0];await h.assistant.handle('peki satışı ne kadar?');
 expect(h.readSummary).toHaveBeenLastCalledWith(expect.objectContaining({metric:'sales',start,end}));
});
it('preserves a taxless persisted customer identity in new collections',async()=>{
 const h=harness();h.findCustomers.mockResolvedValue([{name:'Harmanda Tekstil',tax:'',customer_key:'name:harmanda tekstil'}]);await h.assistant.handle(create);await h.assistant.handle('onaylıyorum');
 expect(h.save.mock.calls[0][0].customer_key).toBe('name:harmanda tekstil');
});
it('adds a new payment for the remembered customer without asking identity again',async()=>{
 const h=harness();await h.assistant.handle('Serkan Bingöl hesabındaki Harmanda bakiyesi ne?');h.findCustomers.mockClear();h.message.mockClear();
 await h.assistant.handle('buna 2k daha ekle');expect(h.findCustomers).not.toHaveBeenCalled();expect(h.message.mock.calls.at(-1)[0]).toContain('2.000,00 TL');
 expect(h.assistant.getContext()).toMatchObject({action:'collection',account:'Serkan Bingöl',customer:'Harmanda Tekstil',amount:'2000.00',phase:'confirm'});
 await h.assistant.handle('onaylıyorum');expect(h.save.mock.calls[0][0]).toMatchObject({account_id:'a',customer_tax_no:customer.tax,amount:'2000.00'});
});
it('treats an additional contextual payment as a separate record, not an edit',async()=>{
 const h=harness();await h.assistant.handle(create);await h.assistant.handle('onaylıyorum');await h.assistant.handle('aynı müşteriye bugün iki bin daha tahsilat ekle');await h.assistant.handle('onaylıyorum');
 expect(h.save).toHaveBeenCalledTimes(2);expect(h.save.mock.calls[1][0].amount).toBe('2000.00');expect(h.update).not.toHaveBeenCalled();
});
it('asks only for the amount when a contextual amount is malformed',async()=>{
 const h=harness();await h.assistant.handle('Serkan Bingöl hesabındaki Harmanda bakiyesi ne?');await h.assistant.handle('buna 2*k daha ekle');
 expect(h.assistant.getContext()).toMatchObject({customer:'Harmanda Tekstil',phase:'amount'});await h.assistant.handle('20 bin');await h.assistant.handle('onaylıyorum');expect(h.save.mock.calls[0][0].amount).toBe('20000.00');
});
it('resolves the customer introduced at the start, then reuses its actual identity',async()=>{
 const h=harness();await h.assistant.handle('Harmanda müşterimiz',{draft:{accountIds:['a']}});expect(h.assistant.getMemory()).toMatchObject({accountIds:['a'],customer:expect.objectContaining({tax:customer.tax})});
 h.findCustomers.mockClear();await h.assistant.handle('ona 2 bin daha ekle');expect(h.findCustomers).not.toHaveBeenCalled();expect(h.assistant.getContext().phase).toBe('confirm');
});
it('can resolve an unfinished report customer for a contextual payment without reasking its name',async()=>{
 const h=harness();await h.assistant.handle('buna 2 bin daha ekle',{draft:{accountIds:['a'],customer:'Harmanda'}});
 expect(h.findCustomers).toHaveBeenCalledWith('a','Harmanda');expect(h.assistant.getContext().phase).toBe('confirm');
});
it('does not turn an extra-payment command into a change to an unconfirmed draft',async()=>{
 const h=harness();await h.assistant.handle(create);await h.assistant.handle('buna 2 bin daha ekle');
 expect(h.assistant.getContext().amount).toBe('60000.00');expect(h.save).not.toHaveBeenCalled();expect(h.update).not.toHaveBeenCalled();
});
it('edits the latest persisted account record with a polite complete request',async()=>{
 const h=harness();h.findCollections.mockResolvedValue([{...record,id:'old',created_at:'2026-10-16T12:00:00Z'},record]);
 await h.assistant.handle('serkan bingöldeki son eklediğim tahsilatın tutarı yanlıştı onu 75 bin olarak düzeltir misin');
 expect(h.assistant.getContext()).toMatchObject({action:'update_collection',account:'Serkan Bingöl',amount:'75000.00',phase:'confirm'});
 expect(h.findCollections).toHaveBeenCalledWith(expect.objectContaining({accountId:'a',customer:null}));
 expect(h.update).not.toHaveBeenCalled();await h.assistant.handle('onaylıyorum');expect(h.update).toHaveBeenCalledWith('r1','a',expect.objectContaining({amount:'75000.00',version:3}));
});
it('advances from edit field choice and preserves amount plus date in the same answer',async()=>{
 const h=harness();await h.assistant.handle('Serkan Bingöl hesabındaki Harmanda tahsilatını düzelt');
 expect(h.assistant.getContext().phase).toBe('edit');await h.assistant.handle('tutar');expect(h.assistant.getContext().phase).toBe('amount');
 await h.assistant.handle('75bin ve dün');expect(h.assistant.getContext()).toMatchObject({amount:'75000.00',date:'2026-10-16',phase:'confirm'});
 await h.assistant.handle('onaylıyorum');expect(h.update.mock.calls[0][2]).toMatchObject({amount:'75000.00',date:'2026-10-16'});
});
it('selects a generic historical collection before asking its edit field',async()=>{
 const h=harness();h.findCollections.mockResolvedValue([record,{...record,id:'r2'}]);await h.assistant.handle('Serkan Bingöl tahsilat düzelt');
 expect(h.assistant.getContext().phase).toBe('choose_record');await h.assistant.handle('ikincisi');await h.assistant.handle('tarih');
 expect(h.assistant.getContext().phase).toBe('date');await h.assistant.handle('dün');await h.assistant.handle('onaylıyorum');expect(h.update.mock.calls[0]).toMatchObject(['r2','a',expect.objectContaining({date:'2026-10-16',amount:record.amount})]);
});
it('keeps early edit values supplied alongside a record choice',async()=>{
 const h=harness();h.findCollections.mockResolvedValue([record,{...record,id:'r2'}]);await h.assistant.handle('Serkan Bingöl tahsilat düzelt');await h.assistant.handle('ikincisi tutarı 75 bin tarihi dün olsun');
 expect(h.assistant.getContext()).toMatchObject({amount:'75000.00',date:'2026-10-16',phase:'confirm'});await h.assistant.handle('onaylıyorum');expect(h.update.mock.calls[0][0]).toBe('r2');
});
it('does not consume a new report as pending customer or amount text',async()=>{
 const h=harness();await h.assistant.handle('Serkan Bingöl tahsilat ekle');
 expect(await h.assistant.handle('Ayşe Karabulut hesabından 9. ay satış alış tahsilat dahil Harmanda müşterisinin excelini ver')).toBe(false);
 expect(h.assistant.getContext()).toBeNull();expect(h.save).not.toHaveBeenCalled();
});
it('preserves amount and date supplied while answering the account question',async()=>{
 const h=harness();await h.assistant.handle('Harmanda tahsilatını düzelt');await h.assistant.handle('Serkan Bingöl tutarı 75 bin tarihi dün olsun');
 expect(h.assistant.getContext()).toMatchObject({account:'Serkan Bingöl',amount:'75000.00',date:'2026-10-16',phase:'confirm'});
});
it('does not redirect an explicit other-account edit to the last session record',async()=>{
 const h=harness();await h.assistant.handle(create);await h.assistant.handle('onaylıyorum');h.findCollections.mockResolvedValue([{...record,id:'b1',account_id:'b'}]);
 await h.assistant.handle('Mustafa Yılmaz hesabındaki son eklediğim tahsilatı 75 bin olarak düzeltir misin');
 expect(h.assistant.getContext()).toMatchObject({account:'Mustafa Yılmaz',amount:'75000.00',phase:'confirm'});await h.assistant.handle('onaylıyorum');expect(h.update.mock.calls[0].slice(0,2)).toEqual(['b1','b']);
});
it('retains an early field selection while a historical record is being chosen',async()=>{
 const h=harness();h.findCollections.mockResolvedValue([record,{...record,id:'r2'}]);await h.assistant.handle('Serkan Bingöl tahsilat düzelt');await h.assistant.handle('tutar');
 expect(h.assistant.getContext().phase).toBe('choose_record');await h.assistant.handle('ikinci 75bin dün');expect(h.assistant.getContext()).toMatchObject({amount:'75000.00',date:'2026-10-16',phase:'confirm'});
});
it('does not clear an invalid amount just because the same answer contains a valid date',async()=>{
 const h=harness();await h.assistant.handle('Serkan Bingöl hesabındaki Harmanda tahsilatını düzelt');await h.assistant.handle('tutarı 60.50 tarihi dün olsun');
 expect(h.assistant.getContext().phase).toBe('amount');await h.assistant.handle('onaylıyorum');expect(h.update).not.toHaveBeenCalled();await h.assistant.handle('75bin.');
 expect(h.assistant.getContext()).toMatchObject({amount:'75000.00',date:'2026-10-16',phase:'confirm'});
});
it('uses only explicit latest order, keeping a generic edit ambiguous',async()=>{
 const h=harness();h.findCollections.mockResolvedValue([{...record,id:'backdated',date:'2026-01-01',created_at:'2026-10-17T11:00:00Z'},record]);
 await h.assistant.handle('Serkan Bingöl son tahsilatı 75 bin olarak günceller misin');await h.assistant.handle('onaylıyorum');expect(h.update.mock.calls[0][0]).toBe('backdated');
});
it('applies account and amount corrections together before an unsaved collection',async()=>{
 const h=harness();await h.assistant.handle(create);await h.assistant.handle('Mustafa Yılmaz hesabı olsun tutarı 75 bin tarihi dün olsun');
 expect(h.assistant.getContext()).toMatchObject({account:'Mustafa Yılmaz',amount:'75000.00',date:'2026-10-16',phase:'confirm'});await h.assistant.handle('onaylıyorum');expect(h.save.mock.calls[0][0]).toMatchObject({account_id:'b',amount:'75000.00'});
});
it('preserves all values when correcting a customer and its collection fields',async()=>{
 const h=harness();await h.assistant.handle(create);await h.assistant.handle('müşteri Harmanda değil Cihan olsun tutarı 75 bin tarihi dün olsun');
 expect(h.findCustomers).toHaveBeenLastCalledWith('a','cihan');expect(h.assistant.getContext()).toMatchObject({amount:'75000.00',date:'2026-10-16',phase:'confirm'});
});
it('never previews an invalid initial edit amount as the old persisted value',async()=>{
 const h=harness();await h.assistant.handle('Serkan Bingöl hesabındaki son tahsilatı 60.50 ve dün olarak düzeltir misin');
 expect(h.assistant.getContext().phase).toBe('amount');await h.assistant.handle('onaylıyorum');expect(h.update).not.toHaveBeenCalled();
});
it('scopes latest edits to an explicitly named customer instead of the whole account',async()=>{
 const h=harness();await h.assistant.handle('Serkan Bingöl hesabındaki Harmanda müşterisinin son tahsilatını 75 bin olarak düzeltir misin');
 expect(h.findCustomers).toHaveBeenCalledWith('a','harmanda');expect(h.findCollections).toHaveBeenCalledWith(expect.objectContaining({customer:expect.objectContaining({tax:customer.tax})}));
});
it('does not turn a bare numeric record choice into an edit amount',async()=>{
 const h=harness();h.findCollections.mockResolvedValue([record,{...record,id:'r2'}]);await h.assistant.handle('Serkan Bingöl tahsilat düzelt');await h.assistant.handle('2');
 expect(h.assistant.getContext()).toMatchObject({phase:'edit'});expect(h.assistant.getContext().amount).toBeUndefined();expect(h.update).not.toHaveBeenCalled();
});
it('does not turn a customer VKN choice into the collection amount',async()=>{
 const h=harness();h.findCustomers.mockResolvedValue([customer,{name:'Harmanda İplik',tax:'9876543210'}]);await h.assistant.handle('bugün Serkan Bingöl hesabındaki Harmanda müşterisine 60 bin tahsilat ekle');await h.assistant.handle(customer.tax);
 expect(h.assistant.getContext()).toMatchObject({amount:'60000.00',phase:'confirm'});await h.assistant.handle('onaylıyorum');expect(h.save.mock.calls[0][0].amount).toBe('60000.00');
});
it('does not interpret a numbered-month summary query as a pending draft amount',async()=>{
 const h=harness();await h.assistant.handle(create);await h.assistant.handle('9. ay toplam tahsilat ne kadar?');
 expect(h.assistant.getContext()).toMatchObject({amount:'60000.00',phase:'confirm'});expect(h.save).not.toHaveBeenCalled();
});
it('resolves persisted latest from the current account context instead of an older session write',async()=>{
 const h=harness();await h.assistant.handle(create);await h.assistant.handle('onaylıyorum');await h.assistant.handle('Mustafa Yılmaz hesabındaki Harmanda bakiyesi ne?');h.findCollections.mockResolvedValue([{...record,id:'b1',account_id:'b'}]);
 await h.assistant.handle('son eklediğim tahsilatı 75 bin olarak düzeltir misin');expect(h.findCollections).toHaveBeenLastCalledWith(expect.objectContaining({accountId:'b',customer:null}));expect(h.assistant.getContext()).toMatchObject({account:'Mustafa Yılmaz',phase:'confirm'});
});
it('refuses a cancelled latest record instead of editing an older active collection',async()=>{
 const h=harness();h.findCollections.mockResolvedValue([{...record,id:'cancelled',created_at:'2026-10-17T12:00:00Z',cancelled_at:'2026-10-17T13:00:00Z'},record]);
 await h.assistant.handle('Serkan Bingöl son tahsilatı 75 bin olarak düzelt');expect(h.findCollections).toHaveBeenCalledWith(expect.objectContaining({includeCancelled:true}));expect(h.assistant.getContext()).toBeNull();expect(h.message.mock.calls.at(-1)[0]).toContain('iptal');expect(h.update).not.toHaveBeenCalled();
});
it.each(['Harmanda bize ne borçlu','Harmanda bize kaç para borçlu',"Harmanda'dan ne kadar alacağımız var"])('reads real customer balance for a natural receivable question: %s',async text=>{
  const h=harness();await h.assistant.handle('Serkan Bingöl hesabındaki '+text);expect(h.findCustomers).toHaveBeenCalledWith('a','harmanda');expect(h.message.mock.calls.at(-1)[0]).toContain('125.000,00 TL');expect(h.save).not.toHaveBeenCalled();
 });
it('uses full positive balance totals for receivables instead of adding the visible debtor rows',async()=>{
 const h=harness();h.readSummary.mockResolvedValue({totals:{balance:'999000.00'},count:23,rows:[{name:'Harmanda',accountId:'a',balance:'100.00'}],excluded:0,complete:false});
 await h.assistant.handle('Serkan hesabında toplam ne kadar alacağımız var');expect(h.readSummary).toHaveBeenCalledWith(expect.objectContaining({metric:'debtors',accountIds:['a'],customer:null}));expect(h.message.mock.calls.at(-1)[0]).toContain('999.000,00 TL');expect(h.message.mock.calls.at(-1)[0]).not.toContain('100,00 TL');
});
it('keeps current customer for a conversational receivable followup and clears it for explicit total',async()=>{
 const h=harness();await h.assistant.handle('Serkan hesabındaki Harmanda bakiyesi ne?');await h.assistant.handle('peki ne kadar alacağımız var');expect(h.findCustomers).toHaveBeenLastCalledWith('a','Harmanda Tekstil');expect(h.readSummary).not.toHaveBeenCalled();
 h.readSummary.mockResolvedValue({totals:{balance:'50000.00'},rows:[],excluded:0});await h.assistant.handle('toplam ne kadar alacağımız var');expect(h.readSummary).toHaveBeenLastCalledWith(expect.objectContaining({customer:null,metric:'debtors'}));
});
it.each(['75 bin yapma','75 bin olarak düzeltmek istemiyorum','tahsilatı 75 bin ekleme'])('keeps a pending amount unchanged when the user negates a mutation: %s',async text=>{
  const h=harness();await h.assistant.handle(create);await h.assistant.handle(text);expect(h.assistant.getContext()).toMatchObject({amount:'60000.00',phase:'confirm'});expect(h.save).not.toHaveBeenCalled();
 });
it.each(['Bu ay kârımız 90 bin miydi?','Bankada 80 bin var mı?','Vadesi 10 gün olanları göster'])('preserves pending financial slots for unsupported numeric queries: %s',async text=>{
  const h=harness();await h.assistant.handle(create);await h.assistant.handle(text);expect(h.assistant.getContext()).toMatchObject({amount:'60000.00',phase:'confirm'});expect(h.message.mock.calls.at(-1)[0]).toContain('bağlı değil');expect(h.save).not.toHaveBeenCalled();
 });
it('honors the explicitly selected accounts when asking total receivables after a customer conversation',async()=>{
 const h=harness();await h.assistant.handle('Serkan hesabındaki Harmanda bakiyesi ne?');h.readSummary.mockResolvedValue({totals:{balance:'50000.00'},rows:[],excluded:0});
 await h.assistant.handle('seçili hesaplarda ne kadar alacağımız var',{draft:{accountIds:['a','b']}});expect(h.readSummary).toHaveBeenCalledWith(expect.objectContaining({accountIds:['a','b'],customer:null,metric:'debtors'}));
});
