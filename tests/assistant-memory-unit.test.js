import {describe,it,expect} from 'vitest';
import {createConversationMemory,resolveFollowUp,describeTopic,topicForModel,normalizeTopic,SESSION_KEY} from '../src/lib/assistant-memory.js';

const accounts=[{id:'a',name:'Ayşe Karabut'},{id:'b',name:'Serkan Bingöl'}];
const now=new Date('2026-10-17T12:00:00+03:00');
const harmanda={name:'Harmanda Tekstil',tax:'1234567890',key:'1234567890'};
const summary={action:'summary',metric:'collections',accountIds:['b'],customer:harmanda,period:{start:'2026-10-01',end:'2026-10-31'}};
const balance={action:'balance',accountIds:['b'],customer:harmanda,period:null};
const follow=(text,topic=summary)=>resolveFollowUp(text,{topic,accounts,now});
function memoryStore(){const map=new Map();return {getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,String(value)),removeItem:key=>map.delete(key),map};}

describe('elliptical follow-ups reuse the active topic',()=>{
 it.each([
  ['peki geçen ayki?',{metric:'collections',period:{start:'2026-09-01',end:'2026-09-30'}}],
  ['ya eylül?',{metric:'collections',period:{start:'2026-09-01',end:'2026-09-30'}}],
  ['ya satışlar?',{metric:'sales',period:summary.period}],
  ['peki alışlar ne kadar',{metric:'purchases',period:summary.period}],
  ['bir de net',{metric:'net',period:summary.period}],
 ])('%s',(text,expected)=>{
  const result=follow(text);
  expect(result.kind).toBe('summary');
  expect(result.command).toMatchObject({action:'summary',accountIds:['b'],selected:harmanda,...expected});
 });
 it('drops the customer when the account changes and keeps metric plus period',()=>{
  expect(follow('peki Ayşe hesabında?').command).toMatchObject({accountIds:['a'],metric:'collections',period:summary.period,allCustomers:true});
  expect(follow('peki Ayşe hesabında?').command).not.toHaveProperty('selected');
 });
 it('widens to every customer or every account on request',()=>{
  expect(follow('tüm müşterilerde ne kadar').command).toMatchObject({allCustomers:true,accountIds:['b']});
  expect(follow('peki tüm hesaplarda?').command).toMatchObject({scope:'all',accountIds:['a','b']});
 });
 it('turns a read topic into a report for the same customer',()=>{
  expect(follow('onu excel yap')).toMatchObject({kind:'report',intent:{customer:'Harmanda Tekstil',accountIds:['b'],scope:'cari',start:'2026-10-01',end:'2026-10-31',format:'excel',direction:'both',withCollections:true}});
  expect(follow('onun fotoğrafını hazırla',{...summary,metric:'sales'}).intent).toMatchObject({format:'image',direction:'satis',withCollections:false});
  expect(follow('geçen ayın excelini ver',balance).intent).toMatchObject({start:'2026-09-01',end:'2026-09-30',customer:'Harmanda Tekstil'});
 });
 it('asks which reading is meant when only a period follows a balance',()=>{
  const result=follow('peki geçen ay?',balance);
  expect(result.kind).toBe('clarify');expect(result.text).toContain('Eylül 2026');
  expect(result.options.map(([label])=>label)).toEqual(['Tahsilat toplamı','Satış toplamı','Cari Excel']);
  expect(follow(result.options[0][1],balance).command).toMatchObject({metric:'collections',selected:harmanda,period:{start:'2026-09-01',end:'2026-09-30'}});
 });
 it.each(['ya Aydın?','peki Alışan ne kadar','Netaş satış toplamı','peki Yapı Market?','Verdi’nin excelini ver','Harmanda’ya 5 bin tahsilat ekle','WhatsApp’a gönder','giden faturaları aç','onaylıyorum','yeni sohbet','geçen hafta ne kadar','bunu nasıl yorumlarsın'])('leaves new names and commands to the regular parsers: %s',text=>{
  expect(follow(text)).toBe(null);
 });
 it('never resolves without a topic and leaves live report follow-ups to the report flow',()=>{
  expect(resolveFollowUp('peki geçen ayki?',{topic:null,accounts,now})).toBe(null);
  expect(follow('sadece satışlar olsun',{action:'report',accountIds:['a'],customer:harmanda,period:summary.period})).toBe(null);
 });
});

