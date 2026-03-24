// ══════════════════════════════════════════
// Header Component — Nilvera-Inspired
// ══════════════════════════════════════════

export function renderHeader(title = 'Dashboard', options = {}) {
  const {
    userInitials = 'SV',
    userEmail = '',
    onLogout = null,
    requestAccounts = null,
    onAccountSwitch = null,
    onManageAccounts = null,
  } = options;

  const header = document.createElement('header');
  header.className = 'header';
  header.innerHTML = `
    <button class="hamburger-btn" id="mobileMenuBtn" aria-label="Menü">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
    </button>
    <h2 class="header-title">${title}</h2>
    <div class="header-search">
      <svg class="header-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <input type="text" placeholder="Fatura, müşteri veya VKN ara..." id="globalSearch" />
    </div>
    <div class="header-actions">
      <button class="header-btn" id="themeToggle" title="Tema Değiştir">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
      </button>
      ${onLogout ? `
      <button class="header-btn" id="logoutBtn" title="Çıkış Yap">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
      </button>
      ` : ''}
      <div class="header-user" id="headerUser">
        <button class="header-user-avatar" id="headerAccountBtn" title="${userEmail || 'Kullanıcı'}" aria-label="Hesap Menüsü">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21V19a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        </button>
        <div class="header-account-dropdown" id="headerAccountDropdown"></div>
      </div>
    </div>
  `;

  const themeBtn = header.querySelector('#themeToggle');
  themeBtn?.addEventListener('click', () => {
    const html = document.documentElement;
    const current = html.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    localStorage.setItem('nilfatura_theme', next);
  });

  const logoutBtn = header.querySelector('#logoutBtn');
  logoutBtn?.addEventListener('click', async () => {
    if (typeof onLogout === 'function') {
      await onLogout();
    }
  });

  const mobileMenuBtn = header.querySelector('#mobileMenuBtn');
  mobileMenuBtn?.addEventListener('click', () => {
    const sidebar = document.getElementById('mainSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (!sidebar || !overlay) return;

    const willOpen = !sidebar.classList.contains('sidebar-mobile-open');
    sidebar.classList.toggle('sidebar-mobile-open', willOpen);
    overlay.classList.toggle('active', willOpen);
  });

  const accountBtn = header.querySelector('#headerAccountBtn');
  const accountDropdown = header.querySelector('#headerAccountDropdown');

  function closeAccountDropdown() {
    accountDropdown?.classList.remove('open');
    if (accountDropdown) {
      accountDropdown.style.position = '';
      accountDropdown.style.top = '';
      accountDropdown.style.right = '';
      accountDropdown.style.left = '';
      accountDropdown.style.zIndex = '';
      accountDropdown.style.maxWidth = '';
    }
  }

  function positionAccountDropdown() {
    if (!accountBtn || !accountDropdown) return;
    const rect = accountBtn.getBoundingClientRect();
    const margin = 12;
    const right = Math.max(margin, window.innerWidth - rect.right);

    accountDropdown.style.position = 'fixed';
    accountDropdown.style.top = `${Math.round(rect.bottom + 8)}px`;
    accountDropdown.style.right = `${Math.round(right)}px`;
    accountDropdown.style.left = 'auto';
    accountDropdown.style.zIndex = '10000';
    accountDropdown.style.maxWidth = `min(92vw, 320px)`;
  }

  function renderAccountDropdownContent(accounts = [], activeId = '') {
    const rows = (accounts || []).map((acc) => {
      const envLabel = acc.environment === 'live' ? 'CANLI' : 'TEST';
      const envClass = acc.environment === 'live' ? 'live' : 'test';
      const isActive = acc.id === activeId;
      return `
        <button class="header-account-item ${isActive ? 'active' : ''}" data-account-id="${acc.id}">
          <span class="header-account-dot" style="background:${acc.color || '#3b82f6'}"></span>
          <span class="header-account-name">${acc.name || 'Hesap'}</span>
          <span class="header-account-env ${envClass}">${envLabel}</span>
        </button>
      `;
    }).join('');

    accountDropdown.innerHTML = `
      <div class="header-account-head">Aktif API Hesabı</div>
      ${rows || '<div class="header-account-empty">Kayıtlı hesap yok</div>'}
      <button class="header-account-manage" id="headerManageAccountsBtn">Hesapları Yönet</button>
    `;

    accountDropdown.querySelectorAll('[data-account-id]').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.dataset.accountId;
        if (!id || typeof onAccountSwitch !== 'function') return;
        if (btn.disabled) return;
        btn.disabled = true;
        btn.classList.add('is-loading');
        try {
          await onAccountSwitch(id);
          closeAccountDropdown();
        } finally {
          btn.disabled = false;
          btn.classList.remove('is-loading');
        }
      });
    });

    accountDropdown.querySelector('#headerManageAccountsBtn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (typeof onManageAccounts === 'function') {
        onManageAccounts();
      }
      closeAccountDropdown();
    });
  }

  accountBtn?.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (!accountDropdown) return;

    const willOpen = !accountDropdown.classList.contains('open');
    if (!willOpen) {
      closeAccountDropdown();
      return;
    }

    accountDropdown.classList.add('open');
    positionAccountDropdown();
    accountDropdown.innerHTML = '<div class="header-account-loading">Hesaplar yükleniyor...</div>';

    try {
      if (typeof requestAccounts === 'function') {
        const data = await requestAccounts();
        renderAccountDropdownContent(data?.accounts || [], data?.activeId || '');
      } else {
        renderAccountDropdownContent([], '');
      }
    } catch {
      accountDropdown.innerHTML = '<div class="header-account-empty">Hesaplar alınamadı</div>';
    }

    setTimeout(() => {
      document.addEventListener('click', closeAccountDropdown, { once: true });
    }, 0);
  });

  window.addEventListener('resize', () => {
    if (accountDropdown?.classList.contains('open')) {
      positionAccountDropdown();
    }
  });

  // ── Global Search ──
  const searchInput = header.querySelector('#globalSearch');
  if (searchInput) {
    let searchTimeout = null;
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const q = searchInput.value.trim();
        if (!q) return;
        clearTimeout(searchTimeout);

        // Route-based search shortcuts
        const routeMap = {
          'cari': '/cari', 'musteri': '/musteriler', 'müşteri': '/musteriler',
          'firma': '/firma', 'ayar': '/settings', 'hesap': '/accounts',
          'etiket': '/efatura-etiketler', 'sablon': '/efatura-sablonlar', 'şablon': '/efatura-sablonlar',
          'gelen': '/incoming', 'giden': '/outgoing', 'arsiv': '/earsiv-faturalar',
          'irsaliye': '/eirsaliye-gelen', 'taslak': '/drafts', 'export': '/export',
          'dashboard': '/dashboard', 'gib': '/gib-earsiv',
        };

        const lower = q.toLowerCase();
        for (const [keyword, route] of Object.entries(routeMap)) {
          if (lower.includes(keyword)) {
            window.location.hash = '#' + route;
            searchInput.value = '';
            searchInput.blur();
            return;
          }
        }

        // Default: search in customer list (cari page)
        window.location.hash = '#/musteriler';
        searchInput.value = '';
        searchInput.blur();

        // After navigation, try to fill the search on the target page
        setTimeout(() => {
          const targetSearch = document.querySelector('#customerSearch');
          if (targetSearch) {
            targetSearch.value = q;
            targetSearch.dispatchEvent(new Event('input'));
            const searchBtn = document.querySelector('#customerSearchBtn');
            if (searchBtn) searchBtn.click();
          }
        }, 300);
      }
    });
  }

  return header;
}
