import {mountAssistant} from '../pages/assistant.js';
import {assistantContext} from '../services/assistant-context.js';
import {hasPendingMutation} from '../lib/operations.js';
import {activateVoiceAudio} from '../services/voice-session.js';
let active=null;
export async function openAssistantPanel(trigger,{listen=true}={}){
 if(active){active.focus();return;}
 const audioContext=listen?activateVoiceAudio():undefined;
 const context=assistantContext(),overlay=document.createElement('div');overlay.className='sv-assistant-overlay';
 const panel=document.createElement('section');panel.className='sv-assistant-panel';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label','SonAI');panel.tabIndex=-1;
 panel.innerHTML='<button class="sv-panel-close" type="button" aria-label="SonAI’yi kapat"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button><div class="sv-panel-content"><p role="status">SonAI açılıyor…</p></div>';
 document.body.append(overlay,panel);active=panel;const previous=document.activeElement;trigger?.setAttribute('aria-expanded','true');
 let app,closed=false;const previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';
 function close(){if(closed||hasPendingMutation())return;closed=true;app?.cleanup();active=null;overlay.remove();panel.remove();document.body.style.overflow=previousOverflow;document.removeEventListener('keydown',onKey);window.removeEventListener('hashchange',close);trigger?.setAttribute('aria-expanded','false');if(previous?.isConnected)previous.focus();}
 function onKey(e){if(document.querySelector('.modal-overlay'))return;if(e.key==='Escape'){e.preventDefault();close();}if(e.key==='Tab'){const nodes=[...panel.querySelectorAll('button:not(:disabled),textarea,input:not(:disabled),select:not(:disabled),summary,a[href]')].filter(n=>n.getClientRects().length);const first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}}
 overlay.onclick=close;panel.querySelector('.sv-panel-close').onclick=close;document.addEventListener('keydown',onKey);window.addEventListener('hashchange',close);panel.focus();
 try{app=await mountAssistant({compact:true,context,audioContext});if(closed){app.cleanup();return;}panel.querySelector('.sv-panel-content').replaceChildren(app.page);if(listen)app.page.querySelector('#assistantMic')?.click();else if(window.innerWidth>768)app.page.querySelector('#assistantCommand')?.focus({preventScroll:true});}catch{void audioContext?.close();if(closed)return;panel.querySelector('.sv-panel-content').textContent='Asistan açılamadı. Bağlantını kontrol edip tekrar aç.';}
}
