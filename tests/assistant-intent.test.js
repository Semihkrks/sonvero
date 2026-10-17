import {it,expect} from 'vitest';
import {parseQuickIntent,nextQuestion,monthRange,matchSpokenAccounts} from '../src/lib/assistant-intent.js';
const accounts=[{id:'a',name:'Ayşe Karabut'},{id:'b',name:'Mert Sarısoy'}];
it('defaults to 2026 and respects an explicitly requested year',()=>{
 const {intent,handled}=parseQuickIntent('seçili hesaplarda 9.ayda harmanda excelini bana gönder',{accounts});
 expect(handled).toBe(true);expect(intent).toMatchObject({scope:'selected',month:9,customer:'harmanda',start:'2026-09-01',end:'2026-09-30'});
 expect(nextQuestion({...intent,accountIds:['a']})).toMatchObject({key:'direction'});
 const year=parseQuickIntent('2025',{awaiting:'period',draft:intent}).intent;
 expect(year).toMatchObject({start:'2025-09-01',end:'2025-09-30'});
});
it('resolves short answers against the question, never assumes collections',()=>{
 expect(parseQuickIntent('her ikisi',{awaiting:'direction'})).toMatchObject({handled:true,intent:{direction:'both'}});
 expect(parseQuickIntent('hayır',{awaiting:'collections'})).toMatchObject({handled:true,intent:{withCollections:false}});
 expect(parseQuickIntent('evet',{awaiting:'period'}).handled).toBe(false);
});
it('understands a spoken month and a photo request',()=>{
 const {intent}=parseQuickIntent('dokuzuncu ayda harmanda fotoğrafını gönder',{accounts});
 expect(intent).toMatchObject({month:9,customer:'harmanda'});
 expect(parseQuickIntent('eylülde Mert Sarısoy hesabında Cihan ekstresini hazırla',{accounts}).intent).toMatchObject({month:9,accountIds:['b'],customer:'cihan'});
});
it('recognizes known account names and preserves valid month boundaries',()=>{
 const {intent}=parseQuickIntent('Ayşe Karabut hesabında Cihan müşterisinin Eylül 2026 carisini gönder',{accounts});
 expect(intent).toMatchObject({scope:'cari',accountIds:['a'],customer:'cihan',start:'2026-09-01',end:'2026-09-30'});
 expect(monthRange(2,2024).end).toBe('2024-02-29');expect(monthRange(13,2026)).toEqual({});
});
it('understands all customers for a named account and inflected month',()=>{
 const {intent,handled}=parseQuickIntent('Ayşe Karabutun 9.ayki müşterilerin excelini getir bana',{accounts,draft:{scope:'selected'}});
 expect(handled).toBe(true);expect(intent).toMatchObject({scope:'cari',accountIds:['a'],allCustomers:true,customer:'',format:'excel',start:'2026-09-01',end:'2026-09-30',direction:'both',withCollections:true});
 expect(nextQuestion(intent)).toBe(null);
 const all=parseQuickIntent('9.ayın tüm müşterilerinin excelini ver',{accounts,draft:{scope:'selected',direction:'satis',withCollections:false}});
 expect(all.handled).toBe(true);expect(all.intent).toMatchObject({allCustomers:true,month:9,direction:'satis',withCollections:false,format:'excel'});
});
it('returns from an all-customers draft to a single customer',()=>{
 const {intent}=parseQuickIntent('seçili hesaplarda 9.ayda Harmanda carisini çıkar',{accounts,draft:{allCustomers:true}});
 expect(intent).toMatchObject({customer:'harmanda',allCustomers:false});
});
it('recognizes a unique full spoken account with a missing letter and inflection',()=>{
 const scoped=[{id:'serkan',name:'Serkan Bingöl'},{id:'other',name:'Serkan Akın'}];
 expect(parseQuickIntent('bugün serkan bingl hesabındaki harmanda müşterisinin carisini getir',{accounts:scoped}).intent).toMatchObject({scope:'cari',accountIds:['serkan'],customer:'harmanda'});
 expect(parseQuickIntent('Serkan Bingölün 9.ayda Harmanda carisini getir',{accounts:scoped}).intent.accountIds).toEqual(['serkan']);
 expect(parseQuickIntent('Serkan hesabında Harmanda carisini getir',{accounts:scoped}).intent.accountIds).toEqual([]);
 expect(parseQuickIntent('Serkan Bingl hesabında Harmanda carisini getir',{accounts:[...scoped,{id:'near',name:'Serkan Bingal'}]}).intent.accountIds).toEqual([]);
 expect(parseQuickIntent('XSerkan Bingöl hesabında Harmanda carisini getir',{accounts:scoped}).intent.accountIds).toEqual([]);
});
it('extracts every supplied field from joined speech instead of putting modifiers in the customer name',()=>{
 const {intent,handled}=parseQuickIntent('ayşe karabut hesabından 9.ay satışalış tahsilatdahil harmanda müşterisinin excelini ver',{accounts});
 expect(handled).toBe(true);
 expect(intent).toMatchObject({scope:'cari',accountIds:['a'],month:9,start:'2026-09-01',end:'2026-09-30',direction:'both',withCollections:true,customer:'harmanda',format:'excel'});
 expect(nextQuestion(intent)).toBe(null);
});
it.each([
 'Harmanda müşterisinin Ayşe hesabından Eylül satış ve alış tahsilat dahil excelini ver',
 'Ayşe hesabındaki Harmanda için dokuzuncu ay satış alış tahsilatları dahil Excel hazırla',
 'kanka eylül ayında Ayşe hesabından satışları alışları ve tahsilatları dahil Harmanda Tekstil Excel raporunu çıkar',
])('keeps slots independent of word order: %s',text=>{
 const {intent}=parseQuickIntent(text,{accounts});
 expect(intent).toMatchObject({accountIds:['a'],month:9,direction:'both',withCollections:true,format:'excel'});
 expect(intent.customer).toMatch(/^harmanda(?: tekstil)?$/);
 expect(nextQuestion(intent)).toBe(null);
});
it('resolves unique account aliases and Turkish account suffixes without choosing ambiguous names',()=>{
 const known=[...accounts,{id:'serkan',name:'Serkan Bingöl'},{id:'serkan2',name:'Serkan Akın'}];
 expect(matchSpokenAccounts('Ayşe hesabından Harmanda Excelini ver',known).map(a=>a.id)).toEqual(['a']);
 expect(matchSpokenAccounts('Serkan Bingöldeki son tahsilat',known).map(a=>a.id)).toEqual(['serkan']);
 expect(matchSpokenAccounts('Bingöl hesabındaki son tahsilat',known).map(a=>a.id)).toEqual(['serkan']);
 expect(matchSpokenAccounts('Serkan hesabındaki son tahsilat',known)).toEqual([]);
 expect(matchSpokenAccounts('Harmanda müşterisinin excelini ver',[{id:'x',name:'Harmanda Hesabı'}])).toEqual([]);
});
it('takes the current year from the supplied clock and preserves explicit period and exclusion',()=>{
 const {intent}=parseQuickIntent('Ayşe hesabından Harmanda müşterisinin 9.ay 2025 satışalış tahsilathariç excelini ver',{accounts,now:new Date('2027-01-05T12:00:00Z')});
 expect(intent).toMatchObject({year:2025,month:9,start:'2025-09-01',end:'2025-09-30',direction:'both',withCollections:false,customer:'harmanda'});
 expect(parseQuickIntent('Ayşe hesabından 9.ay Harmanda excelini ver',{accounts,now:new Date('2027-01-05T12:00:00Z')}).intent.start).toBe('2027-09-01');
});
it('accepts account aliases after periods and combines unique aliases with a full named account',()=>{
 const known=[...accounts,{id:'serkan',name:'Serkan Bingöl'}];
 expect(matchSpokenAccounts('Eylül Ayşe hesabından Harmanda excelini ver',known).map(a=>a.id)).toEqual(['a']);
 expect(matchSpokenAccounts('9.ayda Ayşe hesabından Harmanda excelini ver',known).map(a=>a.id)).toEqual(['a']);
 expect(matchSpokenAccounts('Ayşe ve Serkan Bingöl hesaplarından Harmanda excelini ver',known).map(a=>a.id).sort()).toEqual(['a','serkan']);
 expect(parseQuickIntent("Ayşe hesabından Eylül'ün Harmanda satış alış tahsilat dahil excelini ver",{accounts}).intent).toMatchObject({customer:'harmanda',month:9,accountIds:['a']});
});
it('accepts a short report customer answer together with later slots without another model turn',()=>{
 const draft={scope:'cari',accountIds:['a']};
 const parsed=parseQuickIntent('Harmanda eylül satış alış tahsilat dahil',{accounts,draft,awaiting:'customer'});
 expect(parsed).toMatchObject({handled:true,intent:{customer:'harmanda',month:9,direction:'both',withCollections:true}});
 expect(nextQuestion({...draft,...parsed.intent})).toBe(null);
 expect(parseQuickIntent('Harmanda',{accounts,draft,awaiting:'customer'})).toMatchObject({handled:true,intent:{customer:'harmanda'}});
 expect(parseQuickIntent('VKN 1234567890',{accounts,draft,awaiting:'customer'})).toMatchObject({handled:true,intent:{customer:'1234567890'}});
 expect(parseQuickIntent('evet',{accounts,draft,awaiting:'customer'})).toMatchObject({handled:false,intent:{}});
});
it('clears previous accounts for an ambiguous or unknown explicitly named report account',()=>{
 const known=[...accounts,{id:'serkan',name:'Serkan Bingöl'},{id:'other',name:'Serkan Akın'}];
 const draft={scope:'cari',accountIds:['a'],customer:'Cihan'};
 for(const text of ['Serkan hesabından 9.ay satış alış tahsilat dahil Harmanda excelini ver','Harmanda müşterisinin Deniz Kaya hesabından 9.ay satış alış tahsilat dahil excelini ver','Ayşe Karabut ve Deniz hesabından 9.ay satış alış tahsilat dahil Harmanda excelini ver']){
  const {intent}=parseQuickIntent(text,{accounts:known,draft});
  expect(intent).toMatchObject({scope:'cari',accountIds:[],customer:'harmanda',month:9,direction:'both',withCollections:true});
  expect(nextQuestion({...draft,...intent})).toMatchObject({key:'accounts'});
 }
});
it.each([
 ['geçen ay',{start:'2026-09-01',end:'2026-09-30'}],
 ['bu ay',{start:'2026-10-01',end:'2026-10-31'}],
 ['2026-09-01 ile 2026-09-30 arası',{start:'2026-09-01',end:'2026-09-30'}],
 ['1 eylül ile 30 eylül arası',{start:'2026-09-01',end:'2026-09-30'}],
 ['1 eylül 2025 ile 15 ekim 2025 arası',{start:'2025-09-01',end:'2025-10-15'}],
])('consumes the complete report period without adding dates to the customer: %s',(period,expected)=>{
 const {intent,handled}=parseQuickIntent(`Ayşe hesabından ${period} Harmanda müşterisinin satış alış tahsilat dahil excelini ver`,{accounts,now:new Date('2026-10-17T12:00:00Z')});
 expect(handled).toBe(true);expect(intent).toMatchObject({...expected,customer:'harmanda',accountIds:['a'],direction:'both',withCollections:true});
});
it.each(['Alışan Tekstil','Ali Verdi','Satışoğlu Kumaş','Carino Tekstil','Hesaboğlu Kumaş'])('preserves real customer words which resemble command prefixes: %s',name=>{
 expect(parseQuickIntent(`Ayşe hesabından geçen ay ${name} müşterisinin satış alış tahsilat dahil excelini ver`,{accounts,now:new Date('2026-10-17T12:00:00Z')}).intent.customer).toBe(name.toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i'));
});
it.each(['geçen hafta','son 3 ay','geçen sene','1-15 eylül','2026-02-30 ile 2026-03-10 arası'])('defers unfamiliar or invalid periods without overwriting the model customer: %s',period=>{
 const parsed=parseQuickIntent(`Ayşe hesabından ${period} Harmanda müşterisinin satış alış tahsilat dahil excelini ver`,{accounts});
 expect(parsed.handled).toBe(false);expect(parsed.intent).not.toHaveProperty('customer');
});
