import {readFinancialManifest,canonical} from './financial-manifest.mjs';
import {Readable} from 'node:stream';
import {backupMetadata,reportBackup} from './backup-report.mjs';
import {spawn} from 'node:child_process';
import {promises as fs} from 'node:fs';
import {resolve,join} from 'node:path';
import {encryptStream,decryptBackup} from './backup-crypto.mjs';
const password=process.env.SONVERA_BACKUP_PASSWORD;
if(!password||password.length<16)throw new Error('SONVERA_BACKUP_PASSWORD en az 16 karakter olmalı. Parolayı yedekten ayrı saklayın.');
if(process.argv[2]==='decrypt'){
 const source=process.argv[3],target=process.argv[4];if(!source||!target)throw new Error('Kullanım: npm run backup:decrypt -- yedek.svb hedef.dump');
 await decryptBackup(resolve(source),resolve(target),password);console.log('Şifre doğrulandı. Dosya açıldı; veritabanına hiçbir şey yazılmadı.');
}else{
 if(!process.env.PGHOST&&!process.env.PGSERVICE)throw new Error('PGHOST/PGDATABASE/PGUSER/PGPASSWORD veya PGSERVICE bağlantısını tanımlayın.');
 const directory=resolve('backups');await fs.mkdir(directory,{recursive:true});
 const path=join(directory,'sonvera-'+new Date().toISOString().replace(/[:.]/g,'-')+'.svb');
 let before=null;try{before=await readFinancialManifest();}catch{console.warn('Finansal karşılaştırma referansı okunamadı; şifreli yedek yine alınacak.');}
 const dump=spawn('pg_dump',['--format=custom','--no-owner','--no-acl'],{stdio:['ignore','pipe','pipe'],windowsHide:true});
 // Never log provider credentials or raw SQL errors from the database.
 dump.stderr.resume();
 const completion=new Promise((resolve,reject)=>{dump.once('error',()=>reject(new Error('pg_dump bulunamadı veya başlatılamadı. PostgreSQL istemcisini kurun.')));dump.once('close',code=>code===0?resolve():reject(new Error('Veritabanı yedeği tamamlanamadı. Bağlantı ve yetkileri kontrol edin.')));});
 let backupReady=false;
 try{
  await Promise.all([encryptStream(dump.stdout,path,password),completion]);
  backupReady=true;
  const metadata=await backupMetadata(path,(await fs.stat(path)).size);
  let after=null;try{after=await readFinancialManifest();}catch{ /* The backup remains valid without a comparison baseline. */ }
  const comparable=!!before&&!!after&&canonical(before)===canonical(after);
  metadata.financialBaseline=comparable?'available':'unavailable';
  if(comparable){
   const manifest={backupId:metadata.id,sha256:metadata.sha256,completedAt:metadata.completedAt,financial:before};
   await encryptStream(Readable.from([Buffer.from(JSON.stringify(manifest))]),path+'.manifest.svb',password);
  }else console.warn('Yedek sırasında veri değişti veya referans okunamadı; bu yedek finansal karşılaştırma için doğrulanmış başlangıç referansına sahip değil.');
  await fs.writeFile(path+'.json',JSON.stringify(metadata,null,2),{flag:'wx',mode:0o600});
  await fs.writeFile(join(directory,'last-success.json'),JSON.stringify(metadata,null,2));
  const report=await reportBackup(metadata);
  await fs.writeFile(join(directory,'last-success.json'),JSON.stringify({...metadata,report},null,2));
  if(!report.reported)console.warn(report.reason);
  console.log('Şifreli yedek hazır: '+path);
 }catch(error){dump.kill();if(!backupReady)await fs.unlink(path).catch(()=>{});else console.warn('Tamamlanan şifreli yedek korundu; durum raporu yazılamadı.');throw error;}
}
