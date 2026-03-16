// ══════════════════════════════════════════
// Settings Page
// ══════════════════════════════════════════
import { isSupabaseConfigured, initSupabase } from '../lib/supabase.js';
import { showToast } from '../components/toast.js';
import { EMBEDDED_SUPABASE_URL, EMBEDDED_SUPABASE_ANON_KEY } from '../lib/supabase.js';
import {
  getPushStatus,
  getStoredVapidKey,
  requestNotificationPermission,
  setStoredVapidKey,
  subscribePush,
  triggerLocalTestNotification,
  unsubscribePush,
} from '../services/push-manager.js';


export async function renderSettings() {
  const page = document.createElement('div');
  const sbConfigured = isSupabaseConfigured();
  const sbUrl = EMBEDDED_SUPABASE_URL;
  const sbKey = EMBEDDED_SUPABASE_ANON_KEY;
  const theme = localStorage.getItem('nilfatura_theme') || 'dark';
  const pushStatus = await getPushStatus();
  const vapidKey = getStoredVapidKey();

  page.innerHTML = `
    <div class="page-header">
      <div>
        <h2>⚙️ Ayarlar</h2>
        <p class="page-header-sub">Platform yapılandırması ve güvenlik ayarları</p>
      </div>
    </div>

    <!-- Theme -->
    <div class="card settings-section">
      <h3>🎨 Tema Ayarları</h3>
      <div class="form-group">
        <label class="form-label">Uygulama Teması</label>
        <select class="form-select" id="themeSelect" style="max-width:300px">
          <option value="dark" ${theme === 'dark' ? 'selected' : ''}>🌙 Dark Mode</option>
          <option value="light" ${theme === 'light' ? 'selected' : ''}>☀️ Light Mode</option>
        </select>
      </div>
    </div>

    <!-- Supabase -->
    <div class="card settings-section">
      <h3>🔐 Supabase Yapılandırması</h3>
      <p style="font-size:13px;color:var(--text-muted);margin-bottom:16px">
        ${sbConfigured
          ? '<span class="badge badge-success">✓ Bağlı</span> Sabit Supabase bağlantısı aktif (her oturumda otomatik)'
          : '<span class="badge badge-warning">! Yapılandırılmamış</span>'
        }
      </p>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Supabase URL</label>
          <input type="url" class="form-input" id="sbUrl" value="${sbUrl}" readonly />
        </div>
        <div class="form-group">
          <label class="form-label">Anon Key</label>
          <input type="password" class="form-input" id="sbKey" value="${sbKey}" readonly />
        </div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
        <button class="btn btn-primary" id="saveSbBtn">Supabase'i Simdi Baslat</button>
      </div>
      <p style="margin-top:10px;font-size:12px;color:var(--text-muted)">Not: Frontend tarafinda sadece URL + Anon Key kullanilir. Service Role anahtari guvenlik nedeniyle buraya girilmemelidir.</p>
    </div>

    <!-- Push Bildirim -->
    <div class="card settings-section">
      <h3>📲 PWA Push Bildirim</h3>
      <p style="font-size:13px;color:var(--text-muted);margin-bottom:12px">
        Durum: <span id="pushStatusBadge" class="badge ${pushStatus.subscribed ? 'badge-success' : 'badge-warning'}">${
          pushStatus.supported
            ? (pushStatus.subscribed ? 'Abone' : 'Abone Değil')
            : 'Desteklenmiyor'
        }</span>
      </p>

      <div class="form-group">
        <label class="form-label">VAPID Public Key (Opsiyonel)</label>
        <input type="text" class="form-input" id="pushVapidKey" value="${vapidKey}" placeholder="BEl5... (base64url public key)">
      </div>

      <div class="form-group">
        <label class="form-label">Abonelik Endpoint</label>
        <input type="text" class="form-input" id="pushEndpoint" value="${pushStatus.endpoint || ''}" readonly placeholder="Henüz abonelik yok">
      </div>

      <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
        <button class="btn btn-secondary" id="btnPushPermission">İzin İste</button>
        <button class="btn btn-primary" id="btnPushSubscribe">Abone Ol</button>
        <button class="btn btn-secondary" id="btnPushUnsubscribe">Aboneliği Kaldır</button>
        <button class="btn" id="btnPushTest" style="background:#0ea5e9;color:#fff;">Test Bildirimi</button>
      </div>
      <p style="margin-top:10px;font-size:12px;color:var(--text-muted)">
        Not: Sunucuya gerçek push gönderimi için backend tarafında subscription endpoint'i saklama ve VAPID private key ile gönderim gerekir.
      </p>
    </div>

    <!-- Danger Zone -->
    <div class="card settings-section" style="border-color:rgba(239,68,68,0.2)">
      <h3 style="color:var(--danger)">⚠️ Tehlikeli Bölge</h3>
      <p style="font-size:13px;color:var(--text-muted);margin-bottom:16px">Bu işlemler geri alınamaz</p>
      <div style="display:flex;gap:10px">
        <button class="btn btn-danger" id="clearLocal">🗑 Yerel Verileri Temizle</button>
        <button class="btn btn-danger" id="clearAll">🗑 Tüm Ayarları Sıfırla</button>
      </div>
    </div>
  `;

  // Theme
  page.querySelector('#themeSelect')?.addEventListener('change', (e) => {
    document.documentElement.setAttribute('data-theme', e.target.value);
    localStorage.setItem('nilfatura_theme', e.target.value);
    showToast('Tema değiştirildi', 'success');
  });

  // Supabase
  page.querySelector('#saveSbBtn')?.addEventListener('click', () => {
    try {
      initSupabase();
      showToast('Sabit Supabase bağlantısı aktif ✅', 'success');
    } catch (e) {
      showToast(`Bağlantı hatası: ${e.message}`, 'error');
    }
  });

  async function refreshPushState() {
    const status = await getPushStatus();
    const badge = page.querySelector('#pushStatusBadge');
    const endpoint = page.querySelector('#pushEndpoint');

    if (!badge || !endpoint) return;

    badge.textContent = status.supported
      ? (status.subscribed ? 'Abone' : 'Abone Değil')
      : 'Desteklenmiyor';

    badge.classList.remove('badge-success', 'badge-warning');
    badge.classList.add(status.subscribed ? 'badge-success' : 'badge-warning');
    endpoint.value = status.endpoint || '';
  }

  page.querySelector('#pushVapidKey')?.addEventListener('change', (e) => {
    const val = setStoredVapidKey(e.target.value);
    e.target.value = val;
    showToast(val ? 'VAPID public key kaydedildi' : 'VAPID public key temizlendi', 'info');
  });

  page.querySelector('#btnPushPermission')?.addEventListener('click', async () => {
    try {
      const permission = await requestNotificationPermission();
      showToast(`Bildirim izni: ${permission}`, permission === 'granted' ? 'success' : 'warning');
      await refreshPushState();
    } catch (e) {
      showToast(`İzin işlemi başarısız: ${e.message}`, 'error');
    }
  });

  page.querySelector('#btnPushSubscribe')?.addEventListener('click', async () => {
    try {
      const vapid = page.querySelector('#pushVapidKey')?.value || '';
      setStoredVapidKey(vapid);
      await subscribePush(vapid);
      await refreshPushState();
      showToast('Push aboneliği aktif', 'success');
    } catch (e) {
      showToast(`Abonelik hatası: ${e.message}`, 'error');
    }
  });

  page.querySelector('#btnPushUnsubscribe')?.addEventListener('click', async () => {
    try {
      await unsubscribePush();
      await refreshPushState();
      showToast('Push aboneliği kaldırıldı', 'warning');
    } catch (e) {
      showToast(`Kaldırma hatası: ${e.message}`, 'error');
    }
  });

  page.querySelector('#btnPushTest')?.addEventListener('click', async () => {
    try {
      await triggerLocalTestNotification();
      showToast('Test bildirimi gönderildi', 'success');
    } catch (e) {
      showToast(`Test bildirimi hatası: ${e.message}`, 'error');
    }
  });

  // Clear local
  page.querySelector('#clearLocal')?.addEventListener('click', () => {
    if (confirm('Yerel taslaklar ve hesap verileri silinecek. Emin misiniz?')) {
      localStorage.removeItem('nilfatura_local_drafts');
      localStorage.removeItem('nilfatura_accounts');
      localStorage.removeItem('nilfatura_active_account');
      showToast('Yerel veriler temizlendi', 'warning');
    }
  });

  // Clear all
  page.querySelector('#clearAll')?.addEventListener('click', () => {
    if (confirm('TÜM AYARLAR SİLİNECEK. Bu işlem geri alınamaz!')) {
      const keys = Object.keys(localStorage).filter(k => k.startsWith('nilfatura_') || k.startsWith('sb_'));
      keys.forEach(k => localStorage.removeItem(k));
      showToast('Tüm ayarlar sıfırlandı', 'warning');
      setTimeout(() => window.location.reload(), 1000);
    }
  });

  return page;
}
