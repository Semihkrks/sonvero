import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { createPortal } from 'react-dom';
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowDownLeft, ArrowUpRight, ArrowRight, Check, ChevronLeft, ChevronRight, FilePlus2, FileText, History, Info, LoaderCircle, Moon, Plus, RefreshCw, Search, ShieldCheck, Sun, Upload, Wallet, X, Pencil, CircleX, Building2 } from 'lucide-react';
import { getSupabase } from '../lib/supabase.js';
import { getActiveAccount, getAllAccounts } from '../services/account-manager.js';
import { addCollection, updateCollection, deleteCollection, collectionHistory, CollectionCommandError } from '../services/tahsilat-manager.js';
import { parseTurkishAmount, istanbulDate, Decimal } from '../lib/money.js';
import { showToast } from '../components/toast.js';
import { registerCacheReset } from '../router.js';

const client = new QueryClient({defaultOptions:{queries:{staleTime:30000,retry:1,refetchOnWindowFocus:false},mutations:{retry:false}}});
registerCacheReset(()=>{client.cancelQueries();client.clear();});
type Row = { id:string; account_id:string; customer_key:string;customer_name:string; customer_tax_no:string;date:string;description:string;type:string;amount:string;debit:string;credit:string;source:string;version:number };
type OperationMetadata = {id:string;account_id:string;status:string;created_at:string;updated_at:string};
type Ledger = {rows:Row[];totals:{count:number;debit:string;credit:string;balance:string};opening:string;excluded:number;lastSync:string|null;complete:boolean};
const money = (value:string|number) => new Intl.NumberFormat('tr-TR',{style:'currency',currency:'TRY'}).format(Number(value));
const date = (value:string|null) => value ? new Intl.DateTimeFormat('tr-TR',{timeZone:'Europe/Istanbul',dateStyle:'medium'}).format(new Date(value)) : 'Henüz yok';
const statusLabels:Record<string,string>={succeeded:'Tamamlandı',failed:'Kontrol gerekli',unknown:'Sonuç doğrulanıyor',processing:'İşleniyor',pending:'Bekliyor',running:'Çalışıyor',done:'Tamamlandı'};
async function rpc<T>(name:string,args:Record<string,unknown>={},signal?:AbortSignal):Promise<T> {
  const request=getSupabase().rpc(name,args);
  const {data,error}=await (signal?request.abortSignal(signal):request);
  if(error)throw new Error(['PGRST202','42883','42703'].includes(error.code)?'Güvenli veri katmanı kurulumu bekleniyor. Veritabanı geçişlerini uygulayın.':error.message);
  return data as T;
}
function useLedger(search='',start='',end='',offset=0) {
  const account=getActiveAccount();
  return useQuery({queryKey:['ledger',account?.id,search,start,end,offset],enabled:!!account?.id,
    queryFn:({signal})=>rpc<Ledger>('ledger_page',{p_account_id:account?.id,p_search:search,p_start:start||null,p_end:end||null,p_offset:offset,p_limit:50},signal)});
}
function ErrorBox({error}:{error:unknown}) { return <div className="sv-error" role="alert">{error instanceof Error?error.message:'İşlem tamamlanamadı.'}</div>; }
function Notice({children}:{children:ReactNode}) {return <div className="sv-notice"><Info size={18}/><div>{children}</div></div>;}
function Empty({title='Henüz kayıt yok',children}:{title?:string;children?:ReactNode}) {return <div className="sv-empty"><FileText size={32}/><h3>{title}</h3><div>{children}</div></div>;}
function Status({value}:{value:string}) {return <span className={'sv-status '+value}>{statusLabels[value]||value}</span>;}
function Loading(){return <div className="sv-loading" role="status"><LoaderCircle size={24}/> Veriler yükleniyor…</div>;}
function Header({eyebrow,title,description,children}:{eyebrow:string;title:string;description:string;children?:ReactNode}) {
 return <div className="sv-heading"><div><div className="sv-eyebrow">{eyebrow}</div><h1 className="sv-title">{title}</h1><p className="sv-subtitle">{description}</p></div><div className="sv-actions">{children}</div></div>;
}
function NoAccount(){return <Empty title="Önce bir firma hesabı seçin"><a className="btn btn-primary" href="#/accounts">Hesapları aç</a></Empty>;}
function Metrics({data}:{data:Ledger}) {
 const items=[{label:'Satış / borç',value:data.totals.debit,icon:ArrowUpRight},{label:'Alım ve tahsilat / alacak',value:data.totals.credit,icon:ArrowDownLeft},{label:'Dönem bakiyesi',value:data.totals.balance,icon:Wallet}];
 return <div className="sv-grid">{items.map(item=><div className="sv-metric" key={item.label}><div className="sv-metric-label"><item.icon size={16}/>{item.label}</div><strong>{money(item.value)}</strong><small>Arşivdeki TL hareketleri</small></div>)}<div className="sv-metric"><div className="sv-metric-label"><FileText size={16}/>Hareket sayısı</div><strong>{data.totals.count.toLocaleString('tr-TR')}</strong><small>Filtreye uyan tüm kayıtlar</small></div></div>;
}
function SyncButton({start,end}:{start?:string;end?:string}) {
 const [busy,setBusy]=useState(false),lock=useRef(false),query=useQueryClient();
 return <button className="btn btn-secondary" disabled={busy} onClick={async()=>{
  if(lock.current)return;lock.current=true;setBusy(true);
  try {
   const today=istanbulDate();const count=await rpc<number>('queue_sync',{p_account_id:getActiveAccount()?.id,p_start:start||today.slice(0,7)+'-01',p_end:end||today});
   showToast(count+' tarama işi sıraya alındı.','success');
   const {error}=await getSupabase().functions.invoke('job-runner',{body:{}});
   if(error)showToast('Tarama sırada. Arka plan işleyicisi bağlantısı kontrol edilmeli.','warning');
   await query.invalidateQueries();
  }catch(error){showToast(error instanceof Error?error.message:'Senkronizasyon başlatılamadı','error');}
  finally{lock.current=false;setBusy(false);}
 }}><RefreshCw size={16}/>{busy?'Sıraya alınıyor…':'Nilvera’dan yenile'}</button>;
}
function Dashboard(){
 const account=getActiveAccount(),ledger=useLedger();
 const activity=useQuery({queryKey:['activity',account?.id],enabled:!!account?.id,queryFn:async()=>{
  const {data,error}=await getSupabase().from('operation_receipts').select('id,kind,status,created_at').eq('account_id',account!.id).order('created_at',{ascending:false}).limit(8);
  if(error)throw error;return data as {id:string;kind:string;status:string;created_at:string}[];
 }});
 if(!account)return <NoAccount/>;
 return <div className="sv-workspace"><Header eyebrow={account.name+' · '+(account.environment==='live'?'Canlı hesap':'Test hesabı')} title="İşlerinize genel bakış" description="Faturalarınız, cari hareketleriniz ve bekleyen işlemleriniz bir arada."><SyncButton/><a href="#/belgeler" className="btn btn-secondary"><FileText size={17}/>Belgeler</a><a href="#/create" className="btn btn-primary"><Plus size={17}/>Fatura oluştur</a></Header>
 {ledger.error?<ErrorBox error={ledger.error}/>:ledger.data?<Metrics data={ledger.data}/>:<Loading/>}
 <Notice>Özetler arşivde bulunan TL hareketlerini içerir. Son senkronizasyon: {date(ledger.data?.lastSync||null)}. Tam geçmişi almak için Cari ekranından tarih aralığı seçerek yenileyin.</Notice>
 <div className="sv-quicklinks"><a href="#/create" className="sv-quicklink"><FilePlus2/><div><strong>Yeni fatura</strong><small>Müşteriyi seçin, düzenleyin ve gönderin.</small></div><ArrowRight size={16}/></a><a href="#/cari" className="sv-quicklink"><Wallet/><div><strong>Cari ve tahsilat</strong><small>Hareketleri inceleyin, tahsilat kaydedin.</small></div><ArrowRight size={16}/></a><a href="#/toplu-tahsilat" className="sv-quicklink"><Upload/><div><strong>Dekont yükle</strong><small>PDF ve Excel dosyalarını kontrol edin.</small></div><ArrowRight size={16}/></a></div>
 <section className="sv-section"><div className="sv-section-head"><h2>Son işlemler</h2><a href="#/settings">Tüm işlem durumları <ArrowRight size={14}/></a></div>
 {activity.error?<ErrorBox error={activity.error}/>:activity.isPending?<Loading/>:activity.data?.length?<div className="sv-table-wrap"><table className="sv-table"><thead><tr><th>İŞLEM</th><th>TARİH</th><th>DURUM</th></tr></thead><tbody>{activity.data.map(item=><tr key={item.id}><td>{item.kind==='collection'?'Tahsilat işlemi':'Belge işlemi'}<small className="sv-hide-mobile" style={{display:'block',color:'var(--text-muted)',marginTop:5}}>{item.id.slice(0,8)}</small></td><td>{date(item.created_at)}</td><td><Status value={item.status}/></td></tr>)}</tbody></table></div>:<Empty title="İşlem geçmişiniz burada görünecek">Yeni kayıtlar ve belge işlemleri sonuçlarıyla birlikte listelenir.</Empty>}</section></div>;
}
function Modal({title,children,onClose}:{title:string;children:ReactNode;onClose:()=>void}){
 const ref=useRef<HTMLDivElement>(null),closeRef=useRef(onClose);closeRef.current=onClose;
 useEffect(()=>{
  const previous=document.activeElement as HTMLElement|null;const dialog=ref.current!;
  (dialog.querySelector('input,button,select,textarea') as HTMLElement)?.focus();
  const handler=(event:KeyboardEvent)=>{
   if([...document.querySelectorAll('[role="dialog"]')].at(-1)!==dialog)return;
   if(event.key==='Escape'){event.preventDefault();closeRef.current();}
   if(event.key==='Tab'){
    const items=[...dialog.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href]')];
    if(!items.length)return;const first=items[0],last=items[items.length-1];
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
    if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
   }
  };document.addEventListener('keydown',handler);
  return()=>{document.removeEventListener('keydown',handler);previous?.focus();};
 },[]);
 return createPortal(<div className="modal-overlay"><div className="modal modal-lg" role="dialog" aria-modal="true" aria-label={title} ref={ref}><div className="modal-header"><h2>{title}</h2><button className="modal-close" onClick={onClose} aria-label="Kapat"><X size={20}/></button></div><div className="modal-body">{children}</div></div></div>,document.body);
}
const collectionSchema=z.object({customer_name:z.string().trim().min(2,'Müşteri adı gerekli'),customer_tax_no:z.string().regex(/^(?:\d{10,11})?$/,'10 haneli VKN veya 11 haneli TCKN girin'),date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/,'Tarih gerekli'),
 amount:z.string().refine(value=>{try{return new Decimal(parseTurkishAmount(value)).gt(0);}catch{return false;}},'Geçerli tutar girin. Örnek: 1.234,56'),description:z.string().max(1000,'En fazla 1000 karakter')});
