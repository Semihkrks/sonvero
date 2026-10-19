import {sonaiMark} from './sonai-mark.js';
import { listenScoped } from '../lib/page-events.js';
import { escapeHtml, safeColor } from '../lib/html.js';
import { openMobileSidebar } from './sidebar.js';
// ══════════════════════════════════════════
// Header Component — Nilvera-Inspired
// ══════════════════════════════════════════

const iconAttrs = 'width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"';
const SUN_ICON = `<svg class="theme-icon-sun" ${iconAttrs}><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`;
const MOON_ICON = `<svg class="theme-icon-moon" ${iconAttrs}><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`;
const LOGOUT_ICON = `<svg ${iconAttrs}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`;

// One observer for the whole app; every rendered header's theme button follows data-theme,
// whoever changes it (this button, app.js boot, another tab via storage, tests).
let themeObserver = null;
function syncThemeButtons() {
  const dark = document.documentElement.getAttribute('data-theme') === 'dark';
  const label = dark ? 'Açık temaya geç' : 'Koyu temaya geç';
  document.querySelectorAll('#themeToggle').forEach((btn) => {
    btn.setAttribute('aria-label', label);
    btn.setAttribute('title', label);
    btn.setAttribute('aria-pressed', String(dark));
  });
}
function ensureThemeObserver() {
  if (themeObserver) return;
  themeObserver = new MutationObserver(syncThemeButtons);
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
}

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
    <button type="button" class="hamburger-btn" id="mobileMenuBtn" aria-label="Menü" aria-controls="mainSidebar" aria-expanded="false">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
    </button>
    <h2 class="header-title">${title}</h2>
    <div class="header-search" role="search">
      <svg class="header-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <input type="search" placeholder="Fatura, müşteri veya VKN ara..." id="globalSearch" aria-label="Fatura, müşteri veya VKN ara" enterkeyhint="search" autocomplete="off" />
    </div>
    <button class="sv-header-assistant" id="headerAssistant" type="button" aria-haspopup="dialog" aria-expanded="false">${sonaiMark}<span>SonAI</span></button>
    <div class="header-actions">
      <button type="button" class="header-btn" id="themeToggle" aria-pressed="false" aria-label="Koyu temaya geç" title="Koyu temaya geç">
        ${SUN_ICON}${MOON_ICON}
      </button>
      ${onLogout ? `
      <button type="button" class="header-btn" id="logoutBtn" title="Çıkış Yap" aria-label="Çıkış yap">
        ${LOGOUT_ICON}
      </button>
      ` : ''}
      <div class="header-user" id="headerUser">
        <button type="button" class="header-user-avatar" id="headerAccountBtn" title="${escapeHtml(userEmail || 'Kullanıcı')}" aria-label="Hesap menüsü" aria-haspopup="menu" aria-expanded="false" aria-controls="headerAccountDropdown">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M20 21V19a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        </button>
        <div class="header-account-dropdown" id="headerAccountDropdown" role="menu" aria-label="Hesap menüsü"></div>
      </div>
    </div>
  `;

  const themeBtn = header.querySelector('#themeToggle');
  header.querySelector('#headerAssistant').addEventListener('click',event=>{void import('./assistant-panel.js').then(m=>m.openAssistantPanel(event.currentTarget||header.querySelector('#headerAssistant')));});
  themeBtn?.addEventListener('click', () => {
    const html = document.documentElement;
    const current = html.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    localStorage.setItem('nilfatura_theme', next);
    syncThemeButtons();
  });
  ensureThemeObserver();
  // The header is not in the document yet; set this button's state directly.
  {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    const label = dark ? 'Açık temaya geç' : 'Koyu temaya geç';
    themeBtn?.setAttribute('aria-label', label);
    themeBtn?.setAttribute('title', label);
    themeBtn?.setAttribute('aria-pressed', String(dark));
  }

  const runLogout = async () => {
    if (typeof onLogout === 'function') {
      await onLogout();
    }
  };
  header.querySelector('#logoutBtn')?.addEventListener('click', runLogout);

  // Mobile drawer: open/close, inert, Esc and focus return live in sidebar.js.
  const mobileMenuBtn = header.querySelector('#mobileMenuBtn');
  mobileMenuBtn?.addEventListener('click', () => openMobileSidebar(mobileMenuBtn));

  const accountBtn = header.querySelector('#headerAccountBtn');
  const accountDropdown = header.querySelector('#headerAccountDropdown');
  let accountRequestSeq = 0;

  const menuItems = () => [...(accountDropdown?.querySelectorAll('[role^="menuitem"]:not([disabled])') || [])];

  function closeAccountDropdown({ restoreFocus = false } = {}) {
    accountRequestSeq += 1;
    accountDropdown?.classList.remove('open');
    accountBtn?.setAttribute('aria-expanded', 'false');
    if (accountDropdown) {
      accountDropdown.style.position = '';
      accountDropdown.style.top = '';
      accountDropdown.style.right = '';
      accountDropdown.style.left = '';
      accountDropdown.style.zIndex = '';
      accountDropdown.style.maxWidth = '';
    }
    if (restoreFocus) accountBtn?.focus();
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
    accountDropdown.style.zIndex = 'var(--z-popover, 10000)';
    accountDropdown.style.maxWidth = `min(92vw, 320px)`;
  }

  function renderAccountDropdownContent(accounts = [], activeId = '', note = '') {
    const rows = (accounts || []).map((acc) => {
      const envLabel = acc.environment === 'live' ? 'CANLI' : 'TEST';
      const envClass = acc.environment === 'live' ? 'live' : 'test';
      const isActive = acc.id === activeId;
      return `
        <button type="button" role="menuitemradio" aria-checked="${isActive}" tabindex="-1" class="header-account-item ${isActive ? 'active' : ''}" data-account-id="${escapeHtml(acc.id)}">
          <span class="header-account-dot" style="background:${safeColor(acc.color)}" aria-hidden="true"></span>
          <span class="header-account-name">${escapeHtml(acc.name || 'Hesap')}</span>
          <span class="header-account-env ${envClass}">${envLabel}</span>
        </button>
      `;
    }).join('');

    accountDropdown.innerHTML = `
      <div class="header-account-head" id="headerAccountHead" role="presentation">Aktif API Hesabı</div>
      ${rows
        ? `<div role="group" aria-labelledby="headerAccountHead">${rows}</div>`
        : `<div class="header-account-empty" role="presentation">${escapeHtml(note || 'Kayıtlı hesap yok')}</div>`}
      <button type="button" role="menuitem" tabindex="-1" class="header-account-manage" id="headerManageAccountsBtn">Hesapları Yönet</button>
      ${onLogout ? '<button type="button" role="menuitem" tabindex="-1" class="header-account-manage header-account-logout" id="headerMenuLogoutBtn">Çıkış yap</button>' : ''}
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
          closeAccountDropdown({ restoreFocus: accountDropdown.contains(document.activeElement) });
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

    accountDropdown.querySelector('#headerMenuLogoutBtn')?.addEventListener('click', async (e) => {
      e.stopPropagation();
      closeAccountDropdown();
      await runLogout();
    });
  }

  function focusMenuItem(which = 'first') {
    const items = menuItems();
    if (!items.length) return;
    const target = which === 'last' ? items.at(-1) : (which === 'active' ? (items.find(i => i.getAttribute('aria-checked') === 'true') || items[0]) : items[0]);
    target.focus();
  }

  async function openAccountDropdown(focusWhich = 'first') {
    if (!accountDropdown) return;
    const seq = ++accountRequestSeq;
    accountDropdown.classList.add('open');
    accountBtn?.setAttribute('aria-expanded', 'true');
    positionAccountDropdown();
    accountDropdown.innerHTML = '<div class="header-account-loading" role="presentation">Hesaplar yükleniyor...</div>';
    // Keep keyboard focus inside the menu while accounts load.
    accountDropdown.tabIndex = -1;
    accountDropdown.focus({ preventScroll: true });

    try {
      if (typeof requestAccounts === 'function') {
        const data = await requestAccounts();
        if (seq !== accountRequestSeq) return;
        renderAccountDropdownContent(data?.accounts || [], data?.activeId || '');
      } else {
        renderAccountDropdownContent([], '');
      }
    } catch {
      if (seq !== accountRequestSeq) return;
      renderAccountDropdownContent([], '', 'Hesaplar alınamadı');
    }

    if (accountDropdown.contains(document.activeElement) || document.activeElement === document.body) {
      focusMenuItem(focusWhich);
    }

    setTimeout(() => {
      listenScoped(header, document, 'click', () => closeAccountDropdown(), { once: true });
    }, 0);
  }

  accountBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!accountDropdown) return;
    if (accountDropdown.classList.contains('open')) {
      closeAccountDropdown();
      return;
    }
    void openAccountDropdown('first');
  });

  accountBtn?.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (accountDropdown?.classList.contains('open')) focusMenuItem(e.key === 'ArrowUp' ? 'last' : 'first');
      else void openAccountDropdown(e.key === 'ArrowUp' ? 'last' : 'first');
    } else if (e.key === 'Escape' && accountDropdown?.classList.contains('open')) {
      e.preventDefault();
      e.stopPropagation();
      closeAccountDropdown({ restoreFocus: true });
    }
  });

  accountDropdown?.addEventListener('keydown', (e) => {
    const items = menuItems();
    const index = items.indexOf(document.activeElement);
    let next = null;
    switch (e.key) {
      case 'ArrowDown': next = items[(index + 1) % items.length]; break;
      case 'ArrowUp': next = items[(index - 1 + items.length) % items.length]; break;
      case 'Home': next = items[0]; break;
      case 'End': next = items.at(-1); break;
      case 'Escape':
        e.preventDefault();
        e.stopPropagation();
        closeAccountDropdown({ restoreFocus: true });
        return;
      case 'Tab':
        closeAccountDropdown();
        return;
      default:
        return;
    }
    if (next) {
      e.preventDefault();
      next.focus();
    }
  });

  listenScoped(header, window, 'resize', () => {
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
