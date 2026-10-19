import {hasPendingMutation} from '../lib/operations.js';
import {escapeHtml} from '../lib/html.js';
const openModals=new Set();
let modalSeq=0;
const CLOSE_ICON='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M18 6 6 18M6 6l12 12"/></svg>';
const FOCUSABLE='button:not(:disabled),input:not(:disabled):not([type="hidden"]),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex]:not([tabindex="-1"]),[contenteditable="true"]';
const focusableIn=root=>[...root.querySelectorAll(FOCUSABLE)].filter(n=>n.getClientRects().length&&!n.closest('[inert]'));
export function showModal({title,body,footer,size='',onClose}){
 const container=document.getElementById('modal-container');if(!container)return null;
 const previous=document.activeElement;
 const titleId='modal-title-'+(++modalSeq);
 const overlay=document.createElement('div');overlay.className='modal-overlay';
 overlay.innerHTML='<div class="modal '+(size?'modal-'+escapeHtml(size):'')+'" role="dialog" aria-modal="true" aria-labelledby="'+titleId+'" tabindex="-1"><div class="modal-header"><h2 id="'+titleId+'">'+escapeHtml(title)+'</h2><button type="button" class="modal-close" aria-label="Kapat">'+CLOSE_ICON+'</button></div><div class="modal-body"></div>'+(footer?'<div class="modal-footer"></div>':'')+'</div>';
 const dialog=overlay.querySelector('.modal');
 for(const [selector,content] of [['.modal-body',body],['.modal-footer',footer]]){
  const node=overlay.querySelector(selector);if(!node)continue;
  if(typeof content==='string')node.innerHTML=content;else if(content instanceof HTMLElement)node.append(content);
 }
 let closed=false;
 const close=(force=false)=>{
  if(closed||(!force&&hasPendingMutation()))return;
  closed=true;document.removeEventListener('keydown',keydown);openModals.delete(close);overlay.remove();onClose?.();
  if(previous instanceof HTMLElement&&previous!==document.body&&previous.isConnected&&!previous.closest('[inert]'))previous.focus({preventScroll:true});
 };
 const keydown=event=>{
  if(container.lastElementChild!==overlay)return;
  if(event.key==='Escape'){event.preventDefault();close();}
  if(event.key==='Tab'){
   const items=focusableIn(dialog);
   if(!items.length){event.preventDefault();dialog.focus();return;}
   const active=document.activeElement;
   if(!dialog.contains(active)){event.preventDefault();(event.shiftKey?items.at(-1):items[0]).focus();return;}
   if(event.shiftKey&&(active===items[0]||active===dialog)){event.preventDefault();items.at(-1).focus();}
   else if(!event.shiftKey&&active===items.at(-1)){event.preventDefault();items[0].focus();}
  }
 };
 overlay.querySelector('.modal-close').addEventListener('click',()=>close());
 overlay.addEventListener('click',event=>{if(event.target===overlay)close();});
 container.append(overlay);document.addEventListener('keydown',keydown);openModals.add(close);
 // Initial focus: first field in the body, else the primary action, else the dialog itself.
 queueMicrotask(()=>{
  if(closed||dialog.contains(document.activeElement))return;
  const bodyNode=dialog.querySelector('.modal-body');
  const field=bodyNode&&focusableIn(bodyNode).find(n=>n.matches('input,select,textarea,[contenteditable="true"]'));
  const footerNode=dialog.querySelector('.modal-footer');
  const isPrimary=n=>n.matches('.btn-primary,[type="submit"]');
  const primary=focusableIn(dialog).find(n=>isPrimary(n)&&!n.closest('.modal-header'))||(footerNode&&focusableIn(footerNode)[0]);
  const fallback=bodyNode&&focusableIn(bodyNode)[0];
  (field||primary||fallback||dialog).focus({preventScroll:false});
 });
 return {overlay,close:()=>close()};
}
export function closeAllModals(){for(const close of [...openModals])close(true);}
