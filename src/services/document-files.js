import {callNilvera,retryRead} from '../lib/api-transport.js';
import {saveExportFile} from './export-delivery.js';
const paths={outgoing:'/einvoice/Sale',incoming:'/einvoice/Purchase',archive:'/earchive/Invoices',despatch:'/edespatch/Sale',received:'/edespatch/Purchase',despatchDraft:'/edespatch/Draft'};
export function supportsDocumentFile(kind){return Object.hasOwn(paths,kind);}
function contentOf(data){if(typeof data==='string')return data;if(Array.isArray(data)&&data.length===1)return contentOf(data[0]);if(data&&typeof data==='object')return contentOf(data.File??data.String??data.Content??data.content);throw new Error('Belge içeriği beklenen biçimde gelmedi.');}
export function documentBlob(data,format){
 if(!['pdf','xml'].includes(format))throw new Error('Geçersiz dosya türü.');
 let content=contentOf(data).trim();
 if(content.length>40000000)throw new Error('Belge indirme sınırını aşıyor. Ayrıntılı işlemler ekranını kullanın.');
 if(content.startsWith('data:')){const match=content.match(/^data:[^,]*;base64,([\s\S]+)$/);if(!match)throw new Error('Belge kodlaması desteklenmiyor.');content=match[1];}
 let bytes;
 if(format==='xml'&&content.startsWith('<'))bytes=new TextEncoder().encode(content);
 else{const encoded=content.replace(/\s/g,'');if(!/^[A-Za-z0-9+/]*={0,2}$/.test(encoded)||encoded.length%4!==0)throw new Error('Belge kodlaması geçersiz.');let binary;try{binary=atob(encoded);}catch{throw new Error('Belge çözümlenemedi.');}bytes=Uint8Array.from(binary,char=>char.charCodeAt(0));}
 if(format==='pdf'&&new TextDecoder().decode(bytes.subarray(0,5))!=='%PDF-')throw new Error('Sağlayıcı geçerli bir PDF döndürmedi.');
 if(format==='xml'){
  const xml=new TextDecoder().decode(bytes),parsed=new DOMParser().parseFromString(xml,'application/xml');
  if(parsed.querySelector('parsererror')||/^(html|error)$/i.test(parsed.documentElement.localName))throw new Error('Sağlayıcı geçerli bir belge XML’i döndürmedi.');
 }
 return new Blob([bytes],{type:format==='pdf'?'application/pdf':'application/xml'});
}
export async function downloadDocument({account,kind,uuid,number,format,signal}){
 const path=paths[kind];if(!path||!['pdf','xml'].includes(format))throw new Error('Bu belge türünde dosya erişimi ayrıntılı ekran üzerinden yapılır.');
 if(!/^[a-f0-9-]{36}$/i.test(uuid||''))throw new Error('Belge kimliği geçersiz.');
 // Allowlist uses lowercase pdf/xml; do not send Pdf/Xml.
 const result=await retryRead(()=>callNilvera(account,'GET',path+'/'+encodeURIComponent(uuid)+'/'+format,null,null,{signal}),{signal});
 if(signal?.aborted)throw new DOMException('İndirme iptal edildi','AbortError');
 if(!result.success)throw new Error(result.error||'Belge indirilemedi.');
 const blob=documentBlob(result.data,format);
 const name=(String(account.name||'Firma')+' '+String(number||uuid)).replace(/[<>:"/\\|?*\x00-\x1f]/g,' ').replace(/[. ]+$/,'').slice(0,170);
 if(signal?.aborted)throw new DOMException('İndirme iptal edildi','AbortError');
 await saveExportFile(blob,name+'.'+format,{signal});
}
