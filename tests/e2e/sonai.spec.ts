import {test,expect} from '@playwright/test';
test.beforeEach(async({page})=>{
 await page.addInitScript(()=>{
  (window as any).spokenReplies=[];
  class Utterance{ text:string;lang='';volume=1;onstart?:()=>void;onend?:()=>void;onerror?:()=>void;constructor(text:string){this.text=text;} }
  const synthesis={getVoices:()=>[{lang:'tr-TR',localService:true}],resume:()=>{},cancel:()=>{},speak:(utterance:Utterance)=>{if(utterance.text.trim()){(window as any).spokenReplies.push(utterance.text);(window as any).muteMicOnSpeech?.();}setTimeout(()=>{utterance.onstart?.();if((window as any).holdSpeech&&utterance.text.trim())(window as any).finishSpeech=()=>utterance.onend?.();else setTimeout(()=>utterance.onend?.(),25);},0);}};
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
test('orb bars stay even in silence and animate on speech without frequency bands',async({page},testInfo)=>{
 await page.emulateMedia({reducedMotion:'no-preference'});await page.setViewportSize({width:390,height:844});
 await page.addInitScript(()=>{
  (window as any).orbSample=0;
  class Recorder{static isTypeSupported(){return true;}state='inactive';start(){this.state='recording';}stop(){this.state='inactive';}}
  class Audio{state='running';sampleRate=44100;resume(){return Promise.resolve();}close(){return Promise.resolve();}createMediaStreamSource(){return {connect(){},disconnect(){}};}createAnalyser(){return {fftSize:1024,frequencyBinCount:512,getFloatTimeDomainData:(a:Float32Array)=>a.fill((window as any).orbSample),getByteFrequencyData:(a:Uint8Array)=>a.fill(0)};}}
  const track={readyState:'live',enabled:false,stop(){}};navigator.mediaDevices.getUserMedia=async()=>({getAudioTracks:()=>[track],getTracks:()=>[track]}) as any;
  Object.defineProperty(window,'MediaRecorder',{value:Recorder});Object.defineProperty(window,'AudioContext',{value:Audio});
 });
 await page.goto('/tests/assistant-preview.html');await page.waitForFunction(()=>typeof (window as any).testPanel==='function');await page.evaluate(()=> (window as any).testPanel());
 const panel=page.getByRole('dialog',{name:'SonAI',exact:true}),app=panel.locator('.sv-voice-app'),bars=app.locator('.sv-orb-core i');
 await expect(app).toHaveAttribute('data-voice','listening');await expect(app).toHaveAttribute('data-sound','quiet');
 const heights=await bars.evaluateAll(nodes=>nodes.map(node=>({css:getComputedStyle(node).height,visible:node.getBoundingClientRect().height,animation:getComputedStyle(node).animationName})));
 expect(heights.map(bar=>bar.css)).toEqual(Array(5).fill('32px'));expect(heights.every(bar=>Math.abs(bar.visible-7.04)<.1&&bar.animation==='none')).toBe(true);
 await panel.screenshot({path:testInfo.outputPath('orb-quiet.png')});
 await page.evaluate(()=>{(window as any).orbSample=.04;});await expect(app).toHaveAttribute('data-sound','active');
 expect(await bars.evaluateAll(nodes=>nodes.map(node=>getComputedStyle(node).animationName))).toEqual(Array(5).fill('sonai-listen-wave'));
 const first=await bars.evaluateAll(nodes=>nodes.map(node=>getComputedStyle(node).transform));
 await expect.poll(()=>bars.evaluateAll(nodes=>nodes.map(node=>getComputedStyle(node).transform))).not.toEqual(first);
 await panel.screenshot({path:testInfo.outputPath('orb-talking.png')});
 await page.evaluate(()=>{(window as any).orbSample=0;});await expect(app).toHaveAttribute('data-sound','quiet');
 await expect.poll(()=>bars.evaluateAll(nodes=>nodes.every(node=>Math.abs(node.getBoundingClientRect().height-7.04)<.1))).toBe(true);
 await app.getByRole('button',{name:'Dinlemeyi durdur',exact:true}).click();await expect(app).toHaveAttribute('data-voice','idle');
 expect(await bars.evaluateAll(nodes=>nodes.map(node=>getComputedStyle(node).height))).toEqual(Array(5).fill('32px'));
 await app.evaluate(node=>{(node as HTMLElement).dataset.voice='thinking';});await panel.screenshot({path:testInfo.outputPath('orb-thinking.png')});
 expect(await app.locator('.sv-orb-core').evaluate(node=>getComputedStyle(node).animationName)).toBe('sonai-thought-turn');
 await app.evaluate(node=>{(node as HTMLElement).dataset.voice='speaking';});expect(await bars.evaluateAll(nodes=>nodes.map(node=>getComputedStyle(node).animationName))).toEqual(Array(5).fill('sonai-listen-wave'));
 await page.emulateMedia({reducedMotion:'reduce'});expect(await bars.evaluateAll(nodes=>nodes.map(node=>getComputedStyle(node).animationName))).toEqual(Array(5).fill('none'));
 for(const width of [360,390,768,1280]){await page.setViewportSize({width,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
 await page.evaluate(()=>{document.documentElement.dataset.theme='dark';});await panel.screenshot({path:testInfo.outputPath('orb-dark.png')});
 await page.keyboard.press('Escape');await expect(panel).toHaveCount(0);
});

test('a muted microphone captures speech again after an answer ends or is interrupted',async({page})=>{
 await page.addInitScript(()=>{
  Object.assign(window,{holdSpeech:true,micTracks:[],orbSample:0});
  class Recorder{static isTypeSupported(){return true;}state='inactive';start(){this.state='recording';}stop(){this.state='inactive';}}
  class Audio{state='running';sampleRate=44100;resume(){return Promise.resolve();}close(){return Promise.resolve();}createMediaStreamSource(){return {connect(){},disconnect(){}};}createAnalyser(){return {fftSize:1024,frequencyBinCount:512,getFloatTimeDomainData:(a:Float32Array)=>a.fill((window as any).orbSample),getByteFrequencyData:(a:Uint8Array)=>a.fill(0)};}}
  navigator.mediaDevices.getUserMedia=async()=>{const track={readyState:'live',muted:false,enabled:false,stop(){this.readyState='ended';}};(window as any).micTracks.push(track);return {getAudioTracks:()=>[track],getTracks:()=>[track]} as any;};
  (window as any).muteMicOnSpeech=()=>{(window as any).micTracks.at(-1).muted=true;};
  Object.defineProperty(window,'MediaRecorder',{value:Recorder});Object.defineProperty(window,'AudioContext',{value:Audio});
 });
 await page.goto('/tests/assistant-preview.html');await page.waitForFunction(()=>typeof (window as any).testPanel==='function');await page.evaluate(()=> (window as any).testPanel());
 const panel=page.getByRole('dialog',{name:'SonAI',exact:true}),app=panel.locator('.sv-voice-app');await expect(app).toHaveAttribute('data-voice','listening');
 const send=async()=>{await panel.evaluate(p=>{(p.querySelector('#assistantCommand') as HTMLTextAreaElement).value='nasılsın';(p.querySelector('#assistantInterpret') as HTMLButtonElement).click();});await expect(app).toHaveAttribute('data-voice','speaking');};
 await send();await expect(panel.getByRole('button',{name:'Araya gir',exact:true})).toBeVisible();
 await page.waitForFunction(()=>typeof (window as any).finishSpeech==='function');await page.evaluate(()=> (window as any).finishSpeech());
 await expect(app).toHaveAttribute('data-voice','listening');expect(await page.evaluate(()=> (window as any).micTracks.length)).toBe(2);
 await page.evaluate(()=>{(window as any).orbSample=.04;});await expect(app).toHaveAttribute('data-sound','active');
 await send();await panel.getByRole('button',{name:'Araya gir',exact:true}).click();await expect(app).toHaveAttribute('data-voice','listening');
 expect(await page.evaluate(()=> (window as any).micTracks.length)).toBe(3);await expect(app).toHaveAttribute('data-sound','active');
 expect(await page.evaluate(()=> (window as any).micTracks.filter((track:any)=>track.enabled&&track.readyState==='live').length)).toBe(1);
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
 await send('en son eklediğim tahsilat ne');await expect(panel.locator('.sv-chat-assistant').last()).toContainText('65.000,00 TL');
 await expect(panel.getByRole('button',{name:'Tahsilatı onayla'})).toHaveCount(0);expect(await page.evaluate(()=> (window as any).businessWrites.length)).toBe(1);
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
 await send('Harmanda müşterimiz');await expect(panel.locator('.sv-chat-assistant').last()).toContainText('Harmanda Tekstil');
 await send('buna 2k daha ekle');await expect(panel.getByRole('button',{name:'Tahsilatı onayla'})).toBeVisible();
 await expect(panel.locator('.sv-chat-assistant').last()).toContainText('2.000,00 TL');expect(await page.evaluate(()=> (window as any).businessWrites.length)).toBe(0);
 await send('onaylıyorum');const writes=await page.evaluate(()=> (window as any).businessWrites);
 expect(writes).toHaveLength(1);expect(writes[0].p_record).toMatchObject({customer_name:'Harmanda Tekstil',customer_tax_no:'9876543210',amount:'2000.00'});
});
test('a short customer name and all report filters in one sentence produce a downloadable Excel',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/tests/assistant-preview.html');await page.waitForFunction(()=>typeof (window as any).testPanel==='function');await page.evaluate(()=> (window as any).testPanel());
 const panel=page.getByRole('dialog',{name:'SonAI',exact:true});
 await panel.evaluate(p=>{(p.querySelector('#assistantCommand') as HTMLTextAreaElement).value='ayşe karabut hesabından 9.ay satışalış tahsilatdahil harmanda müşterisinin excelini ver';(p.querySelector('#assistantInterpret') as HTMLButtonElement).click();});
 await expect(panel.locator('.sv-chat-assistant').last()).toContainText('Excel hazır');
 await expect(panel.locator('#assistantResults')).toContainText('Harmanda Tekstil');
 const download=page.waitForEvent('download');await panel.getByRole('link',{name:'Excel’i incele ↗'}).click();
 expect((await download).suggestedFilename()).toMatch(/\.xlsx$/);
 expect(await page.evaluate(()=> (window as any).businessWrites.length)).toBe(0);
 expect(await page.evaluate(()=> (window as any).sentRequests.length)).toBe(0);expect(errors).toEqual([]);
});
test('a persisted latest collection can be edited after reopening and a field answer advances to the value',async({page})=>{
 await page.goto('/tests/assistant-preview.html');await page.waitForFunction(()=>typeof (window as any).testPanel==='function');
 await page.evaluate(()=>{(window as any).seedCollection({id:'saved-before-conversation',customer_name:'Harmanda Tekstil',customer_tax_no:'9876543210',customer_key:'9876543210',amount:'60000.00',date:'2026-09-01',created_at:'2026-10-17T08:00:00Z'});(window as any).testPanel();});
 const panel=page.getByRole('dialog',{name:'SonAI',exact:true});
 const send=async(text:string)=>{await expect(panel.locator('#assistantInterpret')).toBeEnabled();await panel.evaluate((p,text)=>{(p.querySelector('#assistantCommand') as HTMLTextAreaElement).value=text;(p.querySelector('#assistantInterpret') as HTMLButtonElement).click();},text);await expect(panel.locator('#assistantInterpret')).toBeEnabled();};
 await send('Ayşe Karabuttaki son eklediğim tahsilatın tutarı yanlıştı onu 75 bin olarak düzeltir misin');
 await expect(panel.getByRole('button',{name:'Düzeltmeyi onayla'})).toBeVisible();expect(await page.evaluate(()=> (window as any).businessWrites.length)).toBe(0);
 await send('onaylıyorum');expect(await page.evaluate(()=> (window as any).businessWrites[0].p_record)).toMatchObject({id:'saved-before-conversation',amount:'75000.00',version:1});
 await send('tahsilat düzelt');await send('tutar');
 await expect(panel.locator('.sv-chat-assistant').last()).toContainText('Yeni tutar');
 await send('80 bin tarihi de dün olsun');await expect(panel.getByRole('button',{name:'Düzeltmeyi onayla'})).toBeVisible();
 await send('onaylıyorum');expect(await page.evaluate(()=> (window as any).businessWrites[1].p_record)).toMatchObject({id:'saved-before-conversation',amount:'80000.00',version:2});
});
