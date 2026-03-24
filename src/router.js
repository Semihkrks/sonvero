// ══════════════════════════════════════════
// Hash-based SPA Router
// ══════════════════════════════════════════

const routes = {};
let currentCleanup = null;
let routeSeq = 0;

// Global cache reset registry — page modules register their reset functions here
const cacheResetFns = [];
export function registerCacheReset(fn) {
  if (typeof fn === 'function') cacheResetFns.push(fn);
}

function resetAllCaches() {
  cacheResetFns.forEach(fn => { try { fn(); } catch(e) { console.warn('Cache reset error:', e); } });
}

export function registerRoute(path, handler) {
  routes[path] = handler;
}

export function navigate(path) {
  window.location.hash = '#' + path;
}

export function getCurrentRoute() {
  const hash = window.location.hash.replace('#', '') || '/dashboard';
  return hash.startsWith('/') ? hash : '/' + hash;
}

export function getRouteParams() {
  const route = getCurrentRoute();
  const parts = route.split('/').filter(Boolean);
  return { segments: parts, full: route };
}

export async function handleRoute(renderLayout) {
  const seq = ++routeSeq;
  const route = getCurrentRoute();
  const path = '/' + route.split('/').filter(Boolean)[0];

  // Cleanup previous page
  if (currentCleanup) {
    currentCleanup();
    currentCleanup = null;
  }

  const handler = routes[path] || routes['/dashboard'];
  if (handler) {
    const result = await handler(route);
    // Stale check: if another handleRoute started while we were awaiting, abort
    if (seq !== routeSeq) return;
    renderLayout(result.page, result.title, route.replace('/', ''));

    if (result.cleanup) {
      currentCleanup = result.cleanup;
    }
  }
}

export function startRouter(renderLayout) {
  const onRoute = () => handleRoute(renderLayout);
  window.addEventListener('hashchange', onRoute);

  // On account change: reset ALL page caches, then re-render current page
  const onAccountChanged = () => {
    resetAllCaches();
    handleRoute(renderLayout);
  };
  window.addEventListener('accountChanged', onAccountChanged);
  onRoute();

  return () => {
    window.removeEventListener('hashchange', onRoute);
    window.removeEventListener('accountChanged', onAccountChanged);
  };
}
