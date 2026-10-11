import {spawn} from 'node:child_process';
import {createReadStream} from 'node:fs';
import {createHash,randomUUID} from 'node:crypto';
import {basename} from 'node:path';
export async function backupMetadata(path,bytes){
 const hash=createHash('sha256');for await(const chunk of createReadStream(path))hash.update(chunk);
 return {id:randomUUID(),completedAt:new Date().toISOString(),file:path,fileName:basename(path),bytes,sha256:hash.digest('hex')};
}
export async function reportBackup(metadata){
 const owner=process.env.SONVERA_OWNER_USER_ID;
 if(!owner)return {reported:false,reason:'SONVERA_OWNER_USER_ID tanımlı değil; yedek durumu yalnız yerelde saklandı.'};
 if(!/^[a-f0-9-]{36}$/i.test(owner))return {reported:false,reason:'Yedek sahibi kimliği geçersiz; dosya korundu.'};
 return new Promise(resolve=>{
  const args=['--no-psqlrc','--quiet','--set=ON_ERROR_STOP=on',...Object.entries({owner,id:metadata.id,file_name:metadata.fileName,bytes:String(metadata.bytes),sha256:metadata.sha256,completed_at:metadata.completedAt}).flatMap(([key,value])=>['--set',key+'='+value])];
  const child=spawn('psql',args,{windowsHide:true,stdio:['pipe','ignore','ignore']});
  const timer=setTimeout(()=>{child.kill();resolve({reported:false,reason:'Yedek raporu zaman aşımına uğradı; dosya korundu.'});},30000);
  child.on('error',()=>{clearTimeout(timer);resolve({reported:false,reason:'psql başlatılamadı; yedek dosyası korundu.'});});
  child.on('close',code=>{clearTimeout(timer);resolve(code===0?{reported:true}:{reported:false,reason:'Yedek hazır ancak sunucu durum kaydı yazılamadı. Migration ve bağlantıyı kontrol edin.'});});
  child.stdin.on('error',()=>{});
  child.stdin.end("select public.record_backup_result(:'owner'::uuid,:'id'::uuid,:'file_name',:'bytes'::bigint,:'sha256',:'completed_at'::timestamptz);\n");
 });
}

export async function reportRestoreVerification(result){
 const owner=process.env.SONVERA_OWNER_USER_ID;
 if(!/^[a-f0-9-]{36}$/i.test(owner||''))return {reported:false,reason:'SONVERA_OWNER_USER_ID gerekli; yerel doğrulama raporu korundu.'};
 return new Promise(resolve=>{
  const variables={owner,id:result.backupId,sha256:result.sha256,verified_at:result.verifiedAt};
  const child=spawn('psql',['--no-psqlrc','--quiet','--set=ON_ERROR_STOP=on',...Object.entries(variables).flatMap(([key,value])=>['--set',key+'='+value])],{windowsHide:true,stdio:['pipe','ignore','ignore']});
  const timer=setTimeout(()=>{child.kill();resolve({reported:false,reason:'Doğrulama raporu zaman aşımına uğradı.'});},30000);
  child.on('error',()=>{clearTimeout(timer);resolve({reported:false,reason:'psql başlatılamadı; yerel rapor korundu.'});});
  child.on('close',code=>{clearTimeout(timer);resolve(code===0?{reported:true}:{reported:false,reason:'Doğrulama sonucu kaydedilemedi; migration 013 ve kaynak bağlantısını kontrol edin.'});});
  child.stdin.on('error',()=>{});
  child.stdin.end("select public.record_restore_verification(:'owner'::uuid,:'id'::uuid,:'sha256',:'verified_at'::timestamptz);\n");
 });
}
