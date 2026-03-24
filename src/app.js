// ══════════════════════════════════════════
// Sonvera 2.0 — Main Application Entry Point
// ══════════════════════════════════════════
import './styles/main.css';
import './styles/mobile.css';
import 'flatpickr/dist/flatpickr.min.css';
import { registerRoute, startRouter } from './router.js';
import { renderSidebar } from './components/sidebar.js';
import { renderHeader } from './components/header.js';
import { renderBottomNav } from './components/bottom-nav.js';
import { startInvoiceNotificationMonitor } from './services/invoice-notification-monitor.js';
import { startDatePickerAutoBind } from './lib/date-picker.js';
import { getSession, signIn, signUp, signOut, getSupabase } from './lib/supabase.js';
import { listAccounts, getActiveAccountId, setActiveAccount } from './services/account-manager.js';

// Pages
import { renderDashboard } from './pages/dashboard.js';
import { renderInvoiceCreate } from './pages/invoice-create.js';
import { renderIncomingInvoices } from './pages/invoices-incoming.js';
import { renderOutgoingInvoices } from './pages/invoices-outgoing.js';
import { renderEArsivInvoices } from './pages/earsiv-faturalar.js';
import { renderDrafts } from './pages/drafts.js';
import { renderAccounts } from './pages/accounts.js';
import { renderExportPage } from './pages/export.js';
import { renderSettings } from './pages/settings.js';
import { renderCariPage } from './pages/cari.js';
import { renderPlaceholderPage } from './pages/placeholder-page.js';
import { renderCompanyInfo } from './pages/company-info.js';
import { renderCustomers } from './pages/customers.js';
import { renderTagsPage } from './pages/tags.js';
import { renderTemplatesPage } from './pages/templates.js';
import { renderGibEarsiv } from './pages/gib-earsiv.js';
import { renderEirsaliyeCreate } from './pages/eirsaliye-create.js';
import { renderEDespatchOutgoing } from './pages/eirsaliye-outgoing.js';
import { renderEDespatchIncoming } from './pages/eirsaliye-incoming.js';
import {
  renderEFaturaArchiveOutgoing,
  renderEFaturaArchiveIncoming,
  renderEirsaliyeArchiveOutgoing,
  renderEirsaliyeArchiveIncoming,
} from './pages/archive-boxes.js';

