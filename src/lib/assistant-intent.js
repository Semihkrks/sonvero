const fold=s=>String(s||'').toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i').trim();
import {requestedFormat} from './assistant-dialogue.js';
const months=['ocak','subat','mart','nisan','mayis','haziran','temmuz','agustos','eylul','ekim','kasim','aralik'];
const ordinals={birinci:1,ikinci:2,ucuncu:3,dorduncu:4,besinci:5,altinci:6,yedinci:7,sekizinci:8,dokuzuncu:9,onuncu:10,onbirinci:11,onikinci:12};
export function monthRange(month,year){
 if(!Number.isInteger(month)||month<1||month>12||!Number.isInteger(year)||year<2000||year>2100)return {};
 return {start:`${year}-${String(month).padStart(2,'0')}-01`,end:`${year}-${String(month).padStart(2,'0')}-${new Date(year,month,0).getDate()}`};
}
/** Fast path only for explicit fields; unknown language still goes to the model. */
export function parseQuickIntent(text,{awaiting,accounts=[],draft={}}={}){
 const s=fold(text),intent={};
 const format=requestedFormat(text);if(format)intent.format=format;
 if(/tum hesap/.test(s))intent.scope='all';else if(/secili hesap/.test(s))intent.scope='selected';else if(/cari ekrani|tek hesap/.test(s))intent.scope='cari';
 const named=accounts.filter(a=>s.includes(fold(a.name)));if(named.length){intent.accountIds=named.map(a=>a.id);if(!intent.scope&&!draft.scope)intent.scope=named.length===1?'cari':'selected';}
 if(/satis ve alis|alis ve satis|satislarla alis/.test(s)||awaiting==='direction'&&/her ikisi|ikisi de/.test(s))intent.direction='both';else if(/\bsatis\b/.test(s))intent.direction='satis';else if(/\balis\b/.test(s))intent.direction='alis';
 if(/\bcari(?:si\w*)?\b|ekstre/.test(s)&&!intent.direction&&!draft.direction)intent.direction='both';
 if(awaiting==='format'&&/^(ikisi de|her ikisi|hepsi)$/.test(s))intent.format='both';
 if(/tahsilat/.test(s))intent.withCollections=!/haric|olmasin|istemiyorum|dahil etme/.test(s);
 if(awaiting==='collections'&&/^(evet|dahil|olsun|hayir|haric|olmasin)[.! ]*$/.test(s))intent.withCollections=/evet|dahil|olsun/.test(s)&&!s.includes('olmasin');
 if(/hesaplar ayri|ayri sayfa/.test(s))intent.layout='separate';
 const numbered=s.match(/\b(1[0-2]|0?[1-9])\s*\.?\s*ay(?:da|in|i|a)?\b/);
 const spoken=Object.entries(ordinals).find(([name])=>new RegExp('\\b'+name+'\\s+ay').test(s));
 const namedMonth=months.findIndex(m=>new RegExp('\\b'+m+'(?:de|da|ki)?\\b').test(s))+1;
 const month=numbered?Number(numbered[1]):spoken?spoken[1]:namedMonth;
 const year=Number(s.match(/\b20\d{2}\b/)?.[0])||null;
 if(month)intent.month=month;if(year)intent.year=year;
 if(month||(year&&draft.month))Object.assign(intent,monthRange(month||draft.month,year||draft.year||2026));
 const customer=s.match(/(?:^|\s)([\p{L}\d][\p{L}\d .&'-]*?)\s+(?:musterisinin|musterisi|excelini|ekstresini|carisini|raporunu|fotografini|gorselini)/u);
 if(customer){let name=customer[1].replace(/^.*(?:hesaplarda|hesaplarinda|hesabinda|hesabindaki|ayda|ayinda|ayi|ay|eylul|ekim|kasim|aralik|ocak|subat|mart|nisan|mayis|haziran|temmuz|agustos)\s+/,'').replace(/\b20\d{2}\b/g,'').replace(/^(?:kanka\s+|bana\s+)+/,'').replace(/\s+(?:adli kisinin|adli kisi|isimli kisinin|adli|isimli)$/,'').trim();if(name&&!/^(bana|onun|bu|o|secilen)$/.test(name))intent.customer=name;}
 const customerFallback=awaiting==='customer'&&!Object.keys(intent).length;
 if(customerFallback)intent.customer=text.trim();
 if(awaiting==='accounts'&&/^(hepsi|tum hesaplar|tumunu)$/.test(s))intent.accountIds=accounts.map(a=>a.id);
 const simpleAnswer=!!awaiting&&(intent[awaiting]!==undefined||awaiting==='collections'&&typeof intent.withCollections==='boolean'||awaiting==='accounts'&&intent.accountIds?.length||awaiting==='period'&&(month||year));
 const completeCommand=!!intent.customer&&!!(intent.scope||intent.accountIds?.length)&&(month||intent.start);
 return {intent,handled:!!(simpleAnswer||completeCommand)&&!customerFallback&&!s.includes('degil')};
}
export function nextQuestion(draft){
 if(!draft.scope)return {key:'scope',text:'Hangi ekrandaki raporu hazırlayayım?',choices:[['Seçili Hesaplar',{scope:'selected'}],['Tüm Hesaplar',{scope:'all'}],['Cari',{scope:'cari'}]]};
 if(draft.scope!=='all'&&!draft.accountIds?.length)return {key:'accounts',text:'Hangi hesapları kullanayım? Aşağıdan seçebilir veya adlarını söyleyebilirsin.'};
 if(!draft.customer)return {key:'customer',text:'Hangi müşteri için hazırlayayım? Adını veya VKN’sini söyle.'};
 if(!draft.start||!draft.end)return {key:'period',text:'Hangi ay için hazırlayayım?'};
 if(!draft.direction)return {key:'direction',text:'Satışlar mı, alışlar mı, her ikisi mi?',choices:[['Satış',{direction:'satis'}],['Alış',{direction:'alis'}],['Her ikisi',{direction:'both'}]]};
 if(typeof draft.withCollections!=='boolean')return {key:'collections',text:'Tahsilatları da ekleyeyim mi?',choices:[['Dahil et',{withCollections:true}],['Hariç tut',{withCollections:false}]]};
 return null;
}
