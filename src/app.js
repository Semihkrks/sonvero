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

const ALLOWED_LOGIN_EMAIL = 'sonvera@gmail.com';
const ALLOWED_LOGIN_PASSWORD = '123659789sK.';

async function signInFixedUser() {
  try {
    await signIn(ALLOWED_LOGIN_EMAIL, ALLOWED_LOGIN_PASSWORD);
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

// ── Placeholder routes for Nilvera sections ──
const placeholderRoutes = [
  // Fatura İşlemleri
  { path: '/create-export', title: 'İhracat Faturası Oluştur' },
  { path: '/upload-xml', title: 'XML Yükle' },
  { path: '/upload-excel', title: 'Excel Yükle' },
  { path: '/upload-sgk', title: 'SGK Pdf Yükle' },
  // e-Fatura
  { path: '/efatura-eski-giden', title: 'Eski Faturalar — Giden' },
  { path: '/efatura-eski-gelen', title: 'Eski Faturalar — Gelen' },
  { path: '/efatura-seriler', title: 'e-Fatura Seriler' },
  { path: '/efatura-sablonlar', title: 'e-Fatura Şablonlar' },
  { path: '/efatura-bildirim-giden', title: 'Giden Fatura Bildirimleri' },
  { path: '/efatura-bildirim-gelen', title: 'Gelen Fatura Bildirimleri' },
  { path: '/efatura-etiketler', title: 'e-Fatura Etiketler' },
  // e-Arşiv
  
  { path: '/earsiv-iptal', title: 'İptal Faturaları' },
  { path: '/earsiv-rapor-liste', title: 'Rapor Listesi' },
  { path: '/earsiv-rapor-olustur', title: 'Rapor Oluştur' },
  { path: '/earsiv-eski', title: 'e-Arşiv Eski Faturalar' },
  { path: '/earsiv-tanimlamalar', title: 'e-Arşiv Tanımlamalar' },
  { path: '/earsiv-bildirim', title: 'e-Arşiv Bildirim Ayarları' },
  { path: '/earsiv-etiketler', title: 'e-Arşiv Etiketler' },
  // e-İrsaliye
  { path: '/eirsaliye-olustur', title: 'İrsaliye Oluştur' },
  { path: '/eirsaliye-taslaklar', title: 'İrsaliye Taslakları' },
  { path: '/eirsaliye-dosya', title: 'İrsaliye Dosya Yükleme' },
  { path: '/eirsaliye-tanimlamalar', title: 'e-İrsaliye Tanımlamalar' },
  { path: '/eirsaliye-bildirim', title: 'e-İrsaliye Bildirim Ayarları' },
  { path: '/eirsaliye-etiketler', title: 'e-İrsaliye Etiketler' },
  // Others
  { path: '/gib-earsiv', title: 'GİB E-Arşiv' },
  { path: '/stoklar', title: 'Stoklar' },
  { path: '/musteriler', title: 'Müşteriler' },
  { path: '/mailing', title: 'Mailing Ayarları' },
  { path: '/raporlar', title: 'Raporlar' },
  { path: '/firma', title: 'Firma Bilgileri' },
  { path: '/kullanicilar', title: 'Kullanıcılar' },
  { path: '/api-tanimlari', title: 'API Tanımları' },
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

function renderLoginPage(info = '') {
  const app = document.getElementById('app');
  if (!app) return;

  app.innerHTML = `
    <div class="login-page">
      <div class="login-card">
        <div class="login-logo">
          <div class="login-logo-icon">S</div>
          <h1>Sonvera</h1>
          <p>Yetkili kullanıcı girişi</p>
        </div>
        <form id="authForm">
          <div class="form-group">
            <label class="form-label">E-Posta</label>
            <input type="email" id="authEmail" class="form-input" value="${ALLOWED_LOGIN_EMAIL}" readonly required />
          </div>
          <div class="form-group">
            <label class="form-label">Şifre</label>
            <input type="password" id="authPassword" class="form-input" placeholder="Şifre" required />
          </div>
          <button type="submit" class="btn btn-primary login-submit-btn" id="authSubmitBtn">
            Giriş Yap
          </button>
          ${info ? `<p class="login-info">${info}</p>` : ''}
          <p class="login-note">Oturum açık kalır. Aynı hesapla farklı telefonlardan giriş yapabilirsin.</p>
        </form>
      </div>
    </div>
  `;

  const form = app.querySelector('#authForm');
  const submitBtn = app.querySelector('#authSubmitBtn');

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = app.querySelector('#authEmail')?.value?.trim();
    const password = app.querySelector('#authPassword')?.value || '';
    if (!email || !password) return;

    submitBtn?.setAttribute('disabled', 'true');

    try {
      if (email !== ALLOWED_LOGIN_EMAIL || password !== ALLOWED_LOGIN_PASSWORD) {
        renderLoginPage('Yetkisiz giriş. Mail veya şifre hatalı.');
        return;
      }

      await signInFixedUser();
    } catch (err) {
      renderLoginPage(err?.message || 'Giriş sırasında bir hata oluştu.');
    } finally {
      submitBtn?.removeAttribute('disabled');
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

console.log('%c🧾 Sonvera 2.0', 'font-size:16px;font-weight:bold;color:#6366f1');
console.log('%cE-Fatura Yönetim Platformu başlatıldı', 'color:#94a3b8');

