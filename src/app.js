// ══════════════════════════════════════════
// Sonvera — Main Application Entry Point
// ══════════════════════════════════════════
import './styles/main.css';
import './styles/mobile.css';
import 'flatpickr/dist/flatpickr.min.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import './styles/system.css';
import { clearPrivateStorage, hasPendingMutation } from './lib/operations.js';
import { clearAccounts } from './services/account-manager.js';
import { showToast } from './components/toast.js';
import { startPwa } from './lib/pwa.js';
import { closeAllModals } from './components/modal.js';
import { disposeEventScope } from './lib/page-events.js';
import { registerRoute, startRouter } from './router.js';
import { renderSidebar } from './components/sidebar.js';
import { renderHeader } from './components/header.js';
import { renderBottomNav } from './components/bottom-nav.js';
import { logoMark } from './components/logo.js';
import { startInvoiceNotificationMonitor, stopInvoiceNotificationMonitor } from './services/invoice-notification-monitor.js';
import { startDatePickerAutoBind } from './lib/date-picker.js';
import { getSession, signIn, signOut, getSupabase } from './lib/supabase.js';
import { listAccounts, getActiveAccountId, setActiveAccount, syncAccounts } from './services/account-manager.js';

// Pages

const renderInvoiceCreate = (...args) => import('./pages/invoice-create.js').then(m => m.renderInvoiceCreate(...args));
const renderIncomingInvoices = (...args) => import('./pages/invoices-incoming.js').then(m => m.renderIncomingInvoices(...args));
const renderOutgoingInvoices = (...args) => import('./pages/invoices-outgoing.js').then(m => m.renderOutgoingInvoices(...args));
const renderEArsivInvoices = (...args) => import('./pages/earsiv-faturalar.js').then(m => m.renderEArsivInvoices(...args));
const renderDrafts = (...args) => import('./pages/drafts.js').then(m => m.renderDrafts(...args));
const renderAccounts = (...args) => import('./pages/accounts.js').then(m => m.renderAccounts(...args));
const renderExportPage = (...args) => import('./pages/export.js').then(m => m.renderExportPage(...args));
const renderSettings = (...args) => import('./pages/settings.js').then(m => m.renderSettings(...args));
const renderCariPage = (...args) => import('./pages/cari.js').then(m => m.renderCariPage(...args));
const renderMultiAccountCari = (...args) => import('./pages/multi-account-cari.js').then(m => m.renderMultiAccountCari(...args));
const renderSelectedAccountCari = (...args) => import('./pages/selected-account-cari.js').then(m => m.renderSelectedAccountCari(...args));
const renderTopluTahsilat = (...args) => import('./pages/toplu-tahsilat.js').then(m => m.renderTopluTahsilat(...args));
const renderPlaceholderPage = (...args) => import('./pages/placeholder-page.js').then(m => m.renderPlaceholderPage(...args));
const renderGibEarsiv = (...args) => import('./pages/gib-earsiv.js').then(m => m.renderGibEarsiv(...args));
const renderEirsaliyeCreate = (...args) => import('./pages/eirsaliye-create.js').then(m => m.renderEirsaliyeCreate(...args));
const renderEDespatchOutgoing = (...args) => import('./pages/eirsaliye-outgoing.js').then(m => m.renderEDespatchOutgoing(...args));
const renderEDespatchIncoming = (...args) => import('./pages/eirsaliye-incoming.js').then(m => m.renderEDespatchIncoming(...args));
const renderEFaturaArchiveOutgoing = (...args) => import('./pages/archive-boxes.js').then(m => m.renderEFaturaArchiveOutgoing(...args));
const renderEFaturaArchiveIncoming = (...args) => import('./pages/archive-boxes.js').then(m => m.renderEFaturaArchiveIncoming(...args));
const renderEirsaliyeArchiveOutgoing = (...args) => import('./pages/archive-boxes.js').then(m => m.renderEirsaliyeArchiveOutgoing(...args));
const renderEirsaliyeArchiveIncoming = (...args) => import('./pages/archive-boxes.js').then(m => m.renderEirsaliyeArchiveIncoming(...args));
const renderDashboard = (...args) => import('./pages/dashboard.js').then(m => m.renderDashboard(...args));