describe('conversation memory',()=>{
 it('keeps recent turns verbatim and digests older user requests',()=>{
  const memory=createConversationMemory({storage:null});
  for(let i=0;i<20;i++)memory.add(i%2?'assistant':'user','mesaj '+i);
  const history=memory.modelHistory();
  expect(history.conversation).toHaveLength(12);expect(history.conversation.at(-1)).toEqual({role:'assistant',text:'mesaj 19'});
  expect(history.earlier).toContain('mesaj 0');expect(history.earlier).not.toContain('mesaj 1 ');
 });
 it('restores a saved session and expires an idle one',()=>{
  const storage=memoryStore();let clock=1000;
  const first=createConversationMemory({storage,now:()=>clock});first.add('user','merhaba');first.setTopic(normalizeTopic(summary,accounts));first.save({draft:{customer:'Harmanda'}});
  const second=createConversationMemory({storage,now:()=>clock});
  expect(second.restore(accounts)).toMatchObject({draft:{customer:'Harmanda'}});
  expect(second.turns).toEqual([{role:'user',text:'merhaba'}]);expect(second.topic).toMatchObject({action:'summary',accountIds:['b']});
  clock+=7*60*60*1000;
  expect(createConversationMemory({storage,now:()=>clock}).restore(accounts)).toBe(null);
  expect(storage.map.has(SESSION_KEY)).toBe(false);
 });
 it('discards unknown accounts and malformed fields from a stored topic',()=>{
  const topic=normalizeTopic({action:'summary',metric:'sales',accountIds:['b','zzz'],customer:{name:'X',tax:7},period:{start:'bad',end:'2026-10-31'},extra:'<script>'},accounts);
  expect(topic).toEqual({action:'summary',metric:'sales',accountIds:['b'],customer:{name:'X',tax:'7',key:'7'},period:null});
 });
 it('describes the topic for people and for the model',()=>{
  expect(describeTopic(normalizeTopic(summary,accounts),accounts)).toBe('Serkan Bingöl · Harmanda Tekstil · Ekim 2026 · tahsilat toplamı');
  expect(topicForModel(normalizeTopic(summary,accounts),accounts)).toMatchObject({action:'summary',accounts:['Serkan Bingöl'],customer:'Harmanda Tekstil',metric:'collections'});
 });
});

describe('review regressions',()=>{
 it('leaves the current screen selection and unmatched account-name parts to the regular parser',()=>{
  expect(follow('peki seçili hesaplarda satışlar')).toBe(null);
  const named=[...accounts,{id:'c',name:'Aydın Yılmaz'}];
  expect(resolveFollowUp('Aydın satış toplamı',{topic:summary,accounts:named,now})).toBe(null);
  expect(resolveFollowUp('peki Aydın Yılmaz hesabında?',{topic:summary,accounts:named,now}).command).toMatchObject({accountIds:['c']});
 });
 it('keeps the receivables view when only the period changes',()=>{
  const receivables={action:'summary',metric:'debtors',view:'receivables',accountIds:['b'],customer:null,period:null};
  expect(follow('peki geçen ayki?',receivables).command).toMatchObject({metric:'debtors',view:'receivables'});
  expect(follow('ya satışlar?',receivables).command).not.toHaveProperty('view');
 });
 it('discards a stored session with malformed shapes instead of throwing',()=>{
  const storage=memoryStore();
  storage.setItem(SESSION_KEY,JSON.stringify({v:1,savedAt:Date.now(),lastUserAt:Date.now(),turns:[{role:'user',text:'merhaba'},{text:5},null],topic:{action:'summary',accountIds:{},customer:'x',period:{start:1}}}));
  const memory=createConversationMemory({storage});
  expect(()=>memory.restore(accounts)).not.toThrow();
  expect(memory.turns).toEqual([{role:'user',text:'merhaba'}]);
  expect(memory.topic).toEqual({action:'summary',accountIds:[],customer:null,period:null});
  storage.setItem(SESSION_KEY,'{"v":1,"turns":"nope"}');expect(createConversationMemory({storage}).restore(accounts)).toBe(null);expect(storage.map.has(SESSION_KEY)).toBe(false);
 });
 it('expires idle context while open and never stores transient draft turns',()=>{
  const storage=memoryStore();let clock=0;const memory=createConversationMemory({storage,now:()=>clock});
  memory.add('user','Harmanda’ya 5 bin tahsilat ekle');memory.add('assistant','Serkan · Harmanda · 5.000,00 TL. Onaylıyor musun?',{transient:true});memory.save();
  expect(storage.getItem(SESSION_KEY)).not.toContain('5.000,00');expect(memory.modelHistory().conversation).toHaveLength(2);
  clock+=5*60*60*1000;memory.save();expect(memory.expired()).toBe(false);
  clock+=2*60*60*1000;expect(memory.expired()).toBe(true);
 });
});
