const CACHE_NAME = 'sonvera-shell-__BUILD_ID__';
const SHELL = ['/', '/index.html', '/manifest.json', '/icon-192.png', '/icon-512.png', '/logo.svg', '/apple-touch-icon.png', '/apple-touch-icon-precomposed.png', '/favicon-32.png', '/icons/sonvera-touch-v2.png', '/icons/sonvera-192-v2.png', '/icons/sonvera-512-v2.png', '/icons/sonvera-maskable-192-v2.png', '/icons/sonvera-maskable-512-v2.png'];
// Existing pages decide when their active forms and financial operations can safely reload.
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(SHELL))));
self.addEventListener('message',event=>{ if(event.data?.type==='ACTIVATE_UPDATE') self.skipWaiting(); });
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  for(const key of await caches.keys()) if(key.startsWith('sonvera-shell-')&&key!==CACHE_NAME) await caches.delete(key);
  await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
  const request=event.request, url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==self.location.origin||request.headers.has('authorization')) return;
  const navigation=request.mode==='navigate' && ['/', '/index.html'].includes(url.pathname);
  const asset=SHELL.includes(url.pathname)||/^\/assets\/[\w.-]+\.(js|css|woff2?|png|svg|mjs)$/.test(url.pathname);
  if(!navigation&&!asset) return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE_NAME);
    if(!navigation) { const hit=await cache.match(request); if(hit) return hit; }
    try {
      const response=await fetch(request);
      if(response.ok&&response.type==='basic') await cache.put(request,response.clone());
      return response;
    } catch {
      return await cache.match(navigation?'/index.html':request)||new Response('Çevrimdışı',{status:503});
    }
  })());
});
self.addEventListener('push',event=>{
  let data={}; try{ data=event.data?.json()||{}; }catch{}
  event.waitUntil(self.registration.showNotification(data.title||'Sonvera',{body:data.body||'Yeni bildirim',icon:'/icon-192.png',data:{url:'/index.html#/incoming'}}));
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  event.waitUntil(self.clients.openWindow('/index.html#/incoming'));
});
