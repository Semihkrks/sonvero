import {it,expect} from 'vitest';
import {parseQuickIntent,nextQuestion,monthRange} from '../src/lib/assistant-intent.js';
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
