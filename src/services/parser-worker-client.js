export function parseStatementInWorker(file) {
 return new Promise((resolve,reject)=>{
  const worker=new Worker(new URL('../workers/statement.js',import.meta.url),{type:'module'});
  const timer=setTimeout(()=>{worker.terminate();reject(new Error('Dosya işleme süresi aşıldı. Dosyayı küçültün.'));},60000);
  worker.onmessage=event=>{clearTimeout(timer);worker.terminate();event.data.error?reject(new Error(event.data.error)):resolve(event.data.rows);};
  worker.onerror=()=>{clearTimeout(timer);worker.terminate();reject(new Error('Dosya işlenemedi. Biçimini kontrol edin.'));};
  worker.postMessage(file);
 });
}
