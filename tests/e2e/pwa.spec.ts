import {test,expect} from '@playwright/test';

test('home-screen metadata uses real PNG icons and keeps a stable standalone identity',async({page,request})=>{
 const html=await (await request.get('/')).text();const icon=html.match(/<link rel="apple-touch-icon"[^>]*href="([^"]+)"/)?.[1];expect(icon).toContain('v2');
 const response=await request.get(icon!);expect(response.status()).toBe(200);expect(response.headers()['content-type']).toContain('image/png');
 const manifest=await (await request.get('/manifest.json')).json();expect(manifest.id).toBe('/');expect(manifest.display).toBe('standalone');
 for(const icon of manifest.icons.filter((i:any)=>i.type==='image/png'))expect((await request.get(icon.src)).status()).toBe(200);
 await page.goto('/tests/pwa-preview.html');await expect(page.getByRole('img',{name:'Sonvera’nın mavi uygulama ikonu'})).toBeVisible();
 expect(await page.getByRole('img').evaluate((img:HTMLImageElement)=>img.complete&&img.naturalWidth===180)).toBe(true);
});
test('installation help remains responsive and never requests microphone permission',async({page})=>{
 await page.addInitScript(()=>{(window as any).micRequests=0;navigator.mediaDevices.getUserMedia=async()=>{(window as any).micRequests++;throw new Error('Unexpected microphone request');};});
 await page.goto('/tests/pwa-preview.html');await expect(page.getByRole('heading',{name:'Ana ekran uygulaması'})).toBeVisible();
 await page.getByText('iPhone ve iPad’de ana ekrana ekleme',{exact:true}).click();await expect(page.getByText('Paylaş menüsünden “Ana Ekrana Ekle”yi seç.')).toBeVisible();
 for(const width of [360,390,768,1280]){await page.setViewportSize({width,height:844});for(const theme of ['light','dark']){await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}}
 expect(await page.evaluate(()=>(window as any).micRequests)).toBe(0);
});
test('the install prompt runs once after a click and installed mode is accurately shown',async({page})=>{
 await page.goto('/tests/pwa-preview.html');await page.waitForFunction(()=>typeof (window as any).testInstall==='function');await page.evaluate(()=>(window as any).testInstall());
 await expect(page.getByRole('button',{name:'Sonvera’yı yükle'})).toBeVisible();expect(await page.evaluate(()=>(window as any).installRequests)).toBe(0);
 await page.getByRole('button',{name:'Sonvera’yı yükle'}).click();expect(await page.evaluate(()=>(window as any).installRequests)).toBe(1);await expect(page.getByText('Kurulum kabul edildi',{exact:true})).toBeVisible();
});
