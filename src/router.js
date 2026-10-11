import { hasPendingMutation } from './lib/operations.js';
import { showToast } from './components/toast.js';
import { disposeEventScope } from './lib/page-events.js';
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
  const path = '/' + route.split('?')[0].split('/').filter(Boolean)[0];

  // Cleanup previous page
  if (currentCleanup) {
    currentCleanup();
    currentCleanup = null;
  }

  const handler = routes[path] || routes['/dashboard'];
  if (handler) {
    const result = await handler(route);
    // Stale check: if another handleRoute started while we were awaiting, abort
    if (seq !== routeSeq) { result.cleanup?.(); disposeEventScope(result.page); return; }
    renderLayout(result.page, result.title, route.replace('/', ''));

    currentCleanup = () => { result.cleanup?.(); disposeEventScope(result.page); };
  }
}

export function startRouter(renderLayout) {
  let previousRoute = window.location.hash;
  const onRoute = () => {
    if (hasPendingMutation()) {
      history.replaceState(null, '', previousRoute || '#/dashboard');
      showToast('Devam eden işlemin bitmesini bekleyin.', 'warning'); return;
    }
    previousRoute = window.location.hash;
    handleRoute(renderLayout).catch(error => {
      const page = document.createElement('div'); page.className = 'sv-error'; page.setAttribute('role','alert'); page.textContent = error.message || 'Sayfa yüklenemedi.';
      renderLayout(page,'Sayfa yüklenemedi',getCurrentRoute());
    });
  };
  window.addEventListener('hashchange', onRoute);

  // On account change: reset ALL page caches, then re-render current page
  const onAccountChanged = () => {
    resetAllCaches();
    onRoute();
  };
  window.addEventListener('accountChanged', onAccountChanged);
  onRoute();

  return () => {
    routeSeq++;
    currentCleanup?.();
    currentCleanup = null;
    resetAllCaches();
    window.removeEventListener('hashchange', onRoute);
    window.removeEventListener('accountChanged', onAccountChanged);
  };
}
