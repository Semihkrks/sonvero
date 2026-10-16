import {it,expect,vi} from 'vitest';
import ExcelJS from 'exceljs';
const {save}=vi.hoisted(()=>({save:vi.fn()}));
vi.mock('../src/services/export-delivery.js',()=>({saveExportFile:save}));
import {exportAllTransactions,exportCustomerCari,exportMultiAccountCari} from '../src/services/cari-export.js';
it('exports the selected direction/account only and preserves return signs',async()=>{
 const invoice={_accountId:'test',_accountName:'Test',_direction:'giden',CurrencyCode:'TRY',PayableAmount:120,IssueDate:'2026-10-01',InvoiceNumber:'A0001',ReceiverName:'=WEBSERVICE("x")',ReceiverTaxNumber:'1234567890',InvoiceType:'IADE'};
 const result=await exportAllTransactions([invoice,{...invoice,_direction:'gelen'},{...invoice,CurrencyCode:'USD'},{...invoice,_accountId:'other'},{_type:'tahsilat',_accountId:'test',amount:100}], [{id:'test',name:'Test'}],{direction:'satis',withTahsilat:false});
 expect(result).toEqual({success:true,count:1});expect(save).toHaveBeenCalledTimes(1);
 const workbook=new ExcelJS.Workbook();await workbook.xlsx.load(await save.mock.calls[0][0].arrayBuffer());
 const strings=[],numbers=[];for(const sheet of workbook.worksheets)sheet.eachRow(row=>row.eachCell(cell=>{if(typeof cell.value==='string')strings.push(cell.value);if(typeof cell.value==='number')numbers.push(cell.value);}));
 expect(strings).toContain(invoice.ReceiverName);expect(numbers).toContain(-120);
});
it('returns the same workbook for WhatsApp without downloading and preserves each screen template',async()=>{
 save.mockClear();
 const invoice={_accountId:'test',_accountName:'Test',_direction:'giden',CurrencyCode:'TRY',PayableAmount:120,IssueDate:'2026-09-01',InvoiceNumber:'A0001',ReceiverName:'Cihan',ReceiverTaxNumber:'1234567890'};
 const options={dateRange:{start:'2026-09-01',end:'2026-09-30'},returnFile:true};
 const results=await Promise.all([
  exportAllTransactions([invoice],[{id:'test',name:'Test'}],options),
  exportCustomerCari([invoice],'Cihan','giden',options),
  exportMultiAccountCari([invoice],'Cihan',{test:{name:'Test',totalAmount:120,totalTahsilat:0}},options),
 ]);
 expect(save).not.toHaveBeenCalled();
 for(const result of results){expect(result.success).toBe(true);expect(result.file.fileName).toMatch(/\.xlsx$/);const book=new ExcelJS.Workbook();await book.xlsx.load(await result.file.blob.arrayBuffer());expect(book.worksheets.length).toBeGreaterThan(0);}
});
it('keeps all customers and their details in a single all-transactions workbook',async()=>{
 const invoices=Array.from({length:9},(_,index)=>({_accountId:'a',_accountName:'Ayşe Karabut',_direction:'giden',CurrencyCode:'TRY',PayableAmount:100+index,IssueDate:'2026-09-01',InvoiceNumber:'INV'+index,ReceiverName:'Firma '+index,ReceiverTaxNumber:String(1000000000+index)}));
 const result=await exportAllTransactions(invoices,[{id:'a',name:'Ayşe Karabut'}],{name:'Tüm Müşteriler',layout:'ayri',direction:'both',withTahsilat:true,returnFile:true,dateRange:{start:'2026-09-01',end:'2026-09-30'}});
 expect(result.success).toBe(true);expect(result.count).toBe(9);
 const workbook=new ExcelJS.Workbook();await workbook.xlsx.load(await result.file.blob.arrayBuffer());
 const summary=workbook.getWorksheet('Müşteri Özeti');expect(summary).toBeDefined();expect(workbook.getWorksheet('Müşteri Detay')).toBeDefined();
 const cells=[];summary.eachRow(row=>row.eachCell(cell=>cells.push(cell.value)));
 for(const invoice of invoices)expect(cells).toContain(invoice.ReceiverName);
});
