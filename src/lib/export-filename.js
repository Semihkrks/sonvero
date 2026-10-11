// Shared by browser and export workers. Selected period takes precedence over row dates.
function month(value){const match=String(value||'').match(/^(\d{4})-(\d{2})/);return match&&+match[2]>=1&&+match[2]<=12?{year:match[1],month:+match[2],key:match[0]}:null;}
export function excelFileName({name='Tüm Firmalar',dateRange,items=[]}={}){
 const clean=String(name||'Tüm Firmalar').replace(/\.xlsx$/i,'').replace(/[<>:"/\\|?*]/g,' ').split('').filter(ch=>ch.charCodeAt(0)>31).join('').replace(/\s+/g,' ').trim().replace(/[. ]+$/,'').slice(0,120)||'Excel';
 const dates=items.map(item=>month(item.IssueDate||item.issueDate||item.date||item.Date||item.InvoiceInfo?.IssueDate||item.raw?.IssueDate)).filter(Boolean).sort((a,b)=>a.key.localeCompare(b.key));
 const explicit=!!(dateRange?.start||dateRange?.end);
 const start=month(dateRange?.start)||(explicit?null:dates[0]);
 const end=month(dateRange?.end)||(explicit?null:dates.at(-1));
 let period='Tüm Dönemler';
 if(start&&end)period=start.year!==end.year?start.month+'.'+start.year+'-'+end.month+'.'+end.year+' AY':start.month===end.month?start.month+'. AY':start.month+'-'+end.month+'. AY';
 else if(start)period=start.month+'.'+start.year+' ve Sonrası';
 else if(end)period=end.month+'.'+end.year+' ve Öncesi';
 return clean+' '+period+'.xlsx';
}
