// ══════════════════════════════════════════
// Etiketler (Tags) Page
// ══════════════════════════════════════════
import { EInvoice } from '../api/nilvera.js';
import { getActiveAccount } from '../services/account-manager.js';
import { showToast } from '../components/toast.js';

const ic = {
  tag: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>`,
  refresh: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>`,
  noData: `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" opacity="0.3"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>`,
};

const tagColors = ['#3b82f6', '#2563eb', '#0ea5e9', '#06b6d4', '#14b8a6', '#22c55e', '#f59e0b', '#f97316', '#ef4444', '#64748b'];

export async function renderTagsPage() {
  const page = document.createElement('div');
  const account = await getActiveAccount();

  page.innerHTML = `
    <div class="nilvera-breadcrumb">
      ${ic.tag}
      <span>e-Fatura</span>
      <span class="bc-separator">›</span>
      <span class="bc-current">Etiketler</span>
    </div>
    <div class="page-header" style="margin-bottom:20px">
      <div>
        <h2 style="display:flex;align-items:center;gap:8px">${ic.tag} Etiketler</h2>
        <p class="page-header-sub">Faturalariniza atanmis etiketler</p>
      </div>
      <button class="btn btn-secondary" id="refreshTagsBtn" style="display:flex;align-items:center;gap:6px">${ic.refresh} Yenile</button>
    </div>
    <div id="tagsContent" class="card" style="max-width:700px">
      <div style="padding:40px;text-align:center;color:var(--text-muted)">
        <div style="animation:pulse 1.5s infinite">${ic.noData}</div>
        <p style="margin-top:12px">Etiketler yukleniyor...</p>
      </div>
    </div>
  `;

  async function loadTags() {
    const content = page.querySelector('#tagsContent');
    if (!content) return;

    if (!account) {
      content.innerHTML = `<div style="padding:30px;text-align:center;color:var(--text-muted)">${ic.noData}<p>Hesap secilmedi</p></div>`;
      return;
    }

    content.innerHTML = `<div style="padding:40px;text-align:center;color:var(--text-muted)"><div style="animation:pulse 1.5s infinite">${ic.noData}</div><p style="margin-top:12px">Yukleniyor...</p></div>`;

    try {
      const res = await EInvoice.listTags();
      if (!res.success) {
        content.innerHTML = `<div style="padding:30px;text-align:center;color:var(--danger)">Veri alinamadi: ${res.error || 'Bilinmeyen hata'}</div>`;
        return;
      }

      const tags = Array.isArray(res.data) ? res.data : (res.data?.Items || res.data?.Content || []);

      if (tags.length === 0) {
        content.innerHTML = `<div style="padding:40px;text-align:center;color:var(--text-muted)">${ic.noData}<p style="margin-top:12px">Henuz etiket tanimlanmamis</p></div>`;
        return;
      }

      content.innerHTML = `
        <div style="padding:20px">
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:16px">${tags.length} etiket</div>
          <div style="display:flex;flex-wrap:wrap;gap:10px">
            ${tags.map((t, i) => {
              const color = t.Color || tagColors[i % tagColors.length];
              const name = t.Name || t.TagName || t;
              return `<div style="display:inline-flex;align-items:center;gap:8px;padding:8px 14px;border-radius:20px;background:${color}18;border:1px solid ${color}33;font-size:13px;font-weight:500;color:${color}">
                <span style="width:8px;height:8px;border-radius:50%;background:${color}"></span>
                ${typeof name === 'string' ? name : JSON.stringify(name)}
              </div>`;
            }).join('')}
          </div>
        </div>
      `;
    } catch (e) {
      content.innerHTML = `<div style="padding:30px;text-align:center;color:var(--danger)">Hata: ${e.message}</div>`;
    }
  }

  page.querySelector('#refreshTagsBtn')?.addEventListener('click', () => {
    showToast('Etiketler yenileniyor...', 'info');
    loadTags();
  });

  loadTags();
  return page;
}