// ── Apply saved theme ──
const savedTheme = localStorage.getItem('nilfatura_theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
document.documentElement.setAttribute('data-theme', savedTheme);

// ── iOS viewport height fix ──
function setAppHeight() {
  document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`);
}
setAppHeight();
window.addEventListener('resize', setAppHeight);
window.addEventListener('orientationchange', () => setTimeout(setAppHeight, 100));

const ALLOWED_LOGIN_EMAIL = 'sonvera@gmail.com';

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

// ── Register Routes ──

// Core pages (existing)
registerRoute('/belge', async (route) => (await import('./react/documents.tsx')).mountSharedDocument(route));
registerRoute('/belgeler', async (route) => (await import('./react/documents.tsx')).mountDocuments(route));
registerRoute('/dashboard', async () => ({
  page: await renderDashboard(),
  title: 'Ana Sayfa'
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

registerRoute('/settings', async () => (await import('./react/workspace.tsx')).mountWorkspace('settings'));

registerRoute('/cari', async () => ({
  page: await renderCariPage(),
  title: 'Cari ve Tahsilat'
}));
registerRoute('/cari-ozet', async () => (await import('./react/workspace.tsx')).mountWorkspace('customers'));
registerRoute('/cari-musteriler', async () => ({page:await renderCariPage(),title:'Müşteri Cari Detayı'}));
registerRoute('/cari-react', async () => (await import('./react/workspace.tsx')).mountWorkspace('ledger'));

registerRoute('/tum-hesaplar-cari', async () => ({
  page: await renderMultiAccountCari(),
  title: 'Tüm Hesaplar Cari (Satış)'
}));

registerRoute('/secili-hesaplar-cari', async () => ({
  page: await renderSelectedAccountCari(),
  title: 'Seçili Hesaplar Cari (Tüm İşlemler)'
}));

registerRoute('/toplu-tahsilat', async () => ({
  page: await renderTopluTahsilat(),
  title: 'Toplu Tahsilat'
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
registerRoute('/firma', async () => (await import('./react/directory.tsx')).mountDirectory('company'));

registerRoute('/musteriler', async () => (await import('./react/directory.tsx')).mountDirectory('customers'));

registerRoute('/efatura-etiketler', async () => (await import('./react/directory.tsx')).mountDirectory('tags'));

registerRoute('/efatura-sablonlar', async () => (await import('./react/directory.tsx')).mountDirectory('templates'));

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
    page: await renderPlaceholderPage(routeKey),
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
          <div class="login-logo-icon">${logoMark(60)}</div>
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
    if (isLoginLocked() || submitBtn?.disabled) return;

    const email = app.querySelector('#authEmail')?.value?.trim();
    const password = app.querySelector('#authPassword')?.value || '';
    if (!email || !password) return;

    submitBtn?.setAttribute('disabled', 'true');
    const btnText = app.querySelector('#loginBtnText');
    const btnSpinner = app.querySelector('#loginBtnSpinner');
    if (btnText) btnText.textContent = 'Giris yapiliyor...';
    if (btnSpinner) btnSpinner.style.display = 'inline-block';

    try {
      await signIn(email, password);
      loginFailCount = 0;
      loginLockUntil = 0;
      // The auth listener replaces this page once accounts are loaded; keep the spinner until then.
      if (btnText) btnText.textContent = 'Hesaplar yükleniyor...';
    } catch (err) {
      const cooldown = recordLoginFail();
      const lockMsg = cooldown > 0 ? ` ${cooldown} saniye beklemeniz gerekiyor.` : '';
      submitBtn?.removeAttribute('disabled');
      if (btnText) btnText.textContent = 'Giris Yap';
      if (btnSpinner) btnSpinner.style.display = 'none';
      renderLoginPage((err?.message || 'Giris sirasinda bir hata olustu.') + lockMsg);
    }
  });
}

function teardownAppRuntime() {
  closeAllModals();
  stopInvoiceNotificationMonitor();
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
    if (hasPendingMutation()) { showToast("İşlem sürüyor; sonuçlanmasını bekleyin.", "warning"); return; }
    await signOut();
    clearPrivateStorage();
    clearAccounts();
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
  } catch (error) {
    showToast(error.message || 'Hesap değiştirilemedi.', 'warning');
  } finally {
    isAccountSwitching = false;
  }
}

function handleManageAccounts() {
  window.location.hash = '#/accounts';
}

let bootPromise = null;
let bootUserId = '';

// Startup fires both getSession() and the INITIAL_SESSION auth event; without this the app booted and rendered twice.
function bootAuthedApp(user) {
  if (bootPromise && bootUserId === user.id) { currentAuthUser = user; return bootPromise; }
  bootUserId = user.id;
  bootPromise = runBootAuthedApp(user).finally(() => { bootPromise = null; });
  return bootPromise;
}

async function runBootAuthedApp(user) {
  currentAuthUser = user;

  // Hesap listesini buluttan (Supabase) tazele: yeni cihazda bellek-içi state boş
  // olabilir. Router başlamadan önce tamamlanmalı ki ilk render doğru hesabı görsün.
  try { await syncAccounts().catch(error => showToast(error.message, 'error')); } catch (e) { console.warn('Hesap senkronu başarısız:', e?.message || e); }

  if (!window.location.hash || window.location.hash === '#') {
    window.location.hash = '#/dashboard';
  }

  if (!stopRouter) {
    stopRouter = startRouter(renderLayout);
    stopDatePickerAutoBind = startDatePickerAutoBind(document.body);

    startInvoiceNotificationMonitor({ delayMs: 4000 }).catch((err) => {
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
      // Uygulama ZATEN çalışıyorsa (router aktif) sayfayı baştan render ETME.
      // Sekmeye geri dönünce Supabase SIGNED_IN / TOKEN_REFRESHED / INITIAL_SESSION
      // olayları tetikler; eskiden bunlar bootAuthedApp -> hashchange -> tam re-render
      // yapıp açık sayfanın verilerini (ör. "Tüm Hesaplar Cari" taraması) sıfırlıyordu.
      // Artık sadece kullanıcı referansını güncelliyoruz.
      if (stopRouter && currentAuthUser?.id===session.user.id) {
        currentAuthUser = session.user;
        return;
      }
      if(currentAuthUser&&currentAuthUser.id!==session.user.id){teardownAppRuntime();clearPrivateStorage();clearAccounts();}
      bootAuthedApp(session.user);
      return;
    }

    currentAuthUser = null;
    teardownAppRuntime();
    if(event==='SIGNED_OUT'){clearPrivateStorage();clearAccounts();}
    renderLoginPage();
  });
}

// ── Layout Renderer ──
function renderLayout(pageElement, title, currentRoute) {
  const app = document.getElementById('app');
  if (!app) return;
  disposeEventScope(app);
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

window.addEventListener('beforeunload', (event) => {
  if (hasPendingMutation()) { event.preventDefault(); event.returnValue = ''; }
}, { once: true });

startPwa();
