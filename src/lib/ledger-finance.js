import {Decimal,money} from './money.js';
export function invoiceCurrency(invoice){return String(invoice.CurrencyCode??invoice.currencyCode??invoice.InvoiceInfo?.CurrencyCode??'UNKNOWN').toUpperCase();}
export function invoiceLedgerAmount(invoice){
 if(invoiceCurrency(invoice)!=='TRY')return null;
 const status=String(invoice.Answer?.AnswerCode||invoice.Answer?.AnswerNote||invoice.StatusCode||invoice.Status||'').toUpperCase();
 if(invoice.IsCancelled===true||invoice.IsCanceled===true||['REJECTED','RED','REDDEDILDI','2005','REJECTALL','CANCELLED','CANCELED','IPTAL'].includes(status))return null;
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
