import {scryptSync,randomBytes,createCipheriv,createDecipheriv} from 'node:crypto';
import {createReadStream,createWriteStream,promises as fs} from 'node:fs';
import {pipeline} from 'node:stream/promises';
const MAGIC=Buffer.from('SONVERA1'),HEADER=52;
export async function encryptStream(source,path,password){
 const salt=randomBytes(32),iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',scryptSync(password,salt,32),iv);
 const header=Buffer.concat([MAGIC,salt,iv]);cipher.setAAD(header);
 await fs.writeFile(path,header,{flag:'wx',mode:0o600});
 try{await pipeline(source,cipher,createWriteStream(path,{flags:'a'}));await fs.appendFile(path,cipher.getAuthTag());}
 catch(error){await fs.unlink(path).catch(()=>{});throw error;}
}
export async function decryptBackup(path,output,password){
 const stat=await fs.stat(path);if(stat.size<HEADER+16)throw new Error('Yedek eksik');
 const handle=await fs.open(path,'r'),header=Buffer.alloc(HEADER),tag=Buffer.alloc(16);
 try{await handle.read(header,0,HEADER,0);await handle.read(tag,0,16,stat.size-16);}finally{await handle.close();}
 if(!header.subarray(0,8).equals(MAGIC))throw new Error('Yedek biçimi geçersiz');
 const cipher=createDecipheriv('aes-256-gcm',scryptSync(password,header.subarray(8,40),32),header.subarray(40));
 cipher.setAAD(header);cipher.setAuthTag(tag);
 const temporary=output+'.verifying-'+randomBytes(6).toString('hex');
 try{await pipeline(createReadStream(path,{start:HEADER,end:stat.size-17}),cipher,createWriteStream(temporary,{flags:'wx',mode:0o600}));
 await fs.link(temporary,output);await fs.unlink(temporary);}
 catch(error){await fs.unlink(temporary).catch(()=>{});throw error;}
}
