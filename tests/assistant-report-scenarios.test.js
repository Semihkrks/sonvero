import {describe,it,expect} from 'vitest';
import {parseQuickIntent,nextQuestion} from '../src/lib/assistant-intent.js';
import {dialogueCommand,requestedFormat} from '../src/lib/assistant-dialogue.js';

const accounts=[{id:'a',name:'Ayşe Karabut'},{id:'b',name:'Serkan Bingöl'}];
const draft={scope:'cari',accountIds:['a'],customer:'Harmanda',start:'2026-09-01',end:'2026-09-30',month:9,year:2026,direction:'both',withCollections:true,format:'excel'};
const now=new Date('2026-10-17T12:00:00Z');
describe('report followups preserve supplied identity and only patch requested fields',()=>{
 it.each([
  ['aynısını geçen ay için',{start:'2026-09-01',end:'2026-09-30'}],
  ['aynı raporu bu ay için hazırla',{start:'2026-10-01',end:'2026-10-31'}],
  ['sadece satışlar olsun',{direction:'satis'}],
  ['yalnızca alışlar olsun',{direction:'alis'}],
  ['satış ve alışları birlikte göster',{direction:'both'}],
  ['tahsilatları çıkar',{withCollections:false}],
  ['tahsilatları dahil etme',{withCollections:false}],
  ['tahsilatlar olmasın',{withCollections:false}],
  ['tahsilatları da ekle',{withCollections:true}],
  ['aynı müşterinin sadece satışları olsun tahsilatları hariç tut',{direction:'satis',withCollections:false}],
 ])('%s',(text,expected)=>{
  const parsed=parseQuickIntent(text,{accounts,draft,now});
  expect(parsed.handled).toBe(true);expect(parsed.intent).toMatchObject(expected);
  expect(parsed.intent).not.toHaveProperty('customer');
  expect(nextQuestion({...draft,...parsed.intent})).toBe(null);
 });
 it('switches the same customer to the unique other account and asks when there are several',()=>{
  expect(parseQuickIntent('diğer hesabın aynı müşterisi',{accounts,draft,now})).toMatchObject({handled:true,intent:{scope:'cari',accountIds:['b']}});
  const parsed=parseQuickIntent('diğer hesabın aynı müşterisi',{accounts:[...accounts,{id:'c',name:'Mert Sarısoy'}],draft,now});
  expect(parsed).toMatchObject({handled:true,intent:{scope:'cari',accountIds:[]}});
  expect(parsed.intent).not.toHaveProperty('customer');expect(nextQuestion({...draft,...parsed.intent}).key).toBe('accounts');
 });
 it.each(['aynısını geçen ay için','sadece satışlar olsun','tahsilatları çıkar','diğer hesabın aynı müşterisi'])('requires report identity without context: %s',text=>{
  const parsed=parseQuickIntent(text,{accounts,now});
  expect(parsed.handled).toBe(false);expect(parsed.intent).not.toHaveProperty('customer');
 });
 it.each(['tahsilat ekle','75 bin tahsilat ekle','son tahsilatı 75 bin olarak düzelt','son tahsilat ne kadar','bu ay satış toplamı ne kadar','tahsilat ekle Excel olsun','Satıştan tahsilatı çıkar','satışından tahsilatını çıkar'])('does not take financial commands away from business handling: %s',text=>{
  expect(parseQuickIntent(text,{accounts,draft,now}).contextual).toBe(false);
 });
 it('changes the format before preview without treating replacement words as a customer',()=>{
  const parsed=parseQuickIntent('Excel yerine fotoğraf olsun',{accounts,draft,now});
  expect(parsed).toMatchObject({handled:true,contextual:true,intent:{format:'image'}});
  expect(parsed.intent).not.toHaveProperty('customer');
 });
 it('does not broaden a negated all-account request to every account',()=>{
  const parsed=parseQuickIntent('tüm hesaplar değil Ayşe Karabut hesabından Harmanda 9.ay excelini ver',{accounts,draft,now});
  expect(parsed.intent).toMatchObject({scope:'cari',accountIds:['a'],customer:'harmanda'});
 });
 it('does not let an unrelated report verb remove collections',()=>{
  expect(parseQuickIntent('satış alış tahsilat dahil Harmanda raporunu çıkar',{accounts,draft,now}).intent.withCollections).toBe(true);
 });
 it.each(['9.ay mı 10.ay mı','2025 mi 2026 mı','2026-09-01 ile 2026-09-30 değil 2026-10-01 ile 2026-10-31'])('defers contradictory period alternatives instead of guessing the first one: %s',period=>{
  const parsed=parseQuickIntent(`Ayşe hesabından ${period} Harmanda müşterisinin Excelini ver`,{accounts,draft,now});
  expect(parsed.handled).toBe(false);expect(parsed.intent).not.toHaveProperty('start');expect(parsed.intent).not.toHaveProperty('customer');
 });
});
describe('customer choice remains bounded by actual displayed identities',()=>{
 const candidates=[{name:'Volkan Tekstil',tax:'1111111111'},{name:'Volkan Kumaş',tax:'2222222222'}];
 it('accepts an unambiguous short distinction and retains an ambiguous common name',()=>{
  expect(dialogueCommand('tekstil olan olsun',{candidates})).toMatchObject({action:'choose',index:0});
  expect(dialogueCommand('Volkan olsun',{candidates})).toBe(null);
 });
 it('never matches a tax number inside a different longer number',()=>{
  expect(dialogueCommand('1111111111',{candidates})).toMatchObject({action:'choose',index:0});
  expect(dialogueCommand('91111111111',{candidates})).toBe(null);
 });
});
describe('format changes and external send consent',()=>{
 it.each([
  ['Excel de olsun','image','both'],['fotoğrafı da ekle','excel','both'],
  ['sadece Excel olsun','both','excel'],['Excel yerine görsel olsun','excel','image'],
  ['fotoğrafı çıkar','both','excel'],['Exceli kaldır','both','image'],
 ])('%s patches %s to %s',(text,currentFormat,expected)=>{
  expect(requestedFormat(text,{currentFormat})).toBe(expected);
  expect(dialogueCommand(text,{hasPreview:true,currentFormat})).toMatchObject({action:'format',format:expected});
 });
 it.each(['WhatsAppa gönderme','Exceli gönderme','fotoğrafı yollama'])('never treats a negated send as permission: %s',text=>{
  expect(dialogueCommand(text,{hasPreview:true,currentFormat:'both'})?.action).not.toBe('send');
 });
 it('can explicitly exclude an attachment and send the other one',()=>{
  expect(dialogueCommand('fotoğrafı gönderme sadece Exceli gönder',{hasPreview:true,currentFormat:'both'})).toMatchObject({action:'send',format:'excel'});
 });
});
