const svg=(body)=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+body+'</svg>';
export function renderBottomNav(currentRoute){
 const route='/'+String(currentRoute).replace(/^\//,'');
 const nav=document.createElement('nav');nav.className='mobile-bottom-nav';nav.setAttribute('aria-label','Ana gezinme');
 const items=[
  ['Ana Sayfa','/dashboard',svg('<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>')],
  ['Belgeler','/belgeler',svg('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h6"/>')],
  ['Cari','/cari',svg('<path d="M20 8H4a2 2 0 0 1 0-4h14v4M4 8v12h16V8M20 12h-5v4h5"/>')],
  ['Diğer',null,svg('<path d="M4 6h16M4 12h16M4 18h16"/>')]
 ];
 for(const [label,path,icon] of items){
  const link=document.createElement(path?'a':'button');link.className='bnav-item';link.innerHTML=icon+'<span class="bnav-label">'+label+'</span>';
  if(path){link.href='#'+path;const selected=route===path||(path==='/belgeler'&&/incoming|outgoing|draft|create|archive|eirsaliye/.test(route))||(path==='/cari'&&/cari|tahsilat/.test(route));if(selected){link.classList.add('active');link.setAttribute('aria-current','page');}}
  else {link.type='button';link.addEventListener('click',()=>{document.querySelector('.sidebar')?.classList.add('sidebar-mobile-open');document.querySelector('#sidebarOverlay')?.classList.add('active');document.querySelector('.sidebar button, .sidebar a')?.focus();});}
  nav.appendChild(link);
 }
 return nav;
}
