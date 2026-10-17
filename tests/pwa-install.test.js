// @vitest-environment jsdom
import {it,expect,vi} from 'vitest';
import {createPwaInstallController} from '../src/lib/pwa-install.js';
import {canAutomaticallyUpdatePwa} from '../src/lib/pwa.js';
it('recognizes iOS standalone mode without creating a fake permission grant',()=>{
 const browser=new EventTarget(),controller=createPwaInstallController({browser,nav:{standalone:true}});
 expect(controller.getState()).toMatchObject({installed:true,standalone:true,canInstall:false});controller.dispose();
});
it('only opens an available install prompt after a user requests it, and consumes it once',async()=>{
 const browser=new EventTarget(),controller=createPwaInstallController({browser,nav:{}}),event=new Event('beforeinstallprompt',{cancelable:true});
 event.prompt=vi.fn(async()=>{});event.userChoice=Promise.resolve({outcome:'accepted'});browser.dispatchEvent(event);
 expect(event.defaultPrevented).toBe(true);expect(event.prompt).not.toHaveBeenCalled();expect(controller.getState().canInstall).toBe(true);
 expect(await controller.install()).toBe('accepted');expect(await controller.install()).toBe('unavailable');expect(event.prompt).toHaveBeenCalledOnce();controller.dispose();
});
it('reports dismissal honestly and never claims installation or microphone access',async()=>{
 const browser=new EventTarget(),controller=createPwaInstallController({browser,nav:{}}),event=new Event('beforeinstallprompt',{cancelable:true});
 event.prompt=vi.fn(async()=>{});event.userChoice=Promise.resolve({outcome:'dismissed'});browser.dispatchEvent(event);
 expect(await controller.install()).toBe('dismissed');expect(controller.getState()).toEqual({installed:false,standalone:false,canInstall:false});controller.dispose();
});
it('tracks installed and display-mode events and detaches on cleanup',()=>{
 const browser=new EventTarget(),media=new EventTarget();media.matches=false;browser.matchMedia=()=>media;
 const changed=vi.fn(),controller=createPwaInstallController({browser,nav:{}});const unsubscribe=controller.subscribe(changed);
 browser.dispatchEvent(new Event('appinstalled'));expect(controller.getState().installed).toBe(true);
 media.matches=true;media.dispatchEvent(new Event('change'));expect(controller.getState().standalone).toBe(true);
 unsubscribe();controller.dispose();changed.mockClear();browser.dispatchEvent(new Event('appinstalled'));expect(changed).not.toHaveBeenCalled();
});
it('defers automatic updates while SonAI is open, requesting permission, or replying',()=>{
 const page=document.createElement('div');
 expect(canAutomaticallyUpdatePwa({document:page,pending:false})).toBe(true);
 for(const state of ['listening','requesting','thinking','speaking']){page.innerHTML='<div class="sv-voice-app" data-voice="'+state+'"></div>';expect(canAutomaticallyUpdatePwa({document:page,pending:false})).toBe(false);}
 page.innerHTML='<section class="sv-assistant-panel"></section>';expect(canAutomaticallyUpdatePwa({document:page,pending:false})).toBe(false);
 page.replaceChildren();expect(canAutomaticallyUpdatePwa({document:page,pending:true})).toBe(false);expect(canAutomaticallyUpdatePwa({document:page,pending:false,dirty:true})).toBe(false);
});
