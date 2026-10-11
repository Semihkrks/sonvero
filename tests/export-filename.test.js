import {describe,it,expect} from 'vitest';
import {excelFileName} from '../src/lib/export-filename.js';
describe('Excel download names',()=>{
 it('uses selected months even when no records exist at the edges',()=>expect(excelFileName({name:'Sem',dateRange:{start:'2026-07-01',end:'2026-10-31'},items:[{IssueDate:'2026-08-10'}]})).toBe('Sem 7-10. AY.xlsx'));
 it('uses one month once',()=>expect(excelFileName({name:'Sem',dateRange:{start:'2026-07-01',end:'2026-07-31'}})).toBe('Sem 7. AY.xlsx'));
 it('includes both years across a year boundary',()=>expect(excelFileName({name:'Sem',dateRange:{start:'2025-12-01',end:'2026-02-28'}})).toBe('Sem 12.2025-2.2026 AY.xlsx'));
 it('keeps Turkish letters and removes unsafe filename characters',()=>expect(excelFileName({name:'Şem / Ticaret:*?',items:[{date:'2026-07-01'}]})).toBe('Şem Ticaret 7. AY.xlsx'));
 it('does not invent a missing range boundary',()=>expect(excelFileName({name:'Sem',dateRange:{start:'2026-07-01'},items:[{date:'2026-09-01'}]})).toBe('Sem 7.2026 ve Sonrası.xlsx'));
 it('uses a clear label for multiple firms without dates',()=>expect(excelFileName()).toBe('Tüm Firmalar Tüm Dönemler.xlsx'));
});
