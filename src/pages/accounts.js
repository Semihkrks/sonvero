// ══════════════════════════════════════════
// Accounts Management Page
// ══════════════════════════════════════════
import { listAccounts, addAccount, updateAccount, deleteAccount, setActiveAccount, getActiveAccountId, ACCOUNT_COLORS } from '../services/account-manager.js';
import { showToast } from '../components/toast.js';
import { showModal } from '../components/modal.js';

const ic = {
  users: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  plus: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  key: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>`,
  keyLarge: `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" opacity="0.3"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>`,
  building: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="2" width="22" height="20" rx="2" ry="2"/><line x1="7" y1="8" x2="7.01" y2="8"/><line x1="12" y1="8" x2="12.01" y2="8"/><line x1="17" y1="8" x2="17.01" y2="8"/><line x1="7" y1="12" x2="7.01" y2="12"/><line x1="12" y1="12" x2="12.01" y2="12"/><line x1="17" y1="12" x2="17.01" y2="12"/></svg>`,
  clipboard: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>`,
  check: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  edit: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  trash: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
};

export async function renderAccounts() {
  const page = document.createElement('div');

  page.innerHTML = `
    <div class="page-header">
      <div>
        <h2 style="display:flex;align-items:center;gap:8px">${ic.users} Hesap Yönetimi</h2>
        <p class="page-header-sub">Nilvera API hesaplarınızı yönetin — birden fazla hesap ekleyip arasında geçiş yapın</p>
      </div>
      <button class="btn btn-primary" id="addAccountBtn">${ic.plus} Yeni Hesap Ekle</button>
    </div>
    <div class="accounts-grid" id="accountsGrid"></div>
  `;

  page.querySelector('#addAccountBtn')?.addEventListener('click', () => showAccountForm(page));
  await refreshGrid(page);
  return page;
}

