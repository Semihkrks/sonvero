// ══════════════════════════════════════════
// Firma Bilgileri Page
// ══════════════════════════════════════════
import { General } from '../api/nilvera.js';
import { getActiveAccount } from '../services/account-manager.js';
import { showToast } from '../components/toast.js';

const ic = {
  building: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="2" width="22" height="20" rx="2" ry="2"/><line x1="7" y1="8" x2="7.01" y2="8"/><line x1="12" y1="8" x2="12.01" y2="8"/><line x1="17" y1="8" x2="17.01" y2="8"/><line x1="7" y1="12" x2="7.01" y2="12"/><line x1="12" y1="12" x2="12.01" y2="12"/><line x1="17" y1="12" x2="17.01" y2="12"/></svg>`,
  refresh: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>`,
  noData: `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" opacity="0.3"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
};

function infoRow(label, value) {
  return `<div class="company-info-row">
    <span class="company-info-label">${label}</span>
    <span class="company-info-value">${value || '—'}</span>
  </div>`;
}

export async function renderCompanyInfo() {
  const page = document.createElement('div');
  const account = await getActiveAccount();

  page.innerHTML = `
    <div class="page-header">
      <div>
        <h2 style="display:flex;align-items:center;gap:8px">${ic.building} Firma Bilgileri</h2>
        <p class="page-header-sub">Nilvera uzerindeki firma bilgileriniz</p>
      </div>
      <button class="btn btn-secondary" id="refreshCompanyBtn" style="display:flex;align-items:center;gap:6px">${ic.refresh} Yenile</button>
    </div>
    <div class="card" id="companyContent" style="max-width:700px">
      <div style="padding:40px;text-align:center;color:var(--text-muted)">
        <div style="animation:pulse 1.5s infinite">${ic.noData}</div>
        <p style="margin-top:12px">Firma bilgileri yukleniyor...</p>
      </div>
    </div>
  `;

  async function loadCompanyInfo() {
    const content = page.querySelector('#companyContent');
    if (!content) return;

    if (!account) {
      content.innerHTML = `<div style="padding:30px;text-align:center;color:var(--text-muted)">${ic.noData}<p>Hesap secilmedi</p></div>`;
      return;
    }

    content.innerHTML = `<div style="padding:40px;text-align:center;color:var(--text-muted)"><div style="animation:pulse 1.5s infinite">${ic.noData}</div><p style="margin-top:12px">Yukleniyor...</p></div>`;

    try {
      const res = await General.getCompanyInfo();
      if (!res.success) {
        content.innerHTML = `<div style="padding:30px;text-align:center;color:var(--danger)">Veri alinamadi: ${res.error || 'Bilinmeyen hata'}</div>`;
        return;
      }

      const d = res.data || {};
      content.innerHTML = `
        <div style="padding:24px">
          <h3 style="font-size:16px;font-weight:700;margin-bottom:20px;color:var(--text-primary)">${d.Name || d.Title || account.name || 'Firma'}</h3>
          <div class="company-info-grid">
            ${infoRow('Vergi / TC No', d.TaxNumber || d.Identifier)}
            ${infoRow('Vergi Dairesi', d.TaxOffice)}
            ${infoRow('Unvan', d.Title || d.Name)}
            ${infoRow('Adres', d.Address)}
            ${infoRow('Ilce', d.District)}
            ${infoRow('Sehir', d.City)}
            ${infoRow('Ulke', d.Country)}
            ${infoRow('Telefon', d.Phone)}
            ${infoRow('E-Posta', d.Email)}
            ${infoRow('Web', d.WebSite || d.Website)}
            ${infoRow('e-Fatura Mukellef', d.IsEInvoiceTaxPayer ? 'Evet' : 'Hayir')}
            ${infoRow('e-Arsiv Mukellef', d.IsEArchiveTaxPayer ? 'Evet' : 'Hayir')}
            ${infoRow('e-Irsaliye Mukellef', d.IsEDespatchTaxPayer ? 'Evet' : 'Hayir')}
          </div>
        </div>
      `;
    } catch (e) {
      content.innerHTML = `<div style="padding:30px;text-align:center;color:var(--danger)">Hata: ${e.message}</div>`;
    }
  }

  page.querySelector('#refreshCompanyBtn')?.addEventListener('click', () => {
    showToast('Firma bilgileri yenileniyor...', 'info');
    loadCompanyInfo();
  });

  loadCompanyInfo();
  return page;
}
