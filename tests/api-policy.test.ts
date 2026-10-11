import {describe,it,expect} from 'vitest';
import {isAllowedOperation} from '../supabase/functions/_shared/policy';
const uuid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
describe('provider route boundary',()=>{
 it('allows encoded customer searches and UUID paths',()=>{
  expect(isAllowedOperation('GET','/general/GlobalCompany/Search/%C3%96rnek%20Firma')).toBe(true);
  expect(isAllowedOperation('GET',`/einvoice/Sale/${uuid}/Status`)).toBe(true);
 });
 it('accepts client catalog paths used for downloads, details, tags and drafts',()=>{
  const catalog:[string,string][]=[
   ['GET',`/einvoice/Sale/${uuid}/pdf`],
   ['GET',`/einvoice/Sale/${uuid}/Pdf`],
   ['GET',`/einvoice/Sale/${uuid}/xml`],
   ['GET',`/einvoice/Purchase/${uuid}/Details`],
   ['GET',`/earchive/Invoices/${uuid}/Details`],
   ['GET',`/earchive/Invoices/${uuid}/html`],
   ['GET',`/edespatch/Sale/${uuid}/pdf`],
   ['GET',`/edespatch/Draft/${uuid}/model`],
   ['GET','/einvoice/Tags'],
   ['GET','/einvoice/Templates'],
   ['DELETE','/einvoice/Draft'],
   ['DELETE','/edespatch/Draft'],
  ];
  for(const [method,path] of catalog)expect(isAllowedOperation(method,path),method+' '+path).toBe(true);
  expect(isAllowedOperation('GET','/einvoice/Tag')).toBe(false);
  expect(isAllowedOperation('GET',`/earchive/Invoices/${uuid}`)).toBe(false);
 });
 it('rejects traversal, arbitrary origins and unsupported methods',()=>{
  for(const path of ['https://example.com','/general/GlobalCompany/Search/%2e%2e','/general/GlobalCompany/Search/%2fsecret','/admin','/einvoice/Sale/..'])expect(isAllowedOperation('GET',path)).toBe(false);
  expect(isAllowedOperation('DELETE','/general/Company')).toBe(false);
 });
});
