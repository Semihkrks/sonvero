import {beforeEach,describe,expect,it,vi} from 'vitest';
vi.mock('../src/lib/supabase.js',()=>({getSupabase:vi.fn()}));
vi.mock('../src/services/tahsilat-manager.js',()=>({listCollections:vi.fn()}));
vi.mock('../src/services/invoice-archive.js',()=>({fetchInvoicesSmart:vi.fn()}));
vi.mock('../src/api/nilvera.js',()=>({EInvoiceWithAccount:{},EArchiveWithAccount:{}}));
import {getSupabase} from '../src/lib/supabase.js';
import {listCollections} from '../src/services/tahsilat-manager.js';
import {findAssistantCollections,findAssistantCustomers,readAssistantSummary} from '../src/services/assistant-ledger.js';

const customer={account_id:'a',customer_key:'123',customer_tax_no:'123',customer_name:'Harmanda Tekstil'};
const collection=(changes={})=>({...customer,id:'c1',version:3,amount:'0.10',currency:'TRY',date:'2026-10-17',created_at:'2026-10-17T12:00:00Z',cancelled_at:null,...changes});
const movement=(changes={})=>({...collection(),source:'invoice',debit:'0.10',credit:'0.00',...changes});
let rpc;
beforeEach(()=>{
 vi.resetAllMocks();rpc=vi.fn();getSupabase.mockReturnValue({rpc});listCollections.mockResolvedValue([]);
});

