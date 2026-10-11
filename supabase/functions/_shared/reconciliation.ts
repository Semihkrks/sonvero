function containsExpected(actual:unknown,expected:unknown):boolean{
 if(expected===null)return actual===null;
 if(Array.isArray(expected))return Array.isArray(actual)&&actual.length===expected.length&&expected.every((value,index)=>containsExpected(actual[index],value));
 if(typeof expected==='object'&&expected!==null)return !!actual&&typeof actual==='object'&&Object.entries(expected).every(([key,value])=>containsExpected((actual as Record<string,unknown>)[key],value));
 if(typeof expected==='number')return actual!==null&&actual!==''&&Number.isFinite(Number(actual))&&Number(actual)===expected;
 return actual===expected;
}
function statusCode(path:string,responseData:Record<string,any>):string{
 return String((path.startsWith('/edespatch/')?responseData.DespatchStatus?.Code:responseData.InvoiceStatus?.Code)||'').toLowerCase();
}
function statusFromCode(code:string):'succeeded'|'failed'|'unknown'{
 // Nilvera StatusCode enum: unknown, waiting, succeed, error.
 return code==='succeed'?'succeeded':code==='error'?'failed':'unknown';
}
function tagList(data:unknown):unknown[]|null{
 if(Array.isArray(data))return data;
 if(data&&typeof data==='object'){
  const rows=(data as Record<string,unknown>).Content??(data as Record<string,unknown>).Items??(data as Record<string,unknown>).Tags??(data as Record<string,unknown>).tags;
  return Array.isArray(rows)?rows:null;
 }
 return null;
}
export function documentUuidFromRequest(path:string,requestData:unknown):string|undefined{
 const data=requestData&&typeof requestData==='object'?requestData as Record<string,any>:{};
 const model=data.EInvoice||data.ArchiveInvoice||data.Invoice||data.Despatch||data;
 if(Array.isArray(data)){
  if(data.length!==1)return undefined;
  const item=data[0];
  return typeof item==='string'?item:item?.UUID||item?.uuid;
 }
 if(Array.isArray(data.UUIDS)&&data.UUIDS.length===1)return String(data.UUIDS[0]);
 if(typeof data.UUID==='string')return data.UUID;
 if(typeof data.DocumentUUID==='string')return data.DocumentUUID;
 const fromModel=model?.InvoiceInfo?.UUID||model?.DespatchInfo?.UUID||model?.UUID;
 if(typeof fromModel==='string')return fromModel;
 const match=String(path).match(/\/([a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12})(?:\/|$)/i);
 return match?.[1];
}
/** Returns the provider GET path used to verify a write, or null when only manual close is safe. */
export function reconciliationLookupPath(path:string,uuid:string):string|null{
 if(!uuid||!/^[0-9a-f-]{36}$/i.test(uuid))return null;
 if(/\/Draft\/Create$/.test(path)){
  if(path.startsWith('/einvoice/'))return '/einvoice/Draft/'+uuid+'/model';
  if(path.startsWith('/earchive/'))return '/earchive/Draft/'+uuid+'/model';
  if(path.startsWith('/edespatch/'))return '/edespatch/Draft/'+uuid+'/model';
 }
 if(/\/(Send\/Model|Draft\/EditAndSend|Draft\/ConfirmAndSend)$/.test(path)){
  if(path.startsWith('/einvoice/'))return '/einvoice/Sale/'+uuid+'/Status';
  if(path.startsWith('/earchive/'))return '/earchive/Invoices/'+uuid+'/Status';
  if(path.startsWith('/edespatch/'))return '/edespatch/Sale/'+uuid+'/Status';
 }
 if(/\/Purchase\/SendAnswer$/.test(path)){
  if(path.startsWith('/einvoice/'))return '/einvoice/Purchase/'+uuid+'/Status';
  if(path.startsWith('/edespatch/'))return '/edespatch/Purchase/'+uuid+'/Status';
 }
 if(/\/Tags$/.test(path)){
  if(path.startsWith('/einvoice/Sale'))return '/einvoice/Sale/'+uuid+'/Tags';
  if(path.startsWith('/einvoice/Purchase'))return '/einvoice/Purchase/'+uuid+'/Tags';
  if(path.startsWith('/einvoice/Draft'))return '/einvoice/Draft/'+uuid+'/Tags';
  if(path.startsWith('/earchive/Invoices'))return '/earchive/Invoices/'+uuid+'/Tags';
  if(path.startsWith('/earchive/Draft'))return '/earchive/Draft/'+uuid+'/Tags';
  if(path.startsWith('/edespatch/Sale'))return '/edespatch/Sale/'+uuid+'/Tags';
  if(path.startsWith('/edespatch/Purchase'))return '/edespatch/Purchase/'+uuid+'/Tags';
  if(path.startsWith('/edespatch/Draft'))return '/edespatch/Draft/'+uuid+'/Tags';
 }
 if(/\/SpecialCode$/.test(path)){
  if(path.startsWith('/einvoice/Sale'))return '/einvoice/Sale/'+uuid+'/Details';
  if(path.startsWith('/einvoice/Purchase'))return '/einvoice/Purchase/'+uuid+'/Details';
  if(path.startsWith('/earchive/Invoices'))return '/earchive/Invoices/'+uuid+'/Details';
  if(path.startsWith('/edespatch/Sale'))return '/edespatch/Sale/'+uuid+'/Details';
  if(path.startsWith('/edespatch/Purchase'))return '/edespatch/Purchase/'+uuid+'/Details';
 }
 if(/\/Operation\//.test(path)){
  if(path.startsWith('/einvoice/Sale'))return '/einvoice/Sale/'+uuid+'/Details';
  if(path.startsWith('/einvoice/Purchase'))return '/einvoice/Purchase/'+uuid+'/Details';
  if(path.startsWith('/earchive/Invoices'))return '/earchive/Invoices/'+uuid+'/Details';
  if(path.startsWith('/edespatch/Sale'))return '/edespatch/Sale/'+uuid+'/Details';
  if(path.startsWith('/edespatch/Purchase'))return '/edespatch/Purchase/'+uuid+'/Details';
 }
 return null;
}
export function reconciliationState(path:string,requestData:Record<string,any>,responseData:Record<string,any>):'succeeded'|'failed'|'unknown'{
 if(path.includes('/Draft/Create')){
  const expected=requestData.EInvoice||requestData.ArchiveInvoice||requestData.Invoice||requestData.Despatch||requestData;
  const actual=responseData.EInvoice||responseData.ArchiveInvoice||responseData.Invoice||responseData.Despatch||responseData;
  if(requestData.CustomerAlias&&requestData.CustomerAlias!==responseData.CustomerAlias)return 'unknown';
  return containsExpected(actual,expected)?'succeeded':'unknown';
 }
 if(/\/Purchase\/SendAnswer$/.test(path)||/\/(Send\/Model|Draft\/EditAndSend|Draft\/ConfirmAndSend)$/.test(path)){
  return statusFromCode(statusCode(path,responseData));
 }
 if(/\/Tags$/.test(path)){
  const expected=requestData.Tags??requestData.tags;
  if(!Array.isArray(expected)||!expected.length)return 'unknown';
  const actual=tagList(responseData);
  if(!actual)return 'unknown';
  const names=actual.map(item=>typeof item==='string'?item:String((item as Record<string,unknown>)?.Name??(item as Record<string,unknown>)?.TagName??''));
  return expected.every((tag:unknown)=>{
   const name=typeof tag==='string'?tag:String((tag as Record<string,unknown>)?.Name??(tag as Record<string,unknown>)?.TagName??'');
   return name&&names.includes(name);
  })?'succeeded':'unknown';
 }
 if(/\/SpecialCode$/.test(path)){
  const expected=requestData.SpecialCode;
  if(expected==null||expected==='')return 'unknown';
  const actual=responseData.SpecialCode??responseData.InvoiceInfo?.SpecialCode??responseData.DespatchInfo?.SpecialCode??responseData.EInvoice?.InvoiceInfo?.SpecialCode??responseData.Despatch?.DespatchInfo?.SpecialCode;
  if(actual==null||actual==='')return 'unknown';
  return String(actual)===String(expected)?'succeeded':'unknown';
 }
 if(/\/Operation\//.test(path)){
  const op=decodeURIComponent(path.split('/Operation/')[1]?.split(/[/?#]/)[0]||'');
  const archived=responseData.IsArchived===true||responseData.Archived===true||responseData.IsInArchive===true||responseData.InArchive===true;
  const explicitlyOpen=responseData.IsArchived===false||responseData.Archived===false||responseData.IsInArchive===false;
  if(/^(Archive|Archived|ArsiveKaldir)$/i.test(op))return archived?'succeeded':'unknown';
  if(/^(Unarchive|UnArchive|Unarchived|ArchiveRemove|ArsivdenCikar)$/i.test(op))return explicitlyOpen?'succeeded':'unknown';
  // Read/Unread/Transferred and other flags are not inferred from unknown response shapes.
  return 'unknown';
 }
 return 'unknown';
}
export {containsExpected};
