import {it,expect,vi} from 'vitest';
vi.mock('../src/lib/supabase.js',()=>({getSupabase:vi.fn()}));
vi.mock('../src/services/invoice-archive.js',()=>({fetchInvoicesSmart:vi.fn()}));
vi.mock('../src/services/tahsilat-manager.js',()=>({listCollections:vi.fn()}));
vi.mock('../src/api/nilvera.js',()=>({EInvoiceWithAccount:{},EArchiveWithAccount:{}}));
import {groupReportItems,summarizeRows,exportArguments,matchReportGroups} from '../src/services/report-data.js';
import {reportCardModel} from '../src/services/report-image.js';
const accounts=[{id:'a',name:'Ayşe'},{id:'b',name:'Mert'}];
const invoice=(overrides={})=>({_accountId:'a',_direction:'giden',ReceiverName:'Cihan',ReceiverTaxNumber:'1234567890',CurrencyCode:'TRY',PayableAmount:'100.10',IssueDate:'2026-09-02',...overrides});
it('keeps decimal totals, purchase signs and collection signs exact',()=>{
 const [group]=groupReportItems([invoice(),invoice({InvoiceType:'IADE',PayableAmount:'10.10'}),invoice({_direction:'gelen',SenderName:'Cihan',SenderTaxNumber:'1234567890',PayableAmount:'20'}),{_accountId:'a',_type:'tahsilat',customer_name:'Cihan',customer_tax_no:'1234567890',amount:'30',date:'2026-09-03'}],accounts);
 expect(summarizeRows(group.rows)).toEqual({satis:'90.00',alis:'20.00',tahsilat:'30.00',net:'40.00'});
});
it('drops rejected invoices the same way Seçili Hesaplar does',()=>{
 const [group]=groupReportItems([invoice(),invoice({PayableAmount:'309111',InvoiceStatus:{Code:'Rejected'},UUID:'rej-1'}),invoice({PayableAmount:'100',Answer:{AnswerCode:'2005'},UUID:'rej-2'})],accounts);
 expect(group.rows).toHaveLength(1);
 expect(summarizeRows(group.rows).satis).toBe('100.10');
});
it('does not merge tax-less ambiguous customers or people from different accounts',()=>{
 const items=[invoice(),invoice({ReceiverTaxNumber:'9876543210'}),{_accountId:'a',_type:'tahsilat',customer_name:'Cihan',amount:2},{_accountId:'b',_type:'tahsilat',customer_name:'Cihan',amount:3}];
 expect(groupReportItems(items,accounts)).toHaveLength(4);
});
it('matches the selected screen balance without adding hidden historical opening',()=>{
 const group={name:'Burak Üretim',tax:'1900637732',rows:[{accountId:'a',kind:'satis',amount:'10.00'},{accountId:'b',kind:'alis',amount:'4.00'}]};
 const colored=[{id:'a',name:'Mert Sarısoy',color:'#16a34a'},{id:'b',name:'Ayşe Karabut',color:'#0f766e'}];
 expect(reportCardModel(group,colored,{direction:'satis',withCollections:false},{value:null})).toMatchObject({balanceLabel:'Dönem neti',balance:'6.00'});
 const full=reportCardModel(group,colored,{direction:'both',withCollections:true},{value:'100.00'});
 expect(full).toMatchObject({balanceLabel:'Bakiye',balance:'6.00'});
 expect(full.columns.map(column=>column.color)).toEqual(['#16a34a','#0f766e']);
 expect(full.columns[0]).toMatchObject({name:'Mert Sarısoy',count:1,satis:'10.00'});
});
it('matches spoken spacing and VKN against actual customers',()=>{
 const groups=[{name:'HARMANDA TEKSTİL',tax:'1234567890'},{name:'Cihan',tax:'3333333333'}];
 expect(matchReportGroups(groups,'Harman da')).toEqual([groups[0]]);
 expect(matchReportGroups(groups,'3333333333')).toEqual([groups[1]]);
 expect(matchReportGroups(groups,'')).toEqual([]);
});
it('reuses the selected screen template and excludes non-TRY data',()=>{
 const [group]=groupReportItems([invoice(),invoice({CurrencyCode:'USD'})],accounts);
 expect(group.rows).toHaveLength(1);
 const options={start:'2026-09-01',end:'2026-09-30',direction:'both',withCollections:true,layout:'separate'};
 expect(exportArguments(group,accounts,{...options,scope:'cari'}).name).toBe('exportCustomerCari');
 expect(exportArguments(group,accounts,{...options,scope:'selected'}).args[2].layout).toBe('ayri');
 expect(exportArguments(group,accounts,{...options,scope:'all',direction:'satis'}).name).toBe('exportMultiAccountCari');
});
