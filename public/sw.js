// ══════════════════════════════════════════
// Sonvera 2.0 — Service Worker (PWA Offline & Cache)
// ══════════════════════════════════════════

const CACHE_NAME = 'sonvera-v3';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
  // Vite assets will be mostly handled by network-first strategy
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching App Shell');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Removing old cache', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  const reqUrl = new URL(event.request.url);
  // ÖNEMLİ: API çağrıları Vite/Vercel proxy yollarından (/nilvera-api, /nilvera-live)
  // geçer; bu durumda hostname localhost/Vercel olur. Bu yüzden hem proxy yolunu
  // hem de doğrudan nilvera.com host'unu kontrol et.
  const isApiRequest =
    reqUrl.pathname.startsWith('/nilvera-api') ||
    reqUrl.pathname.startsWith('/nilvera-live') ||
    reqUrl.hostname.includes('nilvera.com');

  if (isApiRequest) {
    // API yanıtları HESABA ÖZELDİR ve API anahtarı header'dadır (URL tüm
    // hesaplarda aynı). Önbelleğe alınırsa bir hesabın yanıtı URL eşleşmesiyle
    // başka hesaba SIZAR (rakamların birebir aynı çıkması bundandı). Bu yüzden
    // API isteklerini ASLA önbellekleme/okuma — her zaman doğrudan ağdan getir.
    event.respondWith(fetch(event.request));
    return;
  }

  // Static/app-shell: cache-first, ag varsa cache yenile.
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        fetch(event.request)
          .then((networkResponse) => {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse.clone()));
          })
          .catch(() => {});
        return cachedResponse;
      }

      return fetch(event.request)
        .then((networkResponse) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        })
        .catch(async () => {
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
          return undefined;
        });
    })
  );
});

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Sonvera Bildirim';
  const options = {
    body: data.body || 'Yeni bir gelisme var.',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: {
      url: data.url || '/index.html#/dashboard'
    }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification?.data?.url || '/index.html#/dashboard';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsArr) => {
      const existing = clientsArr.find((c) => c.url.includes('/index.html'));
      if (existing) {
        existing.focus();
        existing.navigate(targetUrl);
        return;
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});
