// @vitest-environment jsdom
import {it,expect,vi} from 'vitest';
import {listenScoped,disposeEventScope} from '../src/lib/page-events.js';
it('removes old page and layout listeners when navigating away',()=>{
 const root=document.createElement('main'),child=document.createElement('header');root.append(child);
 const callback=vi.fn();listenScoped(child,window,'resize',callback);
 window.dispatchEvent(new Event('resize'));expect(callback).toHaveBeenCalledTimes(1);
 disposeEventScope(root);window.dispatchEvent(new Event('resize'));expect(callback).toHaveBeenCalledTimes(1);
});
