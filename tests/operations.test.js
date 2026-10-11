import {describe,it,expect,beforeEach,vi} from 'vitest';
import { singleFlight,stableJson,operationIntent,completeIntent,hasPendingMutation } from '../src/lib/operations.js';
beforeEach(()=>{const storage=new Map();vi.stubGlobal('localStorage',{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)});});
describe('Operation intent',()=>{
 it('joins twenty simultaneous clicks into one mutation',async()=>{
  let finish;let count=0;const run=()=>{count++;return new Promise(resolve=>{finish=resolve;});};
  const promises=Array.from({length:20},()=>singleFlight('same-command',run));await Promise.resolve();expect(count).toBe(1);expect(hasPendingMutation()).toBe(true);finish({id:1});expect(await Promise.all(promises)).toEqual(Array(20).fill({id:1}));expect(hasPendingMutation()).toBe(false);
 });
 it('keeps pending identity, rejects changed payload, allows a deliberate next payment',()=>{
  const key=operationIntent('one','hash-a');expect(operationIntent('one','hash-a')).toBe(key);expect(()=>operationIntent('one','hash-b')).toThrow();completeIntent('one');expect(operationIntent('one','hash-a')).not.toBe(key);
 });
 it('canonicalizes object keys without changing array order',()=>{expect(stableJson({b:2,a:1})).toBe(stableJson({a:1,b:2}));expect(stableJson([1,2])).not.toBe(stableJson([2,1]));});
});
