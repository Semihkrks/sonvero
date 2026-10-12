const svg=(body)=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+body+'</svg>';
const ICONS={
 layers:svg('<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>'),
 check:svg('<rect x="3" y="3" width="18" height="18" rx="3"/><path d="m8 12 3 3 5-6"/>'),
 inbox:svg('<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5h13l3.5 7v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6z"/>'),
 send:svg('<path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/>'),
 plus:svg('<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M12 12v6M9 15h6"/>'),
 receipt:svg('<path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2z"/><path d="M9 8h6M9 12h6"/>'),
 menu:svg('<path d="M4 6h16M4 12h16M4 18h10"/>'),
 close:svg('<path d="M18 6 6 18M6 6l12 12"/>'),
};
const QUICK_GROUPS=[
 ['Cari',[['Tüm Hesaplar Cari','/tum-hesaplar-cari','layers'],['Seçili Hesaplar Cari','/secili-hesaplar-cari','check']]],
 ['Faturalar',[['Gelen Faturalar','/incoming','inbox'],['Giden Faturalar','/outgoing','send'],['Fatura Oluştur','/create','plus'],['e-Arşiv Faturalar','/earsiv-faturalar','receipt']]],
];

let closeQuickSheet=null;

function openSidebar(){
 document.querySelector('.sidebar')?.classList.add('sidebar-mobile-open');
 document.querySelector('#sidebarOverlay')?.classList.add('active');
 document.querySelector('.sidebar button, .sidebar a')?.focus();
}

function openQuickSheet(trigger,route){
 if(closeQuickSheet) return;
 const overlay=document.createElement('div');overlay.className='quick-sheet-overlay';
 const sheet=document.createElement('aside');sheet.className='quick-sheet';sheet.setAttribute('role','dialog');sheet.setAttribute('aria-modal','true');sheet.setAttribute('aria-label','Hızlı erişim');
 const head=document.createElement('div');head.className='quick-sheet-head';
 head.innerHTML='<span class="quick-sheet-title">Hızlı erişim</span><button type="button" class="quick-sheet-close" aria-label="Kapat">'+ICONS.close+'</button>';
 const body=document.createElement('div');body.className='quick-sheet-body';
 for(const [title,links] of QUICK_GROUPS){
  const group=document.createElement('section');group.className='quick-sheet-group';
  const h=document.createElement('h3');h.textContent=title;group.appendChild(h);
  for(const [label,path,icon] of links){
   const a=document.createElement('a');a.className='quick-sheet-link';a.href='#'+path;
   a.innerHTML=ICONS[icon]+'<span></span>';a.lastChild.textContent=label;
   if(route===path){a.classList.add('active');a.setAttribute('aria-current','page');}
   group.appendChild(a);
  }
  body.appendChild(group);
 }
 const all=document.createElement('button');all.type='button';all.className='quick-sheet-all';all.innerHTML=ICONS.menu+'<span>Tüm menü</span>';
 body.appendChild(all);
 sheet.append(head,body);
 document.body.append(overlay,sheet);
 trigger.setAttribute('aria-expanded','true');

 const onKey=(e)=>{if(e.key==='Escape') close();};
 const close=(restoreFocus=true)=>{
  closeQuickSheet=null;
  document.removeEventListener('keydown',onKey);
  window.removeEventListener('hashchange',onRoute);
  trigger.setAttribute('aria-expanded','false');
  overlay.classList.remove('open');sheet.classList.remove('open');
  setTimeout(()=>{overlay.remove();sheet.remove();},220);
  if(restoreFocus&&trigger.isConnected) trigger.focus();
 };
 const onRoute=()=>close(false);
 closeQuickSheet=close;
 overlay.addEventListener('click',()=>close());
 head.querySelector('.quick-sheet-close').addEventListener('click',()=>close());
 body.addEventListener('click',(e)=>{const link=e.target.closest('.quick-sheet-link');if(link&&link.getAttribute('href')==='#'+route) close(false);});
 all.addEventListener('click',()=>{close(false);openSidebar();});
 document.addEventListener('keydown',onKey);
 window.addEventListener('hashchange',onRoute);
 void sheet.offsetWidth;
 overlay.classList.add('open');sheet.classList.add('open');
 sheet.querySelector('.quick-sheet-link')?.focus({preventScroll:true});
}

export function renderBottomNav(currentRoute){
 const route='/'+String(currentRoute).replace(/^\//,'');
 closeQuickSheet?.(false);
 const nav=document.createElement('nav');nav.className='mobile-bottom-nav';nav.setAttribute('aria-label','Ana gezinme');
 const items=[
  ['Ana Sayfa','/dashboard',svg('<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>')],
  ['Toplu Tahsilat','/toplu-tahsilat',svg('<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 10v4M18 10v4"/>')],
  ['Cari','/cari',svg('<path d="M20 8H4a2 2 0 0 1 0-4h14v4M4 8v12h16V8M20 12h-5v4h5"/>')],
  ['Diğer',null,svg('<path d="M4 6h16M4 12h16M4 18h16"/>')]
 ];
 for(const [label,path,icon] of items){
  const link=document.createElement(path?'a':'button');link.className='bnav-item';link.innerHTML=icon+'<span class="bnav-label">'+label+'</span>';
  if(path){link.href='#'+path;const selected=route===path||(path==='/cari'&&route==='/cari');if(selected){link.classList.add('active');link.setAttribute('aria-current','page');}}
  else {
   link.type='button';link.setAttribute('aria-haspopup','dialog');link.setAttribute('aria-expanded','false');
   if(QUICK_GROUPS.some(([,links])=>links.some(([,p])=>p===route))) link.classList.add('active');
   link.addEventListener('click',()=>openQuickSheet(link,route));
  }
  nav.appendChild(link);
 }
 return nav;
}
