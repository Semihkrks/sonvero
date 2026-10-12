import {test,expect,type Page} from '@playwright/test';
const user={id:'11111111-1111-4111-8111-111111111111',email:'sonvera@gmail.com',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},created_at:'2026-01-01'};
const account={id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',user_id:user.id,name:'Deneme Ticaret',environment:'test',color:'#2563eb',has_api_key:true,disabled_at:null};
const records:any[]=[];
let writes:any[]=[];
async function setup(page:Page,{loseResponse=false}={}){
 records.length=0;writes=[];
 await page.addInitScript(({user})=>{
  const token=['eyJhbGciOiJIUzI1NiJ9',btoa(JSON.stringify({sub:user.id,role:'authenticated',exp:Math.floor(Date.now()/1000)+3600})),'test'].join('.');
  localStorage.setItem('sb-sonvera-test-auth-token',JSON.stringify({access_token:token,refresh_token:'test-refresh',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user}));
 },{user});
 await page.route('https://sonvera-test.supabase.co/**',async route=>{
  const req=route.request(),url=new URL(req.url());
  const send=(data:any,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
  if(url.pathname.includes('/auth/'))return send(user);
  if(url.pathname.endsWith('/accounts'))return send([account]);
  if(url.pathname.endsWith('/rpc/ledger_page'))return send({rows:records,totals:{count:records.length,debit:'0.00',credit:records.reduce((n,r)=>n+Number(r.amount),0).toFixed(2),balance:'0'},opening:'0',excluded:0,complete:false,lastSync:null});
  if(url.pathname.endsWith('/rpc/collection_command')){
   const args=req.postDataJSON();writes.push(args);
   let row=records.find(r=>r.key===args.p_key);
   if(!row){row={...args.p_record,key:args.p_key,id:crypto.randomUUID(),account_id:account.id,version:1,source:'collection',debit:'0',credit:args.p_record.amount};records.push(row);}
   await new Promise(resolve=>setTimeout(resolve,350));
   if(loseResponse&&writes.length===1)return route.abort('failed');
   return send(row);
  }
  if(url.pathname.endsWith('/rpc/system_health'))return send({databaseBytes:1000000,databaseLimitBytes:524288000,pendingJobs:0,failedJobs:0,unknownOperations:0,lastSync:null});
  if(url.pathname.includes('/functions/'))return send({success:true,data:[]});
  return send([]);
 });
 await page.goto('/#/cari-react');
 await expect(page.getByRole('heading',{name:'Cari ve tahsilat',exact:true})).toBeVisible();
}
async function fillPayment(page:Page){
 await page.getByRole('button',{name:'Tahsilat kaydet',exact:true}).click();
 const modal=page.getByRole('dialog');
 await modal.getByLabel('Müşteri adı',{exact:true}).fill('Örnek Müşteri');
 await modal.getByLabel('VKN / TCKN',{exact:true}).fill('1234567890');
 await modal.getByLabel('Tutar (TL)',{exact:true}).fill('1.234,56');
 return modal;
}
test('ten clicks produce one request and one visible payment',async({page})=>{
 await setup(page);const modal=await fillPayment(page);
 await modal.getByRole('button',{name:'Kaydet',exact:true}).evaluate((button:HTMLButtonElement)=>{for(let i=0;i<10;i++)button.click();});
 await expect(modal).toHaveCount(0);
 expect(writes).toHaveLength(1);expect(records).toHaveLength(1);
 await expect(page.getByText('Örnek Müşteri',{exact:true})).toBeVisible();
});
test('lost response preserves form and reuses operation identity',async({page})=>{
 await setup(page,{loseResponse:true});const modal=await fillPayment(page);
 await modal.getByRole('button',{name:'Kaydet',exact:true}).click();
 await expect(modal.getByRole('alert')).toBeVisible();
 await expect(modal.getByLabel('Tutar (TL)',{exact:true})).toHaveValue('1.234,56');
 await modal.getByRole('button',{name:'Kaydet',exact:true}).click();
 await expect(modal).toHaveCount(0);
 expect(writes).toHaveLength(2);expect(writes[0].p_key).toBe(writes[1].p_key);expect(records).toHaveLength(1);
});
test('separate intentional equal payments remain separate',async({page})=>{
 await setup(page);
 for(let i=0;i<2;i++){const modal=await fillPayment(page);await modal.getByRole('button',{name:'Kaydet',exact:true}).click();await expect(modal).toHaveCount(0);}
 expect(records).toHaveLength(2);expect(writes[0].p_key).not.toBe(writes[1].p_key);
});
test('offline input survives without a write',async({page,context})=>{
 await setup(page);const modal=await fillPayment(page);await context.setOffline(true);
 await modal.getByRole('button',{name:'Kaydet',exact:true}).click();
 await expect(modal.getByRole('alert')).toContainText('Bağlantı yok');
 expect(writes).toHaveLength(0);await expect(modal.getByLabel('Tutar (TL)',{exact:true})).toHaveValue('1.234,56');
});
test('mobile and desktop themes do not overflow the page',async({page})=>{
 await setup(page);const modal=await fillPayment(page);await modal.getByRole('button',{name:'Kaydet',exact:true}).click();await expect(modal).toHaveCount(0);await expect(page.getByText('Örnek Müşteri',{exact:true})).toBeVisible();
 for(const width of [360,390,430,768,1280,1440,1920]){
  await page.setViewportSize({width,height:900});
  for(const theme of ['light','dark']){
   await page.evaluate(t=>{document.documentElement.dataset.theme=t;},theme);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   await page.screenshot({path:'test-results/ledger-'+width+'-'+theme+'.png',fullPage:true});
  }
 }
});
test('invoice edits survive refresh with stable document identity',async({page})=>{
 await setup(page);await page.goto('/#/create');
 await page.locator('#c_vkn').fill('1234567890');await page.locator('#c_name').fill('Taslak Müşteri');
 await page.locator('.line-name').first().fill('Danışmanlık');
 await page.locator('.line-price').first().fill('19.99');
 const before=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('sonvera:draft:invoice:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')!));
 await page.reload();await expect(page.locator('#c_name')).toHaveValue('Taslak Müşteri');
 await expect(page.locator('.line-price').first()).toHaveValue('19.99');
 const after=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('sonvera:draft:invoice:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')!));
 expect(after.documentId).toBe(before.documentId);
});

