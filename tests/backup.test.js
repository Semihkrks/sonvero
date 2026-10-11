import {it,expect} from 'vitest';
import {mkdtemp,readFile,writeFile,rm,access} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Readable} from 'node:stream';
import {encryptStream,decryptBackup} from '../scripts/backup-crypto.mjs';
import {canonical} from '../scripts/financial-manifest.mjs';
it('encrypted backup authenticates contents and never publishes invalid plaintext',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'sonvera-backup-'));
 try{
  const enc=join(dir,'test.svb'),out=join(dir,'recovered.dump'),password='test-only-password-123';
  await encryptStream(Readable.from(['financial-test-data']),enc,password);
  expect((await readFile(enc)).includes(Buffer.from('financial-test-data'))).toBe(false);
  await decryptBackup(enc,out,password);expect(await readFile(out,'utf8')).toBe('financial-test-data');
  await expect(decryptBackup(enc,join(dir,'wrong.dump'),'incorrect-password')).rejects.toThrow();
  await expect(access(join(dir,'wrong.dump'))).rejects.toThrow();
  const bytes=await readFile(enc);bytes[55]^=1;await writeFile(enc,bytes);
  await expect(decryptBackup(enc,join(dir,'tampered.dump'),password)).rejects.toThrow();
 }finally{await rm(dir,{recursive:true,force:true});}
});
it('financial manifest canonical form is key-order stable',()=>{
 expect(canonical({b:2,a:{d:4,c:3}})).toBe(canonical({a:{c:3,d:4},b:2}));
 expect(canonical([{currency:'TRY',count:'1'},{currency:'USD',count:'2'}])).not.toBe(canonical([{currency:'USD',count:'2'},{currency:'TRY',count:'1'}]));
});
