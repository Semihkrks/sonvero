import {it,expect,vi,afterEach} from 'vitest';
vi.mock('../src/lib/supabase.js',()=>({getSupabase:()=>({})}));
import {retryRead} from '../src/lib/api-transport.js';
afterEach(()=>vi.useRealTimers());
it('does not repeat successful GETs',async()=>{const fn=vi.fn().mockResolvedValue({success:true,data:[1]});expect((await retryRead(fn)).success).toBe(true);expect(fn).toHaveBeenCalledTimes(1);});
it('does not retry unauthorized reads',async()=>{const fn=vi.fn().mockResolvedValue({success:false,status:403});await retryRead(fn);expect(fn).toHaveBeenCalledTimes(1);});
it('honors provider delay and retries a transient read only',async()=>{
 vi.useFakeTimers();const fn=vi.fn().mockResolvedValueOnce({success:false,status:429,retryAfter:'2'}).mockResolvedValue({success:true});
 const promise=retryRead(fn);await vi.advanceTimersByTimeAsync(1999);expect(fn).toHaveBeenCalledTimes(1);await vi.advanceTimersByTimeAsync(1);await promise;expect(fn).toHaveBeenCalledTimes(2);
});
it('cancels a queued retry when account context changes',async()=>{
 vi.useFakeTimers();const controller=new AbortController(),fn=vi.fn().mockResolvedValue({success:false,status:503});
 const promise=retryRead(fn,{signal:controller.signal});await vi.advanceTimersByTimeAsync(1);controller.abort();expect((await promise).cancelled).toBe(true);expect(fn).toHaveBeenCalledTimes(1);
});
