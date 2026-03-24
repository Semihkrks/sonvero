// ══════════════════════════════════════════
// Sonvera 2.0 — Service Worker (PWA Offline & Cache)
// ══════════════════════════════════════════

const CACHE_NAME = 'sonvera-v2';
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
  const isApiRequest =
    reqUrl.hostname.includes('apitest.nilvera.com') ||
    reqUrl.hostname.includes('api.nilvera.com') ||
    reqUrl.pathname.startsWith('/nilvera-api') ||
    reqUrl.pathname.startsWith('/nilvera-live');
  self.skipWaiting(); // Activate worker immediately
    // API: asla cache'den okuma/yazma yapma. Hesap ve API key degisimlerinde stale veri riski yaratir.

      fetch(event.request)
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
  const isApiRequest = reqUrl.hostname.includes('apitest.nilvera.com') || reqUrl.hostname.includes('api.nilvera.com');

  if (isApiRequest) {
    // API: network-first, offline'da son cache'e don.
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse.clone()));
          return networkResponse;
        })
        .catch(() => caches.match(event.request))
    );
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
