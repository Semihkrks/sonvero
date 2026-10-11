import {reportRestoreVerification} from './backup-report.mjs';
import {promises as fs,createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,join} from 'node:path';
import {tmpdir} from 'node:os';
import {decryptBackup} from './backup-crypto.mjs';
import {readFinancialManifest,canonical} from './financial-manifest.mjs';

// Never restores or modifies the target. Optional --report writes verification metadata to the source database.
// --report-only re-sends an existing local success report without re-reading the restore target.
const args=process.argv.slice(2);
const reportOnly=args.includes('--report-only');
const report=args.includes('--report')||reportOnly;
const source=args.find(arg=>!arg.startsWith('--'));
const password=process.env.SONVERA_BACKUP_PASSWORD;
if(!source)throw new Error('Kullanım: npm run backup:verify -- yedek.svb [--report|--report-only]');
const path=resolve(source);

function sameEndpoint(a,b){
 return String(a.host||'')===String(b.host||'')&&String(a.port||'5432')===String(b.port||'5432')&&String(a.database||'')===String(b.database||'');
}
function restoreTarget(){
 if(!process.env.SONVERA_RESTORE_PGHOST||!process.env.SONVERA_RESTORE_PGDATABASE||!process.env.SONVERA_RESTORE_PGUSER){
  throw new Error('İzole hedef için SONVERA_RESTORE_PGHOST / PGDATABASE / PGUSER gerekli.');
 }
 const target={host:process.env.SONVERA_RESTORE_PGHOST,port:process.env.SONVERA_RESTORE_PGPORT||'5432',database:process.env.SONVERA_RESTORE_PGDATABASE};
 const sourceDb={host:process.env.PGHOST,port:process.env.PGPORT||'5432',database:process.env.PGDATABASE};
 if(sourceDb.host&&sourceDb.database&&sameEndpoint(target,sourceDb)){
  throw new Error('SONVERA_RESTORE_* kaynak veritabanıyla aynı. İzole bir hedef kullanın; bu araç üretim üzerine yazmaz ama aynı DB üzerinde “doğrulama” yanıltıcıdır.');
 }
 const targetEnv={...process.env};
 for(const key of ['PGHOST','PGPORT','PGDATABASE','PGUSER','PGPASSWORD','PGSERVICE','PGSERVICEFILE','PGPASSFILE','PGOPTIONS'])delete targetEnv[key];
 for(const key of ['PGHOST','PGPORT','PGDATABASE','PGUSER','PGPASSWORD','PGSSLMODE'])if(process.env['SONVERA_RESTORE_'+key])targetEnv[key]=process.env['SONVERA_RESTORE_'+key];
 return targetEnv;
}

if(reportOnly){
 const verifiedPath=path+'.restore-verified.json';
 const result=JSON.parse(await fs.readFile(verifiedPath,'utf8'));
 if(!result?.matched||!result.backupId||!result.sha256||!result.verifiedAt)throw new Error('Yerel doğrulama raporu geçersiz.');
 const age=Date.now()-Date.parse(result.verifiedAt);
 if(!Number.isFinite(age)||age>20*60*60*1000)throw new Error('Yerel rapor 20 saatten eski; migration 013 bir günlük pencere kullanır. Doğrulamayı yeniden çalıştırın.');
 const reported=await reportRestoreVerification(result);
 if(!reported.reported)throw new Error(reported.reason||'Doğrulama sonucu kaydedilemedi.');
 console.log('Mevcut yerel doğrulama raporu kaynak sisteme yeniden gönderildi.');
 process.exit(0);
}

if(!password)throw new Error('SONVERA_BACKUP_PASSWORD gerekli.');
const targetEnv=restoreTarget();
const directory=await fs.mkdtemp(join(tmpdir(),'sonvera-verify-'));
try{
 const manifestPath=join(directory,'manifest.json');await decryptBackup(path+'.manifest.svb',manifestPath,password);
 const manifest=JSON.parse(await fs.readFile(manifestPath,'utf8'));
 if(manifest.financial?.version!==1||!manifest.backupId)throw new Error('Yedek karşılaştırma referansı geçersiz. Manifest yoksa bu yedek otomatik finansal karşılaştırma için uygun değildir.');
 const hash=createHash('sha256');for await(const chunk of createReadStream(path))hash.update(chunk);
 if(hash.digest('hex')!==manifest.sha256)throw new Error('Yedek dosyası referans özetiyle uyuşmuyor.');
 const actual=await readFinancialManifest(targetEnv);
 if(canonical(actual)!==canonical(manifest.financial))throw new Error('Geri yüklenen finansal kayıtlar referansla uyuşmuyor. Başarı raporu oluşturulmadı.');
 const result={backupId:manifest.backupId,sha256:manifest.sha256,verifiedAt:new Date().toISOString(),scope:'accounts-collections-archive-ledger',matched:true};
 const verifiedPath=path+'.restore-verified.json';
 try{await fs.writeFile(verifiedPath,JSON.stringify(result,null,2),{flag:'wx',mode:0o600});}
 catch(error){
  if(error?.code!=='EEXIST')throw error;
  const previous=JSON.parse(await fs.readFile(verifiedPath,'utf8'));
  if(previous.backupId!==result.backupId||previous.sha256!==result.sha256||!previous.matched)throw new Error('Var olan doğrulama raporu bu yedekle uyuşmuyor.');
  console.warn('Yerel doğrulama raporu zaten vardı; yeniden yazılmadı.');
 }
 if(report){
  const reported=await reportRestoreVerification(result);
  if(!reported.reported)console.warn(reported.reason+' Yerel rapor korundu; npm run backup:verify -- '+source+' --report-only ile yeniden deneyin.');
  else console.log('Finansal doğrulama durumu kaynak sistemde kaydedildi.');
 }
 console.log('İzole veritabanındaki hesap, tahsilat, arşiv kayıtları ve para birimi bazlı finansal toplamlar eşleşti. Yerel rapor yazıldı. Anahtar çözme, dosya alanı ve uygulama akışları bu karşılaştırmanın kapsamı dışındadır.');
}finally{
 await fs.unlink(join(directory,'manifest.json')).catch(()=>{});await fs.rmdir(directory).catch(()=>{});
}
