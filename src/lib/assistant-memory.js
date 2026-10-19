// SonAI conversation memory: role-tagged turns, a compact summary of older turns
// and the active topic (the last answer the user may refer back to). It lives in
// the tab's sessionStorage so closing the panel or changing screens continues the
// same conversation. Pending financial drafts are never persisted; every write
// still needs a fresh, explicit confirmation.
import {parseAssistantPeriod,matchSpokenAccounts} from './assistant-intent.js';
import {requestedFormat} from './assistant-dialogue.js';

export const SESSION_KEY='sonvera:sonai-session:v1';
const MAX_TURNS=40,MODEL_TURNS=12,TURN_CHARS=480,IDLE_MS=6*60*60*1000;
const fold=value=>String(value||'').toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i').replace(/[’']/g,'').replace(/[.,!?;:]/g,' ').replace(/\s+/g,' ').trim();
const months=['ocak','subat','mart','nisan','mayis','haziran','temmuz','agustos','eylul','ekim','kasim','aralik'];
const monthNames=['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
const metricLabels={collections:'tahsilat toplamı',sales:'satış toplamı',purchases:'alış toplamı',net:'dönem neti',sales_collections:'satış eksi tahsilat',debtors:'en borçlu müşteriler'};
const clip=(value,size)=>{const text=String(value||'').replace(/\s+/g,' ').trim();return text.length>size?text.slice(0,size-1)+'…':text;};
const customerOf=value=>value&&typeof value==='object'&&typeof value.name==='string'&&value.name?{name:String(value.name),tax:String(value.tax||value.customer_tax_no||''),key:String(value.key||value.customer_key||value.tax||value.customer_tax_no||'')}:null;
const periodOf=value=>typeof value?.start==='string'&&typeof value?.end==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value.start)&&/^\d{4}-\d{2}-\d{2}$/.test(value.end)?{start:value.start,end:value.end}:null;

function defaultStorage(){try{return globalThis.sessionStorage||null;}catch{return null;}}

/** Normalizes a topic so only known fields with safe shapes are kept or persisted. */
export function normalizeTopic(topic,accounts=[]){
 if(!topic||typeof topic.action!=='string')return null;
 const accountIds=(Array.isArray(topic.accountIds)?topic.accountIds:[]).filter(id=>typeof id==='string'&&accounts.some(a=>a.id===id));
 const value={action:topic.action,accountIds,customer:customerOf(topic.customer),period:periodOf(topic.period)};
 for(const key of ['metric','view','direction','format','scope','order'])if(typeof topic[key]==='string')value[key]=topic[key];
 for(const key of ['allCustomers','withCollections'])if(typeof topic[key]==='boolean')value[key]=topic[key];
 for(const key of ['amount','date'])if(topic[key]!=null)value[key]=String(topic[key]);
 return value;
}

export function periodLabel(period){
 if(!period)return 'kayıtlı tüm dönem';
 const [year,month]=period.start.split('-').map(Number),last=new Date(year,month,0).getDate();
 if(period.start.slice(0,7)===period.end.slice(0,7)&&period.start.endsWith('-01')&&Number(period.end.slice(-2))===last)return monthNames[month-1]+' '+year;
 const [endYear,endMonth,endDay]=period.end.split('-').map(Number),startDay=Number(period.start.slice(8));
 if(year===endYear&&month===endMonth)return startDay+'–'+endDay+' '+monthNames[month-1]+' '+year;
 return startDay+' '+monthNames[month-1]+(year===endYear?'':' '+year)+' – '+endDay+' '+monthNames[endMonth-1]+' '+endYear;
}

/** Short human description of the active topic, shown in the chip and clarifications. */
export function describeTopic(topic,accounts=[]){
 if(!topic)return '';
 const names=topic.accountIds.map(id=>accounts.find(a=>a.id===id)?.name).filter(Boolean);
 const parts=[names.length>2?names.length+' hesap':names.join(', '),topic.allCustomers?'Tüm müşteriler':topic.customer?.name];
 if(topic.action==='summary')parts.push(periodLabel(topic.period),metricLabels[topic.metric]||'özet');
 else if(topic.action==='balance')parts.push('bakiye');
 else if(topic.action==='latest_collection')parts.push('son tahsilat');
 else if(topic.action==='report')parts.push(periodLabel(topic.period),'rapor');
 else if(topic.action==='invoices')parts.push(periodLabel(topic.period),{satis:'satış faturaları',alis:'alış faturaları'}[topic.direction]||'faturalar');
 else if(['collection','update_collection','cancel_collection'].includes(topic.action))parts.push('tahsilat');
 return parts.filter(Boolean).join(' · ');
}

