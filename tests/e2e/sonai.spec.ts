import {test,expect} from '@playwright/test';
test.beforeEach(async({page})=>{
 await page.addInitScript(()=>{
  (window as any).spokenReplies=[];
  class Utterance{ text:string;lang='';volume=1;onstart?:()=>void;onend?:()=>void;onerror?:()=>void;constructor(text:string){this.text=text;} }
  const synthesis={getVoices:()=>[{lang:'tr-TR',localService:true}],resume:()=>{},cancel:()=>{},speak:(utterance:Utterance)=>{if(utterance.text.trim())(window as any).spokenReplies.push(utterance.text);setTimeout(()=>{utterance.onstart?.();setTimeout(()=>utterance.onend?.(),25);},0);}};
  Object.defineProperty(window,'speechSynthesis',{value:synthesis,configurable:true});Object.defineProperty(window,'SpeechSynthesisUtterance',{value:Utterance,configurable:true});
 });
});

test('SonAI starts microphone on opening and keeps the voice only mobile controls within viewport',async({page})=>{
 await page.addInitScript(()=>{(window as any).micRequests=0;navigator.mediaDevices.getUserMedia=async()=>{(window as any).micRequests++;throw new DOMException('No mic in test','NotAllowedError');};});
 await page.goto('/tests/assistant-preview.html');
 await page.waitForFunction(()=>typeof (window as any).testPanel==='function');
 await page.evaluate(()=> (window as any).testPanel());
 const panel=page.getByRole('dialog',{name:'SonAI',exact:true});
 await expect(panel.getByRole('button',{name:'SonAI ile konuş',exact:true})).toBeVisible();
 await expect.poll(()=>page.evaluate(()=> (window as any).micRequests)).toBe(1);
 for(const width of [360,390,768,1280]){
  await page.setViewportSize({width,height:844});
  for(const theme of ['light','dark']){
   await page.evaluate(theme=>{document.documentElement.dataset.theme=theme;},theme);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
 }
 await expect(panel.getByRole('button',{name:'Yazarak komut ver'})).toHaveCount(0);
 await expect(panel.getByRole('button',{name:'Yeni sohbet'})).toHaveCount(0);
 await expect(panel.getByRole('textbox',{name:'Asistana mesajın'})).toBeHidden();
 await page.keyboard.press('Escape');await expect(panel).toHaveCount(0);
});
test('voice tools correct, summarize, update and cancel a versioned collection',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/tests/assistant-preview.html');await page.waitForFunction(()=>typeof (window as any).testPanel==='function');await page.evaluate(()=> (window as any).testPanel());
 const panel=page.getByRole('dialog',{name:'SonAI',exact:true});
 const send=async(text:string)=>{await expect(panel.locator('#assistantInterpret')).toBeEnabled();await panel.evaluate((p,text)=>{(p.querySelector('#assistantCommand') as HTMLTextAreaElement).value=text;(p.querySelector('#assistantInterpret') as HTMLButtonElement).click();},text);await expect(panel.locator('#assistantInterpret')).toBeEnabled();};
 await send('bugün Ayşe Karabut hesabındaki Cihan müşterisine 60 bin tahsilat ekle');await send('60 değil 65 bin olsun');
 await expect(panel.getByRole('button',{name:'Tahsilatı onayla'})).toBeVisible();await send('onaylıyorum');
 expect(await page.evaluate(()=> (window as any).businessWrites[0].p_record.amount)).toBe('65000.00');
 await send('peki bu ay ne kadar tahsilat yapmışız?');await expect(panel.locator('#assistantMessages')).toContainText('Tahsilat toplamı 65.000,00 TL');
 await send('az önce eklediğim tahsilatı 70 bin olarak düzelt');await expect(panel.getByRole('button',{name:'Düzeltmeyi onayla'})).toBeVisible();
 await send('onaylıyorum');await send('az önce eklediğim tahsilatı iptal et');await expect(panel.getByRole('button',{name:'Tahsilat iptalini onayla'})).toBeVisible();
 await send('onaylıyorum');const writes=await page.evaluate(()=> (window as any).businessWrites);
 expect(writes.map((w:any)=>w.p_action)).toEqual(['create','update','cancel']);expect(writes[1].p_record).toMatchObject({amount:'70000.00',version:1});expect(writes[2].p_record.version).toBe(2);expect(errors).toEqual([]);
});
test('voice tools queue each customer with its own confirmation and speak replies for free',async({page})=>{
 await page.addInitScript(()=>{
  class Recorder{static isTypeSupported(){return true;}state='inactive';start(){this.state='recording';}stop(){this.state='inactive';}}
  class Audio{state='running';sampleRate=44100;resume(){return Promise.resolve();}close(){return Promise.resolve();}createMediaStreamSource(){return {connect(){},disconnect(){}};}createAnalyser(){return {fftSize:1024,frequencyBinCount:512,getFloatTimeDomainData:(a:Float32Array)=>a.fill(0),getByteFrequencyData:(a:Uint8Array)=>a.fill(0)};}}
  const track={readyState:'live',enabled:false,stop(){}};navigator.mediaDevices.getUserMedia=async()=>({getAudioTracks:()=>[track],getTracks:()=>[track]}) as any;
  Object.defineProperty(window,'MediaRecorder',{value:Recorder});Object.defineProperty(window,'AudioContext',{value:Audio});
 });
 await page.goto('/tests/assistant-preview.html');await page.waitForFunction(()=>typeof (window as any).testPanel==='function');await page.evaluate(()=> (window as any).testPanel());
 const panel=page.getByRole('dialog',{name:'SonAI',exact:true});
 const send=async(text:string)=>{await expect(panel.locator('#assistantInterpret')).toBeEnabled();await panel.evaluate((p,text)=>{(p.querySelector('#assistantCommand') as HTMLTextAreaElement).value=text;(p.querySelector('#assistantInterpret') as HTMLButtonElement).click();},text);await expect(panel.locator('#assistantInterpret')).toBeEnabled();};
 await send('bugün Ayşe Karabut hesabındaki Cihan’a 20 bin, Harmanda’ya 60 bin tahsilat ekle');
 await expect.poll(()=>page.evaluate(()=> (window as any).spokenReplies.length)).toBeGreaterThan(0);
 expect(await page.evaluate(()=> (window as any).businessWrites.length)).toBe(0);await send('onaylıyorum');
 await expect(panel.getByRole('button',{name:'Tahsilatı onayla'})).toBeVisible();expect(await page.evaluate(()=> (window as any).businessWrites.length)).toBe(1);await send('onaylıyorum');
 const writes=await page.evaluate(()=> (window as any).businessWrites);expect(writes.map((w:any)=>[w.p_record.customer_name,w.p_record.amount])).toEqual([['Cihan Tekstil','20000.00'],['Harmanda Tekstil','60000.00']]);
 await page.keyboard.press('Escape');await expect(panel).toHaveCount(0);
});

