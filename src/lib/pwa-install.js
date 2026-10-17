/** Installation state comes from browser events, never from a made-up stored permission. */
export function createPwaInstallController({browser=globalThis.window,nav=globalThis.navigator}={}){
 const media=browser?.matchMedia?.('(display-mode: standalone)');
 let prompt=null,installed=false,disposed=false;const listeners=new Set();
 const getState=()=>{const standalone=!!(media?.matches||nav?.standalone);return {installed:installed||standalone,standalone,canInstall:!!prompt&&!standalone&&!installed};};
 const emit=()=>{const state=getState();if(browser?.document)browser.document.documentElement.dataset.displayMode=state.standalone?'standalone':'browser';for(const listener of listeners)listener(state);};
 const beforeInstall=event=>{event.preventDefault();prompt=event;emit();};
 const onInstalled=()=>{installed=true;prompt=null;emit();};
 browser?.addEventListener('beforeinstallprompt',beforeInstall);browser?.addEventListener('appinstalled',onInstalled);media?.addEventListener?.('change',emit);emit();
 async function install(){
  if(disposed||!getState().canInstall)return 'unavailable';
  const event=prompt;prompt=null;emit();await event.prompt();const result=await event.userChoice;
  if(!disposed&&result?.outcome==='accepted'){installed=true;emit();}
  return result?.outcome==='accepted'?'accepted':'dismissed';
 }
 return {getState,install,subscribe(listener){listeners.add(listener);return()=>{listeners.delete(listener);};},dispose(){disposed=true;prompt=null;listeners.clear();browser?.removeEventListener('beforeinstallprompt',beforeInstall);browser?.removeEventListener('appinstalled',onInstalled);media?.removeEventListener?.('change',emit);}};
}
let shared;
export function getPwaInstallController(){return shared||=createPwaInstallController();}
