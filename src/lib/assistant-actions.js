import {parseQuickIntent,matchSpokenAccounts,monthRange} from './assistant-intent.js';
import {istanbulDate,parseTurkishAmount,positiveMoney,Decimal} from './money.js';

const fold=value=>String(value||'').toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i').replace(/[’']/g,'').trim();
const spokenNumbers={bir:1,iki:2,uc:3,dort:4,bes:5,alti:6,yedi:7,sekiz:8,dokuz:9,on:10,yirmi:20,otuz:30,kirk:40,elli:50,altmis:60,yetmis:70,seksen:80,doksan:90};
const moneyWord='(?:[+\\-]?\\d[\\d.,]*|'+Object.keys(spokenNumbers).join('|')+'|yuz|bin|milyon|eksi|sifir|bucuk|yarim|ceyrek|virgul|nokta|kurus)';
const trailingMoney=new RegExp('(?:^|\\s)('+moneyWord+'(?:\\s+'+moneyWord+')*(?:\\s+(?:tl|lira))?)$');
function amountClause(text){
 const normalized=String(text).replace(/(\d)(bin|milyon|k)\b/giu,'$1 $2'),match=fold(normalized).match(trailingMoney);
 return {amount:match?explicitAmount(match[1]):null,prefix:match?normalized.trim().split(/\s+/).slice(0,-match[1].split(/\s+/).length).join(' '):normalized,explicit:!!match};
}
function explicitAmount(value){
 const s=fold(value).replace(/(\d)(bin|milyon|k)\b/g,'$1 $2').replace(/\s+k$/,' bin').replace(/\s+(?:tl|lira)$/,'').trim();
 try{
  const numeric=s.match(/^(\d[\d.,]*)(?:\s+(bin|milyon))?$/);
  if(numeric)return positiveMoney(new Decimal(parseTurkishAmount(numeric[1])).mul(numeric[2]==='bin'?1000:numeric[2]==='milyon'?1000000:1).toFixed(2));
  // Each group is a valid Turkish integer, with strictly descending scale words.
  const group=words=>{
   if(!words.length)return 1;
   let result=0,index=0;
   if(words[0]==='yuz'){result=100;index=1;}
   else if(spokenNumbers[words[0]]<10&&words[1]==='yuz'){result=spokenNumbers[words[0]]*100;index=2;}
   if(spokenNumbers[words[index]]>=10){result+=spokenNumbers[words[index++]];}
   if(spokenNumbers[words[index]]<10){result+=spokenNumbers[words[index++]];}
   return index===words.length?result:null;
  };
  const words=s.split(/\s+/);let total=0,lastScale=Infinity,part=[];
  for(const word of words){
   if(word==='bin'||word==='milyon'){
    const scale=word==='bin'?1000:1000000,number=group(part);
    if(scale>=lastScale||number===null)return null;
    total+=number*scale;part=[];lastScale=scale;
   }else part.push(word);
  }
  const rest=part.length?group(part):0;
  return rest===null?null:positiveMoney(String(total+rest));
 }catch{return null;}
}
function explicitDate(text){
 const s=fold(text),today=istanbulDate();
 if(/\bdun(?:e|ku)?\b/.test(s)){const date=new Date(today+'T12:00:00+03:00');date.setUTCDate(date.getUTCDate()-1);return istanbulDate(date);}
 if(/\bbugun(?:e|ku)?\b/.test(s))return today;
 const date=s.match(/\b20\d{2}-\d{2}-\d{2}\b/)?.[0];
 return date&&Number.isFinite(Date.parse(date))&&new Date(date).toISOString().slice(0,10)===date?date:null;
}
function periodFor(text,quick){
 const s=fold(text),today=istanbulDate();
 const day=explicitDate(s);if(day)return {start:day,end:day};
 const y=Number(today.slice(0,4)),m=Number(today.slice(5,7));
 if(/\bgecen ay\b/.test(s))return monthRange(m===1?12:m-1,m===1?y-1:y);
 if(/\bbu ay\b/.test(s))return monthRange(m,y);
 if(/\bbu yil\b/.test(s))return {start:`${y}-01-01`,end:`${y}-12-31`};
 if(quick.start&&quick.end)return {start:quick.start,end:quick.end};
 return null;
}
const cleanCustomer=value=>fold(String(value||'').trim().replace(/\s+(?:bugün|dün)$/iu,'').replace(/['’](?:ya|ye|a|e|nin|nın|nun|nün|in|ın|un|ün)$/iu,'')).replace(/^(?:(?:bugun|dun|kanka|lutfen|peki|bana)\s+)+/,'').replace(/\s+musteri\w*$/,'').trim();
function accountPatch(value,accounts){
 const account=fold(value).replace(/\s+hesab\w*.*$/,'').replace(/\s+(?:olsun|yaz|sec)$/,'').trim();
 const exact=matchSpokenAccounts(account,accounts);
 const matches=exact.length?exact:accounts.filter(a=>fold(a.name).split(' ')[0]===account);
 return {accountIds:matches.length===1?[matches[0].id]:[],account};
}
function explicitAccount(text,accounts){
 const phrase=fold(text).match(/^(.*?)\s+hesab\w*/)?.[1]?.replace(/^(?:(?:bugun|dun|kanka|lutfen|bana|peki|bu ay|gecen ay)\s+)+/,'');
 if(!phrase)return null;
 const exact=matchSpokenAccounts(phrase+' hesabı',accounts),patch=accountPatch(phrase,accounts);
 return {accountIds:exact.length?exact.map(a=>a.id):patch.accountIds,account:phrase,explicitAccount:true};
}
const summaryMetrics=['collections','sales','purchases','net','sales_collections','debtors'];
function remotePeriod(remote){
 const {start,end}=remote;
 return /^20\d{2}-\d{2}-\d{2}$/.test(start||'')&&/^20\d{2}-\d{2}-\d{2}$/.test(end||'')&&explicitDate(start)===start&&explicitDate(end)===end&&start<=end?{start,end}:null;
}
const editVerb=String.raw`(?:duzelt|degistir|guncelle)(?:ir|r|tir|sene|sen|in|iniz|y?ebilir)?(?:\s*mi(?:sin|siniz))?`;
const hasEdit=text=>new RegExp('\\b'+editVerb+'\\b').test(text);
/** Parse all spoken financial slots together; never import model supplied money. */
export function parseBusinessSlots(text){
 const s=fold(text).replace(/[.!?]+$/,'').replace(/\bdegil(?=\d)/g,'degil ').split(/\bdegil\b/).at(-1).replace(/(\d)(bin|milyon|k)\b/g,'$1 $2');
 const patch={},date=explicitDate(s);
 if(date||/\b20\d{2}-\d{2}-\d{2}\b/.test(s))patch.date=date;
 const withoutDates=s.replace(/\b20\d{2}-\d{2}-\d{2}\b/g,' ');
 const matches=[...withoutDates.matchAll(new RegExp('(?:^|\\s)('+moneyWord+'(?:\\s+'+moneyWord+')*(?:\\s+(?:k|tl|lira))?)(?=$|\\s|[,;.!?])','g'))];
 if(matches.length===1)patch.amount=explicitAmount(matches[0][1]);
 if(matches.length>1)patch.amount=null;
 return Object.keys(patch).length?patch:null;
}
/** Only explicit user corrections change a pending operation; models never provide money. */
export function parseBusinessCorrection(text,{accounts=[]}={}){
 const s=fold(text).replace(/\bdegil(?=\d)/g,'degil ').replace(/[!?]$/,'').replace(/^kanka\s+/,'');
 if(!/\b(?:degil|olsun|yaz)\b/.test(s)&&!hasEdit(s))return null;
 const target=s.includes('degil')?s.split(/\bdegil\b/).at(-1).trim():s;
 if(/\bdiger hesap\b/.test(target))return {accountReference:'other'};
 const slots=parseBusinessSlots(target);
 if(/^musteri\b/.test(s)||/\bmusteri\w*\b/.test(target))return {...slots,customer:cleanCustomer(target.replace(/^musteri\w*\s+/,'').split(/\s+(?:tutar\w*|tarih\w*|miktar\w*)\b/)[0].replace(/\s+(?:musteri\w*\s+)?(?:olsun|yaz|sec|olarak duzelt)$/,''))};
 if(/\bhesab\w*\b/.test(target))return {...slots,...accountPatch(target,accounts)};
 if(slots)return slots;
 const amountText=target.replace(/^(?:tutari|tutar|miktari|miktar)\s+/,'').replace(/\s+(?:olarak\s+)?(?:olsun|yaz|duzelt|degistir)$/,'').trim();
 if(/^[+\-\d]|^(?:bir|iki|uc|dort|bes|alti|yedi|sekiz|dokuz|on|yirmi|otuz|kirk|elli|altmis|yetmis|seksen|doksan|yuz|bin|milyon|eksi)\b/.test(amountText))return {amount:explicitAmount(amountText)};
 if(s.includes('degil'))return accountPatch(target,accounts);
 return null;
}
/** Split only explicit collection clauses; each item still requires its own confirmation. */
export function parseBusinessBatch(text,{accounts=[],draft={},remote={}}={}){
 text=normalizeRequest(text);
 const s=fold(text);
 if(!/tahsilat/.test(s)||!/\b(?:ekle|kaydet|isle|gir)\b/.test(s)||/\b(?:ekleme|kaydetme|isleme|girme|iptal|vazgec)\b/.test(s))return null;
 const clauses=String(text).split(/\s*[,;]\s+(?=\p{L})|\s+ve\s+/iu,11).map(clause=>clause.replace(/\s+tahsilat\w*\s+(?:ekle|kaydet|işle|isle|gir).*$/iu,''));
 // Keep an eleventh item as an overflow signal; the controller rejects the whole batch.
 if(clauses.length<2)return null;
 const shared=parseQuickIntent(text,{accounts,draft}).intent,date=explicitDate(clauses[0]),sharedAccount=explicitAccount(clauses[0],accounts);
 return clauses.map(clause=>{
  const {amount,prefix}=amountClause(clause);
  const customer=cleanCustomer(prefix.replace(/^.*hesab\p{L}*\s+/iu,''));
  const own=parseQuickIntent(clause,{accounts,draft}).intent;
  const account=explicitAccount(clause,accounts)||sharedAccount;
  return {action:'collection',accountIds:own.accountIds||shared.accountIds||[],account:remote.account||null,...account,customer,amount,date:explicitDate(clause)||date};
 });
}
export const assistantDestinations=[
 ['/dashboard','Ana sayfa'],['/create','Fatura oluştur'],['/incoming','Gelen faturalar'],['/outgoing','Giden faturalar'],
 ['/earsiv-faturalar','e-Arşiv faturaları'],['/drafts','Taslaklar'],['/accounts','Hesaplar'],['/settings','Ayarlar'],
 ['/cari','Cari'],['/cari-ozet','Müşteriler ve bakiyeler'],['/secili-hesaplar-cari','Seçili hesaplar'],
 ['/tum-hesaplar-cari','Tüm hesaplar'],['/toplu-tahsilat','Toplu tahsilat'],['/musteriler','Müşteriler'],
 ['/eirsaliye-olustur','İrsaliye oluştur'],['/eirsaliye-giden','Giden irsaliyeler'],['/eirsaliye-gelen','Gelen irsaliyeler'],['/export','Excel dışa aktar'],
];
function normalizeRequest(text){
 return String(text).replace(/\b(?:ekler|ekleyebilir)\s+mi(?:sin|siniz)\b/giu,'ekle')
  .replace(/\b(?:kaydeder|kaydedebilir)\s+mi(?:sin|siniz)\b/giu,'kaydet')
  .replace(/\b(?:girer|girebilir)\s+mi(?:sin|siniz)\b/giu,'gir')
  .replace(/\b(?:işler|işleyebilir|isler|isleyebilir)\s+mi(?:sin|siniz)\b/giu,'isle');
}
export function parseBusinessCommand(text,{accounts=[],draft={},remote={}}={}){
 text=normalizeRequest(text);
 const s=fold(text),quick=parseQuickIntent(text,{accounts,draft}).intent;
 if(/\b(?:excel\w*|ekstre\w*|rapor\w*|pdf|fotograf\w*|gorsel\w*)\b/.test(s)&&!hasEdit(s)&&!/\b(?:ekle|kaydet|isle|gir)\b/.test(s))return null;
 const additional=s.replace(/^(?:(?:kanka|peki|tamam|simdi)\s+)+/,'').match(/^(?:(?:bugun|dun)\s+)?(?:buna|ona|ayni musteriye|bu musteriye|o musteriye)\s+(.+?)\s+(?:ekle|kaydet|isle)(?:\s+(?:kanka|lutfen))?[.!?]*$/);
 if(additional){
  const value=additional[1].replace(/\b(?:bugun|dun|daha|tahsilat)\b/g,'').replace(/\s+/g,' ').trim().replace(/^(\d[\d.,]*)\s*k$/,'$1 bin');
  return {action:'collection',useContext:true,accountIds:[],customer:null,amount:explicitAmount(value),date:explicitDate(s)||istanbulDate()};
 }
 const namedAccount=explicitAccount(text,accounts);
 if(namedAccount)quick.accountIds=namedAccount.accountIds;
 const selection=s.replace(/[.!?]+$/,'').match(/^(?:kanka\s+)?(?:musteri(?:miz)?\s+(.+?)|(.+?)\s+musteri(?:miz|si))$/);
 if(selection)return {action:'select_customer',accountIds:quick.accountIds||[],...namedAccount,customer:cleanCustomer(selection[1]||selection[2]).replace(/^.*hesab\w*\s+/,'')};
 if(!quick.accountIds?.length){
  const explicit=s.match(/(?:^|\s)([a-z]+)\s+hesab\w*/)?.[1];
  if(explicit){const patch=accountPatch(explicit,accounts);if(patch.accountIds.length)quick.accountIds=patch.accountIds;}
 }
 if(/\b(?:iptal etme|silme|duzeltme|degistirme)\b/.test(s))return null;
 const mutation=/\b(?:ekle|kaydet|isle|gir|olustur)(?:sene)?\b/.test(s)||/\b(?:iptal et|sil|kaldir)\b/.test(s)||hasEdit(s);
 const latest=/\btahsilat\w*\b/.test(s)&&!mutation&&(/\b(?:en son|son\s+(?:ekledigim|kaydettigim|girdigim|yaptigim|tahsilat\w*)|az once|demin|biraz once)\b/.test(s)||/\bhangi\b.*\b(?:ekledim|kaydettim|girdim)\b/.test(s)||remote.action==='latest_collection');
 if(latest){
  const useContext=/\b(?:onun|buna|bu musterinin|ayni musterinin|o musterinin)\b/.test(s);
  const possessive=String(text).replace(/^.*hesab\p{L}*\s+/iu,'').match(/^(.+?)['’](?:nın|nin|nun|nün|ın|in|un|ün)\s+(?:en\s+)?son\s+tahsilat/iu)?.[1];
  return {action:'latest_collection',scope:quick.scope,accountIds:quick.accountIds||[],...namedAccount,period:periodFor(s,quick),
   customer:quick.customer||(possessive?cleanCustomer(possessive):null)||(useContext?draft.customer:null)||null,useContext};
 }
 if(/\btahsilat\w*\b/.test(s)&&!/\b(?:iptal etme|silme|duzeltme|degistirme)\b/.test(s)){
  const cancel=/\b(?:iptal et|sil|kaldir)\b/.test(s),update=hasEdit(s);
  if(/\b(?:iptal et|sil|kaldir|duzelt|degistir|guncelle)\s+degil\b/.test(s))return null;
  if(cancel||update){
   const correction=update?parseBusinessSlots(s.replace(/^.*?tahsilat\w*\s+/,'')):null;
   const referLast=/\b(?:az once|son|demin|biraz once)\b/.test(s);
   const latestPersisted=/\b(?:en son|son\s+(?:ekledigim|kaydettigim|girdigim|yaptigim|tahsilat\w*))\b/.test(s);
   const prefix=String(text).split(/\s+tahsilat/iu)[0].replace(/^.*hesab\p{L}*\s+/iu,'');
   const beforeOrder=prefix.replace(/(?:^|\s)(?:en\s+son|son|az önce|demin|biraz önce)\b.*$/iu,'').trim();
   const prefixWithoutAccount=matchSpokenAccounts(beforeOrder,accounts).length?'':beforeOrder;
   const customer=cleanCustomer(prefixWithoutAccount)||null;
   return {action:cancel?'cancel_collection':'update_collection',referLast,latestPersisted,accountIds:quick.accountIds||[],...namedAccount,customer,...correction};
  }
 }
 if(/\b(?:ekleme|kaydetme|isleme|girme|olusturma|iptal|vazgec)\b/.test(s))return null;
 if(/\b(?:iptal etme|silme|duzeltme|degistirme)\b/.test(s))return null;
 if(/\b(?:ac|git|goster|gotur)\b/.test(s)){
  const destination=[...assistantDestinations].sort((a,b)=>b[1].length-a[1].length).find(([,label])=>s.includes(fold(label)));
  if(destination)return {action:'navigate',route:destination[0]};
 }
 const collection=/tahsilat/.test(s)&&/\b(?:ekle|kaydet|isle|gir|olustur)(?:sene)?\b/.test(s);
 const remoteSummary=remote.action==='summary'&&summaryMetrics.includes(remote.metric);
 const summary=!collection&&(/\b(?:toplam|ne kadar|ne topladik|ne toplamisiz|ozet|en cok borcu|net)\b/.test(s)||/satis\w*.*tahsilat\w*.*cikar/.test(s)||remoteSummary);
 if(summary){
  const metric=/en cok borcu/.test(s)?'debtors':/satis\w*.*tahsilat\w*.*cikar/.test(s)?'sales_collections':/\bnet\b/.test(s)?'net':/tahsilat|topladik|toplamisiz/.test(s)?'collections':/satis/.test(s)?'sales':/alis/.test(s)?'purchases':remoteSummary?remote.metric:null;
  if(metric){
   if(!quick.accountIds?.length){
    const aliases=accounts.filter(account=>{
     const first=fold(account.name).split(' ')[0].replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
     return new RegExp('(?:^|\\s)'+first+'(?:nin|nun|in|un)?\\s+(?:satis|alis|tahsilat)').test(s);
    });
    if(aliases.length===1)quick.accountIds=[aliases[0].id];
   }
   const limitMatch=s.match(/\b(\d+|bir|iki|uc|dort|bes|alti|yedi|sekiz|dokuz|on|yirmi)\s+musteri/),limit=limitMatch?Math.min(50,Math.max(1,Number(limitMatch[1])||spokenNumbers[limitMatch[1]])):5;
   const hasContext=/^(?:peki|onun|bu musterinin|ayni musterinin)\b/.test(s);
   const explicitCustomer=String(text).match(/hesab\p{L}*\s+(.+?)(?:\s+(?:bu ay|bugün|dün|geçen ay|ne kadar|tahsilat\p{L}*|satış\p{L}*|alış\p{L}*))\b/iu)?.[1];
   return {action:'summary',metric,period:periodFor(s,quick)||remotePeriod(remote),limit,scope:quick.scope,allCustomers:quick.allCustomers||metric==='debtors',accountIds:quick.accountIds||(hasContext?draft.accountIds:[])||[],account:remote.account||null,...namedAccount,customer:quick.allCustomers||metric==='debtors'?null:quick.customer||(explicitCustomer?cleanCustomer(explicitCustomer):null)||(hasContext?draft.customer:null)||remote.customer||null};
  }
 }
 const balance=/\b(?:bakiye\w*|borcu\w*|alacagi\w*)\b/.test(s)&&!/tahsilat.*(?:ekle|kaydet)/.test(s);
 if(!collection&&!balance&&remote.action==='select_customer'&&remote.customer)return {action:'select_customer',accountIds:quick.accountIds||[],account:remote.account||null,...namedAccount,customer:remote.customer};
 if(!collection&&!balance&&!['balance','navigate'].includes(remote.action))return null;
 if(remote.action==='navigate'&&!collection&&!balance)return assistantDestinations.some(([route])=>route===remote.route)?{action:'navigate',route:remote.route}:null;
 const action=collection?'collection':balance?'balance':remote.action;
 // The model may transcribe words, but never supplies the authoritative money value.
 const amountPart=amountClause(String(text).split(/\s+tahsilat/iu)[0]);
 const amount=amountPart.explicit?amountPart.amount:parseBusinessSlots(text)?.amount||null;
 const date=explicitDate(s);
 let customer=quick.customer;
 if(customer)customer=String(customer).replace(/^(?:(?:bugun|dun|kanka|lutfen)\s+)+/,'');
 if(!customer&&action==='balance')customer=s.match(/hesab(?:indaki|inda)\s+(.+?)\s+(?:bakiye\w*|borc\w*|alacag\w*)/)?.[1];
 if(!customer&&action==='balance')customer=cleanCustomer(String(text).match(/^(.+?)\s+(?:bakiyesi|bakiyesini|borcu|alacagi|alacağı)/iu)?.[1]);
 if(action==='collection'){
  const {prefix}=amountPart;
  customer=prefix!==String(text)?cleanCustomer(prefix.replace(/^.*hesab\p{L}*\s+/iu,'')):customer;
 }
 customer=customer||remote.customer;
 if(/^(?:peki\s+)?(?:onun|bu musterinin|ayni musterinin)\b/.test(s)){customer=draft.customer||customer;if(!quick.accountIds?.length)quick.accountIds=draft.accountIds||[];}
 return {action,accountIds:quick.accountIds||[],account:remote.account||null,...namedAccount,customer,amount,date};
}

export function businessConfirmation(text){
 const s=fold(text).replace(/[.!?]/g,'').replace(/^kanka\s+/,'');
 if(/^(?:iptal(?: et)?|vazgec|hayir)$/.test(s))return 'cancel';
 if(/^(?:onayliyorum|onayla|evet kaydet|kaydet)$/.test(s))return 'confirm';
 return null;
}
