import {it,expect} from 'vitest';
import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';
it('provides real versioned home-screen icons and stable standalone app identity',()=>{
 const html=fs.readFileSync('index.html','utf8'),manifest=JSON.parse(fs.readFileSync('public/manifest.json','utf8'));
 expect(manifest.id).toBe('/');expect(manifest.display).toBe('standalone');
 const touch=html.match(/<link rel="apple-touch-icon"[^>]*href="([^"]+)"/)[1];
 expect(touch).toContain('v2');expect(html).toContain('sizes="180x180"');
 for(const icon of [...manifest.icons.filter(icon=>icon.type==='image/png'),{src:touch,sizes:'180x180'}]){
  const file=fs.readFileSync(path.join('public',icon.src));const [width,height]=icon.sizes.split('x').map(Number);
  expect(file.subarray(0,8).toString('hex')).toBe('89504e470d0a1a0a');expect(file.readUInt32BE(16)).toBe(width);expect(file.readUInt32BE(20)).toBe(height);
 }
});
it('waits for a safe activation message and removes only its own old caches',async()=>{
 const handlers={},deleted=[],skipWaiting=()=>{throw new Error('Must not activate during install');};
 const self={location:{origin:'https://sonvera.example'},addEventListener:(name,handler)=>{handlers[name]=handler;},skipWaiting,clients:{claim:async()=>{}}};
 const caches={open:async()=>({addAll:async()=>{}}),keys:async()=>['unrelated-cache','sonvera-shell-old','sonvera-shell-__BUILD_ID__'],delete:async key=>deleted.push(key)};
 vm.runInNewContext(fs.readFileSync('public/sw.js','utf8'),{self,URL,caches});
 let task;handlers.install({waitUntil:p=>{task=p;}});await task;handlers.activate({waitUntil:p=>{task=p;}});await task;
 expect(deleted).toEqual(['sonvera-shell-old']);
});
it('does not intercept API, authorization, signed document or third-party requests',()=>{
 const handlers={},self={location:{origin:'https://sonvera.example'},addEventListener:(name,handler)=>{handlers[name]=handler;}};
 vm.runInNewContext(fs.readFileSync('public/sw.js','utf8'),{self,URL});
 for(const [url,method,mode,authorization] of [
  ['https://sonvera.example/api/ledger','GET','cors',false],
  ['https://sonvera.example/private/invoice.pdf?token=secret','GET','navigate',false],
  ['https://sonvera.example/assets/private.js','GET','cors',true],
  ['https://project.supabase.co/rest/v1/accounts','GET','cors',false],
  ['https://sonvera.example/','POST','navigate',false]
 ]){
  let intercepted=false;handlers.fetch({request:{url,method,mode,headers:{has:()=>authorization}},respondWith:()=>{intercepted=true;}});
  expect(intercepted).toBe(false);
 }
});
