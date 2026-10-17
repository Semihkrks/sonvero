import {parseBusinessCommand,parseBusinessCorrection,parseBusinessBatch,businessConfirmation} from '../lib/assistant-actions.js';
import {matchSpokenAccounts} from '../lib/assistant-intent.js';
import {istanbulDate,Decimal} from '../lib/money.js';
import {findAssistantCustomers,findAssistantCollections,readAssistantSummary} from './assistant-ledger.js';
import {addCollection,updateCollection,deleteCollection} from './tahsilat-manager.js';

const fold=value=>String(value||'').toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i').replace(/[’']/g,'').trim();
const isMutation=action=>['collection','update_collection','cancel_collection'].includes(action);
const money=value=>{const [whole,cents]=new Decimal(String(value)).toFixed(2).split('.');return whole.replace(/\B(?=(\d{3})+(?!\d))/g,'.')+','+cents+' TL';};

/** Volatile session context; each real scoped mutation needs its own confirmation. */
export function createBusinessAssistant({accounts,message,choices,run,isCurrent=()=>true,
 findCustomers=findAssistantCustomers,findCollections=findAssistantCollections,readSummary=readAssistantSummary,
 save=addCollection,update=updateCollection,cancel=deleteCollection,navigate=route=>{window.location.hash='#'+route;}}){
 let plan=null,generation=0,queue=[],memory=null,lastRecord=null;
 const current=(value,version=generation)=>isCurrent()&&plan===value&&version===generation;
 function buttons(items){
  const captured=plan,version=generation;choices.replaceChildren();
  for(const [label,callback]of items){const b=document.createElement('button');b.type='button';b.className='sv-choice';b.textContent=label;
   b.onclick=()=>{if(current(captured,version)&&captured?.phase!=='saving')return run(callback);};choices.append(b);}
 }
 function remember({accountIds,customer,period}={}){
  const ids=(accountIds||[]).filter(id=>accounts.some(a=>a.id===id));if(ids.length)memory={accountIds:ids,customer:customer||null,period:period||null};
 }
 function resolveAccount(command){
  if(command.accountIds?.length)return accounts.filter(a=>command.accountIds.includes(a.id));
  if(command.account)return matchSpokenAccounts(command.account,accounts);
  if(command.referLast&&lastRecord)return accounts.filter(a=>a.id===lastRecord.account_id);
  return accounts.filter(a=>memory?.accountIds?.includes(a.id));
 }
 function start(command,{draft={}}={}){
  const found=resolveAccount(command),explicit=!!(command.explicitAccount||command.accountIds?.length||command.account);
  plan={...command,account:found.length===1?found[0]:null,accountIds:found.map(a=>a.id),phase:'start',attempted:false};generation++;
  if(command.action==='summary'){
   plan.accountIds=command.scope==='all'?accounts.map(a=>a.id):found.length?found.map(a=>a.id):explicit?[]:(draft.accountIds||accounts.map(a=>a.id)).filter(id=>accounts.some(a=>a.id===id));
   if(command.customer)plan.customerQuery=command.customer;
   else if(!explicit&&memory?.customer&&command.scope!=='all'&&!command.allCustomers)plan.selected=memory.customer;
  }else if(command.referLast&&lastRecord&&found.length===1&&found[0].id===lastRecord.account_id){plan.recordId=lastRecord.id;plan.customer=lastRecord.customer_name;plan.selected={name:lastRecord.customer_name,tax:lastRecord.customer_tax_no||'',key:lastRecord.customer_key};}
  else if(!command.customer&&!explicit&&memory?.customer){plan.customer=memory.customer.name;plan.selected=memory.customer;}
  if(command.action==='balance')plan.selected=null;
 }
 async function advance(){
  const p=plan;if(!p)return;
  if(p.action==='summary'){await summarize(p);return;}
  if(!p.account){p.phase='account';message('Hangi hesapta işlem yapayım? Hesap adını söyle veya seç.');buttons(accounts.map(a=>[a.name,async()=>{p.account=a;p.accountIds=[a.id];p.selected=null;p.recordId=null;await advance();}]));return;}
  if(!p.customer){p.phase='customer';message(p.account.name+' hesabındaki müşteri adını veya VKN’sini söyle.');choices.replaceChildren();return;}
  if(p.invalidField){p.phase=p.invalidField;message(p.invalidField==='amount'?'Yeni tutarı anlayamadım. “65 bin” veya “65.000,50” diye tekrar söyle.':'Yeni tarih geçersiz. “Bugün”, “dün” veya yıl-ay-gün biçiminde tekrar söyle.');choices.replaceChildren();return;}
  if(p.action==='collection'&&!p.amount){p.phase='amount';message('Tahsilat tutarı kaç lira olsun? “65 bin” veya “65.000,50” diyebilirsin.');choices.replaceChildren();return;}
  if(p.action==='collection'&&!p.date){p.phase='date';message('Hangi tarihe kaydedeyim? “Bugün”, “dün” veya yıl-ay-gün biçiminde tarih söyle.');buttons([['Bugün',async()=>{p.date=istanbulDate();await advance();}]]);return;}
  if(!p.selected){
   const version=generation;p.phase='search';choices.replaceChildren();const found=await findCustomers(p.account.id,p.customer);
   if(!current(p,version))return;
   if(!found.length){p.customer=null;message('Bu hesapta eşleşen müşteri bulunamadı. Müşteri adını veya VKN’yi yeniden söyle.');await advance();return;}
   if(found.length>1){p.phase='choose_customer';p.candidates=found;message(p.account.name+' hesabında '+found.length+' eşleşme var. Sıra numarasını veya VKN’yi söyle.');buttons(found.map((c,i)=>[(i+1)+'. '+c.name+' · '+(c.tax||'VKN yok'),async()=>{p.selected=c;await advance();}]));return;}
   p.selected=found[0];
  }
  if(p.action==='select_customer'){
   remember({accountIds:[p.account.id],customer:p.selected});plan=null;choices.replaceChildren();message(p.account.name+' hesabındaki '+p.selected.name+' müşterisini seçtim. “Buna 2 bin daha ekle” gibi komutlarda bu müşteriden devam edeceğim.');return;
  }
  if(p.action==='balance'){
   const c=p.selected;remember({accountIds:[p.account.id],customer:c});plan=null;choices.replaceChildren();
   message(p.account.name+' · '+c.name+': arşivdeki TL bakiyesi '+money(c.balance)+'.'+(Number(c.excluded)?' '+c.excluded+' hareket tutar veya para birimi nedeniyle dahil değil.':'')+' Bu bilgi kayıtlı geçmişe dayanır.');return;
  }
  if(p.action!=='collection'&&!p.record){await selectCollection(p);return;}
  if(p.action==='update_collection'&&!p.amount&&!p.date){p.phase='edit';message('Bu tahsilatın tutarını veya tarihini nasıl değiştireyim? “65 bin olsun” ya da “düne yaz” diyebilirsin.');choices.replaceChildren();return;}
  await preview(p);
 }
 async function selectCollection(p){
  const version=generation;p.phase='search';choices.replaceChildren();let found=await findCollections({accountId:p.account.id,customer:p.selected,start:p.period?.start,end:p.period?.end});
  if(!current(p,version))return;
  found=found.filter(r=>r.account_id===p.account.id&&r.id&&!r.cancelled_at&&Number.isInteger(r.version));if(p.recordId)found=found.filter(r=>r.id===p.recordId);
  if(!found.length){message('Bu hesap ve müşteri için işlem yapılabilecek tahsilat bulunamadı. Kayıt değiştirilmiş veya iptal edilmiş olabilir.');clearPlan();return;}
  if(found.length>1){p.phase='choose_record';p.candidates=found;message('Hangi tahsilat? Tarih ve tutarı kontrol edip sıra numarasını söyle.');buttons(found.map((r,i)=>[(i+1)+'. '+r.date+' · '+money(r.amount)+' · '+r.customer_name,async()=>{p.record=r;await advance();}]));return;}
  p.record=found[0];await advance();
 }
 async function summarize(p){
  if(p.selected&&!p.selected.tax&&!p.selected.customer_tax_no&&!p.selected.key&&!p.selected.customer_key){p.customerQuery=p.selected.name;p.selected=null;}
  if(!p.accountIds?.length){p.phase='account';message('Özeti hangi hesaptan alayım?');buttons(accounts.map(a=>[a.name,async()=>{p.account=a;p.accountIds=[a.id];await summarize(p);}]));return;}
  if(p.customerQuery&&!p.selected){
   if(p.accountIds.length!==1){message('Müşteri özeti için tek hesap seçelim.');p.accountIds=[];await summarize(p);return;}
   const version=generation;p.phase='search';choices.replaceChildren();const found=await findCustomers(p.accountIds[0],p.customerQuery);
   if(!current(p,version))return;
   if(found.length!==1){p.phase='summary_customer';p.candidates=found;message(found.length?'Hangi müşteri? Sıra numarasını veya VKN’yi söyle.':'Müşteri bulunamadı. Adını veya VKN’sini yeniden söyle.');buttons(found.map((c,i)=>[(i+1)+'. '+c.name,async()=>{p.selected=c;await summarize(p);}]));return;}p.selected=found[0];
  }
  const version=generation;p.phase='reading';choices.replaceChildren();
  const result=await readSummary({accountIds:p.accountIds,metric:p.metric,start:p.period?.start||null,end:p.period?.end||null,customer:p.selected||null,limit:p.limit||5});
  if(!current(p,version))return;
  remember({accountIds:p.accountIds,customer:p.selected,period:p.period});plan=null;
  const names=p.accountIds.map(id=>accounts.find(a=>a.id===id)?.name).join(', '),period=p.period?p.period.start+' – '+p.period.end:'Kayıtlı tüm dönem';let text=names+(p.selected?' · '+p.selected.name:'')+' · '+period+'. ';
  if(p.metric==='debtors')text+=result.rows.length?result.rows.map((r,i)=>(i+1)+'. '+r.name+' · '+(accounts.find(a=>a.id===r.accountId)?.name||'')+': '+money(r.balance)).join('; '):'Pozitif bakiyeli müşteri bulunamadı.';
  else if(p.metric==='sales_collections')text+='Satış '+money(result.totals.sales)+' eksi tahsilat '+money(result.totals.collections)+' = '+money(result.totals.salesCollections)+'.';
  else if(p.metric==='net')text+='Satış '+money(result.totals.sales)+', alış '+money(result.totals.purchases)+', tahsilat '+money(result.totals.collections)+'. Dönem neti '+money(result.totals.net)+'.';
  else text+=({collections:'Tahsilat',sales:'Satış',purchases:'Alış'}[p.metric]||'Toplam')+' toplamı '+money(result.totals[p.metric])+'.';
  if(result.excluded)text+=' '+(result.excludedScope==='account_history'?'Bu kapsamın kayıtlı geçmişinde ':'Seçilen dönemde ')+result.excluded+' hareket para birimi veya tutar nedeniyle hariç.';
  message(text+' '+(result.completeness?.note||(result.complete?'Uygulamada kayıtlı tahsilatlara göre.':'Arşivdeki kayıtlara göre; geçmişin tamlığı doğrulanmamıştır.')));
 }
 async function preview(p){
  if(p.record)p.selected={name:p.record.customer_name,tax:p.record.customer_tax_no||'',key:p.record.customer_key};
  choices.replaceChildren();p.phase='confirm';const c=p.selected,amount=p.amount||p.record?.amount,date=p.date||p.record?.date;
  const prefix=queue.length?'Sırada '+(queue.length+1)+' işlem var. ':'';
  const recordNote=p.record?' · Kayıt '+p.record.id+' · Mevcut '+money(p.record.amount)+' / '+p.record.date:'';
  const operation=p.action==='cancel_collection'?'Bu tahsilatı iptal edeceğim':p.action==='update_collection'?'Tahsilatı '+money(amount)+' / '+date+' olarak düzelteceğim':money(amount)+' tahsilat · '+date;
  message(prefix+p.account.name+' hesabı · '+c.name+' · '+(c.tax||'VKN yok')+recordNote+'. '+operation+'. İşlem için “onaylıyorum”, vazgeçmek için “iptal” de.');
  buttons([[p.action==='cancel_collection'?'Tahsilat iptalini onayla':p.action==='update_collection'?'Düzeltmeyi onayla':'Tahsilatı onayla',confirm],['Taslağı iptal et',async()=>{clearPlan();message('Bekleyen taslağı ve sıradaki işlemleri iptal ettim. Tamamlanan kayıtlar duruyor.');}]]);
 }
 async function confirm(){
  const p=plan;if(!p||p.phase!=='confirm'||!isMutation(p.action))return;p.phase='saving';choices.replaceChildren();p.attempted=true;
  try{
   if(!p.payload)p.payload=p.action==='collection'?{account_id:p.account.id,customer_key:p.selected.customer_key||p.selected.key||(p.selected.tax||p.selected.name).toLowerCase().trim(),customer_name:p.selected.name,customer_tax_no:p.selected.tax||'',amount:p.amount,date:p.date,description:'SonAI ile sesli komut',type:'Tahsilat'}:
    p.action==='update_collection'?{version:p.record.version,amount:p.amount||p.record.amount,date:p.date||p.record.date,type:p.record.type||'Tahsilat',description:p.record.description||'',reason:'SonAI ile onaylanan tahsilat düzeltmesi'}:{version:p.record.version,reason:'SonAI ile onaylanan tahsilat iptali'};
   const result=p.action==='collection'?await save(p.payload):p.action==='update_collection'?await update(p.record.id,p.account.id,p.payload):await cancel(p.record.id,p.account.id,p.payload);
   if(!result?.id)throw Object.assign(new Error('Kaydın sonucu doğrulanamadı.'),{uncertain:true});if(!current(p))return;
   lastRecord={...(p.record||{}),...p.payload,...result,account_id:p.account.id};remember({accountIds:[p.account.id],customer:p.selected});
   const operation=p.action==='cancel_collection'?'iptal edildi':p.action==='update_collection'?'düzeltildi':'kaydedildi';message((p.action==='cancel_collection'?money(p.record.amount):money(p.payload.amount))+' tahsilat '+p.account.name+' / '+p.selected.name+' için '+operation+'.');
   window.dispatchEvent(new CustomEvent('collectionsChanged',{detail:{accountId:p.account.id}}));plan=null;
   if(queue.length){const next=queue.shift();start(next);try{await advance();}catch(error){if(isCurrent())message('Önceki tahsilat tamamlandı. Sıradaki işlem hazırlanamadı: '+error.message);}}
  }catch(error){
   if(!current(p))return;p.phase='confirm';p.uncertain=error.uncertain!==false;
   if(error.code==='40001'&&p.record){p.recordId=p.record.id;p.record=null;p.payload=null;p.attempted=false;message('Tahsilat başka bir yerde değişmiş. Güncel kaydı yeniden okuyup onayına sunuyorum.');await advance();return;}
   if(error.uncertain===false){p.attempted=false;p.payload=null;}
   message(error.message+' Aynı işlemi kontrol etmek için tekrar onaylayabilirsin.');buttons([['Aynı kaydı kontrol et',confirm],['Bekleyenleri durdur',async()=>{clearPlan();message('Bekleyen işlemler durduruldu. Sonucu belirsiz kaydı Cari ekranından kontrol et.');}]]);
  }
 }
 function clearPlan(){generation++;plan=null;queue=[];choices.replaceChildren();}
 function reset(){clearPlan();memory=null;lastRecord=null;}
 async function correct(patch){
  const p=plan;if(!p)return false;
  if(p.attempted){message('Bu işlemin sonucu henüz doğrulanmadı. Tutarı veya hesabı değiştirmeden aynı işlemi tekrar onaylayalım.');return true;}
  if(p.action==='cancel_collection'){message('İptal taslağını kapatıp düzeltme isteğini söyleyebilirsin.');return true;}
  if(patch.accountIds||patch.accountReference){
   if(p.action==='update_collection'){message('Kaydedilmiş tahsilatın hesabı taşınamaz. Önce doğru kaydı iptal edip yeni hesaba ayrı bir tahsilat ekleyebilirsin.');return true;}
   const ids=patch.accountReference==='other'?accounts.filter(a=>a.id!==p.account?.id).map(a=>a.id):patch.accountIds;p.account=ids?.length===1?accounts.find(a=>a.id===ids[0]):null;p.accountIds=p.account?[p.account.id]:[];p.selected=null;p.record=null;
  }
  if(patch.customer){p.customer=patch.customer;p.selected=null;p.record=null;}
  for(const key of ['amount','date'])if(Object.hasOwn(patch,key)){p[key]=patch[key];p.invalidField=patch[key]?null:key;}generation++;p.payload=null;await advance();return true;
 }
 function selectCandidate(text,candidates){
  const s=fold(text).replace(/[.!?]/g,'').replace(/^kanka\s+/,'').replace(/\s+(?:olsun|sec)$/,'');let index=['ilki','ikincisi','ucuncusu','dorduncusu','besincisi'].indexOf(s);
  if(index<0)index=['birinci','ikinci','ucuncu','dorduncu','besinci'].indexOf(s);if(/^\d+$/.test(s)&&s.length<3)index=Number(s)-1;if(index>=0)return candidates[index];
  const found=candidates.filter(c=>fold(c.name||c.customer_name)===s||c.tax&&c.tax===s||c.customer_tax_no&&c.customer_tax_no===s||c.id===s);return found.length===1?found[0]:null;
 }
 async function handle(text,{draft={},remote={}}={}){
  if(plan?.phase==='saving')return true;const confirmation=businessConfirmation(text);
  if(plan&&confirmation==='cancel'){const attempted=plan.attempted;clearPlan();message(attempted?'Bekleyen işlemler durduruldu. Sonucu belirsiz kaydı Cari ekranından kontrol et.':'Taslak ve sıradaki işlemler iptal edildi.');return true;}
  if(plan?.phase==='confirm'&&confirmation==='confirm'){await confirm();return true;}
  const patch=parseBusinessCorrection(text,{accounts});if(patch&&plan&&isMutation(plan.action))return correct(patch);
  if(patch&&!plan&&lastRecord){
   if(patch.accountIds||patch.accountReference||patch.customer){message('Kaydedilmiş tahsilatın hesabı veya müşterisi taşınamaz. İptal edip yeni bir kayıt oluşturabilirsin.');return true;}
   start({action:'update_collection',referLast:true,...patch});await advance();return true;
  }
  const parserDraft=memory?{...draft,accountIds:memory.accountIds,customer:memory.customer?.name}:draft;
  const batch=parseBusinessBatch(text,{accounts,draft:parserDraft,remote}),command=batch?.[0]||parseBusinessCommand(text,{accounts,draft:parserDraft,remote});
  if(command?.useContext&&!memory&&draft.customer){command.customer=draft.customer;command.accountIds=(draft.accountIds||[]).filter(id=>accounts.some(a=>a.id===id));}
  if(command?.action==='select_customer'&&!command.explicitAccount&&!command.accountIds?.length&&!memory)command.accountIds=(draft.accountIds||[]).filter(id=>accounts.some(a=>a.id===id));
  if(command?.action==='summary'&&!command.period&&/^(?:kanka\s+)?(?:peki|onun|bu musterinin|ayni musterinin)\b/.test(fold(text)))command.period=memory?.period||null;
  if(command?.action==='summary'&&(!/^(?:kanka\s+)?(?:peki|onun|bu musterinin|ayni musterinin)\b/.test(fold(text))||command.metric==='debtors'))command.allCustomers=!command.customer;
  if(command?.action==='navigate'){clearPlan();navigate(command.route);return true;}
  if(command){
   if(plan?.phase==='confirm'&&isMutation(plan.action)){message('Önce mevcut taslağı onayla, düzelt veya iptal et.');return true;}
   if(batch&&batch.length>10){message('Bir seferde en fazla 10 tahsilat isteği verebilirsin.');return true;}
   queue=batch?batch.slice(1):[];start(command,{draft});await advance();return true;
  }
  if(!plan)return false;const p=plan;
  if(p.phase==='account'){const found=matchSpokenAccounts(text,accounts);if(found.length===1){p.account=found[0];p.accountIds=[found[0].id];}}
  else if(p.phase==='customer'){p.customer=text.trim();p.selected=null;}
  else if(p.phase==='amount'||p.phase==='edit'){const value=parseBusinessCorrection(text+' olsun',{accounts})||parseBusinessCommand(text+' tahsilat ekle',{accounts,draft});if(value){if(value.amount){p.amount=value.amount;p.invalidField=null;}if(value.date){p.date=value.date;p.invalidField=null;}}}
  else if(p.phase==='date'){p.date=parseBusinessCommand(text+' tahsilat ekle',{accounts,draft})?.date;if(p.date)p.invalidField=null;}
  else if(['choose_customer','choose_record','summary_customer'].includes(p.phase)){
   const candidate=selectCandidate(text,p.candidates||[]);if(!candidate){if(p.phase==='summary_customer'&&!p.candidates?.length){p.customerQuery=text.trim();await summarize(p);}else message('Listedeki sıra numarasını, tam adı veya VKN’yi söyle.');return true;}
   if(p.phase==='choose_record')p.record=candidate;else p.selected=candidate;
  }else if(p.phase==='confirm'){message('İşlem için “onaylıyorum”, değişiklik için yeni tutar veya tarihi, vazgeçmek için “iptal” de.');return true;}
  await advance();return true;
 }
 return {handle,reset,remember,getMemory:()=>memory?{accountIds:[...memory.accountIds],customer:memory.customer,period:memory.period}:null,
  getContext:()=>plan?{action:plan.action,phase:plan.phase,account:plan.account?.name,customer:plan.customer,amount:plan.amount,date:plan.date,queued:queue.length}:null};
}
