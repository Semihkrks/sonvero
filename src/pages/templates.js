// ══════════════════════════════════════════
// Şablonlar (Templates) Page
// ══════════════════════════════════════════
import { EInvoice } from '../api/nilvera.js';
import { getActiveAccount } from '../services/account-manager.js';
import { showToast } from '../components/toast.js';

const ic = {
  layout: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>`,
  refresh: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>`,
  noData: `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" opacity="0.3"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>`,
};

export async function renderTemplatesPage() {
  const page = document.createElement('div');
  const account = await getActiveAccount();

  page.innerHTML = `
    <div class="nilvera-breadcrumb">
      ${ic.layout}
      <span>e-Fatura</span>
      <span class="bc-separator">›</span>
      <span class="bc-current">Sablonlar</span>
    </div>
    <div class="page-header" style="margin-bottom:20px">
      <div>
        <h2 style="display:flex;align-items:center;gap:8px">${ic.layout} Sablonlar</h2>
        <p class="page-header-sub">e-Fatura sablon listesi</p>
      </div>
      <button class="btn btn-secondary" id="refreshTemplatesBtn" style="display:flex;align-items:center;gap:6px">${ic.refresh} Yenile</button>
    </div>
    <div id="templatesContent" class="card" style="max-width:800px">
      <div style="padding:40px;text-align:center;color:var(--text-muted)">
        <div style="animation:pulse 1.5s infinite">${ic.noData}</div>
        <p style="margin-top:12px">Sablonlar yukleniyor...</p>
      </div>
    </div>
  `;

  async function loadTemplates() {
    const content = page.querySelector('#templatesContent');
    if (!content) return;

    if (!account) {
      content.innerHTML = `<div style="padding:30px;text-align:center;color:var(--text-muted)">${ic.noData}<p>Hesap secilmedi</p></div>`;
      return;
    }

    content.innerHTML = `<div style="padding:40px;text-align:center;color:var(--text-muted)"><div style="animation:pulse 1.5s infinite">${ic.noData}</div><p style="margin-top:12px">Yukleniyor...</p></div>`;

    try {
      const res = await EInvoice.listTemplates();
      if (!res.success) {
        content.innerHTML = `<div style="padding:30px;text-align:center;color:var(--danger)">Veri alinamadi: ${res.error || 'Bilinmeyen hata'}</div>`;
        return;
      }

      const templates = Array.isArray(res.data) ? res.data : (res.data?.Items || res.data?.Content || []);

      if (templates.length === 0) {
        content.innerHTML = `<div style="padding:40px;text-align:center;color:var(--text-muted)">${ic.noData}<p style="margin-top:12px">Henuz sablon tanimlanmamis</p></div>`;
        return;
      }

      content.innerHTML = `
        <div style="padding:20px">
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:16px">${templates.length} sablon</div>
          <div style="display:flex;flex-direction:column;gap:10px">
            ${templates.map(t => `
              <div class="card" style="padding:16px;display:flex;align-items:center;gap:14px">
                <div style="width:42px;height:42px;border-radius:var(--radius-md);background:var(--accent-bg);display:flex;align-items:center;justify-content:center;color:var(--accent);flex-shrink:0">${ic.layout}</div>
                <div style="flex:1;min-width:0">
                  <div style="font-weight:600;font-size:13px">${t.Name || t.TemplateName || '—'}</div>
                  <div style="font-size:11px;color:var(--text-muted);margin-top:2px">${t.Description || t.Type || ''}</div>
                </div>
                ${t.IsDefault ? '<span class="badge badge-success" style="font-size:10px">Varsayilan</span>' : ''}
              </div>
            `).join('')}
          </div>
        </div>
      `;
    } catch (e) {
      content.innerHTML = `<div style="padding:30px;text-align:center;color:var(--danger)">Hata: ${e.message}</div>`;
    }
  }

  page.querySelector('#refreshTemplatesBtn')?.addEventListener('click', () => {
    showToast('Sablonlar yenileniyor...', 'info');
    loadTemplates();
  });

  loadTemplates();
  return page;
}
