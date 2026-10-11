import {it,expect,vi} from 'vitest';
import {fetchAllPagesChunked,splitDateRange} from '../src/services/nilvera-fetcher.js';
it('keeps date windows adjacent across leap years',()=>{const chunks=splitDateRange('2024-02-28','2024-03-02',2);expect(chunks).toEqual([{start:'2024-02-28',end:'2024-02-29'},{start:'2024-03-01',end:'2024-03-02'}]);});
it('does not label page-limit truncation complete',async()=>{const fn=vi.fn(async()=>({success:true,data:{Content:[{UUID:crypto.randomUUID()}],TotalPages:5}}));const stats={failed:false};await fetchAllPagesChunked(fn,{}, {},{maxPages:2,stats});expect(stats.failed).toBe(true);expect(fn).toHaveBeenCalledTimes(2);});
it('signals failure when no stats collector is supplied',async()=>{await expect(fetchAllPagesChunked(async()=>({success:false}),{},{})).rejects.toThrow(/tamamı/);});
