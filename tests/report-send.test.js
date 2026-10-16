// @vitest-environment jsdom
import {it,expect,vi,beforeEach,afterEach} from 'vitest';
vi.mock('../src/services/assistant-client.js',()=>({assistantRequest:vi.fn(async()=>({connection:'ready',recipient:'905000000000'})),blobBase64:vi.fn(async()=> 'UEs=')}));
vi.mock('../src/services/cari-export-worker-client.js',()=>({prepareCariFile:vi.fn(async()=>({fileName:'cari.xlsx',blob:new Blob(['PK'],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'})}))}));
vi.mock('../src/services/report-image.js',()=>({createReportImage:vi.fn(async()=>new Blob(['png'],{type:'image/png'}))}));
vi.mock('../src/lib/supabase.js',()=>({getSupabase:()=>({rpc:async()=>({data:{revision:1}})})}));
import {previewReport} from '../src/components/report-send.js';
import {assistantRequest} from '../src/services/assistant-client.js';
import {prepareCariFile} from '../src/services/cari-export-worker-client.js';
import {createReportImage} from '../src/services/report-image.js';
let view;
beforeEach(()=>{vi.clearAllMocks();vi.stubGlobal('structuredClone',value=>JSON.parse(JSON.stringify(value)));URL.createObjectURL=vi.fn(()=> 'blob:test');URL.revokeObjectURL=vi.fn();assistantRequest.mockImplementation(async url=>url==='/send'?{id:'test',status:'sent'}:{connection:'ready',recipient:'905000000000'});});
afterEach(()=>{view?.close();document.body.replaceChildren();vi.unstubAllGlobals();});
for(const [format,types] of [['excel',['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']],['image',['image/png']],['both',['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','image/png']]]){
 it('prepares and sends only '+format,async()=>{
  const target=document.createElement('div');document.body.append(target);
  view=await previewReport({groups:[{name:'Volkan',tax:'111',rows:[]}],accounts:[{id:'a',name:'A'}],options:{format,start:'2026-09-01',end:'2026-09-30',direction:'both',withCollections:true},target});
  expect(prepareCariFile).toHaveBeenCalledTimes(format==='image'?0:1);expect(createReportImage).toHaveBeenCalledTimes(format==='excel'?0:1);
  await Promise.all([view.send(),view.send()]);
  const sends=assistantRequest.mock.calls.filter(([url])=>url==='/send');expect(sends).toHaveLength(1);
  expect(sends[0][1].files.map(file=>file.mime)).toEqual(types);
 });
}
it('does not send after the preview closes during recipient validation',async()=>{
 const target=document.createElement('div');document.body.append(target);
 view=await previewReport({groups:[{name:'Volkan',rows:[]}],accounts:[{id:'a'}],options:{format:'image'},target});
 let finish;assistantRequest.mockImplementation(url=>url==='/status'?new Promise(resolve=>{finish=resolve;}):Promise.resolve({status:'sent'}));
 const send=view.send();await vi.waitFor(()=>expect(finish).toBeTypeOf('function'));view.close();finish({connection:'ready',recipient:'905000000000'});await send;
 expect(assistantRequest.mock.calls.some(([url])=>url==='/send')).toBe(false);
});
it('prepares more than six customers as one Excel without truncation or extra attachments',async()=>{
 const target=document.createElement('div');document.body.append(target);
 const groups=Array.from({length:9},(_,index)=>({name:'Firma '+index,rows:[{raw:{_accountId:'a',ReceiverName:'Firma '+index}}]}));
 view=await previewReport({groups,accounts:[{id:'a',name:'Ayşe Karabut'}],options:{allCustomers:true,format:'excel',start:'2026-09-01',end:'2026-09-30',direction:'both',withCollections:true,layout:'separate'},target});
 expect(view.ready).toBe(true);expect(prepareCariFile).toHaveBeenCalledOnce();expect(createReportImage).not.toHaveBeenCalled();
 expect(prepareCariFile.mock.calls[0][0]).toBe('exportAllTransactions');expect(prepareCariFile.mock.calls[0][1][0]).toHaveLength(9);
 expect(target.textContent).toContain('9 müşteri');await view.send();
 expect(assistantRequest.mock.calls.find(([url])=>url==='/send')[1].files).toHaveLength(1);
});
it('keeps the Excel available when the WhatsApp status service cannot be reached',async()=>{
 assistantRequest.mockRejectedValue(new Error('offline'));
 const target=document.createElement('div');document.body.append(target);
 view=await previewReport({groups:[{name:'Firma',rows:[]}],accounts:[{id:'a'}],options:{allCustomers:true,format:'excel'},target});
 expect(view.ready).toBe(true);expect(target.querySelector('a[download]')).not.toBe(null);expect(target.querySelector('.sv-confirm-send').disabled).toBe(true);
 expect(await view.send()).toBe(false);
});
