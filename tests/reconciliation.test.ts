import {it,expect} from 'vitest';
import {documentUuidFromRequest,reconciliationLookupPath,reconciliationState} from '../supabase/functions/_shared/reconciliation';
it('never interprets an arbitrary HTTP 200 body or waiting status as completion',()=>{
 for(const response of [{},{InvoiceStatus:{Code:'unknown'}},{InvoiceStatus:{Code:'waiting'}}])expect(reconciliationState('/einvoice/Send/Model',{},response)).toBe('unknown');
 expect(reconciliationState('/einvoice/Send/Model',{},{InvoiceStatus:{Code:'succeed'}})).toBe('succeeded');
 expect(reconciliationState('/einvoice/Send/Model',{},{InvoiceStatus:{Code:'error'}})).toBe('failed');
});
it('does not mistake an old draft for a completed edit',()=>{
 const model={InvoiceInfo:{UUID:'same-id'},InvoiceLines:[{Price:10}]};
 expect(reconciliationState('/einvoice/Draft/Create',{EInvoice:model},model)).toBe('succeeded');
 expect(reconciliationState('/einvoice/Draft/Create',{EInvoice:model},{...model,InvoiceLines:[{Price:9}]})).toBe('unknown');
});
it('uses despatch status codes for send and purchase answers',()=>{
 expect(reconciliationState('/edespatch/Send/Model',{},{DespatchStatus:{Code:'succeed'}})).toBe('succeeded');
 expect(reconciliationState('/edespatch/Send/Model',{},{DespatchStatus:{Code:'waiting'}})).toBe('unknown');
 expect(reconciliationState('/edespatch/Purchase/SendAnswer',{UUID:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'},{DespatchStatus:{Code:'succeed'}})).toBe('succeeded');
 expect(reconciliationState('/einvoice/Purchase/SendAnswer',{UUID:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'},{})).toBe('unknown');
});
it('verifies tags and special codes without treating empty bodies as success',()=>{
 expect(reconciliationState('/einvoice/Sale/Tags',{DocumentUUID:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',Tags:['Acil']},{})).toBe('unknown');
 expect(reconciliationState('/einvoice/Sale/Tags',{Tags:['Acil']},{Content:[{Name:'Acil'}]})).toBe('succeeded');
 expect(reconciliationState('/edespatch/Sale/SpecialCode',{UUID:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',SpecialCode:'X1'},{})).toBe('unknown');
 expect(reconciliationState('/edespatch/Sale/SpecialCode',{SpecialCode:'X1'},{SpecialCode:'X1'})).toBe('succeeded');
 expect(reconciliationState('/edespatch/Sale/SpecialCode',{SpecialCode:'X1'},{SpecialCode:'X2'})).toBe('unknown');
});
it('confirms archive operations only when archived flags are explicit',()=>{
 expect(reconciliationState('/einvoice/Sale/Operation/Archive',{},{})).toBe('unknown');
 expect(reconciliationState('/einvoice/Sale/Operation/Archive',{},{IsArchived:true})).toBe('succeeded');
 expect(reconciliationState('/edespatch/Sale/Operation/Archived',{},{Archived:true})).toBe('succeeded');
 expect(reconciliationState('/edespatch/Purchase/Operation/Unarchived',{},{IsArchived:false})).toBe('succeeded');
 expect(reconciliationState('/einvoice/Purchase/Operation/Read',{},{IsArchived:false})).toBe('unknown');
});
it('builds lookup paths and extracts document UUIDs for supported writes',()=>{
 const uuid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
 expect(documentUuidFromRequest('/edespatch/Sale/Tags',{DocumentUUID:uuid,Tags:['A']})).toBe(uuid);
 expect(documentUuidFromRequest('/einvoice/Purchase/Operation/Archive',[uuid])).toBe(uuid);
 expect(reconciliationLookupPath('/edespatch/Purchase/SendAnswer',uuid)).toBe('/edespatch/Purchase/'+uuid+'/Status');
 expect(reconciliationLookupPath('/einvoice/Sale/Tags',uuid)).toBe('/einvoice/Sale/'+uuid+'/Tags');
 expect(reconciliationLookupPath('/earchive/Invoices/SpecialCode',uuid)).toBe('/earchive/Invoices/'+uuid+'/Details');
 expect(reconciliationLookupPath('/general/Company',uuid)).toBeNull();
});
