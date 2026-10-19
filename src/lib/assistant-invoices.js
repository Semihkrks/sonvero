// Invoice questions for SonAI: read-only lookups over archived invoices, plus the
// one write-adjacent request ("fatura kes") which only opens the invoice screen,
// where the user completes and confirms the document themselves.
import {parseAssistantPeriod,matchSpokenAccounts} from './assistant-intent.js';

const fold=value=>String(value||'').toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/ı/g,'i').replace(/[.,!?;:]/g,' ').replace(/\s+/g,' ').trim();
const months=['ocak','subat','mart','nisan','mayis','haziran','temmuz','agustos','eylul','ekim','kasim','aralik'];
const invoiceWord=/\bfatura(?:lar|lari|larin|larini|larimiz\w*|miz\w*|yi|ya|nin|si|sini|sinin|sina|lar\w*|y\w*)?\b/;
// Present-tense/imperative creation verbs; past participles such as "kestiğimiz" are reads.
const createVerb=/\b(?:kes(?:er\s+mi(?:sin|siniz)|ebilir\s+mi(?:sin|siniz)|elim|sene|in|mek\s+istiyorum|ecegim|iver)?|olustur(?:ur\s+musun|abilir\s+misin|alim|sana|un)?|duzenle(?:r\s+misin|yelim)?|hazirla(?:r\s+misin|yalim)?)\b/;
const readSignal=/\b(?:kac|son|en son|en buyuk|en yuksek|en fazla|toplam\w*|neler|hangi\w*|listele\w*|goster\w*|ne kadar|var mi|kestigimiz|kesilen|kestik|kestim|gelen|gelmis|aldigimiz|giden|gonderdigimiz)\b/;
const navigationOnly=/^(?:(?:kanka|lutfen|bana)\s+)*(?:gelen|giden|e-?arsiv)\s+faturalar\w*\s+(?:ac|git|gotur|goster)\w*$/;
const vocabulary=new RegExp('\\b(?:'+[
 'kanka','peki','ya','lutfen','bana','bize','bu','o','ne','mi','mu','kac','tane','adet','son','en','buyuk','yuksek','fazla','toplam\\w*','neler','hangi\\w*','listele\\w*','goster\\w*','kadar','var','acaba',
 'kestigimiz','kesilen','kestik','kestim','gelen','gelmis','aldigimiz','giden','gonderdigimiz','satis\\w*','alis\\w*','e-?arsiv\\w*','e-?fatura\\w*','fatura\\w*','tutar\\w*','olan','icin','ve','ile','de','da',
 '(?:bu|gecen|onceki)\\s+ay\\w*','(?:'+months.join('|')+')\\w*','(?:1[0-2]|0?[1-9])\\s*\\.?\\s*ay\\w*','20\\d{2}','ay\\w*','hesab\\w*','hesap\\w*','tum','butun','musteri\\w*',
].join('|')+')\\b','g');

/** Parses an invoice question; returns null when the message is not about invoices. */
export function parseInvoiceQuery(text,{accounts=[],now=new Date(),remote={}}={}){
 const s=fold(text);
 if(remote.action!=='invoices'&&!invoiceWord.test(s))return null;
 if(navigationOnly.test(s))return null;
 if(/\b(?:iptal|sil|kaldir|reddet|onayla)\w*\b/.test(s)&&invoiceWord.test(s))return {action:'invoice_unsupported'};
 const past=/\b(?:kestigimiz|kesilen|kestik|kestim|kesmistik)\b/.test(s);
 if(!past&&createVerb.test(s)&&invoiceWord.test(s))return {action:'navigate',route:'/create',reason:'invoice_create'};
 if(remote.action!=='invoices'&&!readSignal.test(s))return null;
 const period=parseAssistantPeriod(text,{now});
 if(period.uncertain)return {action:'invoices',uncertainPeriod:true};
 const direction=/\b(?:satis\w*|giden|kestigimiz|kesilen|kestik|kestim|gonderdigimiz)\b/.test(s)?'satis':/\b(?:alis\w*|gelen|gelmis|aldigimiz)\b/.test(s)?'alis':(['satis','alis'].includes(remote.direction)?remote.direction:'both');
 const order=/\ben\s+(?:buyuk|yuksek|fazla)\b/.test(s)?'largest':'latest';
 const limit=/\b(?:son|en)\b/.test(s)&&!/\b(?:kac|toplam\w*|neler|listele\w*)\b/.test(s)?1:3;
 const named=matchSpokenAccounts(text,accounts);
 let rest=s;
 for(const account of named)for(const token of fold(account.name).split(' ').filter(word=>word.length>=3))rest=rest.replace(new RegExp('\\b'+token+'(?:nin|nun|in|un|n|deki|daki|de|da|den|dan|e|a|i|u)?\\b','g'),' ');
 rest=rest.replace(vocabulary,' ').replace(/\s+/g,' ').trim();
 // "Harmanda'ya kestiğimiz": keep the name before the apostrophe; spoken suffixes stay for the search.
 const spoken=String(text).match(/([\p{L}\d][\p{L}\d .&-]*?)['’](?:ya|ye|a|e|nin|nın|nun|nün|in|ın|un|ün|dan|den|tan|ten)\b/u)?.[1];
 const customer=spoken&&!matchSpokenAccounts(spoken,accounts).length?spoken.replace(/^.*\bhesab\p{L}*\s+/iu,'').trim():rest||remote.customer||null;
 const range=period.intent.start?{start:period.intent.start,end:period.intent.end}:remote.start&&remote.end?{start:remote.start,end:remote.end}:null;
 return {action:'invoices',direction,order,limit,period:range,accountIds:named.map(a=>a.id),scope:/\b(?:tum|butun)\s+hesap/.test(s)?'all':undefined,customer:customer&&customer.length>1?customer:null};
}