/** The topic as the model sees it: names instead of ids, no internal keys. */
export function topicForModel(topic,accounts=[]){
 if(!topic)return null;
 const {accountIds,customer,...rest}=topic;
 return {...rest,accounts:accountIds.map(id=>accounts.find(a=>a.id===id)?.name).filter(Boolean),customer:customer?.name||null,description:describeTopic(topic,accounts)};
}

export function createConversationMemory({storage=defaultStorage(),now=()=>Date.now()}={}){
 let turns=[],topic=null,lastUserAt=now();
 function write(extra={}){
  if(!storage)return;
  // Turns marked transient (pending write drafts) stay in memory for the model but never reach storage.
  const stored=turns.filter(turn=>!turn.transient).map(({role,text})=>({role,text}));
  try{storage.setItem(SESSION_KEY,JSON.stringify({v:1,savedAt:now(),lastUserAt,turns:stored,topic,...extra}));}catch{/* storage is a convenience */}
 }
 return {
  get turns(){return turns;},
  get topic(){return topic;},
  add(role,text,{transient=false}={}){
   if(!text)return;if(role==='user')lastUserAt=now();
   turns.push({role:role==='user'?'user':'assistant',text:clip(text,TURN_CHARS),...(transient?{transient:true}:{})});if(turns.length>MAX_TURNS)turns=turns.slice(-MAX_TURNS);
  },
  setTopic(value){topic=value||null;},
  /** True when the user has been away long enough that old context must not be reused. */
  expired(){return now()-lastUserAt>=IDLE_MS;},
  /** Recent turns verbatim plus a one-line digest of the older user requests. */
  modelHistory(){
   const plain=turns.map(({role,text})=>({role,text}));
   const recent=plain.slice(-MODEL_TURNS),older=plain.slice(0,-MODEL_TURNS).filter(turn=>turn.role==='user');
   return {conversation:recent,earlier:older.length?'Daha önce sorulanlar: '+older.slice(-8).map(turn=>clip(turn.text,90)).join(' | '):''};
  },
  save:write,
  /** Restores a stored session; any malformed or idle state is discarded instead of throwing. */
  restore(accounts=[]){
   if(!storage)return null;
   let saved;try{saved=JSON.parse(storage.getItem(SESSION_KEY)||'null');}catch{saved=null;}
   const active=Number(saved?.lastUserAt??saved?.savedAt);
   if(!saved||typeof saved!=='object'||saved.v!==1||!Array.isArray(saved.turns)||!Number.isFinite(active)||!(now()-active<IDLE_MS)){this.clear();return null;}
   try{
    turns=saved.turns.filter(turn=>turn&&typeof turn.text==='string').slice(-MAX_TURNS).map(turn=>({role:turn.role==='user'?'user':'assistant',text:clip(turn.text,TURN_CHARS)}));
    topic=normalizeTopic(saved.topic,accounts);lastUserAt=active;
   }catch{this.clear();return null;}
   return saved;
  },
  clear(){turns=[];topic=null;lastUserAt=now();if(storage)try{storage.removeItem(SESSION_KEY);}catch{/* ignore */}},
 };
}

