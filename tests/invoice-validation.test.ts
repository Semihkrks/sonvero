import {it,expect} from 'vitest';
import {validateDespatch,validateInvoice} from '../supabase/functions/_shared/invoice-validation';
const uuid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const despatch=(info={},line={},receiver={})=>({Despatch:{DespatchInfo:{UUID:uuid,CurrencyCode:'TRY',...info},ReceiverInfo:{TaxNumber:'1234567890',...receiver},DespatchLines:[{Name:'Ürün',Quantity:'3',Price:'10.335',Amount:'31.01',...line}]}});
const invoice=(info={},line={},customer={})=>({EInvoice:{InvoiceInfo:{UUID:uuid,CurrencyCode:'TRY',...info},CustomerInfo:{TaxNumber:'12345678901',...customer},InvoiceLines:[{Quantity:'2',Price:'50',AllowanceTotal:'10',KDVPercent:'20',KDVTotal:'18',...line}]}});
it('accepts a valid despatch with decimal-rounded line amounts',()=>{
 expect(()=>validateDespatch(despatch())).not.toThrow();
 expect(()=>validateDespatch(despatch().Despatch)).not.toThrow();
});
it('rejects despatches with a bad UUID, non-TRY currency, wrong amount or missing receiver tax number',()=>{
 expect(()=>validateDespatch(despatch({UUID:'not-a-uuid-but-thirty-six-characters'}))).toThrow(/Belge kimliği/);
 expect(()=>validateDespatch(despatch({CurrencyCode:'USD'}))).toThrow(/TL/);
 expect(()=>validateDespatch(despatch({},{Amount:'31.00'}))).toThrow(/satır tutarı/);
 expect(()=>validateDespatch(despatch({},{Quantity:'0',Amount:'0'}))).toThrow(/satır tutarı/);
 expect(()=>validateDespatch(despatch({},{Name:''}))).toThrow(/satır tutarı/);
 expect(()=>validateDespatch(despatch({},{},{TaxNumber:''}))).toThrow(/VKN/);
 expect(()=>validateDespatch({Despatch:{DespatchInfo:{UUID:uuid,CurrencyCode:'TRY'},DespatchLines:[]}})).toThrow(/satırları/);
});
it('accepts a valid invoice and rejects mismatched tax, currency, UUID or customer',()=>{
 expect(()=>validateInvoice(invoice())).not.toThrow();
 expect(()=>validateInvoice(invoice({},{KDVTotal:'18.01'}))).toThrow(/Vergi toplamı/);
 expect(()=>validateInvoice(invoice({},{AllowanceTotal:'101'}))).toThrow(/Geçersiz satır/);
 expect(()=>validateInvoice(invoice({CurrencyCode:'EUR'}))).toThrow(/TL/);
 expect(()=>validateInvoice(invoice({UUID:'short'}))).toThrow(/Belge kimliği/);
 expect(()=>validateInvoice(invoice({},{},{TaxNumber:'123'}))).toThrow(/VKN/);
});
