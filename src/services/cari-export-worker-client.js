import {saveAs} from 'file-saver';
const active=new Map();
function exportInWorker(name,args,{signal}={}){
 if(signal?.aborted)return Promise.resolve({success:false,error:'Dışa aktarma iptal edildi.'});
 if(active.has(name))return Promise.resolve({success:false,error:'Önce devam eden dışa aktarmanın bitmesini bekleyin.'});
 const promise=new Promise(resolve=>{
  let worker;
  try{worker=new Worker(new URL('../workers/cari-export.js',import.meta.url),{type:'module'});}catch{resolve({success:false,error:'Dosya işleyicisi başlatılamadı.'});return;}
  let delivered=false,finished=false;
  const finish=result=>{if(finished)return;finished=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);worker.terminate();resolve(result);};
  const abort=()=>finish({success:false,error:'Dışa aktarma iptal edildi.'});
  const timer=setTimeout(()=>finish({success:false,error:'Dosya zaman sınırında hazırlanamadı. Daha küçük bir tarih aralığı seçin.'}),180000);
  signal?.addEventListener('abort',abort,{once:true});
  worker.onmessage=({data})=>{
   if(signal?.aborted){abort();return;}
   if(data.type==='file'){if(!delivered){delivered=true;saveAs(data.blob,data.fileName);}}
   else if(data.type==='result')finish(data.result);
  };
  worker.onerror=()=>finish({success:false,error:'Dosya hazırlanamadı. Bilgilerinizi ve tarih aralığını kontrol edin.'});
  try{worker.postMessage({name,args});}catch{finish({success:false,error:'Dışa aktarma verisi işleyiciye aktarılamadı.'});}
 });
 const tracked=promise.finally(()=>active.delete(name));active.set(name,tracked);return tracked;
}
export const exportCariDefter=(...args)=>exportInWorker('exportCariDefter',args);
export const exportCustomerCari=(...args)=>exportInWorker('exportCustomerCari',args);
export const exportAllTransactions=(...args)=>exportInWorker('exportAllTransactions',args);
export const exportMultiAccountCari=(...args)=>exportInWorker('exportMultiAccountCari',args);
export const exportLedgerRows=(rows,options,controls={})=>exportInWorker('exportLedgerRows',[rows,options],controls);
