import {Decimal,money} from './money.js';
const EXCLUDED=new Set(['REJECTED','RED','REDDEDILDI','2005','REJECTALL','CANCELLED','CANCELED','IPTAL','ERROR','FAILED','FAIL']);
export function invoiceCurrency(invoice){return String(invoice.CurrencyCode??invoice.currencyCode??invoice.InvoiceInfo?.CurrencyCode??'UNKNOWN').toUpperCase();}
export function invoiceStatus(invoice){
 const answerNote=String(invoice?.Answer?.AnswerNote||invoice?.answer?.answerNote||'').toUpperCase().trim();
 const answerCode=String(invoice?.Answer?.AnswerCode||invoice?.answer?.answerCode||invoice?.AnswerCode||invoice?.answerCode||'').trim();
 if(answerCode)return answerCode;
 if(answerNote==='RED')return 'rejected';
 if(answerNote==='KABUL')return 'accepted';
 return String(invoice?.InvoiceStatus?.Code||invoice?.invoiceStatus?.code||invoice?.StatusCode||invoice?.statusCode||invoice?.Status||invoice?.status||'');
}
export function isExcludedInvoice(invoice){
 if(invoice?.IsCancelled===true||invoice?.IsCanceled===true)return true;
 return EXCLUDED.has(String(invoiceStatus(invoice)||'').toUpperCase());
}
export function invoiceLedgerAmount(invoice){
 if(invoiceCurrency(invoice)!=='TRY')return null;
 if(isExcludedInvoice(invoice))return null;
 const raw=invoice.PayableAmount??invoice.payableAmount??invoice.TotalAmount??invoice.totalAmount;
 if(raw===null||raw===undefined||raw==='')return null;
 try{
  let amount=new Decimal(money(raw));
  const type=String(invoice.InvoiceType||invoice.InvoiceInfo?.InvoiceType||'').toUpperCase();
  if(['IADE','İADE','RETURN'].includes(type))amount=amount.abs().negated();
  return amount.toFixed(2);
 }catch{return null;}
}
export function addAmount(a,b){return Number(new Decimal(a||0).plus(b||0).toDecimalPlaces(2));}
