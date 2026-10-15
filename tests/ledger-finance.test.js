import {it,expect} from 'vitest';
import {invoiceLedgerAmount,addAmount,isExcludedInvoice} from '../src/lib/ledger-finance.js';
it('keeps non-TRY, unknown and invalid values out of the TL balance',()=>{
 for(const invoice of [{CurrencyCode:'USD',PayableAmount:100},{PayableAmount:100},{CurrencyCode:'TRY',PayableAmount:'bad'}])expect(invoiceLedgerAmount(invoice)).toBe(null);
 expect(invoiceLedgerAmount({CurrencyCode:'TRY',PayableAmount:0})).toBe('0.00');
});
it('reverses returns and excludes cancelled or rejected invoices like the cari screens',()=>{
 expect(invoiceLedgerAmount({CurrencyCode:'TRY',PayableAmount:'10.00',InvoiceType:'IADE'})).toBe('-10.00');
 expect(invoiceLedgerAmount({CurrencyCode:'TRY',PayableAmount:10,IsCancelled:true})).toBe(null);
 expect(invoiceLedgerAmount({CurrencyCode:'TRY',PayableAmount:10,Answer:{AnswerNote:'RED'}})).toBe(null);
 expect(invoiceLedgerAmount({CurrencyCode:'TRY',PayableAmount:309111,InvoiceStatus:{Code:'Rejected'}})).toBe(null);
 expect(isExcludedInvoice({InvoiceStatus:{Code:'2005'}})).toBe(true);
 expect(addAmount(0.1,0.2)).toBe(0.3);
});
