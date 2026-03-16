// ══════════════════════════════════════════
// Component: Mobile Bottom Navigation
// ══════════════════════════════════════════

const ROUTE_GROUPS = {
  incoming: ['/incoming', '/eirsaliye-gelen'],
  outgoing: ['/outgoing', '/eirsaliye-giden']
};

const SOURCE_LABELS = {
  '/incoming': 'e-Fatura',
  '/eirsaliye-gelen': 'e-Irsaliye',
  '/outgoing': 'e-Fatura',
  '/eirsaliye-giden': 'e-Irsaliye'
};


function normalizeRoute(route) {
  if (!route) return '';
  const clean = String(route).split('?')[0].split('#')[0];
  if (!clean) return '';
  const withSlash = clean.startsWith('/') ? clean : `/${clean}`;
  return withSlash.endsWith('/') && withSlash !== '/' ? withSlash.slice(0, -1) : withSlash;
}

function getPreferredRoute(group) {
  const key = `nilfatura_mobile_${group}_route`;
  const val = localStorage.getItem(key);
  if (ROUTE_GROUPS[group].includes(val)) return val;
  return ROUTE_GROUPS[group][0];
}

function setPreferredRoute(group, route) {
  const key = `nilfatura_mobile_${group}_route`;
  if (ROUTE_GROUPS[group].includes(route)) {
    localStorage.setItem(key, route);
  }
}

function isGroupActive(group, currentRoute) {
  const route = normalizeRoute(currentRoute);
  return ROUTE_GROUPS[group].includes(route);
}

function resolveSourceMeta(group, currentRoute) {
  const route = normalizeRoute(currentRoute);
  if (isGroupActive(group, route)) {
    setPreferredRoute(group, route);
    return {
      currentPath: route,
      sourceLabel: SOURCE_LABELS[route] || 'e-Fatura'
    };
  }
  const preferred = getPreferredRoute(group);
  return {
    currentPath: preferred,
    sourceLabel: SOURCE_LABELS[preferred] || 'e-Fatura'
  };
}

function getToggleTarget(group, currentRoute) {
  const route = normalizeRoute(currentRoute);
  if (!isGroupActive(group, route)) {
    return getPreferredRoute(group);
  }
  const routes = ROUTE_GROUPS[group];
  return route === routes[0] ? routes[1] : routes[0];
}

function navigateHash(path) {
  if (!path) return;
  if (window.location.hash === `#${path}`) {
    // Same hash'e tekrar gidilirse route event gelmeyebilir; manual tetikleme ile UI sync kalır.
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    return;
  }
  window.location.hash = `#${path}`;
}

export function renderBottomNav(currentRoute) {
  const bottomNav = document.createElement('nav');
  bottomNav.className = 'mobile-bottom-nav';

  const incomingMeta = resolveSourceMeta('incoming', currentRoute);
  const outgoingMeta = resolveSourceMeta('outgoing', currentRoute);

  const menuItems = [
    {
      label: 'Ana Sayfa',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
      path: '/dashboard',
    },
    {
      label: 'Gelen',
      icon: incomingMeta.currentPath === '/eirsaliye-gelen'
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
      path: incomingMeta.currentPath,
      group: 'incoming',
      sourceLabel: incomingMeta.sourceLabel
    },
    {
      label: 'Fatura',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
      path: '/create',
      isFab: true
    },
    {
      label: 'Giden',
      icon: outgoingMeta.currentPath === '/eirsaliye-giden'
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
      path: outgoingMeta.currentPath,
      group: 'outgoing',
      sourceLabel: outgoingMeta.sourceLabel
    },
    {
      label: 'Canli Veri',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>',
      path: '/cari'
    }
  ];

  menuItems.forEach((item) => {
    const link = document.createElement('a');
    link.href = item.isMenu ? 'javascript:void(0)' : `#${item.path}`;

    if (item.isFab) {
      link.className = 'bnav-fab';
      link.innerHTML = item.icon;
      link.addEventListener('click', (e) => {
        e.preventDefault();
        navigateHash('/create');
      });
    } else {
      link.className = 'bnav-item';
      const current = normalizeRoute(currentRoute);
      const isActive = item.group
        ? isGroupActive(item.group, current)
        : current === normalizeRoute(item.path);
      if (isActive) {
        link.classList.add('active');
      }
      link.innerHTML = `
        ${item.icon}
        <span class="bnav-label">${item.label}</span>
        ${item.sourceLabel ? `<span class="bnav-meta">${item.sourceLabel}</span>` : ''}
      `;

      if (item.group) {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          const target = getToggleTarget(item.group, currentRoute);
          setPreferredRoute(item.group, target);
          navigateHash(target);
        });
      }
      
    }

    bottomNav.appendChild(link);
  });

  return bottomNav;
}
