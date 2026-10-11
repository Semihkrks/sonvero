import {it,expect,vi} from 'vitest';
import ExcelJS from 'exceljs';
const {save}=vi.hoisted(()=>({save:vi.fn()}));
vi.mock('../src/services/export-delivery.js',()=>({saveExportFile:save}));
import {exportAllTransactions} from '../src/services/cari-export.js';
it('exports the selected direction/account only and preserves return signs',async()=>{
 const invoice={_accountId:'test',_accountName:'Test',_direction:'giden',CurrencyCode:'TRY',PayableAmount:120,IssueDate:'2026-10-01',InvoiceNumber:'A0001',ReceiverName:'=WEBSERVICE("x")',ReceiverTaxNumber:'1234567890',InvoiceType:'IADE'};
 const result=await exportAllTransactions([invoice,{...invoice,_direction:'gelen'},{...invoice,CurrencyCode:'USD'},{...invoice,_accountId:'other'},{_type:'tahsilat',_accountId:'test',amount:100}], [{id:'test',name:'Test'}],{direction:'satis',withTahsilat:false});
 expect(result).toEqual({success:true,count:1});expect(save).toHaveBeenCalledTimes(1);
 const workbook=new ExcelJS.Workbook();await workbook.xlsx.load(await save.mock.calls[0][0].arrayBuffer());
 const strings=[],numbers=[];for(const sheet of workbook.worksheets)sheet.eachRow(row=>row.eachCell(cell=>{if(typeof cell.value==='string')strings.push(cell.value);if(typeof cell.value==='number')numbers.push(cell.value);}));
 expect(strings).toContain(invoice.ReceiverName);expect(numbers).toContain(-120);
});