// Words that carry no new identity in an elliptical follow-up. Anything left after
// removing them (usually a customer name) sends the message to the regular parsers.
// Suffixes are listed explicitly so real names such as Aydın, Alışan, Netaş or
// Yapı Market are never mistaken for grammar and silently dropped.
const forms=(stem,suffixes)=>stem+'(?:'+suffixes+')?';
const fillers=new RegExp('\\b(?:'+[
 'kanka','peki','ya','yani','tamam','simdi','o zaman','bir de','bide','ayrica','hadi','lutfen','bana','bize','acaba','ve','ile','icin','de','da','mi','mu','misin','misiniz',
 'ne','nedir','neydi','kac','kadar','para','olsun','olur','olmus','oldu','onun','bunun','onu','bunu','bunlar(?:i|in)?','onlar(?:i|in)?','ayni(?:si|sini|sinin)?','o','bu','sekilde','halde','hani','hepsi(?:ni)?',
 forms('goster','ir|in|sene|ebilir|irmisin'),forms('getir','ir|in|sene|ebilir'),forms('soyle','r|sene|yebilir'),forms('bak','alim|ar'),forms('hesapla','r|sana|yabilir'),
 'toplam(?:i|in|ini|lari)?','tutar(?:i|in)?','durum(?:u|unu)?',forms('yap','ar|alim|misiz|mistik|tik|tim|tin|ildi'),'topladik','toplamisiz','toplandi','topladim','etti','ettik','etmisiz','var','varmi','varmis',
].join('|')+')\\b','g');
const monthForm='(?:daki|deki|da|de|ki|in|un|nin|nun|a|e)?',relativeForm='(?:daki|da|inki|indaki|in|inin|i|inda|ki)?';
const periodWords=new RegExp('\\b(?:(?:bu|gecen|onceki|bir onceki)\\s+ay'+relativeForm+'|(?:'+months.join('|')+')'+monthForm+'|(?:1[0-2]|0?[1-9])\\s*\\.?\\s*ay'+relativeForm+'|20\\d{2}|ay(?:daki|da|inki|in|i|ki))\\b','g');
const movement='(?:lar\\w*|i|in|ini|inin|tan|ta|taki|a)?';
const salesWord=new RegExp('\\bsatis'+movement+'\\b'),purchaseWord=new RegExp('\\balis'+movement+'\\b');
const metricWords=new RegExp('\\b(?:tahsilat\\w*|satis'+movement+'|alis'+movement+'|net(?:i|in|ini)?|borclu\\w*|alacag\\w*|alacak\\w*|cikar(?:t|tir)?\\w{0,5})\\b','g');
const reportWords=/\b(?:(?:excel|eksel)\w*|xlsx|rapor\w*|ekstre\w*|cari(?:si|sini|sinin|yi|ye|nin|ni|i)?|fotograf\w*|gorsel\w*|resim\w*|resm\w*|hazirla\w*|ver(?:ir|in|sene|ebilir|irmisin)?|olustur\w*|dosya\w*)\b/g;
const scopeWords=/\b(?:hesap\w*|hesab\w*|tum|butun|secili|musteri\w*|genel(?:de|inde)?|fatura(?:lar|lari|larin|si|sini)?|gelen(?:ler|leri)?|giden(?:ler|leri)?|kestigimiz|kesilen(?:ler)?)\b/g;
const blocked=/\b(?:ekle|kaydet|isle|gir|duzelt\w*|degistir\w*|guncelle\w*|iptal|sil|kaldir|gonder\w*|yolla\w*|ilet|whatsapp\w*|ac|git|gotur|onayla\w*|onayliyorum|vazgec\w*|yeni sohbet|sifirla|bastan)\b/;
const accountForm='(?:nin|nun|in|un|n|deki|daki|de|da|den|dan|te|ta|ten|tan|e|a|i|u|ye|ya)?';
const escapePattern=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');

function metricOf(s){
 if(/satis\w*.*tahsilat\w*.*cikar/.test(s))return 'sales_collections';
 if(/\b(?:borclu\w*|en cok borc\w*)\b/.test(s))return 'debtors';
 if(/\bnet(?:i|in|ini)?\b/.test(s))return 'net';
 if(/\btahsilat\w*\b/.test(s))return 'collections';
 if(salesWord.test(s)&&!purchaseWord.test(s))return 'sales';
 if(purchaseWord.test(s)&&!salesWord.test(s))return 'purchases';
 return null;
}

/**
 * Resolves short follow-ups ("peki geçen ayki?", "ya satışlar?", "onu Excel yap")
 * against the active topic. Returns null whenever the message names something new
 * that the regular parsers or the model should interpret.
 */
