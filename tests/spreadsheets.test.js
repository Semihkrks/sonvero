import {it,expect} from 'vitest';
import ExcelJS from 'exceljs';
import * as XLSX from 'xlsx';
it('exports user text as a string, never a formula',async()=>{
 const text='=WEBSERVICE("https://example.invalid")';
 const book=new ExcelJS.Workbook(),sheet=book.addWorksheet('Cari');sheet.addRow([text,1234.56]);
 const loaded=new ExcelJS.Workbook();await loaded.xlsx.load(await book.xlsx.writeBuffer());
 expect(loaded.worksheets[0].getCell('A1').value).toBe(text);
 const ws=XLSX.utils.aoa_to_sheet([[text,1234.56]]);
 expect(ws.A1.t).toBe('s');expect(ws.A1.f).toBeUndefined();
});