test('pending payment survives refresh and keeps its original operation key',async({page})=>{
 await setup(page,{loseResponse:true});let modal=await fillPayment(page);
 await modal.getByRole('button',{name:'Kaydet',exact:true}).click();await expect(modal.getByRole('alert')).toBeVisible();
 await page.reload();await page.getByRole('button',{name:'Tahsilat kaydet',exact:true}).click();modal=page.getByRole('dialog');
 await expect(modal.getByLabel('Tutar (TL)',{exact:true})).toHaveValue('1.234,56');
 await modal.getByRole('button',{name:'Kaydet',exact:true}).click();await expect(modal).toHaveCount(0);
 expect(records).toHaveLength(1);expect(writes[0].p_key).toBe(writes[1].p_key);
});

test('malformed saved payment does not prevent opening a new form',async({page})=>{
 await setup(page);await page.evaluate(()=>sessionStorage.setItem('sonvera:draft:collection:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa:new','null'));
 const modal=await fillPayment(page);await expect(modal.getByLabel('Tutar (TL)',{exact:true})).toHaveValue('1.234,56');
});

test('partially entered payment survives refresh without requiring valid fields first',async({page})=>{
 await setup(page);await page.getByRole('button',{name:'Tahsilat kaydet',exact:true}).click();
 await page.getByRole('dialog').getByLabel('Müşteri adı',{exact:true}).fill('Yarım kalan müşteri');
 await page.reload();await page.getByRole('button',{name:'Tahsilat kaydet',exact:true}).click();
 await expect(page.getByRole('dialog').getByLabel('Müşteri adı',{exact:true})).toHaveValue('Yarım kalan müşteri');
});
test('worker export produces a downloadable workbook',async({page})=>{
 await setup(page);const download=page.waitForEvent('download');
 const result=await page.evaluate(async()=>{
  const module=await import('/src/services/cari-export-worker-client.js');
  return module.exportAllTransactions([{_accountId:'synthetic',_accountName:'Synthetic',_direction:'giden',CurrencyCode:'TRY',InvoiceType:'SATIS',PayableAmount:120,IssueDate:'2026-01-01',InvoiceNumber:'TEST1',ReceiverName:'Synthetic',ReceiverTaxNumber:'1234567890'}],[{id:'synthetic',name:'Sem'}],{direction:'both',dateRange:{start:'2026-07-01',end:'2026-10-31'}});
 });
 expect(result.success).toBe(true);expect(result.count).toBe(1);
 expect((await download).suggestedFilename()).toBe('Sem 7-10. AY.xlsx');
});

test('despatch form survives refresh and draft/send share a synchronous lock',async({page})=>{
 await setup(page);await page.goto('/#/eirsaliye-olustur');
 await page.locator('#receiverName').fill('Sevk Müşterisi');await page.locator('#receiverTaxNo').fill('1234567890');
 await page.locator('[data-field="name"]').first().fill('Malzeme');await page.locator('[data-field="quantity"]').first().fill('2');
 const before=await page.locator('#ettnValue').textContent();await page.reload();
 await expect(page.locator('#receiverName')).toHaveValue('Sevk Müşterisi');await expect(page.locator('#ettnValue')).toHaveText(before!);
 let requests=0;
 await page.route('https://sonvera-test.supabase.co/functions/v1/nilvera',async route=>{
  if(route.request().postDataJSON().path==='/edespatch/Draft/Create'){requests++;await new Promise(r=>setTimeout(r,400));}
  await route.fulfill({contentType:'application/json',body:JSON.stringify({success:true,data:[]})});
 });
 await page.locator('#btnSaveDraft').evaluate((button:HTMLButtonElement)=>{for(let i=0;i<10;i++)button.click();(document.querySelector('#btnSend') as HTMLButtonElement).click();});
 await expect.poll(()=>requests).toBe(1);await expect(page.getByRole('dialog')).toHaveCount(0);
});