test('SonAI requires explicit financial confirmation and retries lost responses with the same key',async({page})=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/tests/assistant-preview.html');await page.waitForFunction(()=>typeof (window as any).testPanel==='function');await page.evaluate(()=> (window as any).testPanel());
 const panel=page.getByRole('dialog',{name:'SonAI',exact:true});
 const send=async(text:string)=>{await expect(panel.locator('#assistantInterpret')).toBeEnabled();await panel.evaluate((p,text)=>{(p.querySelector('#assistantCommand') as HTMLTextAreaElement).value=text;(p.querySelector('#assistantInterpret') as HTMLButtonElement).click();},text);};
 await send('bugün Ayşe Karabut hesabındaki Cihan müşterisine altmış bin tahsilat ekle');
 await expect(panel.getByRole('button',{name:'Tahsilatı onayla'})).toBeVisible();
 expect(await page.evaluate(()=> (window as any).businessWrites.length)).toBe(0);
 await send('tekrar kontrol et');await expect(panel.locator('#assistantInterpret')).toBeEnabled();
 expect(await page.evaluate(()=> (window as any).businessWrites.length)).toBe(0);
 await page.evaluate(()=>{(window as any).loseCollectionResponse=true;});await send('onaylıyorum');
 await expect(panel.getByRole('button',{name:'Aynı kaydı kontrol et'})).toBeVisible();
 await send('onaylıyorum');
 await expect(panel.getByRole('button',{name:'Aynı kaydı kontrol et'})).toHaveCount(0);
 const writes=await page.evaluate(()=> (window as any).businessWrites);
 expect(writes).toHaveLength(2);expect(writes[0].p_key).toBe(writes[1].p_key);
 expect(writes[0].p_record).toMatchObject({customer_name:'Cihan Tekstil',customer_tax_no:'1234567890',amount:'60000.00'});
 await send('onaylıyorum');await expect(panel.locator('#assistantInterpret')).toBeEnabled();
 expect(await page.evaluate(()=> (window as any).businessWrites.length)).toBe(2);expect(errors).toEqual([]);
});
test('a remembered customer supports a short extra-payment command without repeated identity questions',async({page})=>{
 await page.goto('/tests/assistant-preview.html');await page.waitForFunction(()=>typeof (window as any).testPanel==='function');await page.evaluate(()=> (window as any).testPanel());
 const panel=page.getByRole('dialog',{name:'SonAI',exact:true});
 const send=async(text:string)=>{await expect(panel.locator('#assistantInterpret')).toBeEnabled();await panel.evaluate((p,text)=>{(p.querySelector('#assistantCommand') as HTMLTextAreaElement).value=text;(p.querySelector('#assistantInterpret') as HTMLButtonElement).click();},text);await expect(panel.locator('#assistantInterpret')).toBeEnabled();};
 await send('Harmanda müşterimiz');await expect(panel.locator('.sv-chat-assistant').last()).toContainText('Harmanda Tekstil müşterisini seçtim');
 await send('buna 2k daha ekle');await expect(panel.getByRole('button',{name:'Tahsilatı onayla'})).toBeVisible();
 await expect(panel.locator('.sv-chat-assistant').last()).toContainText('2.000,00 TL');expect(await page.evaluate(()=> (window as any).businessWrites.length)).toBe(0);
 await send('onaylıyorum');const writes=await page.evaluate(()=> (window as any).businessWrites);
 expect(writes).toHaveLength(1);expect(writes[0].p_record).toMatchObject({customer_name:'Harmanda Tekstil',customer_tax_no:'9876543210',amount:'2000.00'});
});
