// ══════════════════════════════════════════
// Hash-based SPA Router
// ══════════════════════════════════════════

const routes = {};
let currentCleanup = null;

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
    renderLayout(result.page, result.title, route.replace('/', ''));

    if (result.cleanup) {
      currentCleanup = result.cleanup;
    }
  }
}

export function startRouter(renderLayout) {
  const onRoute = () => handleRoute(renderLayout);
  window.addEventListener('hashchange', onRoute);

  // Global event listener for account changes so the current page updates
  window.addEventListener('accountChanged', onRoute);
  onRoute();

  return () => window.removeEventListener('hashchange', onRoute);
}
