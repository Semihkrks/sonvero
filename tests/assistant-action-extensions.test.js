import {it,expect} from 'vitest';
import {parseBusinessCommand,parseBusinessCorrection,parseBusinessBatch} from '../src/lib/assistant-actions.js';
import {istanbulDate} from '../src/lib/money.js';

const accounts=[{id:'a',name:'Serkan Bingöl'},{id:'b',name:'Mustafa Yılmaz'}];
it('corrects explicit amount, date and account without retaining a negated name',()=>{
 expect(parseBusinessCorrection('60 değil 65 bin olsun',{accounts})).toEqual({amount:'65000.00'});
 expect(parseBusinessCorrection('Serkan değil Mustafa hesabı olsun',{accounts})).toEqual({accountIds:['b'],account:'mustafa'});
 expect(parseBusinessCorrection('Serkan değil diğer hesap',{accounts})).toEqual({accountReference:'other'});
 expect(parseBusinessCorrection('bugüne değil düne yaz',{accounts})?.date).not.toBe(istanbulDate());
 expect(parseBusinessCorrection('düne değil bugüne yaz',{accounts})).toEqual({date:istanbulDate()});
 expect(parseBusinessCorrection('Mustafa hesabı değil Serkan Bingöl hesabı olsun',{accounts})).toEqual({accountIds:['a'],account:'serkan bingol'});
 expect(parseBusinessCorrection('Serkan Bingöl değil tanımadığım hesap olsun',{accounts})).toEqual({accountIds:[],account:'tanimadigim hesap'});
 expect(parseBusinessCorrection('bugüne değil 2026-02-30 yaz',{accounts})).toEqual({date:null});
 expect(parseBusinessCorrection('müşteri Harmanda değil Cihan olsun',{accounts})).toEqual({customer:'cihan'});
});
it('does not accept malformed, negative or invalid spoken correction money',()=>{
 for(const amount of ['60.50','100000.25','-65 bin','altmış yetmiş bin','bir buçuk bin','65 bin lira kuruş'])
  expect(parseBusinessCorrection(`60 değil ${amount} olsun`,{accounts})).toEqual({amount:null});
 expect(parseBusinessCorrection('65 bin olsun',{accounts})).toEqual({amount:'65000.00'});
 expect(parseBusinessCorrection('60 değil65 bin olsun',{accounts})).toEqual({amount:'65000.00'});
 expect(parseBusinessCorrection('tamam kanka',{accounts})).toBeNull();
});
it('queues each named customer with exact amounts and shared explicit account',()=>{
 const batch=parseBusinessBatch("Bugün Serkan Bingöl hesabındaki Harmanda'ya 60 bin, Cihan'a 20 bin tahsilat ekle",{accounts});
 expect(batch).toHaveLength(2);
 expect(batch[0]).toMatchObject({action:'collection',accountIds:['a'],customer:'harmanda',amount:'60000.00',date:istanbulDate()});
 expect(batch[1]).toMatchObject({action:'collection',accountIds:['a'],customer:'cihan',amount:'20000.00',date:istanbulDate()});
});
it('preserves invalid batch money for clarification and never uses remote money',()=>{
 const batch=parseBusinessBatch("Harmanda'ya 60.50, Cihan'a 20 bin tahsilat ekle",{accounts,remote:{amount:60000}});
 expect(batch).toHaveLength(2);expect(batch[0].amount).toBeNull();
 expect(parseBusinessBatch("Harmanda'ya 60 bin tahsilat ekle",{accounts})).toBeNull();
 expect(parseBusinessBatch("Harmanda'ya 60 bin, Cihan'a 20 bin tahsilat ekleme",{accounts})).toBeNull();
 expect(parseBusinessBatch("Harmanda'ya eksi altmış bin, Cihan'a yirmi bin tahsilat ekle",{accounts})[0].amount).toBeNull();
 expect(parseBusinessCommand("Harmanda'ya altmış bin tahsilat ekle",{accounts})).toMatchObject({customer:'harmanda',amount:'60000.00'});
});
it('preserves oversized batch detection so the controller can reject it',()=>{
 const text='bugün Serkan Bingöl hesabındaki '+Array.from({length:11},(_,i)=>`Müşteri ${i+1}'ye ${i+1} bin`).join(', ')+' tahsilat ekle';
 expect(parseBusinessBatch(text,{accounts}).length).toBeGreaterThan(10);
});
it('preserves explicit customer and account against remote guesses and stale memory',()=>{
 expect(parseBusinessCommand("Bugün Serkan Bingöl hesabındaki Harmanda'ya 60 bin tahsilat ekle",{accounts,remote:{customer:'Cihan'}})).toMatchObject({customer:'harmanda'});
 for(const text of ["bugün Ahmet hesabındaki Harmanda'ya 60 bin tahsilat ekle",'Ahmet hesabındaki Harmanda bu ay ne kadar tahsilat yapmış?'])
  expect(parseBusinessCommand(text,{accounts,draft:{accountIds:['a']},remote:{account:'Serkan Bingöl'}})).toMatchObject({accountIds:[],account:'ahmet',explicitAccount:true});
 expect(parseBusinessCommand('Serkan hesabındaki Harmanda bakiyesi ne?',{accounts:[...accounts,{id:'c',name:'Serkan Kaya'}]})).toMatchObject({accountIds:[],account:'serkan',explicitAccount:true});
 expect(parseBusinessCommand('tamamdır kanka',{accounts,remote:{action:'collection',customer:'Harmanda'}})).toBeNull();
});
it('queues repeated complete clauses and respects each explicit date',()=>{
 const batch=parseBusinessBatch("bugün Serkan Bingöl hesabındaki Harmanda'ya 60 bin tahsilat ekle ve Cihan'a 20 bin tahsilat ekle",{accounts});
 expect(batch).toHaveLength(2);expect(batch.map(c=>c.amount)).toEqual(['60000.00','20000.00']);
 const dated=parseBusinessBatch("Harmanda'ya bugün 60 bin, Cihan'a dün 20 bin tahsilat ekle",{accounts});
 expect(dated[0]).toMatchObject({customer:'harmanda',date:istanbulDate()});expect(dated[1].date).not.toBe(istanbulDate());
 expect(parseBusinessBatch("Harmanda'ya 60 bin, Cihan'a dün 20 bin tahsilat ekle",{accounts})[0].date).toBeNull();
});
it('permits only validated read-only remote summary fallback',()=>{
 expect(parseBusinessCommand('dönemin durumunu anlat',{accounts,remote:{action:'summary',metric:'collections',start:'2026-10-01',end:'2026-10-17'}})).toMatchObject({action:'summary',metric:'collections',period:{start:'2026-10-01',end:'2026-10-17'}});
 expect(parseBusinessCommand('dönemin durumunu anlat',{accounts,remote:{action:'summary',metric:'sql'}})).toBeNull();
 expect(parseBusinessCommand('dönemin durumunu anlat',{accounts,remote:{action:'summary',metric:'collections',start:'2026-02-30',end:'2026-03-17'}})).toMatchObject({period:null});
});
it('parses summaries and context followups with calendar periods',()=>{
 expect(parseBusinessCommand('Bugün toplam ne topladık?',{accounts})).toMatchObject({action:'summary',metric:'collections',period:{start:istanbulDate(),end:istanbulDate()}});
 expect(parseBusinessCommand('Bu ay en çok borcu olan beş müşteri kim?',{accounts})).toMatchObject({action:'summary',metric:'debtors',limit:5});
 expect(parseBusinessCommand('Serkan Bingöl satışından tahsilatını çıkar',{accounts})).toMatchObject({action:'summary',metric:'sales_collections',accountIds:['a']});
 expect(parseBusinessCommand("Serkan'ın satışından tahsilatını çıkar",{accounts})).toMatchObject({action:'summary',metric:'sales_collections',accountIds:['a']});
 expect(parseBusinessCommand('Bu ay net durum ne?',{accounts})).toMatchObject({action:'summary',metric:'net'});
 expect(parseBusinessCommand('Peki bu ay ne kadar tahsilat yapmışız?',{accounts,draft:{accountIds:['a'],customer:'Harmanda'}})).toMatchObject({action:'summary',metric:'collections',accountIds:['a'],customer:'Harmanda'});
 expect(parseBusinessCommand('Harmanda bakiyesi ne?',{accounts})).toMatchObject({action:'balance',customer:'harmanda'});
 expect(parseBusinessCommand("Serkan hesabındaki Harmanda'nın bu ay tahsilatı ne kadar?",{accounts})).toMatchObject({action:'summary',metric:'collections',accountIds:['a'],customer:'harmanda'});
 expect(parseBusinessCommand('Tüm hesaplarda bugün toplam ne topladık?',{accounts})).toMatchObject({action:'summary',scope:'all',customer:null});
 expect(parseBusinessCommand('Bu ay tüm müşteriler ne kadar tahsilat yapmış?',{accounts})).toMatchObject({action:'summary',allCustomers:true,customer:null});
});
it('recognizes record mutation separately from draft cancellation',()=>{
 expect(parseBusinessCommand('Az önce eklediğim tahsilatı iptal et',{accounts})).toMatchObject({action:'cancel_collection',referLast:true});
 expect(parseBusinessCommand('Son tahsilatı 65 bin olarak düzelt',{accounts})).toMatchObject({action:'update_collection',referLast:true,amount:'65000.00'});
 expect(parseBusinessCommand('Serkan Bingöl hesabındaki Harmanda tahsilatını iptal et',{accounts})).toMatchObject({action:'cancel_collection',referLast:false,accountIds:['a'],customer:'harmanda'});
 expect(parseBusinessCommand("Serkan Bingöl hesabındaki Harmanda'nın tahsilatını 65 bin olarak düzelt",{accounts})).toMatchObject({action:'update_collection',accountIds:['a'],customer:'harmanda',amount:'65000.00'});
 expect(parseBusinessCommand('iptal',{accounts})).toBeNull();
 expect(parseBusinessCommand('Son tahsilatı iptal etme',{accounts})).toBeNull();
 expect(parseBusinessCommand('Son tahsilatı iptal et değil 65 bin olarak düzelt',{accounts})).toBeNull();
 expect(parseBusinessCommand('Son tahsilatı iptal et değil bekle',{accounts})).toBeNull();
});