// ── Apply saved theme ──
const savedTheme = localStorage.getItem('nilfatura_theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);

// ── iOS viewport height fix ──
function setAppHeight() {
  document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`);
}
setAppHeight();
window.addEventListener('resize', setAppHeight);
window.addEventListener('orientationchange', () => setTimeout(setAppHeight, 100));

const ALLOWED_LOGIN_EMAIL = 'sonvera@gmail.com';
const ALLOWED_LOGIN_PASSWORD = '123659789sK.';

// ── Rate Limiting ──
let loginFailCount = 0;
let loginLockUntil = 0;

function getLoginCooldown() {
  if (loginFailCount < 3) return 0;
  if (loginFailCount < 5) return 15;
  if (loginFailCount < 8) return 30;
  return 60;
}

function isLoginLocked() {
  if (!loginLockUntil) return false;
  if (Date.now() >= loginLockUntil) {
    loginLockUntil = 0;
    return false;
  }
  return true;
}

function recordLoginFail() {
  loginFailCount++;
  const cooldown = getLoginCooldown();
  if (cooldown > 0) {
    loginLockUntil = Date.now() + cooldown * 1000;
  }
  return cooldown;
}

async function signInFixedUser() {
  try {
    await signIn(ALLOWED_LOGIN_EMAIL, ALLOWED_LOGIN_PASSWORD);
    loginFailCount = 0;
    loginLockUntil = 0;
  } catch (err) {
    const msg = String(err?.message || '');
    const lower = msg.toLowerCase();

    if (lower.includes('email not confirmed')) {
      throw new Error('Giris su an dogrulanamadi. Lutfen yonetici ayarlarini kontrol edip tekrar dene.');
    }

    if (lower.includes('invalid login credentials')) {
      try {
        const signUpResult = await signUp(ALLOWED_LOGIN_EMAIL, ALLOWED_LOGIN_PASSWORD);

        if (!signUpResult?.session) {
          throw new Error('Kullanici olusturuldu ancak oturum acilamadi. Lutfen daha sonra tekrar dene.');
        }

        loginFailCount = 0;
        loginLockUntil = 0;
        return;
      } catch (signUpErr) {
        const signUpMsg = String(signUpErr?.message || '').toLowerCase();

        if (signUpMsg.includes('user already registered')) {
          throw new Error('Supabase Auth kullanicisi mevcut ama sifre farkli. Dashboard > Authentication > Users ekranindan sonvera@gmail.com sifresini 123659789sK. yap.');
        }

        if (signUpMsg.includes('email signups are disabled')) {
          throw new Error('Supabase Auth\'ta Email sign-up kapali. Dashboard > Authentication > Providers > Email\'de Enable email provider ve Enable signups acik olmali.');
        }

        throw signUpErr;
      }
    }

    throw err;
  }
}

// ── Register Routes ──

// Core pages (existing)
registerRoute('/dashboard', async () => ({
  page: await renderDashboard(),
  title: 'Dashboard'
}));

registerRoute('/create', async () => ({
  page: await renderInvoiceCreate(),
  title: 'Fatura Oluştur — Mal / Hizmet'
}));

registerRoute('/incoming', async () => ({
  page: await renderIncomingInvoices(),
  title: 'Gelen Faturalar'
}));

registerRoute('/earsiv-faturalar', async () => ({
  page: await renderEArsivInvoices(),
  title: 'e-Arşiv Faturaları'
}));

registerRoute('/outgoing', async () => ({
  page: await renderOutgoingInvoices(),
  title: 'Giden Faturalar'
}));

registerRoute('/drafts', async () => ({
  page: await renderDrafts(),
  title: 'Taslaklar'
}));

registerRoute('/accounts', async () => ({
  page: await renderAccounts(),
  title: 'Hesaplar'
}));

registerRoute('/export', async () => ({
  page: await renderExportPage(),
  title: 'Excel Export'
}));

registerRoute('/settings', async () => ({
  page: await renderSettings(),
  title: 'Ayarlar'
}));

registerRoute('/cari', async () => ({
  page: await renderCariPage(),
  title: 'Canlı Cari Sistemi'
}));

registerRoute('/eirsaliye-giden', async () => ({
  page: await renderEDespatchOutgoing(),
  title: 'e-İrsaliye Giden Kutusu'
}));

registerRoute('/eirsaliye-gelen', async () => ({
  page: await renderEDespatchIncoming(),
  title: 'e-İrsaliye Gelen Kutusu'
}));

registerRoute('/efatura-arsiv-giden', async () => ({
  page: await renderEFaturaArchiveOutgoing(),
  title: 'e-Fatura Arşiv — Giden'
}));

registerRoute('/efatura-arsiv-gelen', async () => ({
  page: await renderEFaturaArchiveIncoming(),
  title: 'e-Fatura Arşiv — Gelen'
}));

registerRoute('/eirsaliye-arsiv-giden', async () => ({
  page: await renderEirsaliyeArchiveOutgoing(),
  title: 'e-İrsaliye Arşiv — Giden'
}));

registerRoute('/eirsaliye-arsiv-gelen', async () => ({
  page: await renderEirsaliyeArchiveIncoming(),
  title: 'e-İrsaliye Arşiv — Gelen'
}));

// ── Functional routes (formerly placeholders) ──
registerRoute('/firma', async () => ({
  page: await renderCompanyInfo(),
  title: 'Firma Bilgileri'
}));

registerRoute('/musteriler', async () => ({
  page: await renderCustomers(),
  title: 'Musteriler'
}));

registerRoute('/efatura-etiketler', async () => ({
  page: await renderTagsPage(),
  title: 'e-Fatura Etiketler'
}));

registerRoute('/efatura-sablonlar', async () => ({
  page: await renderTemplatesPage(),
  title: 'e-Fatura Sablonlar'
}));

registerRoute('/gib-earsiv', async () => ({
  page: await renderGibEarsiv(),
  title: 'GIB e-Arsiv'
}));

registerRoute('/eirsaliye-olustur', async () => ({
  page: await renderEirsaliyeCreate(),
  title: 'Irsaliye Olustur'
}));

// ── Remaining placeholder routes ──
const placeholderRoutes = [
  // Fatura Islemleri
  { path: '/create-export', title: 'Ihracat Faturasi Olustur' },
  { path: '/upload-xml', title: 'XML Yukle' },
  { path: '/upload-excel', title: 'Excel Yukle' },
  { path: '/upload-sgk', title: 'SGK Pdf Yukle' },
  // e-Fatura
  { path: '/efatura-eski-giden', title: 'Eski Faturalar — Giden' },
  { path: '/efatura-eski-gelen', title: 'Eski Faturalar — Gelen' },
  { path: '/efatura-seriler', title: 'e-Fatura Seriler' },
  { path: '/efatura-bildirim-giden', title: 'Giden Fatura Bildirimleri' },
  { path: '/efatura-bildirim-gelen', title: 'Gelen Fatura Bildirimleri' },
  // e-Arsiv
  { path: '/earsiv-iptal', title: 'Iptal Faturalari' },
  { path: '/earsiv-rapor-liste', title: 'Rapor Listesi' },
  { path: '/earsiv-rapor-olustur', title: 'Rapor Olustur' },
  { path: '/earsiv-eski', title: 'e-Arsiv Eski Faturalar' },
  { path: '/earsiv-tanimlamalar', title: 'e-Arsiv Tanimlamalar' },
  { path: '/earsiv-bildirim', title: 'e-Arsiv Bildirim Ayarlari' },
  { path: '/earsiv-etiketler', title: 'e-Arsiv Etiketler' },
  // e-Irsaliye
  { path: '/eirsaliye-taslaklar', title: 'Irsaliye Taslaklari' },
  { path: '/eirsaliye-dosya', title: 'Irsaliye Dosya Yukleme' },
  { path: '/eirsaliye-tanimlamalar', title: 'e-Irsaliye Tanimlamalar' },
  { path: '/eirsaliye-bildirim', title: 'e-Irsaliye Bildirim Ayarlari' },
  { path: '/eirsaliye-etiketler', title: 'e-Irsaliye Etiketler' },
  // Others
  { path: '/stoklar', title: 'Stoklar' },
  { path: '/mailing', title: 'Mailing Ayarlari' },
  { path: '/raporlar', title: 'Raporlar' },
  { path: '/kullanicilar', title: 'Kullanicilar' },
  { path: '/api-tanimlari', title: 'API Tanimlari' },
  { path: '/destek', title: 'Destek Talepleri' },
];

placeholderRoutes.forEach(({ path, title }) => {
  const routeKey = path.replace('/', '');
  registerRoute(path, async () => ({
    page: renderPlaceholderPage(routeKey),
    title
  }));
});

let currentAuthUser = null;
let stopRouter = null;
let stopDatePickerAutoBind = null;
let stopBottomNavAutoHide = null;
let authBound = false;
let accountSwitchSeq = 0;
let isAccountSwitching = false;

function getUserInitials(user) {
  const email = user?.email || '';
  if (!email) return 'SV';
  const local = email.split('@')[0] || '';
  const parts = local.split(/[._-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return local.slice(0, 2).toUpperCase() || 'SV';
}

function isAuthenticatedSession(session) {
  return Boolean(session?.user && !session.user.is_anonymous);
}

function setupBottomNavAutoHide(scrollContainer, navEl) {
  if (stopBottomNavAutoHide) {
    stopBottomNavAutoHide();
    stopBottomNavAutoHide = null;
  }

  if (!scrollContainer || !navEl || window.innerWidth > 768) return;

  let lastTop = scrollContainer.scrollTop;
  let ticking = false;

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(() => {
      const currentTop = scrollContainer.scrollTop;
      const delta = currentTop - lastTop;

      if (currentTop <= 8 || delta < -8) {
        navEl.classList.remove('mobile-bottom-nav--hidden');
      } else if (delta > 8) {
        navEl.classList.add('mobile-bottom-nav--hidden');
      }

      lastTop = currentTop;
      ticking = false;
    });
  };

  scrollContainer.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);

  stopBottomNavAutoHide = () => {
    scrollContainer.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onScroll);
    navEl.classList.remove('mobile-bottom-nav--hidden');
  };
}

function renderLoginPage(info = '', infoType = 'error') {
  const app = document.getElementById('app');
  if (!app) return;

  const lockedNow = isLoginLocked();
  const remainSec = lockedNow ? Math.ceil((loginLockUntil - Date.now()) / 1000) : 0;

  app.innerHTML = `
    <div class="login-page">
      <div class="login-bg-glow"></div>
      <div class="login-card">
        <div class="login-logo">
          <div class="login-logo-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M9 15l2 2 4-4"/></svg>
          </div>
          <h1>Sonvera</h1>
          <p>E-Fatura Yonetim Platformu</p>
        </div>
        ${info ? `<div class="login-alert login-alert-${infoType}">${info}</div>` : ''}
        ${lockedNow ? `<div class="login-alert login-alert-warning">Cok fazla basarisiz deneme. <span id="lockCountdown">${remainSec}</span> saniye bekleyin.</div>` : ''}
        <form id="authForm">
          <div class="form-group">
            <label class="form-label">E-Posta</label>
            <input type="email" id="authEmail" class="form-input" value="${ALLOWED_LOGIN_EMAIL}" readonly required />
          </div>
          <div class="form-group">
            <label class="form-label">Sifre</label>
            <div class="login-password-wrap">
              <input type="password" id="authPassword" class="form-input" placeholder="Sifrenizi girin" required autocomplete="current-password" />
              <button type="button" class="login-eye-btn" id="togglePwdBtn" tabindex="-1" aria-label="Sifreyi goster/gizle">
                <svg id="eyeIcon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
            </div>
          </div>
          <button type="submit" class="btn btn-primary login-submit-btn" id="authSubmitBtn" ${lockedNow ? 'disabled' : ''}>
            <span id="loginBtnText">Giris Yap</span>
            <span id="loginBtnSpinner" class="login-spinner" style="display:none"></span>
          </button>
          <p class="login-note">Oturum acik kalir. Ayni hesapla farkli cihazlardan giris yapabilirsin.</p>
        </form>
      </div>
    </div>
  `;

  // Lock countdown
  if (lockedNow) {
    const countdownEl = app.querySelector('#lockCountdown');
    const submitBtn = app.querySelector('#authSubmitBtn');
    const lockTimer = setInterval(() => {
      const left = Math.ceil((loginLockUntil - Date.now()) / 1000);
      if (left <= 0) {
        clearInterval(lockTimer);
        if (countdownEl) countdownEl.parentElement.remove();
        if (submitBtn) submitBtn.removeAttribute('disabled');
        return;
      }
      if (countdownEl) countdownEl.textContent = left;
    }, 1000);
  }

  // Password toggle
  const pwdInput = app.querySelector('#authPassword');
  const toggleBtn = app.querySelector('#togglePwdBtn');
  const eyeIcon = app.querySelector('#eyeIcon');
  toggleBtn?.addEventListener('click', () => {
    if (!pwdInput) return;
    const isPassword = pwdInput.type === 'password';
    pwdInput.type = isPassword ? 'text' : 'password';
    if (eyeIcon) {
      eyeIcon.innerHTML = isPassword
        ? '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>'
        : '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
    }
  });

  // Form submit
  const form = app.querySelector('#authForm');
  const submitBtn = app.querySelector('#authSubmitBtn');

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (isLoginLocked()) return;

    const email = app.querySelector('#authEmail')?.value?.trim();
    const password = app.querySelector('#authPassword')?.value || '';
    if (!email || !password) return;

    submitBtn?.setAttribute('disabled', 'true');
    const btnText = app.querySelector('#loginBtnText');
    const btnSpinner = app.querySelector('#loginBtnSpinner');
    if (btnText) btnText.textContent = 'Giris yapiliyor...';
    if (btnSpinner) btnSpinner.style.display = 'inline-block';

    try {
      if (email !== ALLOWED_LOGIN_EMAIL || password !== ALLOWED_LOGIN_PASSWORD) {
        const cooldown = recordLoginFail();
        const lockMsg = cooldown > 0 ? ` ${cooldown} saniye beklemeniz gerekiyor.` : '';
        renderLoginPage(`Yetkisiz giris. Mail veya sifre hatali.${lockMsg}`);
        return;
      }

      await signInFixedUser();
    } catch (err) {
      const cooldown = recordLoginFail();
      const lockMsg = cooldown > 0 ? ` ${cooldown} saniye beklemeniz gerekiyor.` : '';
      renderLoginPage((err?.message || 'Giris sirasinda bir hata olustu.') + lockMsg);
    } finally {
      submitBtn?.removeAttribute('disabled');
      if (btnText) btnText.textContent = 'Giris Yap';
      if (btnSpinner) btnSpinner.style.display = 'none';
    }
  });
}

function teardownAppRuntime() {
  if (stopRouter) {
    stopRouter();
    stopRouter = null;
  }
  if (stopDatePickerAutoBind) {
    stopDatePickerAutoBind();
    stopDatePickerAutoBind = null;
  }
  if (stopBottomNavAutoHide) {
    stopBottomNavAutoHide();
    stopBottomNavAutoHide = null;
  }
}

async function handleLogout() {
  try {
    await signOut();
  } catch (e) {
    console.warn('Cikis hatasi:', e?.message || e);
  }
}

async function getHeaderAccountsData() {
  const accounts = await listAccounts();
  const activeId = getActiveAccountId() || '';
  return { accounts, activeId };
}

async function handleAccountSwitch(accountId) {
  if (!accountId || isAccountSwitching) return;
  isAccountSwitching = true;
  const seq = ++accountSwitchSeq;
  try {
    await setActiveAccount(accountId);
    if (seq !== accountSwitchSeq) return;

    // Sayfayı yenilemek yerine custom event fırlat ve re-render et
    window.dispatchEvent(new CustomEvent('accountChanged', { detail: { accountId } }));
  } finally {
    isAccountSwitching = false;
  }
}

function handleManageAccounts() {
  window.location.hash = '#/accounts';
}

function bootAuthedApp(user) {
  currentAuthUser = user;

  if (!window.location.hash || window.location.hash === '#') {
    window.location.hash = '#/dashboard';
  }

  if (!stopRouter) {
    stopRouter = startRouter(renderLayout);
    stopDatePickerAutoBind = startDatePickerAutoBind(document.body);

    startInvoiceNotificationMonitor().catch((err) => {
      console.warn('Bildirim izleyicisi baslatilamadi:', err?.message || err);
    });
  } else {
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  }
}

function bindAuthState() {
  if (authBound) return;
  authBound = true;

  const sb = getSupabase();
  sb.auth.onAuthStateChange((event, session) => {
    if (isAuthenticatedSession(session)) {
      bootAuthedApp(session.user);
      return;
    }

    currentAuthUser = null;
    teardownAppRuntime();
    renderLoginPage();
  });
}

// ── Layout Renderer ──
function renderLayout(pageElement, title, currentRoute) {
  const app = document.getElementById('app');
  if (!app) return;

  app.innerHTML = '';

  const layout = document.createElement('div');
  layout.className = 'app-layout';

  // Sidebar
  const sidebar = renderSidebar(currentRoute);
  layout.appendChild(sidebar);

  // Sidebar Overlay (Mobile)
  const overlay = document.createElement('div');
  overlay.className = 'sidebar-overlay';
  overlay.id = 'sidebarOverlay';
  overlay.addEventListener('click', () => {
    sidebar.classList.remove('sidebar-mobile-open');
    overlay.classList.remove('active');
  });
  layout.appendChild(overlay);

  // Main Area
  const mainArea = document.createElement('div');
  mainArea.className = 'main-area';

  // Header
  const header = renderHeader(title, {
    userInitials: getUserInitials(currentAuthUser),
    userEmail: currentAuthUser?.email || '',
    onLogout: handleLogout,
    requestAccounts: getHeaderAccountsData,
    onAccountSwitch: handleAccountSwitch,
    onManageAccounts: handleManageAccounts,
  });
  mainArea.appendChild(header);

  // Page Content
  const content = document.createElement('main');
  content.className = 'page-content';
  content.appendChild(pageElement);
  mainArea.appendChild(content);

  layout.appendChild(mainArea);
  
  // Mobile Bottom Navigation
  const bottomNav = renderBottomNav(currentRoute);
  layout.appendChild(bottomNav);

  app.appendChild(layout);
  setupBottomNavAutoHide(content, bottomNav);
}

// ── Start Application ──
bindAuthState();
getSession().then((session) => {
  if (isAuthenticatedSession(session)) {
    bootAuthedApp(session.user);
  } else {
    renderLoginPage();
  }
}).catch(() => {
  renderLoginPage();
});

window.addEventListener('beforeunload', () => {
  teardownAppRuntime();
}, { once: true });

// ── PWA & Service Worker Registration ──
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => console.log('%cPWA Service Worker Aktif', 'color:#10b981;font-weight:bold;', reg.scope))
      .catch((err) => console.warn('Service Worker hatası:', err));
  });
}

console.log('%c🧾 Sonvera 2.0', 'font-size:16px;font-weight:bold;color:#3b82f6');
console.log('%cE-Fatura Yönetim Platformu başlatıldı', 'color:#94a3b8');

