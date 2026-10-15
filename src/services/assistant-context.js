import {getActiveAccountId} from './account-manager.js';
const KEY='sonvera:assistant-context';
export function rememberSelectedContext(page){
 const value={scope:'selected',accountIds:[...page.querySelectorAll('.sac-acc-cb:checked')].map(n=>n.value),direction:page.querySelector('#sacDirection .active')?.dataset.dir,withCollections:page.querySelector('#sacTahsilat')?.checked,start:page.querySelector('#sacDateStart')?.value,end:page.querySelector('#sacDateEnd')?.value};
 try{sessionStorage.setItem(KEY,JSON.stringify(value));}catch{/* optional preferences */}
 return value;
}
export function assistantContext(){
 const route=location.hash.slice(1);
 const selectedPage=document.querySelector('#sacChips')?.closest('.cari-page');
 let saved={};try{saved=JSON.parse(sessionStorage.getItem(KEY)||'{}');}catch{/* no saved selection */}
 const selected=selectedPage?rememberSelectedContext(selectedPage):saved;
 return {route,selected,activeAccountId:getActiveAccountId(),...(route==='/secili-hesaplar-cari'?selected:route==='/tum-hesaplar-cari'?{scope:'all',direction:'satis'}:route==='/cari'?{scope:'cari',accountIds:[getActiveAccountId()]}:{})};
}