export function resolveFollowUp(text,{topic,accounts=[],now=new Date()}={}){
 // Report follow-ups ("tahsilatları çıkar", "aynısını geçen ay için") already patch
 // the live report draft in the regular flow.
 if(!topic||topic.action==='report')return null;
 const s=fold(text);
 // “Seçili hesaplar” means the screen's current selection, which the regular parser resolves.
 if(!s||blocked.test(s)||/\bsecili\s+hesap/.test(s))return null;
 const named=matchSpokenAccounts(s.replace(/^(?:(?:kanka|peki|ya|tamam|simdi|o zaman|bir de|bide|ayrica|hadi)\s+)+/,''),accounts),allAccounts=/\b(?:tum|butun)\s+hesap\w*/.test(s);
 let rest=s;
 // Only a recognised account mention is removed; an unmatched name part stays and defers.
 for(const account of named)for(const token of fold(account.name).split(' ').filter(word=>word.length>=3))rest=rest.replace(new RegExp('\\b'+escapePattern(token)+accountForm+'\\b','g'),' ');
 rest=rest.replace(periodWords,' ').replace(metricWords,' ').replace(reportWords,' ').replace(scopeWords,' ').replace(fillers,' ').replace(/\s+/g,' ').trim();
 if(rest)return null;
 const period=parseAssistantPeriod(text,{now});
 if(period.uncertain)return null;
 const newPeriod=periodOf(period.intent),metric=metricOf(s),wantsReport=/\b(?:excel|eksel|xlsx|rapor|ekstre|cari|fotograf|gorsel|resim|resm)\w*\b/.test(s);
 const accountIds=allAccounts?accounts.map(a=>a.id):named.length?named.map(a=>a.id):topic.accountIds;
 const accountChanged=allAccounts||named.length>0&&named.map(a=>a.id).sort().join()!==[...topic.accountIds].sort().join();
 const allCustomers=/\b(?:tum|butun)\s+musteri\w*|\bmusteriler\w*|\bgenel(?:de|inde)?\b/.test(s);
 const customer=allCustomers||accountChanged?null:topic.customer;
 // Invoice topics continue as invoice lookups; other topics leave invoice questions to the invoice parser.
 const mentionsInvoices=/\bfatura/.test(s);
 if(topic.action==='invoices'&&!wantsReport){
  const direction=/\b(?:giden\w*|kestigimiz|kesilen\w*)\b/.test(s)||salesWord.test(s)&&!purchaseWord.test(s)?'satis':/\bgelen\w*\b/.test(s)||purchaseWord.test(s)&&!salesWord.test(s)?'alis':salesWord.test(s)&&purchaseWord.test(s)?'both':topic.direction||'both';
  if(!newPeriod&&!accountChanged&&direction===(topic.direction||'both')&&!(allCustomers&&topic.customer))return null;
  return {kind:'invoices',command:{action:'invoices',direction,order:topic.order||'latest',limit:3,period:newPeriod||topic.period,accountIds,scope:allAccounts?'all':undefined,...(customer?{selected:customer}:{})}};
 }
 if(mentionsInvoices)return null;
 if(wantsReport){
  if(!customer&&!topic.allCustomers&&!allCustomers)return null;
  const reportMetric=metric||topic.metric;
  const direction=salesWord.test(s)&&purchaseWord.test(s)?'both':reportMetric==='sales'?'satis':reportMetric==='purchases'?'alis':'both';
  const target=newPeriod||topic.period;
  const withCollections=/\btahsilat\w*\s+(?:haric|olmasin|cikar\w*|olmadan)\b/.test(s)?false:/\btahsilat\w*\b/.test(s)?true:!['sales','purchases'].includes(reportMetric);
  return {kind:'report',intent:{scope:accountIds.length===1?'cari':'selected',accountIds,customer:customer?.name||'',allCustomers:!customer,direction,withCollections,format:requestedFormat(text)||'excel',...(target?{start:target.start,end:target.end,month:Number(target.start.slice(5,7)),year:Number(target.start.slice(0,4))}:{})}};
 }
 const changed=!!newPeriod||!!metric&&metric!==topic.metric||accountChanged||allCustomers&&!!topic.customer;
 if(!changed)return null;
 if(topic.action==='summary'||(metric&&['balance','latest_collection','select_customer','collection','update_collection','cancel_collection'].includes(topic.action))){
  const finalMetric=metric||topic.metric;
  if(!finalMetric)return null;
  const everyone=finalMetric==='debtors'||allCustomers||!customer;
  return {kind:'summary',command:{action:'summary',metric:finalMetric,period:newPeriod||(topic.action==='summary'?topic.period:null),accountIds,scope:allAccounts?'all':undefined,allCustomers:everyone,limit:5,...(finalMetric===topic.metric&&topic.view?{view:topic.view}:{}),...(everyone?{}:{selected:customer})}};
 }
 if(topic.action==='latest_collection'&&(accountChanged||newPeriod))return {kind:'latest',command:{action:'latest_collection',accountIds,period:newPeriod,...(customer?{selected:customer}:{})}};
 if(newPeriod){
  const label=periodLabel(newPeriod),who=customer?.name?customer.name+' için ':'';
  return {kind:'clarify',text:who+label+' için neyi göstereyim?',options:[
   ['Tahsilat toplamı',`${label} tahsilat toplamı`],['Satış toplamı',`${label} satış toplamı`],['Cari Excel',`${label} Excelini hazırla`],
  ]};
 }
 return null;
}
