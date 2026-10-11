import {it,expect} from 'vitest';
import {invoiceLedgerAmount,addAmount} from '../src/lib/ledger-finance.js';
it('keeps non-TRY, unknown and invalid values out of the TL balance',()=>{
 for(const invoice of [{CurrencyCode:'USD',PayableAmount:100},{PayableAmount:100},{CurrencyCode:'TRY',PayableAmount:'bad'}])expect(invoiceLedgerAmount(invoice)).toBe(null);
 expect(invoiceLedgerAmount({CurrencyCode:'TRY',PayableAmount:0})).toBe('0.00');
});
it('reverses returns and excludes explicit cancellations',()=>{
 expect(invoiceLedgerAmount({CurrencyCode:'TRY',PayableAmount:'10.00',InvoiceType:'IADE'})).toBe('-10.00');
 expect(invoiceLedgerAmount({CurrencyCode:'TRY',PayableAmount:10,IsCancelled:true})).toBe(null);
 expect(invoiceLedgerAmount({CurrencyCode:'TRY',PayableAmount:10,Answer:{AnswerNote:'RED'}})).toBe(null);
 expect(addAmount(0.1,0.2)).toBe(0.3);
});
