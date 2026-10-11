import {useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {QueryClient,QueryClientProvider,useQuery} from '@tanstack/react-query';
import {ChevronLeft,ChevronRight,FileText,RefreshCw,Search} from 'lucide-react';
import {getActiveAccount,getActiveAccountId,getAllAccounts,setActiveAccount} from '../services/account-manager.js';
import {callNilvera,retryRead} from '../lib/api-transport.js';
import {extractItems} from '../services/nilvera-fetcher.js';
import {istanbulDate} from '../lib/money.js';
import {downloadDocument,supportsDocumentFile} from '../services/document-files.js';
import {showToast} from '../components/toast.js';
import {escapeHtml} from '../lib/html.js';
import {registerCacheReset} from '../router.js';
const client=new QueryClient({defaultOptions:{queries:{retry:false,staleTime:30000,refetchOnWindowFocus:false}}});
registerCacheReset(()=>{void client.cancelQueries();client.clear();});
const kinds:Record<string,{label:string;path:string;legacy:string;incoming?:boolean;despatch?:boolean}>={
 despatchDraft:{label:'İrsaliye taslakları',path:'/edespatch/Draft',legacy:'/eirsaliye-olustur',despatch:true},
 outgoing:{label:'Giden e-Fatura',path:'/einvoice/Sale',legacy:'/outgoing'},
 incoming:{label:'Gelen e-Fatura',path:'/einvoice/Purchase',legacy:'/incoming',incoming:true},
 archive:{label:'e-Arşiv',path:'/earchive/Invoices',legacy:'/earsiv-faturalar'},
 gib:{label:'GİB e-Arşiv',path:'/earchive/Gib/Purchase',legacy:'/gib-earsiv',incoming:true},
 despatch:{label:'Giden irsaliye',path:'/edespatch/Sale',legacy:'/eirsaliye-giden',despatch:true},
 received:{label:'Gelen irsaliye',path:'/edespatch/Purchase',legacy:'/eirsaliye-gelen',incoming:true,despatch:true}
};
const sharedPaths:Record<string,string>={outgoing:'/einvoice/Sale',archive:'/earchive/Invoices',incoming:'/einvoice/Purchase',despatch:'/edespatch/Sale',received:'/edespatch/Purchase'};
const uuidPattern=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
type DocumentRow=Record<string,any>;
function shareLink(accountId:string,kind:string,uuid:string){return `${location.origin}${location.pathname}#/belge/${encodeURIComponent(accountId)}/${kind}/${encodeURIComponent(uuid)}`;}
async function copyShareLink(accountId:string,kind:string,uuid:string){
 const link=shareLink(accountId,kind,uuid);
 try{if(!navigator.clipboard?.writeText)throw new Error('clipboard');await navigator.clipboard.writeText(link);showToast('Bağlantı panoya kopyalandı.','success');}
 catch{showToast('Bağlantı kopyalanamadı. Elle kopyalayın: '+escapeHtml(link),'warning',10000);}
}
const DESPATCH_EDIT_CONTEXT_KEY='nilfatura_despatch_edit_context';
async function editDespatchDraft(accountId:string,uuid:string){
 if(getActiveAccountId()!==accountId){try{await setActiveAccount(accountId);}catch(error){showToast(switchBlocked(error)+' Taslak yanlış firmada açılmasın diye geçiş yapılmadı.','warning');return;}}
 try{sessionStorage.setItem(DESPATCH_EDIT_CONTEXT_KEY,JSON.stringify({accountId,uuid,source:'edespatch'}));}catch{showToast('Düzenleme bilgisi saklanamadı.','error');return;}
 location.hash='#/eirsaliye-olustur';
}
function switchBlocked(error:unknown){return escapeHtml(error instanceof Error?error.message:'Firma hesabı değiştirilemedi.');}
function text(value:unknown):string{return typeof value==='string'||typeof value==='number'?String(value):'';}
function party(row:DocumentRow,incoming?:boolean){return text(incoming?(row.SenderName||row.SupplierName||row.SellerSupplierInfo?.Name):(row.ReceiverName||row.CustomerName||row.CustomerInfo?.Name||row.BuyerCustomerInfo?.Name))||'Unvan belirtilmemiş';}
function number(row:DocumentRow){return text(row.InvoiceNumber||row.DespatchNumber||row.InvoiceSerieOrNumber)||'Numara belirtilmemiş';}
function amount(row:DocumentRow){const value=row.PayableAmount??row.TotalAmount;const currency=text(row.CurrencyCode)||'TRY';if(value==null||!Number.isFinite(Number(value)))return '—';try{return new Intl.NumberFormat('tr-TR',{style:'currency',currency}).format(Number(value));}catch{return String(value)+' '+currency;}}
function day(row:DocumentRow){const value=text(row.IssueDate||row.CreateDate||row.CreatedDate).slice(0,10);return /^\d{4}-\d{2}-\d{2}$/.test(value)?value.split('-').reverse().join('.'): '—';}
function DocumentFiles({account,kind,row,share}:{account:any;kind:string;row:DocumentRow;share?:boolean}){
 const pending=useRef<AbortController|null>(null),[busy,setBusy]=useState('');
 useEffect(()=>()=>pending.current?.abort(),[account.id,kind,row.UUID]);
 if(!supportsDocumentFile(kind)||!row.UUID)return null;
 async function download(format:string){
  if(pending.current)return;const controller=new AbortController();pending.current=controller;setBusy(format);
  try{await downloadDocument({account,kind,uuid:row.UUID,number:number(row),format,signal:controller.signal});}
  catch(error){if(!controller.signal.aborted)showToast(error instanceof Error?error.message:'Dosya indirilemedi.','error');}
  finally{if(pending.current===controller){pending.current=null;setBusy('');}}
 }
 return <div className="sv-actions"><button className="btn btn-sm btn-secondary" disabled={!!busy} onClick={()=>void download('pdf')}>{busy==='pdf'?'İndiriliyor…':'PDF indir'}</button><button className="btn btn-sm btn-secondary" disabled={!!busy} onClick={()=>void download('xml')}>{busy==='xml'?'İndiriliyor…':'XML indir'}</button>{busy&&<button className="btn btn-sm btn-secondary" onClick={()=>pending.current?.abort()}>İptal</button>}{share&&Object.hasOwn(sharedPaths,kind)&&<button className="btn btn-sm btn-secondary" onClick={()=>void copyShareLink(account.id,kind,row.UUID)}>Bağlantıyı kopyala</button>}</div>;
}
function Documents({initial}:{initial:string}){
 const account=getActiveAccount(),today=istanbulDate();
 const filterKey='sonvera:draft:document-filters:'+account?.id;
 const [saved]=useState(()=>{try{const value=JSON.parse(sessionStorage.getItem(filterKey)||'{}');return value&&typeof value==='object'?value:{};}catch{return {};}});
 const [kind,setKind]=useState<string>(Object.hasOwn(kinds,initial)?initial:Object.hasOwn(kinds,saved.kind||'')?saved.kind:'outgoing'),[start,setStart]=useState<string>(/^\d{4}-\d{2}-\d{2}$/.test(saved.start||'')?saved.start:today.slice(0,7)+'-01'),[end,setEnd]=useState<string>(/^\d{4}-\d{2}-\d{2}$/.test(saved.end||'')?saved.end:today),[page,setPage]=useState<number>(!initial&&Number.isInteger(saved.page)&&saved.page>0?saved.page:1),[search,setSearch]=useState('');
 useEffect(()=>{try{sessionStorage.setItem(filterKey,JSON.stringify({kind,start,end,page}));}catch{}},[filterKey,kind,start,end,page]);
 const config=kinds[kind];
 const rangeDays=(Date.parse(end)-Date.parse(start))/86400000;
 const valid=!!start&&!!end&&Number.isFinite(rangeDays)&&rangeDays>=0&&rangeDays<170;
 const query=useQuery({queryKey:['documents',account?.id,account?.environment,kind,start,end,page],enabled:!!account&&valid,queryFn:async({signal})=>{
  const response=await retryRead(()=>callNilvera(account,'GET',config.path,null,{StartDate:start,EndDate:end,Page:page,PageSize:50},{signal}),{signal});
  if(!response.success)throw new Error(response.error||'Belgeler yüklenemedi.');
  const data=response.data;const items=extractItems(data) as DocumentRow[];
  if(!Array.isArray(data)&&!['Content','Items','items'].some(key=>Array.isArray(data?.[key])))throw new Error('Belge listesi beklenen biçimde gelmedi. Ayrıntılı ekranı kullanın.');
  const totalPages=Number(data?.TotalPages);
  return {items,hasMore:Number.isFinite(totalPages)&&totalPages>0?page<totalPages:items.length===50};
 }});
 if(!account)return <div className="sv-empty"><h1>Önce bir firma hesabı seçin</h1><a href="#/accounts" className="btn btn-primary">Hesapları aç</a></div>;
 const rows=(query.data?.items||[]).filter(row=>(number(row)+' '+party(row,config.incoming)+' '+text(row.UUID)).toLocaleLowerCase('tr-TR').includes(search.toLocaleLowerCase('tr-TR')));
 return <main className="sv-workspace"><header className="sv-heading"><div><div className="sv-eyebrow">{account.name} · {account.environment==='live'?'Canlı':'Test'}</div><h1 className="sv-title">Belgeler</h1><p className="sv-subtitle">Faturalar ve irsaliyeler; her sayfada en fazla 50 kayıt.</p></div><div className="sv-actions"><a href={'#'+config.legacy} className="btn btn-secondary">{kind==='despatchDraft'?'İrsaliye oluştur':'Ayrıntılı işlemler'}</a><a href="#/create" className="btn btn-primary">Fatura oluştur</a></div></header>
 <section className="sv-section"><div className="sv-document-filters"><label>Belge türü<select value={kind} onChange={event=>{setKind(event.target.value);setPage(1);setSearch('');}}>{Object.entries(kinds).map(([key,value])=><option key={key} value={key}>{value.label}</option>)}</select></label><label>Başlangıç<input type="date" value={start} onChange={event=>{setStart(event.target.value);setPage(1);}}/></label><label>Bitiş<input type="date" value={end} onChange={event=>{setEnd(event.target.value);setPage(1);}}/></label><button className="btn btn-secondary" disabled={!valid||query.isFetching} onClick={()=>void query.refetch()}><RefreshCw size={16}/>{query.isFetching?'Yükleniyor…':'Yenile'}</button></div>
 {!valid&&<p className="sv-error" role="alert">Başlangıç ve bitiş tarihini, en fazla 170 günlük bir aralık olarak seçin.</p>}
 <div className="sv-document-search"><Search size={18}/><label>Bu sayfada ara<input type="search" value={search} onChange={event=>setSearch(event.target.value)} placeholder="Belge no, unvan veya UUID"/></label><small>Tüm geçmiş yerine yalnızca açık sayfanın kayıtlarında arar.</small></div>
 {query.error?<div className="sv-error" role="alert">{query.error.message}</div>:valid&&query.isPending?<div className="sv-loading" role="status">Belgeler yükleniyor…</div>:valid&&<><div className="sv-document-grid" aria-busy={query.isFetching}>{rows.map((row,index)=><article className="sv-document-card" key={text(row.UUID)||index}><FileText size={20}/><div><strong>{number(row)}</strong><p>{party(row,config.incoming)}</p><small>{day(row)} · {config.label}</small><details><summary>Belge bilgileri</summary><dl><dt>UUID</dt><dd>{text(row.UUID)||'—'}</dd><dt>Durum</dt><dd>{text(row.AnswerNote||row.InvoiceStatus?.Description||row.InvoiceStatus?.Code||row.DespatchStatus?.Code||row.Status)||'Belirtilmemiş'}</dd><dt>Vergi numarası</dt><dd>{text(config.incoming?row.SenderTaxNumber:row.ReceiverTaxNumber)||text(row.TaxNumber)||'—'}</dd></dl></details><DocumentFiles account={account} kind={kind} row={row} share/>{kind==='despatchDraft'&&text(row.UUID)&&<div className="sv-actions"><button className="btn btn-sm btn-primary" onClick={()=>void editDespatchDraft(account.id,text(row.UUID))}>Düzenle</button></div>}</div>{!config.despatch&&<strong className="sv-document-amount">{amount(row)}</strong>}</article>)}</div>{!rows.length&&<div className="sv-empty"><FileText/><h2>{search?'Bu sayfada eşleşme yok':'Bu aralıkta belge bulunamadı'}</h2></div>}<footer className="sv-document-pagination"><button className="btn btn-secondary" disabled={page===1||query.isFetching} onClick={()=>setPage(value=>value-1)}><ChevronLeft size={18}/>Önceki</button><span aria-live="polite">Sayfa {page} · {query.data?.items.length||0} kayıt</span><button className="btn btn-secondary" disabled={!query.data?.hasMore||query.isFetching} onClick={()=>setPage(value=>value+1)}>Sonraki<ChevronRight size={18}/></button></footer></>}
 </section><p className="sv-subtitle">{kind==='despatchDraft'?'Bu ekran kaydedilmiş irsaliye taslaklarını listeler. Düzenle ile taslak, irsaliye oluşturma ekranında açılır; oradan güncellenip kaydedilebilir veya gönderilebilir.':'Gönderim, yanıt ve toplu işlemler için Ayrıntılı işlemler ekranını açın. Dövizli belgeler kendi para birimiyle gösterilir.'}</p></main>;
}
export function mountDocuments(route='/belgeler'){
 const page=document.createElement('div'),root=createRoot(page);root.render(<QueryClientProvider client={client}><Documents initial={route.split('/')[2]||''}/></QueryClientProvider>);return {page,title:'Belgeler',cleanup:()=>root.unmount()};
}

function SharedDocument({route}:{route:string}){
 const [, ,accountId,kind,uuid]=route.split('/');
 const account=getAllAccounts().find(item=>item.id===accountId);
 const valid=Object.hasOwn(sharedPaths,kind||'')&&uuidPattern.test(uuid||'');
 const config=kinds[kind];
 const [ready,setReady]=useState(()=>!account||!valid||getActiveAccountId()===accountId);
 useEffect(()=>{
  if(ready)return;
  setActiveAccount(accountId).catch(error=>showToast(switchBlocked(error)+' Belge bağlantıdaki firma hesabından gösteriliyor.','warning')).finally(()=>setReady(true));
 },[]);
 async function openLegacy(){
  if(getActiveAccountId()!==accountId){try{await setActiveAccount(accountId);}catch(error){showToast(switchBlocked(error)+' Ayrıntılı ekran yanlış firmada açılmasın diye geçiş yapılmadı.','warning');return;}}
  location.hash='#'+config.legacy;
 }
 const query=useQuery({queryKey:['shared-document',accountId,account?.environment,kind,uuid],enabled:!!account&&valid&&ready,queryFn:async({signal})=>{
  const path=sharedPaths[kind]+'/'+uuid+'/Details';
  const response=await retryRead(()=>callNilvera(account,'GET',path,null,null,{signal}),{signal});
  if(!response.success)throw new Error(response.error||'Belge bilgisi alınamadı.');
  const raw=response.data;if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('Belge bilgisi beklenen biçimde gelmedi.');
  return {...raw,UUID:uuid} as DocumentRow;
 }});
 if(!account||!valid)return <div className="sv-empty"><h1>Belge bağlantısı açılamadı</h1><p>Bağlantı geçersiz veya bu firma hesabına erişiminiz bulunmuyor.</p><a className="btn btn-secondary" href="#/accounts">Hesaplar</a></div>;
 return <main className="sv-workspace"><header className="sv-heading"><div><div className="sv-eyebrow">{account.name} · {account.environment==='live'?'Canlı':'Test'}</div><h1 className="sv-title">Belge bağlantısı</h1><p className="sv-subtitle">{config.label} · Belge, bağlantıda belirtilen firma hesabından okunur.</p></div><div className="sv-actions"><button className="btn btn-secondary" onClick={()=>void openLegacy()}>Ayrıntılı işlemler</button></div></header><section className="sv-section sv-section-body">{query.error?<div className="sv-error" role="alert">{query.error.message}</div>:query.isPending?<div className="sv-loading" role="status">Belge yükleniyor…</div>:<><h2>{number(query.data!)}</h2><p>{party(query.data!,config.incoming)}</p><p>{day(query.data!)}{!config.despatch&&<> · {amount(query.data!)}</>}</p><p className="sv-subtitle" style={{overflowWrap:'anywhere'}}>{uuid}</p><DocumentFiles account={account} kind={kind} row={query.data!}/></>}</section><p className="sv-subtitle">Bu bağlantı belgeyi herkese açmaz; ilgili hesaba erişimi olan oturum gerekir.</p></main>;
}
export function mountSharedDocument(route:string){const page=document.createElement('div'),root=createRoot(page);root.render(<QueryClientProvider client={client}><SharedDocument route={route}/></QueryClientProvider>);return {page,title:'Belge bağlantısı',cleanup:()=>root.unmount()};}