describe('account-scoped assistant reads',()=>{
 it('uses actual exact customer identities and versioned active collections',async()=>{
  listCollections.mockResolvedValue([collection(),collection({id:'other-account',account_id:'b'}),collection({id:'other-customer',customer_key:'456',customer_tax_no:'456'}),collection({id:'cancelled',cancelled_at:'2026-10-17'}),collection({id:'old',date:'2026-10-16'})]);
  const rows=await findAssistantCollections({accountId:'a',customer,start:'2026-10-17',end:'2026-10-17'});
  expect(rows).toEqual([collection()]);
  expect(listCollections).toHaveBeenCalledWith({accountId:'a',startDate:'2026-10-17',endDate:'2026-10-17',includeCancelled:false});
 });
 it('does not confuse identical trading names with different tax identities',async()=>{
  listCollections.mockResolvedValue([collection(),collection({id:'wrong',customer_key:'456',customer_tax_no:'456'})]);
  expect(await findAssistantCollections({accountId:'a',customer:{key:'tax:123'}})).toHaveLength(1);
  expect(await findAssistantCollections({accountId:'a',customer:{...customer,account_id:'b'}})).toEqual([]);
 });
 it('can explicitly read cancelled records and sorts newest first',async()=>{
  listCollections.mockResolvedValue([collection(),collection({id:'newer',created_at:'2026-10-17T13:00:00Z',cancelled_at:'2026-10-17'})]);
  expect((await findAssistantCollections({accountId:'a',includeCancelled:true})).map(row=>row.id)).toEqual(['newer','c1']);
 });
 it('matches legacy tax-less collections to their exact canonical ledger name within one account',async()=>{
  const legacy=collection({customer_name:'HARMANDA TEKSTIL',customer_key:'harmanda tekstil',customer_tax_no:''});
  listCollections.mockResolvedValue([legacy,collection({id:'new',customer_key:'name:harmanda tekstil',customer_tax_no:''}),
   {...legacy,id:'foreign-account',account_id:'b'},{...legacy,id:'tax-bearing',customer_tax_no:'123'},
   {...legacy,id:'tax-bearing-canonical-key',customer_key:'name:harmanda tekstil',customer_tax_no:'456'},
   {...legacy,id:'different-name',customer_name:'Mustafa Harmanda',customer_key:'mustafa harmanda'},
   {...legacy,id:'different-canonical-key',customer_key:'name:another identity'}]);
  const rows=await findAssistantCollections({accountId:'a',customer:{account_id:'a',customer_key:'name:harmanda tekstil',customer_name:'Harmanda Tekstil',customer_tax_no:''}});
  expect(rows.map(row=>row.id).sort()).toEqual(['c1','new']);
 });
 it('keeps diacritics significant when matching canonical persisted name identities',async()=>{
  listCollections.mockResolvedValue([collection({customer_name:'Çağ Tekstil',customer_key:'çağ tekstil',customer_tax_no:''}),
   collection({id:'other-spelling',customer_name:'Cag Tekstil',customer_key:'cag tekstil',customer_tax_no:''})]);
  expect((await findAssistantCollections({accountId:'a',customer:{customer_key:'name:çağ tekstil'}})).map(row=>row.id)).toEqual(['c1']);
 });
 it('retains account-restricted customer lookup despite rogue response rows',async()=>{
  rpc.mockResolvedValue({data:{count:2,rows:[customer,{...customer,account_id:'b',customer_name:'Mustafa Harmanda'}]},error:null});
  expect((await findAssistantCustomers('a','harmanda')).map(row=>row.name)).toEqual(['Harmanda Tekstil']);
 });
 it('sums application collections exactly and excludes unsupported currency',async()=>{
  listCollections.mockResolvedValue([collection(),collection({id:'c2',amount:'0.20'}),collection({id:'usd',currency:'USD',amount:'100'}),collection({id:'wrong',account_id:'b',amount:'999'})]);
  const summary=await readAssistantSummary({accountIds:['a','a'],metric:'collections',start:'2026-10-17',end:'2026-10-17'});
  expect(summary).toMatchObject({accountIds:['a'],totals:{collections:'0.30'},count:2,excluded:1,complete:true,source:'customer_collections'});
  expect(rpc).not.toHaveBeenCalled();
 });
 it('reads signed sales, returns, purchases and collections without conflating credit',async()=>{
  rpc.mockResolvedValue({data:{rows:[movement(),movement({id:'return',debit:'-0.01'}),movement({id:'purchase',debit:'0.00',credit:'0.02'}),movement({id:'collection',source:'collection',debit:'0.00',credit:'0.03'}),movement({id:'wrong',account_id:'b',debit:'999'}),movement({id:'future',date:'2026-10-18',debit:'999'})],totals:{count:6},opening:'1.00',excluded:2,lastSync:'2026-10-17'},error:null});
  const summary=await readAssistantSummary({accountIds:['a'],metric:'net',customer,start:'2026-10-17',end:'2026-10-17'});
  expect(summary).toMatchObject({totals:{sales:'0.09',purchases:'0.02',collections:'0.03',net:'0.04',opening:'1.00',balance:'1.04'},count:4,excluded:2,complete:false});
  expect(summary.completeness.note).toMatch(/tamlığı doğrulanmamıştır/);
  expect(rpc).toHaveBeenCalledWith('ledger_page',expect.objectContaining({p_account_id:'a',p_customer:'123',p_start:'2026-10-17',p_end:'2026-10-17'}));
 });
 it('paginates movements and counts each account opening only once',async()=>{
  rpc.mockImplementation((_name,args)=>Promise.resolve({data:{rows:args.p_offset===0?[movement()]:[movement({id:'c2',debit:'0.20'})],totals:{count:101},opening:'1.00',excluded:2},error:null}));
  const summary=await readAssistantSummary({accountIds:['a'],metric:'sales'});
  expect(summary.totals).toMatchObject({sales:'0.30',opening:'1.00'});
  expect(summary.excluded).toBe(2);expect(rpc).toHaveBeenCalledTimes(2);
 });
 it('subtracts only collections for the explicit sales minus collections metric',async()=>{
  rpc.mockResolvedValue({data:{rows:[movement({debit:'100.20'}),movement({id:'purchase',debit:'0',credit:'30.10'}),movement({id:'collection',source:'collection',debit:'0',credit:'20.05'})],totals:{count:3},opening:'5.00',excluded:0},error:null});
  const summary=await readAssistantSummary({accountIds:['a'],metric:'sales_collections'});
  expect(summary).toMatchObject({metric:'sales_collections',totals:{sales:'100.20',purchases:'30.10',collections:'20.05',salesCollections:'80.15',net:'50.05',balance:'55.05'}});
 });
 it('restricts customer summaries to their actual account including opening balance',async()=>{
  rpc.mockResolvedValue({data:{rows:[movement()],totals:{count:1},opening:'2.00',excluded:0},error:null});
  const summary=await readAssistantSummary({accountIds:['a','b'],customer});
  expect(summary.accountIds).toEqual(['a']);expect(summary.totals.opening).toBe('2.00');
  expect(rpc).toHaveBeenCalledTimes(1);
  await expect(readAssistantSummary({accountIds:['b'],customer})).rejects.toThrow(/seçili hesaba/);
  await expect(readAssistantSummary({accountIds:['a'],customer:{name:'Harmanda'}})).rejects.toThrow(/gerçek müşteri/);
 });
 it('ranks positive debtors using decimal ordering and totals all rows before limiting',async()=>{
  rpc.mockResolvedValue({data:{rows:[{...customer,balance:'9.99',excluded:1},{...customer,customer_key:'2',customer_name:'Cihan',balance:'10.00',excluded:0},{...customer,customer_key:'3',balance:'-5.00',excluded:0},{...customer,account_id:'b',balance:'999',excluded:0}],count:4},error:null});
  const summary=await readAssistantSummary({accountIds:['a'],metric:'debtors',limit:1});
  expect(summary.rows).toEqual([{accountId:'a',name:'Cihan',tax:'123',key:'2',balance:'10.00'}]);
  expect(summary).toMatchObject({count:2,totals:{balance:'19.99'},excluded:1,complete:false});
 });
 it('propagates failed reads instead of claiming a zero total',async()=>{
  rpc.mockResolvedValue({error:{message:'erişim yok'}});
  await expect(readAssistantSummary({accountIds:['a'],metric:'net'})).rejects.toThrow(/erişim yok/);
  rpc.mockResolvedValue({data:null,error:null});
  await expect(readAssistantSummary({accountIds:['a'],metric:'net'})).rejects.toThrow(/doğrulanamadı/);
 });
 it.each(['not-money','NaN','Infinity','',null,undefined])('rejects unknown or malformed collection amounts (%s) instead of reporting zero',async amount=>{
  listCollections.mockResolvedValue([collection({amount})]);
  await expect(readAssistantSummary({accountIds:['a'],metric:'collections'})).rejects.toThrow(/tutarı doğrulanamadı/);
 });
 it.each([{debit:null},{credit:undefined},{amount:'bad-money'},{amount:null}])('rejects unknown or malformed ledger money %j',async changes=>{
  rpc.mockResolvedValue({data:{rows:[movement(changes)],totals:{count:1},opening:'0',excluded:0},error:null});
  await expect(readAssistantSummary({accountIds:['a'],metric:'sales'})).rejects.toThrow(/tutarı doğrulanamadı/);
 });
 it('rejects unverified opening and debtor balances instead of adding zero',async()=>{
  rpc.mockResolvedValue({data:{rows:[],totals:{count:0},opening:null,excluded:0},error:null});
  await expect(readAssistantSummary({accountIds:['a'],metric:'net'})).rejects.toThrow(/tutarı doğrulanamadı/);
  rpc.mockResolvedValue({data:{rows:[{...customer,balance:null}],count:1},error:null});
  await expect(readAssistantSummary({accountIds:['a'],metric:'debtors'})).rejects.toThrow(/tutarı doğrulanamadı/);
 });
 it('rejects invalid scopes, periods and unsupported metrics before querying',async()=>{
  await expect(readAssistantSummary({accountIds:[],metric:'net'})).rejects.toThrow(/hesap/);
  await expect(readAssistantSummary({accountIds:['a'],metric:'unknown'})).rejects.toThrow(/desteklenmiyor/);
  await expect(readAssistantSummary({accountIds:['a'],start:'2026-02-30'})).rejects.toThrow(/tarih/);
  await expect(findAssistantCollections({accountId:'a',start:'2026-10-17',end:'2026-10-16'})).rejects.toThrow(/tarih/);
  expect(rpc).not.toHaveBeenCalled();expect(listCollections).not.toHaveBeenCalled();
 });
});
