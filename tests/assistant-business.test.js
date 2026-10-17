// @vitest-environment jsdom
import {it,expect,vi} from 'vitest';
import {parseBusinessCommand} from '../src/lib/assistant-actions.js';
import {createBusinessAssistant} from '../src/services/assistant-business.js';
const accounts=[{id:'a',name:'Serkan Bingöl'},{id:'b',name:'Mustafa Yılmaz'}];
const command='bugün serkan bingl hesabındaki harmanda müşterisine 60 bin tahsilat ekle';
it('parses account, money and date independently of model supplied money',()=>{
 expect(parseBusinessCommand(command,{accounts,remote:{amount:6}})).toMatchObject({action:'collection',accountIds:['a'],customer:'harmanda',amount:'60000.00',date:expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/)});
 expect(parseBusinessCommand(command.replace('60 bin','60.000,50'),{accounts})).toMatchObject({amount:'60000.50'});
});
it('understands Turkish spoken money and negated write commands safely',()=>{
 expect(parseBusinessCommand(command.replace('60 bin','altmış bin'),{accounts})).toMatchObject({amount:'60000.00'});
 expect(parseBusinessCommand(command+' ekleme',{accounts})).toBeNull();
 expect(parseBusinessCommand(command.replace('60 bin','-60 bin'),{accounts})?.amount).toBeNull();
});
it('never interprets a suffix of a malformed money token as the amount',()=>{
 for(const value of ['60.50','100000.25','60,000.50','1,000','60.0000','-60','60.000,001'])expect(parseBusinessCommand(command.replace('60 bin',value),{accounts})?.amount).toBeNull();
});
it('asks again for unsupported spoken fractions instead of losing part of the amount',()=>{
 for(const value of ['bir buçuk milyon','iki buçuk bin','altmış beş buçuk bin'])expect(parseBusinessCommand(command.replace('60 bin',value),{accounts})?.amount).toBeNull();
});
function harness(find=vi.fn(async()=>[{name:'Harmanda Tekstil',tax:'1234567890',balance:'125000.00'}])){
 const message=vi.fn(),save=vi.fn(async()=>({id:'saved'})),choices=document.createElement('div');
 const assistant=createBusinessAssistant({accounts,message,choices,findCustomers:find,save,run:fn=>fn()});
 return {assistant,message,save,find,choices};
}
it('resolves only the explicit account and writes exactly once after spoken confirmation',async()=>{
 const h=harness();await h.assistant.handle(command);
 expect(h.find).toHaveBeenCalledWith('a','harmanda');expect(h.save).not.toHaveBeenCalled();
 expect(h.message.mock.calls.at(-1)[0]).toContain('Harmanda Tekstil');
 await h.assistant.handle('tekrar kontrol et');expect(h.save).not.toHaveBeenCalled();
 await h.assistant.handle('onaylıyorum');await h.assistant.handle('onaylıyorum');
 expect(h.save).toHaveBeenCalledOnce();expect(h.save).toHaveBeenCalledWith(expect.objectContaining({account_id:'a',customer_key:'1234567890',amount:'60000.00'}));
});
it('asks for account rather than using stale report context',async()=>{
 const h=harness();await h.assistant.handle('bugün harmanda müşterisine 60 bin tahsilat ekle',{draft:{accountIds:['b']}});
 expect(h.find).not.toHaveBeenCalled();await h.assistant.handle('Serkan Bingöl');expect(h.find).toHaveBeenCalledWith('a','harmanda');
});
it('keeps same plan on uncertain save and cancels without a write',async()=>{
 const h=harness();h.save.mockRejectedValueOnce(new Error('Sonuç belirsiz'));
 await h.assistant.handle(command);await h.assistant.handle('onaylıyorum');
 expect(h.assistant.getContext().phase).toBe('confirm');await h.assistant.handle('onaylıyorum');
 expect(h.save.mock.calls[0][0]).toEqual(h.save.mock.calls[1][0]);
 await h.assistant.handle(command);await h.assistant.handle('iptal');expect(h.assistant.getContext()).toBeNull();expect(h.save).toHaveBeenCalledTimes(2);
});
it('drops late customer results after reset',async()=>{
 let resolve;const h=harness(()=>new Promise(r=>{resolve=r;}));const task=h.assistant.handle(command);
 h.assistant.reset();resolve([{name:'Harmanda',tax:'1'}]);await task;expect(h.message).not.toHaveBeenCalled();expect(h.save).not.toHaveBeenCalled();
});
it('allows only known navigation destinations',()=>{
 expect(parseBusinessCommand('ayarları aç',{accounts})).toEqual({action:'navigate',route:'/settings'});
 expect(parseBusinessCommand('bir ekran',{accounts,remote:{action:'navigate',route:'https://evil.example'}})).toBeNull();
});
it('reads an account scoped balance without creating a collection',async()=>{
 const h=harness();await h.assistant.handle('Serkan Bingöl hesabındaki Harmanda bakiyesi ne?');
 expect(h.find).toHaveBeenCalledWith('a','harmanda');expect(h.save).not.toHaveBeenCalled();expect(h.message.mock.calls.at(-1)[0]).toContain('125.000');
});
