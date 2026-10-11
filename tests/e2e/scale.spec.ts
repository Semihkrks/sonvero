import {test,expect} from '@playwright/test';
import fs from 'node:fs/promises';
test.skip(process.env.SONVERA_SCALE!=='1','Run explicitly with SONVERA_SCALE=1.');
for(const count of [10000,100000]){
 test('worker export remains responsive with '+count+' synthetic movements',async({page},testInfo)=>{
  test.setTimeout(240000);
  await page.route('https://sonvera-test.supabase.co/**',route=>route.fulfill({contentType:'application/json',body:'[]'}));
  await page.goto('/');
  const download=page.waitForEvent('download',{timeout:200000});
  const result=await page.evaluate(async count=>{
   let ticks=0;const timer=setInterval(()=>ticks++,50);const start=performance.now();
   try{
    // Test fixture only: no account or provider request.
    const module=await import('/src/services/cari-export-worker-client.js');
    const items=Array.from({length:count},(_,i)=>({_accountId:'synthetic',_accountName:'Synthetic',_direction:'giden',CurrencyCode:'TRY',InvoiceType:'SATIS',PayableAmount:120,IssueDate:'2026-01-01',InvoiceNumber:'TEST'+i,ReceiverName:'Synthetic '+(i%10),ReceiverTaxNumber:'1234567890'}));
    const result=await module.exportAllTransactions(items,[{id:'synthetic',name:'Synthetic'}],{direction:'both'});
    return {...result,elapsedMs:Math.round(performance.now()-start),mainThreadTicks:ticks};
   }finally{clearInterval(timer);}
  },count);
  expect(result.success).toBe(true);expect(result.count).toBe(count);expect(result.mainThreadTicks).toBeGreaterThan(5);
  const file=await download;const path=testInfo.outputPath('synthetic-'+count+'.xlsx');await file.saveAs(path);
  const stat=await fs.stat(path);expect(stat.size).toBeGreaterThan(10000);
  await fs.writeFile(testInfo.outputPath('metrics.json'),JSON.stringify({...result,bytes:stat.size},null,2));
  console.log(JSON.stringify({...result,bytes:stat.size}));
 });
}
