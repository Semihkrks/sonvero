// ══════════════════════════════════════════
// Müşteriler Page
// ══════════════════════════════════════════
import { General } from '../api/nilvera.js';
import { getActiveAccount } from '../services/account-manager.js';
import { showToast } from '../components/toast.js';

const ic = {
  users: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  search: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  noData: `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" opacity="0.3"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
};

export async function renderCustomers() {
  const page = document.createElement('div');

  page.innerHTML = `
    <div class="page-header">
      <div>
        <h2 style="display:flex;align-items:center;gap:8px">${ic.users} Musteriler</h2>
        <p class="page-header-sub">GIB e-Fatura mukellef listesinden musteri arama</p>
      </div>
    </div>
    <div class="card" style="max-width:800px">
      <div style="padding:20px">
        <div style="display:flex;gap:10px;margin-bottom:20px">
          <input type="text" class="form-input" id="customerSearch" placeholder="Firma adi veya VKN ile ara..." style="flex:1" />
          <button class="btn btn-primary" id="customerSearchBtn" style="display:flex;align-items:center;gap:6px">${ic.search} Ara</button>
        </div>
        <div id="customerResults">
          <div style="padding:30px;text-align:center;color:var(--text-muted)">${ic.noData}<p style="margin-top:12px">Aramak icin firma adi veya VKN girin</p></div>
        </div>
      </div>
    </div>
  `;

  async function doSearch() {
    const query = page.querySelector('#customerSearch')?.value?.trim();
    const results = page.querySelector('#customerResults');
    if (!query || !results) return;

    results.innerHTML = `<div style="padding:20px;text-align:center;color:var(--text-muted)"><div style="animation:pulse 1.5s infinite">${ic.noData}</div><p>Araniyor...</p></div>`;

    try {
      const res = await General.searchCompany(query);
      if (!res.success) {
        results.innerHTML = `<div style="padding:20px;text-align:center;color:var(--danger)">Hata: ${res.error}</div>`;
        return;
      }

      const items = Array.isArray(res.data) ? res.data : (res.data?.Items || res.data?.Content || []);
      if (items.length === 0) {
        results.innerHTML = `<div style="padding:20px;text-align:center;color:var(--text-muted)">${ic.noData}<p>Sonuc bulunamadi</p></div>`;
        return;
      }

      results.innerHTML = `
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px">${items.length} sonuc bulundu</div>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${items.slice(0, 50).map(c => `
            <div class="card" style="padding:14px;display:flex;justify-content:space-between;align-items:center;gap:12px">
              <div>
                <div style="font-weight:600;font-size:13px">${c.Title || c.Name || c.Identifier || '—'}</div>
                <div style="font-size:11px;color:var(--text-muted)">VKN: ${c.Identifier || c.TaxNumber || '—'} ${c.Alias ? `· Alias: ${c.Alias}` : ''}</div>
              </div>
              <div style="display:flex;gap:6px;flex-shrink:0">
                ${c.IsEInvoiceTaxPayer ? '<span class="badge badge-success" style="font-size:10px">e-Fatura</span>' : ''}
                ${c.IsEArchiveTaxPayer ? '<span class="badge badge-info" style="font-size:10px">e-Arsiv</span>' : ''}
                ${c.IsEDespatchTaxPayer ? '<span class="badge badge-warning" style="font-size:10px">e-Irsaliye</span>' : ''}
              </div>
            </div>
          `).join('')}
        </div>
      `;
    } catch (e) {
      results.innerHTML = `<div style="padding:20px;text-align:center;color:var(--danger)">Hata: ${e.message}</div>`;
    }
  }

  page.querySelector('#customerSearchBtn')?.addEventListener('click', doSearch);
  page.querySelector('#customerSearch')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doSearch();
  });

  return page;
}
