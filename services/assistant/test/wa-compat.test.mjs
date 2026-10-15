import {test} from 'node:test';
import assert from 'node:assert/strict';
import {installMediaCompatibility} from '../wa-compat.mjs';
test('normalizes media models without leaking model identity into the outgoing message',async()=>{
 const blob={media:true};
 globalThis.window={WWebJS:{processMediaData:async()=>({mediaBlob:blob,filename:'test.xlsx',toJSON:()=>({id:'bad-id',_internal:true,parent:{},mimetype:'application/test',filehash:'hash',size:42})})}};
 try{
  installMediaCompatibility();const installed=window.WWebJS.processMediaData;installMediaCompatibility();assert.equal(window.WWebJS.processMediaData,installed);
  const result=await installed();assert.equal(result.id,undefined);assert.equal(result.parent,undefined);assert.equal(result._internal,undefined);
  assert.equal(result.mediaBlob,blob);assert.equal(result.filename,'test.xlsx');assert.equal(result.filehash,'hash');assert.equal(result.size,42);
 }finally{delete globalThis.window;}
});
