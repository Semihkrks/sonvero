import {it,expect} from 'vitest';
import vm from 'node:vm';
import fs from 'node:fs';
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