async function refreshGrid(page) {
  const grid = page.querySelector('#accountsGrid');
  if (!grid) return;

  const accounts = await listAccounts();
  const activeId = getActiveAccountId();

  if (accounts.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div style="margin-bottom:12px">${ic.keyLarge}</div>
        <h3>Henüz hesap yok</h3>
        <p>İlk Nilvera API hesabınızı ekleyerek başlayın</p>
        <button class="btn btn-primary" id="emptyAddBtn">${ic.plus} Hesap Ekle</button>
      </div>
    `;
    grid.querySelector('#emptyAddBtn')?.addEventListener('click', () => showAccountForm(page));
    return;
  }

  grid.innerHTML = accounts.map(acc => `
    <div class="account-card ${acc.id === activeId ? 'active-account' : ''}" data-id="${acc.id}">
      <div class="account-card-header">
        <span class="account-card-color" style="background:${acc.color || '#6366f1'}"></span>
        <span class="account-card-name">${acc.name}</span>
        <span class="account-card-env ${acc.environment}">${acc.environment === 'live' ? 'CANLI' : 'TEST'}</span>
      </div>
      ${acc.company_name ? `<div style="display:flex;align-items:center;gap:4px;font-size:12px;color:var(--text-muted);margin-bottom:6px">${ic.building} ${acc.company_name}</div>` : ''}
      ${acc.vkn ? `<div style="display:flex;align-items:center;gap:4px;font-size:12px;color:var(--text-muted);margin-bottom:8px">${ic.clipboard} VKN: ${acc.vkn}</div>` : ''}
      <div class="account-card-key" style="display:flex;align-items:center;gap:6px">${ic.key} ${'•'.repeat(12)}${(acc.api_key || '').slice(-8)}</div>
      <div class="account-card-actions">
        ${acc.id !== activeId
          ? `<button class="btn btn-sm btn-primary" data-action="activate" data-id="${acc.id}" style="display:flex;align-items:center;gap:4px">${ic.check} Aktif Yap</button>`
          : `<span class="badge badge-success" style="display:flex;align-items:center;gap:4px">${ic.check} Aktif Hesap</span>`
        }
        <button class="btn btn-sm btn-secondary" data-action="edit" data-id="${acc.id}">${ic.edit}</button>
        <button class="btn btn-sm btn-danger" data-action="delete" data-id="${acc.id}">${ic.trash}</button>
      </div>
    </div>
  `).join('');

  grid.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const action = btn.dataset.action;

      if (action === 'activate') {
        await setActiveAccount(id);
        showToast('Hesap aktif edildi', 'success');
        await refreshGrid(page);
      } else if (action === 'delete') {
        if (confirm('Bu hesabı silmek istediğinize emin misiniz?')) {
          await deleteAccount(id);
          showToast('Hesap silindi', 'warning');
          await refreshGrid(page);
        }
      } else if (action === 'edit') {
        const acc = accounts.find(a => a.id === id);
        if (acc) showAccountForm(page, acc);
      }
    });
  });
}

function showAccountForm(page, existing = null) {
  const isEdit = !!existing;
  const existingPrefs = { invoice_series: existing?.invoice_series };
  const colorOptions = ACCOUNT_COLORS.map(c =>
    `<button type="button" class="color-opt" data-color="${c}" style="width:28px;height:28px;border-radius:50%;border:2px solid ${c === (existing?.color || '#6366f1') ? 'white' : 'transparent'};background:${c};cursor:pointer;transition:all 0.15s"></button>`
  ).join('');

  const body = document.createElement('div');
  body.innerHTML = `
    <div class="form-group">
      <label class="form-label">Hesap Adı</label>
      <input type="text" class="form-input" id="accName" placeholder="Firma Muhasebe Hesabı" value="${existing?.name || ''}" />
      <span class="form-hint">Bu hesabı tanımlayacak bir isim</span>
    </div>
    <div class="form-group">
      <label class="form-label">API Anahtarı</label>
      <input type="password" class="form-input" id="accApiKey" placeholder="9EE05B6564525810C86A32646DB46A26..." value="${existing?.api_key || ''}" />
      <span class="form-hint">Nilvera portalından oluşturduğunuz API anahtarı</span>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Ortam</label>
        <select class="form-select" id="accEnv">
          <option value="test" ${existing?.environment !== 'live' ? 'selected' : ''}>Test (apitest.nilvera.com)</option>
          <option value="live" ${existing?.environment === 'live' ? 'selected' : ''}>Canlı (api.nilvera.com)</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Renk</label>
        <div style="display:flex;gap:6px;flex-wrap:wrap" id="colorPicker">${colorOptions}</div>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Firma Adı <span style="color:var(--text-muted)">(opsiyonel)</span></label>
        <input type="text" class="form-input" id="accCompany" value="${existing?.company_name || ''}" />
      </div>
      <div class="form-group">
        <label class="form-label">VKN <span style="color:var(--text-muted)">(opsiyonel)</span></label>
        <input type="text" class="form-input" id="accVkn" value="${existing?.vkn || ''}" />
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Fatura Seri <span style="color:var(--text-muted)">(opsiyonel)</span></label>
      <input type="text" class="form-input" id="accInvoiceSeries" maxlength="12" placeholder="Örn: AKA / BIR" value="${existingPrefs.invoice_series || ''}" />
      <span class="form-hint">Bu hesap aktifken Fatura Oluştur ekranında seri otomatik gelir.</span>
    </div>
  `;

  let selectedColor = existing?.color || '#6366f1';

  const footer = document.createElement('div');
  footer.style.cssText = 'display:flex;gap:10px;justify-content:flex-end;width:100%';
  footer.innerHTML = `
    <button class="btn btn-secondary" id="formCancel">İptal</button>
    <button class="btn btn-primary" id="formSave">${isEdit ? 'Güncelle' : 'Hesap Ekle'}</button>
  `;

  const modal = showModal({
    title: isEdit ? 'Hesabı Düzenle' : 'Yeni Hesap Ekle',
    body,
    footer,
    size: 'lg'
  });

  setTimeout(() => {
    document.querySelectorAll('.color-opt').forEach(opt => {
      opt.addEventListener('click', () => {
        document.querySelectorAll('.color-opt').forEach(o => o.style.borderColor = 'transparent');
        opt.style.borderColor = 'white';
        selectedColor = opt.dataset.color;
      });
    });

    document.getElementById('formCancel')?.addEventListener('click', () => modal?.close());

    document.getElementById('formSave')?.addEventListener('click', async () => {
      const name = document.getElementById('accName')?.value?.trim();
      const apiKey = document.getElementById('accApiKey')?.value?.trim();
      const env = document.getElementById('accEnv')?.value;
      const company = document.getElementById('accCompany')?.value?.trim();
      const vkn = document.getElementById('accVkn')?.value?.trim();
      const invoiceSeries = (document.getElementById('accInvoiceSeries')?.value || '').trim().toUpperCase();

      if (!name) return showToast('Hesap adı gerekli', 'warning');
      if (!apiKey) return showToast('API anahtarı gerekli', 'warning');

      try {
        if (isEdit) {
          await updateAccount(existing.id, { name, api_key: apiKey, environment: env, color: selectedColor, company_name: company, vkn, invoice_series: invoiceSeries });
          showToast('Hesap güncellendi', 'success');
        } else {
          const newAcc = await addAccount({ name, apiKey, environment: env, color: selectedColor, companyName: company, vkn, invoiceSeries });
          const all = await listAccounts();
          if (all.length === 1) await setActiveAccount(newAcc.id);
          showToast('Hesap eklendi', 'success');
        }
        modal?.close();
        await refreshGrid(page);
      } catch (e) {
        showToast(`Hata: ${e.message}`, 'error');
      }
    });
  }, 100);
}
