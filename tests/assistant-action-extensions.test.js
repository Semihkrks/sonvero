import {it,expect} from 'vitest';
import {parseBusinessCommand,parseBusinessCorrection,parseBusinessBatch,parseBusinessSlots} from '../src/lib/assistant-actions.js';
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
it('understands polite collection requests and amounts after the collection noun',()=>{
 for(const ending of ['ekler misin','ekleyebilir misin','eklesene','ekle lütfen']){
  expect(parseBusinessCommand(`Serkan Bingöl hesabındaki Harmanda müşterisine bugün 75bin tahsilat ${ending}`,{accounts})).toMatchObject({action:'collection',accountIds:['a'],customer:'harmanda',amount:'75000.00',date:istanbulDate()});
 }
 expect(parseBusinessCommand('Serkan Bingöl hesabındaki Harmanda müşterisine tahsilat olarak 75 bin ekler misin',{accounts})).toMatchObject({action:'collection',customer:'harmanda',amount:'75000.00'});
});
it('preserves amount magnitude across transcript punctuation between fields',()=>{
 for(const text of ['75 bin, tarihi de dün olsun','75bin, tarihi dün olsun','75 bin. Tarihi dün olsun','75 bin; tarihi dün olsun']){
  expect(parseBusinessSlots(text)).toMatchObject({amount:'75000.00',date:expect.stringMatching(/^20\d{2}-\d{2}-\d{2}$/)});
 }
 for(const text of ['60.50, tarihi dün olsun','60.50; tarihi dün olsun'])expect(parseBusinessSlots(text).amount).toBeNull();
});
it.each([
 ['ne kadar alacağımız var',{action:'summary',metric:'debtors',view:'receivables',customer:null}],
 ['Serkan hesabında toplam alacağımız kaç para',{action:'summary',metric:'debtors',view:'receivables',accountIds:['a'],customer:null}],
 ['tüm müşterilerden toplam ne kadar alacağımız var',{action:'summary',metric:'debtors',view:'receivables',customer:null}],
 ['Harmanda bize ne borçlu',{action:'balance',customer:'harmanda'}],
 ['Harmanda bize kaç para borçlu',{action:'balance',customer:'harmanda'}],
 ["Harmanda'nın borcu kaç para",{action:'balance',customer:'harmanda'}],
 ["Harmanda'dan ne kadar alacağımız var",{action:'balance',customer:'harmanda'}],
 ['Serkan hesabındaki Harmanda bize ne kadar borçlu',{action:'balance',accountIds:['a'],customer:'harmanda'}],
 ["Serkan'daki Harmanda bize ne borçlu",{action:'balance',accountIds:['a'],customer:'harmanda'}],
 ['Serkan Bingöldeki Harmanda bize ne borçlu',{action:'balance',accountIds:['a'],customer:'harmanda'}],
 ['bu ay kaç para topladık',{action:'summary',metric:'collections'}],
 ['bugün ne kadar para topladık',{action:'summary',metric:'collections'}],
 ['geçen ay müşterilerden ne kadar para geldi',{action:'summary',metric:'collections',customer:null}],
 ['bu ay tahsil ettiğimiz toplam tutar nedir',{action:'summary',metric:'collections'}],
 ['satış toplamı',{action:'summary',metric:'sales'}],
 ['bu ay toplam satışımız kaç para',{action:'summary',metric:'sales'}],
 ['alış toplamı',{action:'summary',metric:'purchases'}],
 ['geçen ay toplam alışımızı söyle',{action:'summary',metric:'purchases'}],
 ['en borçlu müşteriler kim',{action:'summary',metric:'debtors',customer:null}],
 ['bize en çok borcu olan müşterileri göster',{action:'summary',metric:'debtors',customer:null}],
 ['en fazla borcu olan üç müşteri kim',{action:'summary',metric:'debtors',limit:3,customer:null}],
 ['son tahsilatı söyler misin',{action:'latest_collection'}],
 ['en son kaydettiğimiz tahsilat hangisi',{action:'latest_collection'}],
 ['tahsilat olarak en son ne ekledik',{action:'latest_collection'}],
 ['Serkan hesabındaki Harmanda için son tahsilatı gösterir misin',{action:'latest_collection',customer:'harmanda',accountIds:['a']}],
 ['Serkan hesabındaki Harmanda son tahsilatını 75 bin yapar mısın',{action:'update_collection',customer:'harmanda',amount:'75000.00'}],
 ['son tahsilatın tutarını 75 bin yap',{action:'update_collection',amount:'75000.00'}],
 ['son tahsilatı iptal eder misin',{action:'cancel_collection'}],
])('maps supported financial phrasing: %s',(text,expected)=>{
 expect(parseBusinessCommand(text,{accounts})).toMatchObject(expected);
});
it('does not reuse one customer for an explicitly selected multi-account receivable scope',()=>{
 expect(parseBusinessCommand('seçili hesaplarda ne kadar alacağımız var',{accounts,draft:{accountIds:['a','b'],customer:'Harmanda'}})).toMatchObject({action:'summary',metric:'debtors',view:'receivables',customer:null,scope:'selected'});
});
it.each([
 'tahsilat ekleme',
 'son tahsilatı 75 bin olarak düzeltme',
 'son tahsilatı düzeltme lütfen 75 bin yapma',
 'son tahsilatı iptal etme',
 'son tahsilatı iptal etmeyelim',
 'Harmanda müşterisine 75 bin tahsilat eklemek istemiyorum',
 'Harmanda müşterisine 75 bin tahsilat ekleyebilir misin hayır ekleme',
 'son tahsilatı 75 bin yapmanı istemiyorum',
 'son tahsilatı 75 bin olarak düzeltmek istemiyorum',
 'fatura oluştur', 'Harmanda müşterisine ödeme yap', 'dekont oluştur',
])('never derives a financial mutation from negated or unsupported requests: %s',text=>{
 const command=parseBusinessCommand(text,{accounts,remote:{action:'collection',amount:75000}});
 expect(command==null||!['collection','update_collection','cancel_collection'].includes(command.action)).toBe(true);
});
it.each(['net kârımız ne kadar','bu ay satıştan ne kadar kâr ettik','hangi müşterinin vadesi geçti','bankada ne kadar para var','kasa bakiyesini söyle','stok toplamı kaç para','Bu ay kârımızın net toplamı ne kadar','Bankalarımızdaki tahsilat toplamı ne kadar','Kasamızın satış toplamı ne kadar'])('does not approximate unsupported financial data: %s',text=>{
  expect(parseBusinessCommand(text,{accounts,remote:{action:'summary',metric:'net'}})).toBeNull();
 });
it('opens the actual customer balances screen before interpreting müşteri as a customer selection',()=>{
 expect(parseBusinessCommand('Müşteri bakiyelerini aç',{accounts})).toEqual({action:'navigate',route:'/cari-ozet'});
});
it('does not reject real account names sharing the beginning of a financial keyword',()=>{
 expect(parseBusinessCommand('Ayşe Karabulut hesabındaki Harmanda müşterisine bugün 75 bin tahsilat ekle',{accounts:[...accounts,{id:'c',name:'Ayşe Karabulut'}]})).toMatchObject({action:'collection',accountIds:['c'],amount:'75000.00'});
});
it.each([
 ['2026-09-01 ile 2026-09-30 arasında satış toplamı',{start:'2026-09-01',end:'2026-09-30'}],
 ['01.09.2026 ile 30.09.2026 arasında tahsilat toplamı',{start:'2026-09-01',end:'2026-09-30'}],
 ['1 eylül 2026 ile 30 eylül 2026 arasında alış toplamı',{start:'2026-09-01',end:'2026-09-30'}],
])('uses the whole validated date range in summaries: %s',(text,period)=>{
 expect(parseBusinessCommand(text,{accounts})).toMatchObject({action:'summary',period,customer:null});
});
