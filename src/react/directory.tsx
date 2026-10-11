import {useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {QueryClient,QueryClientProvider,useQuery} from '@tanstack/react-query';
import {Building2,Copy,LayoutTemplate,RefreshCw,Search,Tag,Users} from 'lucide-react';
import {getActiveAccount} from '../services/account-manager.js';
import {callNilvera,retryRead} from '../lib/api-transport.js';
import {registerCacheReset} from '../router.js';
import {showToast} from '../components/toast.js';
type Kind='company'|'customers'|'tags'|'templates';
type Item=Record<string,any>;
const client=new QueryClient({defaultOptions:{queries:{retry:false,staleTime:60000,refetchOnWindowFocus:false}}});
registerCacheReset(()=>{void client.cancelQueries();client.clear();});
const config={company:{title:'Firma bilgileri',description:'Seçili Nilvera hesabındaki resmi firma bilgileri.',path:'/general/Company',icon:Building2},customers:{title:'Müşteri arama',description:'GİB mükellef kaydında firma adı, VKN veya TCKN ile arayın.',path:'/general/GlobalCompany/Search/',icon:Users},tags:{title:'Etiketler',description:'Faturalarınızda kullanılan etiketler.',path:'/einvoice/Tags',icon:Tag},templates:{title:'Fatura şablonları',description:'Nilvera hesabınızda tanımlı belge şablonları.',path:'/einvoice/Templates',icon:LayoutTemplate}};
const string=(value:unknown)=>typeof value==='string'||typeof value==='number'?String(value):'';
function items(data:any):Item[]{const rows=Array.isArray(data)?data:data?.Content??data?.Items??data?.items;if(!Array.isArray(rows))throw new Error('Liste yanıtı beklenen biçimde gelmedi.');return rows.map(row=>typeof row==='string'?{Name:row}:row).filter(row=>row&&typeof row==='object');}
function boolean(value:unknown){return value===true?'Evet':value===false?'Hayır':'Belirtilmemiş';}
function Company({item}:{item:Item}){
 const fields=[['Unvan',item.Title||item.Name],['VKN / TCKN',item.TaxNumber||item.Identifier],['Vergi dairesi',item.TaxOffice],['Adres',item.Address],['İlçe',item.District],['Şehir',item.City],['Ülke',item.Country],['Telefon',item.Phone],['E-posta',item.Email],['Web sitesi',item.WebSite||item.Website],['e-Fatura mükellefi',boolean(item.IsEInvoiceTaxPayer)],['e-Arşiv mükellefi',boolean(item.IsEArchiveTaxPayer)],['e-İrsaliye mükellefi',boolean(item.IsEDespatchTaxPayer)]];
 return <dl className="sv-company-fields">{fields.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{string(value)||'—'}</dd></div>)}</dl>;
}
function Directory({kind}:{kind:Kind}){
 const account=getActiveAccount(),settings=config[kind],[input,setInput]=useState(''),[term,setTerm]=useState(''),[limit,setLimit]=useState(50);
 useEffect(()=>{const timer=setTimeout(()=>{setTerm(input.trim());setLimit(50);},350);return()=>clearTimeout(timer);},[input]);
 const invalidNumber=kind==='customers'&&/^\d+$/.test(term)&&![10,11].includes(term.length);
 const ready=!!account&&(kind!=='customers'||term.length>=3&&!invalidNumber);
 const query=useQuery({queryKey:['directory',account?.id,account?.environment,kind,kind==='customers'?term:''],enabled:ready,queryFn:async({signal})=>{
  const response=await retryRead(()=>callNilvera(account,'GET',settings.path+(kind==='customers'?encodeURIComponent(term):''),null,null,{signal}),{signal});
  if(!response.success)throw new Error(response.error||'Bilgiler alınamadı.');
  if(kind==='company'){if(!response.data||typeof response.data!=='object'||Array.isArray(response.data))throw new Error('Firma yanıtı beklenen biçimde gelmedi.');return {company:response.data,rows:[] as Item[]};}
  return {company:null,rows:items(response.data)};
 }});
 if(!account)return <div className="sv-empty"><h1>Önce bir firma hesabı seçin</h1><a href="#/accounts" className="btn btn-primary">Hesapları aç</a></div>;
 const rows=(query.data?.rows||[]).filter(row=>kind==='customers'||(string(row.Name||row.TagName||row.TemplateName)+' '+string(row.Description||row.Type)).toLocaleLowerCase('tr-TR').includes(term.toLocaleLowerCase('tr-TR')));
 return <main className="sv-workspace"><header className="sv-heading"><div><div className="sv-eyebrow">{account.name} · {account.environment==='live'?'Canlı':'Test'}</div><h1 className="sv-title"><settings.icon size={26}/> {settings.title}</h1><p className="sv-subtitle">{settings.description}</p></div><button className="btn btn-secondary" disabled={!ready||query.isFetching} onClick={()=>void query.refetch()}><RefreshCw size={16}/>{query.isFetching?'Yükleniyor…':'Yenile'}</button></header>
 <section className="sv-section">{kind!=='company'&&<div className="sv-document-search" style={{paddingTop:20}}><Search size={18}/><label htmlFor="directory-search">{kind==='customers'?'Firma adı veya VKN / TCKN':'Bu listede ara'}<input id="directory-search" type="search" value={input} maxLength={150} onChange={event=>setInput(event.target.value)} placeholder={kind==='customers'?'En az 3 harf veya tam vergi numarası':'Ad veya açıklama'}/></label></div>}
 {invalidNumber?<p className="sv-error" role="alert">VKN 10, TCKN 11 haneli olmalıdır.</p>:!ready?<div className="sv-empty">Aramaya başlamak için en az üç karakter girin.</div>:query.error?<div className="sv-error" role="alert">{query.error.message}</div>:query.isPending?<div className="sv-loading" role="status">Bilgiler yükleniyor…</div>:kind==='company'?<Company item={query.data!.company}/>:<><p className="sv-subtitle" style={{padding:'0 20px'}}>{rows.length} sonuç · {Math.min(rows.length,limit)} kayıt gösteriliyor{kind==='customers'?' · Sağlayıcının döndürdüğü sonuçlar':''}</p><div className="sv-customer-cards">{rows.slice(0,limit).map((row,index)=><article className="sv-directory-card" key={string(row.UUID||row.Id||row.Identifier)||index}>
 <strong>{string(row.Title||row.Name||row.TagName||row.TemplateName)||'Ad belirtilmemiş'}</strong>
 {kind==='customers'?<><p>VKN / TCKN: {string(row.Identifier||row.TaxNumber)||'—'}</p>{row.Alias&&<p className="sv-directory-alias">{string(row.Alias)}</p>}<div className="sv-actions">{row.IsEInvoiceTaxPayer===true&&<span className="sv-status succeeded">e-Fatura</span>}{row.IsEArchiveTaxPayer===true&&<span className="sv-status">e-Arşiv</span>}{row.IsEDespatchTaxPayer===true&&<span className="sv-status">e-İrsaliye</span>}</div>{/^(?:\d{10}|\d{11})$/.test(string(row.Identifier||row.TaxNumber))&&<button className="btn btn-sm btn-secondary" onClick={async()=>{try{await navigator.clipboard.writeText(string(row.Identifier||row.TaxNumber));showToast('Vergi numarası kopyalandı.','success');}catch{showToast('Kopyalanamadı. Vergi numarasını seçerek kopyalayın.','warning');}}}><Copy size={14}/>Vergi numarasını kopyala</button>}</>:<><p>{string(row.Description||row.Type)}</p>{row.IsDefault===true&&<span className="sv-status succeeded">Varsayılan</span>}</>}
 </article>)}</div>{!rows.length&&<div className="sv-empty">Eşleşen kayıt bulunamadı.</div>}{rows.length>limit&&<div className="sv-section-body"><button className="btn btn-secondary" onClick={()=>setLimit(value=>value+50)}>50 kayıt daha göster</button></div>}</>}
 </section></main>;
}
export function mountDirectory(kind:Kind){const page=document.createElement('div'),root=createRoot(page);root.render(<QueryClientProvider client={client}><Directory kind={kind}/></QueryClientProvider>);return {page,title:config[kind].title,cleanup:()=>root.unmount()};}