type CollectionInput=z.infer<typeof collectionSchema>;
function CollectionForm({row,onClose,initial,accountId}:{row:Row|null;onClose:()=>void;initial?:{customer_name:string;customer_tax_no:string};accountId?:string}){
 const account=getAllAccounts().find(item=>item.id===(accountId||row?.account_id))||getActiveAccount()!,query=useQueryClient(),lock=useRef(false),[error,setError]=useState<unknown>(null);
 const draftKey='sonvera:draft:collection:'+account.id+':'+(row?.id||('new'+(initial?.customer_tax_no?':'+initial.customer_tax_no:'')));
 const [recovered]=useState<{values?:CollectionInput;baseVersion?:number;uncertain?:boolean}>(()=>{try{const saved=JSON.parse(sessionStorage.getItem(draftKey)||'{}');if(!saved||typeof saved!=='object'||Array.isArray(saved))return {};const values=saved.values;const valid=values&&['customer_name','customer_tax_no','date','amount','description'].every(key=>typeof values[key]==='string');return {values:valid?values:undefined,baseVersion:Number.isInteger(saved.baseVersion)?saved.baseVersion:undefined,uncertain:valid&&saved.uncertain===true};}catch{return {};}});
 const uncertain=useRef(!!recovered.uncertain),baseVersion=useRef(recovered.baseVersion??row?.version);
 const form=useForm<CollectionInput>({resolver:zodResolver(collectionSchema),defaultValues:recovered.values||{customer_name:row?.customer_name||initial?.customer_name||'',customer_tax_no:row?.customer_tax_no||initial?.customer_tax_no||'',date:row?.date||istanbulDate(),amount:row?Number(row.amount).toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2}):'',description:row?.description||''}});
 const persist=()=>{try{sessionStorage.setItem(draftKey,JSON.stringify({values:form.getValues(),baseVersion:baseVersion.current,uncertain:uncertain.current}));}catch{}};
 useEffect(()=>{const subscription=form.watch(()=>persist());return()=>subscription.unsubscribe();},[form,draftKey]);
 const close=()=>{if(lock.current)return;if(!uncertain.current)sessionStorage.removeItem(draftKey);onClose();};
 const submit=form.handleSubmit(async values=>{
  if(lock.current)return;lock.current=true;setError(null);
  try{
   const expectedAccount=accountId||row?.account_id;
   if(!account || (expectedAccount&&account.id!==expectedAccount) || !getAllAccounts().some(item=>item.id===account.id))throw new Error('İşlemin firma hesabına erişilemiyor. Formu kapatıp firma hesabını yeniden seçin.');
   if(!row&&!values.customer_tax_no)throw new Error('Yeni tahsilat için VKN / TCKN gerekli.');
   const record={...values,amount:parseTurkishAmount(values.amount),type:'Tahsilat'};
   uncertain.current=navigator.onLine;persist();
   if(row)await updateCollection(row.id,account.id,{...record,version:baseVersion.current});
   else await addCollection({...record,account_id:account.id,customer_key:values.customer_tax_no});
   uncertain.current=false;sessionStorage.removeItem(draftKey);
   showToast(row?'Tahsilat güncellendi.':'Tahsilat kaydedildi.','success');
   onClose();void query.invalidateQueries({queryKey:['ledger',account.id]});void query.invalidateQueries({queryKey:['activity',account.id]});void query.invalidateQueries({queryKey:['customer-balances']});
  }catch(error){if(error instanceof CollectionCommandError)uncertain.current=error.uncertain;persist();setError(error);}finally{lock.current=false;}
 });
 return <Modal title={row?'Tahsilatı düzelt':'Tahsilat kaydet'} onClose={close}>
 <form className="sv-form" onSubmit={submit} noValidate>
 <Notice><Building2 size={14}/> {account.name} · TL tahsilat</Notice>
 {uncertain.current&&<Notice>Önceki isteğin sonucu doğrulanamadı. Bilgileri değiştirmeden Kaydet ile mevcut sonucu kontrol edin; aynı işlem tekrar oluşturulmaz.</Notice>}
 {Boolean(error)&&<ErrorBox error={error}/>}
 <fieldset disabled={form.formState.isSubmitting||uncertain.current} style={{border:0,padding:0,margin:0,minWidth:0}}><div className="sv-form-grid">
 {(['customer_name','customer_tax_no','date','amount'] as const).map(name=><label className="sv-field" key={name}>{({customer_name:'Müşteri adı',customer_tax_no:'VKN / TCKN',date:'Tahsilat tarihi',amount:'Tutar (TL)'})[name]}
 <input {...form.register(name)} type={name==='date'?'date':'text'} inputMode={name==='amount'?'decimal':name==='customer_tax_no'?'numeric':undefined} readOnly={!!row&&name.startsWith('customer_')} aria-invalid={!!form.formState.errors[name]} aria-describedby={name+'-error'}/>
 {form.formState.errors[name]&&<span id={name+'-error'} className="sv-field-error">{form.formState.errors[name]?.message}</span>}</label>)}
 </div><label className="sv-field" style={{marginTop:16}}>Açıklama<textarea {...form.register('description')} rows={3}/></label></fieldset>
 <div className="sv-actions"><button className="btn btn-secondary" type="button" disabled={form.formState.isSubmitting} onClick={close}>Vazgeç</button><button className="btn btn-primary" type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting?<><LoaderCircle size={16}/>Kaydediliyor…</>:<><Check size={16}/>Kaydet</>}</button></div>
 </form></Modal>;
}
function HistoryPanel({row,onClose}:{row:Row;onClose:()=>void}){
 const history=useQuery({queryKey:['collection-history',row.account_id,row.id],queryFn:()=>collectionHistory(row.id,row.account_id)});
 return <Modal title="Tahsilat işlem geçmişi" onClose={onClose}>{history.error?<ErrorBox error={history.error}/>:history.isPending?<Loading/>:<div className="sv-form">{history.data?.map((item:any)=><div className="sv-notice" key={item.id}><History size={16}/><div><strong>{({create:'Oluşturuldu',update:'Düzeltildi',cancel:'İptal edildi'} as Record<string,string>)[item.action]}</strong><p>{date(item.created_at)} · {item.reason||'Yeni tahsilat'}</p><p>{item.before_value?money(item.before_value.amount)+' → ':''}{money(item.after_value.amount)}</p></div></div>)}</div>}</Modal>;
}
function CancelPanel({row,onClose}:{row:Row;onClose:()=>void}){
 const [reason,setReason]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState<unknown>(null),lock=useRef(false),query=useQueryClient();
 return <Modal title="Tahsilatı iptal et" onClose={()=>{if(!busy)onClose();}}><form className="sv-form" onSubmit={async event=>{
  event.preventDefault();if(lock.current||!reason.trim())return;lock.current=true;setBusy(true);
  try{await deleteCollection(row.id,row.account_id,{version:row.version,reason});onClose();void query.invalidateQueries({queryKey:['ledger',row.account_id]});void query.invalidateQueries({queryKey:['cancelled-collections',row.account_id]});void query.invalidateQueries({queryKey:['customer-balances']});showToast('Tahsilat iptal edildi; geçmişi korundu.','success');}
  catch(error){setError(error);}finally{lock.current=false;setBusy(false);}
 }}><Notice>{row.customer_name} · {money(row.amount)}. Kayıt bakiyeden çıkarılacak, geçmişi korunacak.</Notice>{Boolean(error)&&<ErrorBox error={error}/>}<label className="sv-field">İptal gerekçesi<textarea required value={reason} onChange={e=>setReason(e.target.value)} disabled={busy}/></label><button className="btn btn-danger" disabled={busy||!reason.trim()}>{busy?'İptal ediliyor…':'Tahsilatı iptal et'}</button></form></Modal>;
}
function CancelledCollections({accountId,onClose}:{accountId:string;onClose:()=>void}){
 const [offset,setOffset]=useState(0),[selected,setSelected]=useState<Row|null>(null);
 const query=useQuery({queryKey:['cancelled-collections',accountId,offset],queryFn:async({signal})=>{
  const {data,error,count}=await getSupabase().from('customer_collections').select('*',{count:'exact'}).eq('account_id',accountId).not('cancelled_at','is',null).order('cancelled_at',{ascending:false}).order('id').range(offset,offset+49).abortSignal(signal);
  if(error)throw error;return {rows:data as Row[],count:count||0};
 }});
 return <><Modal title="İptal edilen tahsilatlar" onClose={onClose}><Notice>Bu kayıtlar bakiyeye katılmaz. Eski değerleri ve iptal gerekçesini işlem geçmişinden inceleyebilirsiniz.</Notice>
 {query.error?<ErrorBox error={query.error}/>:query.isPending?<Loading/>:query.data.rows.length?<div className="sv-history">{query.data.rows.map(row=><button key={row.id} className="sv-history-row" onClick={()=>setSelected(row)}><span><strong>{row.customer_name}</strong><small>{date(row.date)} · {money(row.amount)}</small></span><History size={18}/></button>)}</div>:<Empty title="İptal edilen tahsilat yok"/>}
 <div className="sv-pagination"><span>{query.data?.count||0} kayıt</span><div className="sv-actions"><button className="btn btn-secondary" aria-label="Önceki iptaller" disabled={!offset} onClick={()=>setOffset(Math.max(0,offset-50))}><ChevronLeft size={16}/></button><button className="btn btn-secondary" aria-label="Sonraki iptaller" disabled={offset+50>=(query.data?.count||0)} onClick={()=>setOffset(offset+50)}><ChevronRight size={16}/></button></div></div>
 </Modal>{selected&&<HistoryPanel row={selected} onClose={()=>setSelected(null)}/>}</>;
}
type Coverage={bounded:boolean;scanned:boolean;fresh:boolean;checked:number;expected:number;periods:{month:string;type:string;lastSync:string|null;scanned:boolean;fresh:boolean}[]};
function ArchiveCoverage({accountId,start,end}:{accountId:string;start:string;end:string}){
 const coverage=useQuery({queryKey:['archive-coverage',accountId,start,end],enabled:!!start&&!!end&&start<=end,queryFn:({signal})=>rpc<Coverage>('archive_coverage',{p_account_id:accountId,p_start:start,p_end:end},signal),refetchInterval:60000});
 if(!start||!end)return <Notice>Tarama kapsamını görmek için başlangıç ve bitiş tarihlerini seçin. Tarihsiz görünüm tüm geçmişin alındığı anlamına gelmez.</Notice>;
 if(start>end)return <ErrorBox error={new Error('Başlangıç tarihi bitişten sonra olamaz.')}/>;
 if(coverage.error)return <ErrorBox error={coverage.error}/>;
 if(!coverage.data)return <Loading/>;
 const labels:Record<string,string>={efatura_sale:'Giden e-Fatura',efatura_purchase:'Gelen e-Fatura',earsiv:'Giden e-Arşiv',earsiv_gib:'GİB e-Arşiv'};
 return <details className="sv-section sv-coverage"><summary><ShieldCheck size={17}/><span>{coverage.data.fresh?'Seçilen dönem yakın zamanda tarandı':coverage.data.scanned?'Dönem tarandı; yenilenmesi gerekiyor':'Seçilen dönemde eksik taramalar var'}<small>{coverage.data.checked} / {coverage.data.expected} belge türü ve ay kontrol edildi</small></span></summary><div className="sv-section-body"><p>Tarama bilgisi sağlayıcıdan alınan listeyi kapsar; açılış bakiyesinin veya tüm ticari geçmişin doğrulandığı anlamına gelmez.</p><div className="sv-history">{coverage.data.periods.map(period=><div className="sv-history-row" key={period.month+period.type}><span><strong>{labels[period.type]||period.type}</strong><small>{period.month.slice(0,7)} · Son tarama: {date(period.lastSync)}</small></span><span className={'sv-status '+(period.fresh?'succeeded':period.scanned?'pending':'failed')}>{period.fresh?'Güncel':period.scanned?'Yenileme gerekli':'Taranmadı'}</span></div>)}</div></div></details>;
}
function LedgerPage(){
 const account=getActiveAccount(),[search,setSearch]=useState(''),[debounced,setDebounced]=useState(''),[start,setStart]=useState(''),[end,setEnd]=useState(''),[offset,setOffset]=useState(0);
 const [editor,setEditor]=useState<Row|null|undefined>(undefined),[history,setHistory]=useState<Row|null>(null),[cancel,setCancel]=useState<Row|null>(null),[cancelled,setCancelled]=useState(false);
 useEffect(()=>{const timer=setTimeout(()=>{setDebounced(search);setOffset(0);},250);return()=>clearTimeout(timer);},[search]);
 const ledger=useLedger(debounced,start,end,offset);
 if(!account)return <NoAccount/>;
 return <div className="sv-workspace"><Header eyebrow={account.name} title="Cari ve tahsilat" description="Hareketleri inceleyin. Tahsilatlarınızı geçmişi korunarak yönetin."><a className="btn btn-secondary" href="#/cari-ozet">Müşteri bakiyeleri</a><a className="btn btn-secondary" href="#/cari-musteriler">Müşteri detayları</a><SyncButton start={start} end={end}/><button className="btn btn-primary" onClick={()=>setEditor(null)}><Plus size={17}/>Tahsilat kaydet</button></Header>
 {ledger.data&&<Metrics data={ledger.data}/>}
 <Notice>Bu defter arşivdeki kayıtları gösterir; eksiksiz geçmiş garantisi vermez. Son senkronizasyon: {date(ledger.data?.lastSync||null)}. {ledger.data?.excluded?ledger.data.excluded+' dövizli veya tutarı doğrulanamayan belge TL toplamından ayrı tutuldu.':''}</Notice>
 <ArchiveCoverage accountId={account.id} start={start} end={end}/><section className="sv-section"><div className="sv-filters"><label className="sv-field"><span><Search size={13}/> Müşteri, VKN veya açıklama</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Müşteri ara…"/></label><label className="sv-field">Başlangıç<input type="date" value={start} onChange={e=>{setStart(e.target.value);setOffset(0);}}/></label><label className="sv-field">Bitiş<input type="date" value={end} onChange={e=>{setEnd(e.target.value);setOffset(0);}}/></label><a className="btn btn-secondary" href="#/toplu-tahsilat"><Upload size={16}/>Dekont yükle</a></div>
 {ledger.error?<ErrorBox error={ledger.error}/>:ledger.isPending?<Loading/>:!ledger.data?.rows.length?<Empty title="Bu filtrede hareket yok">Tarih aralığını değiştirin veya Nilvera’dan yenileyin.</Empty>:<div className="sv-table-wrap"><table className="sv-table sv-ledger-table"><thead><tr><th>TARİH / MÜŞTERİ</th><th className="sv-hide-mobile">AÇIKLAMA</th><th className="sv-number">BORÇ</th><th className="sv-number">ALACAK</th><th>İŞLEM</th></tr></thead><tbody>{ledger.data.rows.map(row=><tr key={row.source+row.id}><td><strong>{row.customer_name}</strong><small style={{display:'block',color:'var(--text-muted)',marginTop:6}}>{date(row.date)} · {row.type}</small></td><td className="sv-hide-mobile">{row.description}</td><td className="sv-number">{money(row.debit)}</td><td className="sv-number">{money(row.credit)}</td><td>{row.source==='collection'?<div className="sv-actions"><button className="btn btn-sm btn-secondary" aria-label={row.customer_name+' tahsilatını düzelt'} onClick={()=>setEditor(row)}><Pencil size={14}/></button><button className="btn btn-sm btn-secondary" aria-label="İşlem geçmişi" onClick={()=>setHistory(row)}><History size={14}/></button><button className="btn btn-sm btn-secondary" aria-label="Tahsilatı iptal et" onClick={()=>setCancel(row)}><CircleX size={14}/></button></div>:<span className="sv-status">Fatura</span>}</td></tr>)}</tbody></table></div>}
 <div className="sv-pagination"><span>{ledger.data?.totals.count||0} hareket · Dönem başı: {money(ledger.data?.opening||'0')}</span><div className="sv-actions"><button className="btn btn-secondary" disabled={offset===0} onClick={()=>setOffset(Math.max(0,offset-50))} aria-label="Önceki sayfa"><ChevronLeft size={16}/></button><span>{Math.floor(offset/50)+1}</span><button className="btn btn-secondary" disabled={offset+50>=(ledger.data?.totals.count||0)} onClick={()=>setOffset(offset+50)} aria-label="Sonraki sayfa"><ChevronRight size={16}/></button></div></div></section>
 {editor!==undefined&&<CollectionForm row={editor} onClose={()=>setEditor(undefined)}/>} {history&&<HistoryPanel row={history} onClose={()=>setHistory(null)}/>} {cancel&&<CancelPanel row={cancel} onClose={()=>setCancel(null)}/>}
 <button className="btn btn-secondary" onClick={()=>setCancelled(true)}><History size={16}/>İptal edilen tahsilatlar</button>
 {cancelled&&<CancelledCollections accountId={account.id} onClose={()=>setCancelled(false)}/>}
 </div>;
}
function LedgerExportButton({accountIds,name,start,end,customerKey=null,search=''}:{accountIds:string[];name:string;start:string;end:string;customerKey?:string|null;search?:string}){
 const [busy,setBusy]=useState(false),[count,setCount]=useState(0),controller=useRef<AbortController|null>(null);
 const identity=JSON.stringify({accountIds,name,start,end,customerKey,search});
 useEffect(()=>()=>{controller.current?.abort();},[identity]);
 return <div className="sv-actions"><button className="btn btn-secondary" disabled={busy||!accountIds.length||!!(start&&end&&start>end)} onClick={async()=>{
  if(controller.current)return;const abort=new AbortController();controller.current=abort;setBusy(true);setCount(0);
  try{const {exportLedger}=await import('../services/ledger-export.js');const result=await exportLedger({accountIds:[...accountIds],name,start,end,customerKey,search,signal:abort.signal,onProgress:(rows:number)=>setCount(rows)});if(!abort.signal.aborted){if(result.success)showToast(result.count+' hareket Excel dosyasına aktarıldı.','success');else throw new Error(result.error);}}
  catch(error){if(!abort.signal.aborted)showToast(error instanceof Error?error.message:'Dosya hazırlanamadı.','error');}
  finally{if(controller.current===abort){controller.current=null;setBusy(false);}}
 }}>{busy?count.toLocaleString('tr-TR')+' hareket hazırlanıyor…':'Excel indir'}</button>{busy&&<button className="btn btn-secondary" onClick={()=>controller.current?.abort()}>İptal</button>}</div>;
}
type CustomerBalance={account_id:string;account_name:string;customer_key:string;customer_name:string;customer_tax_no:string;movement_count:number;opening:string;debit:string;credit:string;balance:string;excluded:number};
function CustomerLedgerDetail({customer,start,end,onClose}:{customer:CustomerBalance;start:string;end:string;onClose:()=>void}){
 const [offset,setOffset]=useState(0),[history,setHistory]=useState<Row|null>(null),[editor,setEditor]=useState<Row|null|undefined>(undefined),[cancel,setCancel]=useState<Row|null>(null);
 const ledger=useQuery({queryKey:['ledger',customer.account_id,'customer',customer.customer_key,start,end,offset],queryFn:({signal})=>rpc<Ledger>('ledger_page',{p_account_id:customer.account_id,p_customer:customer.customer_key,p_start:start||null,p_end:end||null,p_offset:offset,p_limit:50},signal)});
 return <><Modal title={customer.customer_name} onClose={onClose}><Notice>{customer.account_name} · {customer.customer_tax_no||'VKN bilgisi yok'} · Yalnız TL hareketleri</Notice><div className="sv-actions"><LedgerExportButton accountIds={[customer.account_id]} name={customer.customer_name} start={start} end={end} customerKey={customer.customer_key}/><button className="btn btn-primary" onClick={()=>setEditor(null)}><Plus size={16}/>Tahsilat kaydet</button></div>{ledger.error?<ErrorBox error={ledger.error}/>:ledger.isPending?<Loading/>:<><div className="sv-grid"><div className="sv-metric"><span>Dönem başı</span><strong>{money(ledger.data.opening)}</strong></div><div className="sv-metric"><span>Dönem hareketleri</span><strong>{money(ledger.data.totals.balance)}</strong></div></div><div className="sv-history">{ledger.data.rows.map(row=><div className="sv-history-row" key={row.source+row.id}><span><strong>{row.type} · {date(row.date)}</strong><small>{row.description}</small><small>Borç: {money(row.debit)} · Alacak: {money(row.credit)}</small></span>{row.source==='collection'&&<div className="sv-actions"><button className="btn btn-sm btn-secondary" aria-label="Tahsilatı düzelt" onClick={()=>setEditor(row)}><Pencil size={16}/></button><button className="btn btn-sm btn-secondary" aria-label="İşlem geçmişi" onClick={()=>setHistory(row)}><History size={16}/></button><button className="btn btn-sm btn-secondary" aria-label="Tahsilatı iptal et" onClick={()=>setCancel(row)}><CircleX size={16}/></button></div>}</div>)}</div><div className="sv-pagination"><span>{ledger.data.totals.count} hareket</span><div className="sv-actions"><button className="btn btn-secondary" aria-label="Önceki hareketler" disabled={!offset} onClick={()=>setOffset(Math.max(0,offset-50))}><ChevronLeft size={16}/></button><button className="btn btn-secondary" aria-label="Sonraki hareketler" disabled={offset+50>=ledger.data.totals.count} onClick={()=>setOffset(offset+50)}><ChevronRight size={16}/></button></div></div></>}</Modal>{history&&<HistoryPanel row={history} onClose={()=>setHistory(null)}/>} {editor!==undefined&&<CollectionForm row={editor} accountId={customer.account_id} initial={customer} onClose={()=>setEditor(undefined)}/>} {cancel&&<CancelPanel row={cancel} onClose={()=>setCancel(null)}/>}</>;
}
function CustomerBalances(){
 const accounts=getAllAccounts(),[selected,setSelected]=useState<string[]>(()=>getActiveAccount()?[getActiveAccount()!.id]:[]);
 const [search,setSearch]=useState(''),[debounced,setDebounced]=useState(''),[start,setStart]=useState(''),[end,setEnd]=useState(''),[offset,setOffset]=useState(0),[customer,setCustomer]=useState<CustomerBalance|null>(null);
 useEffect(()=>{const timer=setTimeout(()=>{setDebounced(search);setOffset(0);},250);return()=>clearTimeout(timer);},[search]);
 const query=useQuery({queryKey:['customer-balances',[...selected].sort(),debounced,start,end,offset],enabled:!!selected.length&&(!start||!end||start<=end),queryFn:({signal})=>rpc<{rows:CustomerBalance[];count:number;debit:string;credit:string;balance:string}>('customer_ledger_page',{p_accounts:selected,p_search:debounced,p_start:start||null,p_end:end||null,p_offset:offset,p_limit:50},signal)});
 return <div className="sv-workspace"><Header eyebrow="Firma bazında cari" title="Müşteri bakiyeleri" description="Birden fazla firmanın müşterilerini, dönem başını ve hareketlerini birlikte inceleyin."><LedgerExportButton accountIds={selected} name={selected.length===1?accounts.find(a=>a.id===selected[0])?.name||'Firma':'Tüm Firmalar'} start={start} end={end} search={debounced}/><a className="btn btn-secondary" href="#/secili-hesaplar-cari">Ayrıntılı Excel işlemleri</a></Header><Notice>Aynı VKN farklı firmalarda ayrı gösterilir. Tutarlar arşiv kapsamındadır; eksik geçmişten tam bakiye sonucu çıkarılmaz.</Notice><section className="sv-section"><div className="sv-section-head"><h2>Firmalar</h2><div className="sv-actions"><button className="btn btn-secondary" onClick={()=>{setSelected(accounts.map(a=>a.id));setOffset(0);}}>Tümünü seç</button><button className="btn btn-secondary" onClick={()=>{setSelected([]);setOffset(0);}}>Temizle</button></div></div><div className="sv-account-choices">{accounts.map(account=><label key={account.id}><input type="checkbox" checked={selected.includes(account.id)} onChange={event=>{setSelected(current=>event.target.checked?[...current,account.id]:current.filter(id=>id!==account.id));setOffset(0);}}/><span>{account.name}</span></label>)}</div></section><section className="sv-section"><div className="sv-filters"><label className="sv-field">Müşteri veya VKN<input value={search} onChange={event=>setSearch(event.target.value)} placeholder="Müşteri ara…"/></label><label className="sv-field">Başlangıç<input type="date" value={start} onChange={event=>{setStart(event.target.value);setOffset(0);}}/></label><label className="sv-field">Bitiş<input type="date" value={end} onChange={event=>{setEnd(event.target.value);setOffset(0);}}/></label></div>{!selected.length?<Empty title="İncelemek istediğiniz firmaları seçin"/>:start&&end&&start>end?<ErrorBox error={new Error('Başlangıç tarihi bitişten sonra olamaz.')}/>:query.error?<ErrorBox error={query.error}/>:query.isPending?<Loading/>:<><div className="sv-section-body"><strong>{query.data.count} müşteri/firma · Dönem sonu: {money(query.data.balance)}</strong></div><div className="sv-customer-cards">{query.data.rows.map(row=><button className="sv-customer-card" key={row.account_id+row.customer_key} onClick={()=>setCustomer(row)}><span className="sv-eyebrow">{row.account_name}</span><strong>{row.customer_name}</strong><small>{row.customer_tax_no||'VKN bilgisi yok'} · {row.movement_count} hareket</small><span className="sv-customer-amount">{money(row.balance)}</span><small>Dönem başı: {money(row.opening)}</small><small>Borç: {money(row.debit)} · Alacak: {money(row.credit)}</small>{row.excluded>0&&<small>{row.excluded} dövizli veya doğrulanamayan kayıt toplam dışında</small>}<span>Hareketleri incele →</span></button>)}</div><div className="sv-pagination"><span>{Math.floor(offset/50)+1}. sayfa</span><div className="sv-actions"><button className="btn btn-secondary" aria-label="Önceki müşteriler" disabled={!offset} onClick={()=>setOffset(Math.max(0,offset-50))}><ChevronLeft size={16}/></button><button className="btn btn-secondary" aria-label="Sonraki müşteriler" disabled={offset+50>=query.data.count} onClick={()=>setOffset(offset+50)}><ChevronRight size={16}/></button></div></div></>}</section>{customer&&<CustomerLedgerDetail customer={customer} start={start} end={end} onClose={()=>setCustomer(null)}/>}</div>;
}
type BackupRecord={id:string;file_name:string;bytes:number;completed_at:string;restore_verified_at:string|null};
function BackupStatus(){
 const backups=useQuery({queryKey:['backup-history'],queryFn:async()=>{const {data,error}=await getSupabase().from('backup_history').select('id,file_name,bytes,completed_at,restore_verified_at').order('completed_at',{ascending:false}).limit(5);if(error)throw new Error('Yedek durumuna erişilemiyor. Yedek raporu migration ve bağlantısı kontrol edilmeli.');return data as BackupRecord[];},refetchInterval:60000});
 const latest=backups.data?.[0],old=latest?Date.now()-new Date(latest.completed_at).getTime()>48*60*60*1000:true;
 return <section className="sv-section"><div className="sv-section-head"><h2>Yerel şifreli yedek</h2><span className={'sv-status '+(old?'failed':'succeeded')}>{latest?old?'Yedek güncel değil':'Son yedek bildirildi':'Yedek bildirilmedi'}</span></div><div className="sv-section-body">{backups.error?<ErrorBox error={backups.error}/>:backups.isPending?<Loading/>:latest?<><p>Son başarılı yedek: {new Intl.DateTimeFormat('tr-TR',{timeZone:'Europe/Istanbul',dateStyle:'medium',timeStyle:'short'}).format(new Date(latest.completed_at))}</p><p>{latest.file_name} · {(latest.bytes/1048576).toFixed(1)} MB</p><p>{latest.restore_verified_at?'Geri yüklenen finansal kayıtlar eşleşti: '+date(latest.restore_verified_at):'Bu yedek için geri yükleme provası henüz kaydedilmedi.'}</p></>:<p>Yerel yedek aracı henüz sunucuya başarılı sonuç bildirmedi.</p>}<p className="sv-subtitle">Bilgisayar ve Windows oturumu açık olmalı. Buradaki bilgi yedek dosyasının buluta yüklendiği anlamına gelmez; şifreli dosya bilgisayarınızda saklanır.</p></div></section>;
}
function NotificationPreferences(){
 const supported=typeof Notification!=='undefined';
 const [permission,setPermission]=useState(supported?Notification.permission:'unsupported'),[busy,setBusy]=useState(false);
 return <section className="sv-section"><div className="sv-section-head"><h2>Fatura bildirimleri</h2></div><div className="sv-section-body"><p>{permission==='granted'?'Tarayıcı bildirimleri açık. Uygulama açıkken yeni belgeler kontrol edilir.':permission==='denied'?'Tarayıcı bildirimleri engellenmiş. İsterseniz tarayıcınızın site ayarlarından açabilirsiniz; uygulama içi bildirimler kullanılmaya devam eder.':permission==='unsupported'?'Bu tarayıcı sistem bildirimlerini desteklemiyor. Uygulama içi bildirimler kullanılabilir.':'Yeni belge uyarılarını tarayıcı bildirimi olarak almak için izin verebilirsiniz.'}</p>{permission==='default'&&<button className="btn btn-secondary" disabled={busy} onClick={async()=>{setBusy(true);try{setPermission(await Notification.requestPermission());}catch{showToast('Bildirim izni alınamadı. Uygulama içi bildirimler kullanılacak.','warning');}finally{setBusy(false);}}}>{busy?'İzin bekleniyor…':'Bildirimleri etkinleştir'}</button>}</div></section>;
}
function Settings(){
 const [theme,setTheme]=useState(localStorage.getItem('nilfatura_theme')||document.documentElement.dataset.theme||'light');
 const health=useQuery({queryKey:['health'],queryFn:()=>rpc<{databaseBytes:number;databaseLimitBytes:number;pendingJobs:number;failedJobs:number;unknownOperations:number;lastSync:string|null}>('system_health'),refetchInterval:60000});
 const jobs=useQuery({queryKey:['jobs'],queryFn:async()=>{const{data,error}=await getSupabase().from('background_jobs').select('id,kind,status,last_error,updated_at').in('status',['pending','running','failed']).order('updated_at',{ascending:false}).limit(20);if(error)throw error;return data;}});
 const [retrying,setRetrying]=useState<string|null>(null),[resolving,setResolving]=useState<string|null>(null);
 const operations=useQuery({queryKey:['unresolved-operations'],queryFn:async()=>{const {data,error}=await getSupabase().from('operation_receipts').select('id,account_id,status,created_at,updated_at').in('status',['unknown','processing']).order('created_at',{ascending:false}).limit(50);if(error)throw error;return data as OperationMetadata[];},refetchInterval:30000});
 async function retryJob(id:string){
  if(retrying)return;setRetrying(id);
  try{await rpc('retry_background_job',{p_job_id:id});await jobs.refetch();await health.refetch();showToast('İş yeniden kontrol sırasına alındı.','success');}
  catch(error){showToast(error instanceof Error?error.message:'İş yeniden kontrol edilemedi.','error');}finally{setRetrying(null);}
 }
 async function resolveOperation(id:string,status:'failed'|'succeeded'){
  if(resolving)return;
  const promptText=status==='failed'
   ?'Sağlayıcıda belgeyi kontrol ettiniz mi? Başarısız kapatmak aynı belge için yeni işlemi yeniden açar. Gerekçe yazın (en az 8 karakter):'
   :'Bu yol gönderim değildir. Sağlayıcıda işlemin gerçekten tamamlandığını doğruladıysanız gerekçe yazın (en az 8 karakter):';
  const note=window.prompt(promptText,'');
  if(note==null)return;
  if(note.trim().length<8){showToast('En az 8 karakterlik gerekçe gerekli.','warning');return;}
  setResolving(id);
  try{
   await rpc('resolve_nilvera_operation',{p_id:id,p_status:status,p_note:note.trim()});
   await operations.refetch();await jobs.refetch();await health.refetch();
   showToast(status==='failed'?'İşlem başarısız olarak kapatıldı. Gerekirse yeniden deneyebilirsiniz.':'İşlem elle tamamlandı olarak kapatıldı.','success');
  }catch(error){showToast(error instanceof Error?error.message:'İşlem kapatılamadı.','error');}
  finally{setResolving(null);}
 }
 const percentage=health.data?health.data.databaseBytes/health.data.databaseLimitBytes*100:0;
 return <div className="sv-workspace"><Header eyebrow="Çalışma alanı" title="Ayarlar ve sistem durumu" description="Görünümünüzü seçin, bekleyen işlemleri ve kapasiteyi takip edin."/>
 <section className="sv-section"><div className="sv-section-head"><h2>Görünüm</h2><Sun size={18}/></div><div className="sv-section-body sv-theme-options">{(['light','dark'] as const).map(value=><button key={value} className="btn btn-secondary" aria-pressed={theme===value} onClick={()=>{setTheme(value);localStorage.setItem('nilfatura_theme',value);document.documentElement.dataset.theme=value;}}>{value==='light'?<Sun size={18}/>:<Moon size={18}/>} {value==='light'?'Açık tema':'Koyu tema'}</button>)}</div></section>
 {health.error?<ErrorBox error={health.error}/>:health.isPending?<Loading/>:<><div className="sv-grid">{[{label:'Bekleyen işler',value:health.data.pendingJobs},{label:'Kontrol gereken işler',value:health.data.failedJobs},{label:'Sonucu belirsiz işlemler',value:health.data.unknownOperations},{label:'Firma hesapları',value:getAllAccounts().length}].map(item=><div className="sv-metric" key={item.label}><span className="sv-metric-label">{item.label}</span><strong>{item.value}</strong></div>)}</div><section className="sv-section"><div className="sv-section-head"><h2>Veritabanı kapasitesi</h2><span className={'sv-status '+(percentage>=85?'failed':'succeeded')}>%{percentage.toFixed(1)}</span></div><div className="sv-section-body"><p>{(health.data.databaseBytes/1048576).toFixed(1)} MB / 500 MB</p><progress className="sv-capacity" max={100} value={percentage}/><p className="sv-subtitle">{percentage>=85?'Arka plan taramaları kapasite nedeniyle durdurulur. Finansal kayıtlar otomatik silinmez.':percentage>=70?'Kapasite yüzde 70 üzerinde. Yedek ve saklama durumunu kontrol edin.':'Kapasite normal. Ücretli plana otomatik geçiş yapılmaz.'}</p></div></section></>}
 <NotificationPreferences/><BackupStatus/><Notice><ShieldCheck size={16}/> Finansal işlemler geçmişiyle saklanır. Nilvera anahtarları yalnızca sunucuda tutulur. Yerel yedekleme yönergesi proje içindeki dağıtım rehberindedir; ücretsiz plan otomatik yedek garantisi vermez.</Notice>
 <section className="sv-section"><div className="sv-section-head"><h2>Sonucu belirsiz işlemler</h2><span>{operations.data?.length||0}</span></div><div className="sv-section-body"><p>Bu işlemler otomatik yeniden gönderilmez. Sağlayıcıda kontrol ettikten sonra gönderim yollarını yalnız başarısız kapatabilirsiniz; elle başarı işaretlemek gönderimler için kapalıdır.</p>{operations.error?<ErrorBox error={operations.error}/>:operations.isPending?<Loading/>:operations.data?.length?<div className="sv-history">{operations.data.map(operation=><div className="sv-history-row" key={operation.id}><span><strong>{getAllAccounts().find(a=>a.id===operation.account_id)?.name||'Firma hesabı'}</strong><small>{operation.id}</small><small>{date(operation.created_at)}</small></span><div className="sv-actions"><Status value={operation.status}/><button className="btn btn-sm btn-secondary" disabled={!!resolving} onClick={()=>void resolveOperation(operation.id,'failed')}>{resolving===operation.id?'Kapatılıyor…':'Başarısız kapat'}</button></div></div>)}</div>:<p className="sv-subtitle">Belirsiz sonuçlu işlem bulunmuyor.</p>}</div></section>
 <section className="sv-section"><div className="sv-section-head"><h2>Bekleyen ve kontrol gereken işler</h2><button className="btn btn-secondary" onClick={()=>{void health.refetch();void jobs.refetch();}}><RefreshCw size={16}/>Yenile</button></div><div className="sv-section-body"><p className="sv-subtitle">Gönderim sonucu kesinleşmeyen işlemler (ör. bağlantı koptuysa) burada sağlayıcıdan teyit edilir; arşiv taramaları da burada sıraya girer. Başarıyla biten gönderimler listede kalmaz.</p></div>{jobs.error?<ErrorBox error={jobs.error}/>:jobs.data?.length?<div className="sv-table-wrap"><table className="sv-table"><thead><tr><th>İŞLEM</th><th>DURUM</th><th>SONUÇ</th></tr></thead><tbody>{jobs.data.map((job:any)=><tr key={job.id}><td>{job.kind==='sync'?'Nilvera arşiv taraması':'Gönderim sonucu teyidi'}</td><td><Status value={job.status}/></td><td>{job.last_error||(job.kind==='sync'?'Taramada sırada':'Sağlayıcıdan teyit bekleniyor')}{job.status==='failed'&&<button className="btn btn-sm btn-secondary" disabled={!!retrying} onClick={()=>void retryJob(job.id)}>{retrying===job.id?'Sıraya alınıyor…':'Tekrar kontrol et'}</button>}</td></tr>)}</tbody></table></div>:<Empty title="Bekleyen iş bulunmuyor"/>}</section></div>;
}
export function mountWorkspace(kind:'dashboard'|'ledger'|'settings'|'customers') {
 const page=document.createElement('div');const root=createRoot(page);
 root.render(<QueryClientProvider client={client}>{kind==='dashboard'?<Dashboard/>:kind==='ledger'?<LedgerPage/>:kind==='customers'?<CustomerBalances/>:<Settings/>}</QueryClientProvider>);
 return {page,cleanup:()=>root.unmount(),title:kind==='dashboard'?'Ana Sayfa':kind==='ledger'?'Cari ve Tahsilat':kind==='customers'?'Müşteri Bakiyeleri':'Ayarlar'};
}
