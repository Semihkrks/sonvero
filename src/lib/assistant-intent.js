const fold=s=>String(s||'').toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i').trim();
import {requestedFormat} from './assistant-dialogue.js';
const months=['ocak','subat','mart','nisan','mayis','haziran','temmuz','agustos','eylul','ekim','kasim','aralik'];
const ordinals={birinci:1,ikinci:2,ucuncu:3,dorduncu:4,besinci:5,altinci:6,yedinci:7,sekizinci:8,dokuzuncu:9,onuncu:10,onbirinci:11,onikinci:12};
const accountEnding="(?:nin|nun|in|un|n|i|u|deki|daki|teki|taki|den|dan|ten|tan|de|da|te|ta)";
const accountSuffix="(?:['’]?"+accountEnding+")?";
const escapePattern=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const normalizeSpeech=value=>fold(value).replace(/\b(satis)(alis)|\b(alis)(satis)/g,(_,a,b,c,d)=>`${a||c} ${b||d}`).replace(/\b(tahsilat\w*?)(dahil|haric)\b/g,'$1 $2').replace(/\s+/g,' ').trim();
const movementWords='(?:satis|alis|tahsilat)(?:lar(?:i|in|ini|inin|la|yla|dan|da|daki)?|in|ini|inin|i|a|tan|ta|taki)?';
const requestWords='(?:hazirla(?:yin|r|yabilir)?|gonder(?:in|ir|ebilir)?|yolla(?:yin|r|yabilir)?|getir(?:in|ir|ebilir)?|ver(?:in|ir|ebilir)?|cikar(?:in|ir|abilir)?|olustur(?:un|ur|abilir)?)(?:misin|misiniz)?';
const accountWords='(?:hesap(?:lar(?:inda(?:ki)?|indan|inin|ina|ini|in|i|da(?:ki)?|dan)?|ta(?:ki)?|tan)?|hesab(?:inda(?:ki)?|indan|inin|ina|ini|in|i|im(?:da|dan)?|imiz(?:da|dan)?)?)';
const reportWords='(?:(?:excel|eksel)(?:ini|in|i|e|den)?|xlsx|(?:ekstre|cari)(?:sini|sinin|si|yi|ye|nin|ni|i)?|rapor(?:unu|unun|u|a|dan)?|fotograf(?:ini|inin|i|a|tan)?|gorsel(?:ini|inin|i|e|den)?|resim(?:ini|inin|i|e|den)?|resm(?:ini|inin|i))';
function reportPeriod(text,now){
 const spans=[],intent={};let uncertain=false;
 const consume=match=>spans.push({start:match.index,end:match.index+match[0].length});
 const calendar=(year,month,day)=>{const range=monthRange(Number(month),Number(year));return range.end&&Number(day)>=1&&Number(day)<=Number(range.end.slice(-2))?`${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`:null;};
 const range=(match,start,end)=>{consume(match);if(start&&end&&start<=end)Object.assign(intent,{start,end,month:Number(start.slice(5,7)),year:Number(start.slice(0,4))});else uncertain=true;};
 const iso=text.match(/\b(20\d{2})-(\d{2})-(\d{2})\s*(?:ile|ve|[-–])\s*(20\d{2})-(\d{2})-(\d{2})(?:\s+arasi\w*)?/);
 if(iso){range(iso,calendar(iso[1],iso[2],iso[3]),calendar(iso[4],iso[5],iso[6]));return {intent,spans,uncertain};}
 const local=text.match(/\b(\d{1,2})\.(\d{1,2})\.(20\d{2})\s*(?:ile|ve|[-–])\s*(\d{1,2})\.(\d{1,2})\.(20\d{2})(?:\s+arasi\w*)?/);
 if(local){range(local,calendar(local[3],local[2],local[1]),calendar(local[6],local[5],local[4]));return {intent,spans,uncertain};}
 const monthNames='('+months.join('|')+')';
 const spoken=text.match(new RegExp('\\b(\\d{1,2})\\s+'+monthNames+'(?:\\s+(20\\d{2}))?\\s*(?:ile|ve|[-–])\\s*(\\d{1,2})\\s+'+monthNames+'(?:\\s+(20\\d{2}))?(?:\\s+arasi\\w*)?'));
 if(spoken){const year=spoken[3]||spoken[6]||now.getFullYear();range(spoken,calendar(year,months.indexOf(spoken[2])+1,spoken[1]),calendar(spoken[6]||year,months.indexOf(spoken[5])+1,spoken[4]));return {intent,spans,uncertain};}
 const relative=text.match(/\b(bu|gecen|onceki|bir onceki)\s+ay(?:da|in|inin|i|inda)?\b/);
 if(relative){const date=new Date(now.getFullYear(),now.getMonth()-(relative[1]==='bu'?0:1),1);consume(relative);Object.assign(intent,{month:date.getMonth()+1,year:date.getFullYear(),...monthRange(date.getMonth()+1,date.getFullYear())});return {intent,spans,uncertain};}
 // Defer unfamiliar temporal language rather than overwriting the model's customer
 // with fragments such as "gecen hafta Harmanda" or treating a day as a full month.
 if(/\b(?:bu|gecen|onceki)\s+(?:hafta\w*|yil\w*|sene\w*|gun\w*|ceyrek\w*|donem\w*)|\bson\s+\d+\s+(?:ay\w*|hafta\w*|gun\w*)|\b\d{1,2}\s+(?:ocak|subat|mart|nisan|mayis|haziran|temmuz|agustos|eylul|ekim|kasim|aralik)\b|\b20\d{2}-\d{2}-\d{2}\b/.test(text))uncertain=true;
 return {intent,spans,uncertain};
}
function oneEditApart(left,right){
 if(Math.abs(left.length-right.length)>1)return false;
 let i=0,j=0,edits=0;
 while(i<left.length&&j<right.length){if(left[i]===right[j]){i++;j++;continue;}if(++edits>1)return false;if(left.length>=right.length)i++;if(right.length>=left.length)j++;}
 return edits+Number(i<left.length||j<right.length)<=1;
}
function spokenAccountReferences(text){
 const references=[];
 for(const marker of text.matchAll(new RegExp('\\b'+accountWords+'\\b','g'))){
  const tokens=[...text.slice(0,marker.index).matchAll(/[a-z]+(?:['’][a-z]+)?/g)];
  let cursor=marker.index,start=cursor,count=0;
  for(const token of tokens.reverse()){
   if(count>=4||!/^\s*$/.test(text.slice(token.index+token[0].length,cursor)))break;
   const periodWord=new RegExp('^(?:'+months.join('|')+")(?:['’]?(?:de|da|ki|un|in|nin|nun))?$").test(token[0]);
   if(periodWord||Object.hasOwn(ordinals,token[0])||new RegExp('^'+movementWords+'$').test(token[0])||new RegExp('^'+requestWords+'$').test(token[0])||/^(?:kanka|bana|lutfen|bugun|dun|icin|ay(?:da|inda|i|in|inin|daki)?|hesa[bp]\w*|musteri\w*|excel\w*|rapor\w*|secili|tum|butun|bu|o|tek|dahil|haric)$/.test(token[0]))break;
   start=token.index;cursor=start;count++;
  }
  if(count)references.push({start,end:marker.index+marker[0].length});
 }
 return references;
}
function spokenAccountMatches(text,accounts=[]){
 const s=fold(text),matches=[];
 for(const account of accounts){
  const pattern=new RegExp('(?:^|[^a-z0-9])('+escapePattern(fold(account.name))+accountSuffix+')(?=$|[^a-z0-9])','g');
  for(const match of s.matchAll(pattern))matches.push({account,start:match.index+match[0].length-match[1].length,end:match.index+match[0].length});
 }
 const phrases=[...s.matchAll(/([a-z]+(?:\s+[a-z]+)*)\s+hesab\w*/g)].map(m=>m[1].split(/\s+/));
 const fuzzy=accounts.filter(a=>{const name=fold(a.name).split(/\s+/);if(name.length<2)return false;return phrases.some(words=>{const spoken=words.slice(-name.length);return spoken.length===name.length&&spoken.slice(0,-1).every((word,i)=>word===name[i])&&oneEditApart(spoken.at(-1),name.at(-1));});});
 if(!matches.length&&fuzzy.length===1){
  const account=fuzzy[0],name=fold(account.name).split(/\s+/);
  for(const match of s.matchAll(/([a-z]+(?:\s+[a-z]+)*)\s+hesab\w*/g)){
   const words=match[1].split(/\s+/),spoken=words.slice(-name.length);
   if(spoken.slice(0,-1).every((word,i)=>word===name[i])&&oneEditApart(spoken.at(-1),name.at(-1))){const length=spoken.join(' ').length;matches.push({account,start:match.index+match[1].length-length,end:match.index+match[1].length});}
  }
  return matches;
 }
 // A partial account name needs an account marker, a possessive/locative suffix,
 // or a standalone answer. A customer with the same first name is not an account.
 const aliases=new Map();
 for(const account of accounts)for(const token of new Set(fold(account.name).split(/\s+/).filter(word=>word.length>=3))){if(!aliases.has(token))aliases.set(token,[]);aliases.get(token).push(account);}
 for(const [alias,owners] of aliases){
  if(owners.length!==1)continue;
  const pattern=new RegExp('(?:^|[^a-z0-9])('+escapePattern(alias)+"(?:['’]?"+accountEnding+")?)(?=$|[^a-z0-9])",'g');
  for(const match of s.matchAll(pattern)){
   const spoken=match[1],start=match.index+match[0].length-spoken.length,end=match.index+match[0].length;
   if(matches.some(match=>start<match.end&&end>match.start))continue;
   const preceding=s.slice(0,start).trim().split(/\s+/).at(-1)||'';
   const periodWord=new RegExp('^(?:'+months.join('|')+')(?:de|da|ki)?$').test(preceding);
   if(preceding&&!periodWord&&!/^(?:kanka|bana|lutfen|bugun|dun|ve|ile|icin|hesap\w*|ay\w*|tahsilat\w*|satis\w*|alis\w*|musteri\w*|rapor\w*|excel\w*|ver\w*|hazirla\w*|getir\w*|gonder\w*|degil|de|da|20\d{2}|[.,;:]|\d+\.?(?:ay\w*)?)$/.test(preceding))continue;
   const followedByKnownAccount=/^\s+ve\s+/.test(s.slice(end))&&matches.some(match=>match.start>end);
   const aliasList=s.slice(end).match(/^\s+ve\s+([a-z]+)\s+hesa[bp]\w*\b/);
   const followedByUniqueAlias=aliasList&&aliases.get(aliasList[1])?.length===1;
   if(/^\s+hesa[bp]\w*\b/.test(s.slice(end))||spoken!==alias||s===alias||followedByKnownAccount||followedByUniqueAlias)matches.push({account:owners[0],start,end});
  }
 }
 return matches;
}
/** Resolve known names and unique spoken aliases; ambiguous aliases stay a question. */
export function matchSpokenAccounts(text,accounts=[]){
 return [...new Map(spokenAccountMatches(text,accounts).map(({account})=>[account.id,account])).values()];
}
export function monthRange(month,year){
 if(!Number.isInteger(month)||month<1||month>12||!Number.isInteger(year)||year<2000||year>2100)return {};
 return {start:`${year}-${String(month).padStart(2,'0')}-01`,end:`${year}-${String(month).padStart(2,'0')}-${new Date(year,month,0).getDate()}`};
}
/** Fast path only for explicit fields; unknown language still goes to the model. */
export function parseQuickIntent(text,{awaiting,accounts=[],draft={},now=new Date()}={}){
 const s=normalizeSpeech(text),intent={};
 const format=requestedFormat(text);if(format)intent.format=format;
 const allCustomers=/\b(?:(?:tum|butun)\s+musteri\w*|musteriler(?:in|inin|i|ini|e|den)?)\b/.test(s);
 if(allCustomers){intent.allCustomers=true;intent.customer='';if(!format)intent.format='excel';}
 if(/tum hesap/.test(s))intent.scope='all';else if(/secili hesap/.test(s))intent.scope='selected';else if(/cari ekrani|tek hesap/.test(s))intent.scope='cari';
 const references=spokenAccountReferences(s),accountMatches=spokenAccountMatches(s,accounts);
 const named=[...new Map(accountMatches.map(({account})=>[account.id,account])).values()];
 const unresolvedAccount=references.some(reference=>{
  let phrase=s.slice(reference.start,reference.end);
  for(const match of [...accountMatches].sort((a,b)=>b.start-a.start)){
   const start=Math.max(reference.start,match.start)-reference.start,end=Math.min(reference.end,match.end)-reference.start;
   if(end>start)phrase=phrase.slice(0,start)+' '.repeat(end-start)+phrase.slice(end);
  }
  return phrase.replace(new RegExp('\\b'+accountWords+'\\b|\\b(?:ve|ile)\\b','g'),'').trim().length>0;
 });
 if(unresolvedAccount){intent.accountIds=[];intent.scope='cari';}
 else if(named.length){intent.accountIds=named.map(a=>a.id);if(!intent.scope)intent.scope=named.length===1?'cari':'selected';}
 const sales=/\bsatis(?:lar\w*|in\w*|i\w*)?\b/.test(s),purchases=/\balis(?:lar\w*|in\w*|i\w*)?\b/.test(s);
 if(sales&&purchases||awaiting==='direction'&&/her ikisi|ikisi de/.test(s))intent.direction='both';else if(sales)intent.direction='satis';else if(purchases)intent.direction='alis';
 if(/\bcari(?:si\w*)?\b|ekstre/.test(s)&&!intent.direction&&!draft.direction)intent.direction='both';
 if(awaiting==='format'&&/^(ikisi de|her ikisi|hepsi)$/.test(s))intent.format='both';
 if(/tahsilat/.test(s))intent.withCollections=!/haric|olmasin|istemiyorum|dahil etme/.test(s);
 if(awaiting==='collections'&&/^(evet|dahil|olsun|hayir|haric|olmasin)[.! ]*$/.test(s))intent.withCollections=/evet|dahil|olsun/.test(s)&&!s.includes('olmasin');
 if(allCustomers){intent.direction??=draft.direction||'both';intent.withCollections??=draft.withCollections??true;}
 if(/hesaplar ayri|ayri sayfa/.test(s))intent.layout='separate';
 const period=reportPeriod(s,now);
 const numbered=s.match(/\b(1[0-2]|0?[1-9])\s*\.?\s*ay(?:da|daki|in|inin|indaki|inki|i|inda|ki|a)?\b/);
 const spoken=Object.entries(ordinals).find(([name])=>new RegExp('\\b'+name+'\\s+ay').test(s));
 const namedMonth=months.findIndex(m=>new RegExp('\\b'+m+"(?:['’]?(?:de|da|ki|un|in|nin|nun))?\\b").test(s))+1;
 const month=numbered?Number(numbered[1]):spoken?spoken[1]:namedMonth;
 const year=Number(s.match(/\b20\d{2}\b/)?.[0])||null;
 if(period.intent.start)Object.assign(intent,period.intent);
 else if(!period.uncertain){if(month)intent.month=month;if(year)intent.year=year;if(month||(year&&draft.month))Object.assign(intent,monthRange(month||draft.month,year||draft.year||now.getFullYear()));}
 if(!allCustomers){
  // Strip independently recognized slots before extracting the remaining identity.
  // This also handles modifiers after the customer and dictated words joined together.
  let remaining=s;
  const accountSpans=unresolvedAccount?references:accountMatches;
  for(const match of [...accountSpans,...period.spans].sort((a,b)=>b.start-a.start))remaining=remaining.slice(0,match.start)+' '.repeat(match.end-match.start)+remaining.slice(match.end);
  remaining=remaining.replace(new RegExp('\\b'+accountWords+'\\b','g'),' ')
   .replace(/\b(?:1[0-2]|0?[1-9])\s*\.?\s*ay\w*\b/g,' ')
   .replace(new RegExp('\\b(?:'+Object.keys(ordinals).join('|')+')\\s+ay\\w*\\b','g'),' ')
   .replace(new RegExp('\\b(?:'+months.join('|')+")(?:['’]?(?:de|da|ki|un|in|nin|nun))?\\b",'g'),' ')
   .replace(/\b20\d{2}\b|\bay(?:da|inda|inin|i|in)?\b/g,' ')
   .replace(new RegExp('\\b'+movementWords+'\\b','g'),' ')
   .replace(/\b(?:dahil|haric)(?:inde|inde)?\b|\bdahil\s+etme\b|\bolmasin\b|\bistemiyorum\b/g,' ')
   .replace(/\b(?:secili|tum|butun|cari|tek|ekrani|ayri|sayfa|hesaplar|adli|isimli|kisinin|kisi)\b/g,' ');
  const beforeCustomer=remaining.match(/^(.*?)\bmusteri(?:sinin|sini|sine|sinden|si|miz(?:in|i)?|nin|yi|ye)\b/);
  if(beforeCustomer&&beforeCustomer[1].trim())remaining=beforeCustomer[1];
  else remaining=remaining.replace(/\bmusteri\w*\b/g,' ');
  remaining=remaining.replace(new RegExp('\\b'+reportWords+'\\b','g'),' ')
   .replace(new RegExp('\\b'+requestWords+'\\b','g'),' ')
   .replace(/\b(?:kanka|bana|lutfen|bugun|dun|icin|ve|ile|olarak|da|de|adli|isimli|kisinin|kisi|vkn|tckn|vergi numarasi|istiyorum|misin|misiniz)\b/g,' ')
   .replace(/[.,!?;:]/g,' ').replace(/\s+/g,' ').trim();
  const namedCustomer=awaiting==='customer'||!!beforeCustomer||/\b(?:excel\w*|eksel\w*|xlsx|ekstre\w*|cari\w*|rapor\w*|fotograf\w*|gorsel\w*|resim\w*|icin)\b/.test(s);
  if(remaining&&namedCustomer&&!period.uncertain&&!/^(?:onun|bu|o|secilen|evet|hayir|tamam|olur|onayliyorum|iptal)$/.test(remaining)){intent.customer=remaining;intent.allCustomers=false;}
 }
 if(awaiting==='accounts'&&/^(hepsi|tum hesaplar|tumunu)$/.test(s))intent.accountIds=accounts.map(a=>a.id);
 const simpleAnswer=!!awaiting&&(intent[awaiting]!==undefined||awaiting==='collections'&&typeof intent.withCollections==='boolean'||awaiting==='accounts'&&intent.accountIds?.length||awaiting==='period'&&(month||year));
 const completeCommand=!!(intent.customer||intent.allCustomers)&&!!(intent.scope||intent.accountIds?.length||draft.scope)&&(month||intent.start||draft.start);
 return {intent,handled:!!(simpleAnswer||completeCommand)&&!period.uncertain&&!s.includes('degil')};
}
export function nextQuestion(draft){
 if(!draft.scope)return {key:'scope',text:'Hangi ekrandaki raporu hazırlayayım?',choices:[['Seçili Hesaplar',{scope:'selected'}],['Tüm Hesaplar',{scope:'all'}],['Cari',{scope:'cari'}]]};
 if(draft.scope!=='all'&&!draft.accountIds?.length)return {key:'accounts',text:'Hangi hesapları kullanayım? Aşağıdan seçebilir veya adlarını söyleyebilirsin.'};
 if(!draft.customer&&!draft.allCustomers)return {key:'customer',text:'Hangi müşteri için hazırlayayım? Adını veya VKN’sini söyle; tümü için “tüm müşteriler” de.'};
 if(!draft.start||!draft.end)return {key:'period',text:'Hangi ay için hazırlayayım?'};
 if(!draft.direction)return {key:'direction',text:'Satışlar mı, alışlar mı, her ikisi mi?',choices:[['Satış',{direction:'satis'}],['Alış',{direction:'alis'}],['Her ikisi',{direction:'both'}]]};
 if(typeof draft.withCollections!=='boolean')return {key:'collections',text:'Tahsilatları da ekleyeyim mi?',choices:[['Dahil et',{withCollections:true}],['Hariç tut',{withCollections:false}]]};
 return null;
}
