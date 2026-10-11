import {hasPendingMutation} from '../lib/operations.js';
import {escapeHtml} from '../lib/html.js';
const openModals=new Set();
export function showModal({title,body,footer,size='',onClose}){
 const container=document.getElementById('modal-container');if(!container)return null;
 const previous=document.activeElement;
 const overlay=document.createElement('div');overlay.className='modal-overlay';
 overlay.innerHTML='<div class="modal '+(size?'modal-'+escapeHtml(size):'')+'" role="dialog" aria-modal="true" tabindex="-1"><div class="modal-header"><h2>'+escapeHtml(title)+'</h2><button class="modal-close" aria-label="Kapat">✕</button></div><div class="modal-body"></div>'+(footer?'<div class="modal-footer"></div>':'')+'</div>';
 const dialog=overlay.querySelector('.modal');dialog.setAttribute('aria-label',title);
 for(const [selector,content] of [['.modal-body',body],['.modal-footer',footer]]){
  const node=overlay.querySelector(selector);if(!node)continue;
  if(typeof content==='string')node.innerHTML=content;else if(content instanceof HTMLElement)node.append(content);
 }
 let closed=false;
 const close=(force=false)=>{
  if(closed||(!force&&hasPendingMutation()))return;
  closed=true;document.removeEventListener('keydown',keydown);openModals.delete(close);overlay.remove();onClose?.();
  if(previous?.isConnected)previous.focus();
 };
 const keydown=event=>{
  if(container.lastElementChild!==overlay)return;
  if(event.key==='Escape'){event.preventDefault();close();}
  if(event.key==='Tab'){
   const items=[...dialog.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href]')].filter(n=>n.getClientRects().length);
   if(!items.length){event.preventDefault();dialog.focus();return;}
   if(event.shiftKey&&document.activeElement===items[0]){event.preventDefault();items.at(-1).focus();}
   else if(!event.shiftKey&&document.activeElement===items.at(-1)){event.preventDefault();items[0].focus();}
  }
 };
 overlay.querySelector('.modal-close').addEventListener('click',()=>close());
 overlay.addEventListener('click',event=>{if(event.target===overlay)close();});
 container.append(overlay);document.addEventListener('keydown',keydown);openModals.add(close);
 queueMicrotask(()=>dialog.querySelector('input,select,textarea,button')?.focus());
 return {overlay,close:()=>close()};
}
export function closeAllModals(){for(const close of [...openModals])close(true);}
