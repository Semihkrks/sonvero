import { describe,it,expect } from 'vitest';
import { calculateLine,parseTurkishAmount,money,positiveMoney,sumMoney,istanbulDate } from '../src/lib/money.js';
describe('Financial correctness',()=>{
 it('parses Turkish input without silently accepting ambiguous decimals',()=>{expect(parseTurkishAmount('1.234,56')).toBe('1234.56');expect(parseTurkishAmount('12,50')).toBe('12.50');for(const value of ['12.50','1,234.56','1e4','NaN','-12','12,123',''])expect(()=>parseTurkishAmount(value)).toThrow();});
 it('calculates invoice discounts and tax with decimal rounding',()=>{expect(calculateLine({quantity:'3',unitPrice:'0.10',discountRate:0,taxRate:20})).toEqual({gross:'0.30',discount:'0.00',net:'0.30',tax:'0.06',total:'0.36'});expect(sumMoney(['0.10','0.20'])).toBe('0.30');expect(money('1.005')).toBe('1.01');});
 it('rejects invalid financial values',()=>{expect(()=>positiveMoney('0')).toThrow();expect(()=>money('Infinity')).toThrow();expect(()=>calculateLine({quantity:0,unitPrice:12})).toThrow();expect(()=>calculateLine({quantity:1,unitPrice:12,discountRate:101})).toThrow();});
 it('uses Istanbul date at UTC day boundaries',()=>{expect(istanbulDate(new Date('2026-10-10T21:30:00Z'))).toBe('2026-10-11');});
});
