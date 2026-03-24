// ══════════════════════════════════════════
// GİB e-Arşiv Alış Faturaları Page
// ══════════════════════════════════════════
import { EArchive } from '../api/nilvera.js';
import { getActiveAccount } from '../services/account-manager.js';
import { showToast } from '../components/toast.js';

const ic = {
  globe: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
  refresh: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>`,
  noData: `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" opacity="0.3"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
};

function fmtDate(d) {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString('tr-TR');
}

function fmtAmount(v) {
  const n = parseFloat(v || 0);
  return n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export async function renderGibEarsiv() {
  const page = document.createElement('div');
  const account = await getActiveAccount();

  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  const startDate = `${y}-${String(m + 1).padStart(2, '0')}-01`;
  const endDate = `${y}-${String(m + 1).padStart(2, '0')}-${String(new Date(y, m + 1, 0).getDate()).padStart(2, '0')}`;

  page.innerHTML = `
    <div class="nilvera-breadcrumb">
      ${ic.globe}
      <span>GIB e-Arsiv</span>
      <span class="bc-separator">›</span>
      <span class="bc-current">Alis Faturalari</span>
    </div>

    <div class="nilvera-filter-bar" style="margin-bottom:16px">
      <div class="filter-group">
        <label class="filter-label">Baslangic</label>
        <input type="date" class="filter-input" id="gibStart" value="${startDate}" />
      </div>
      <div class="filter-group">
        <label class="filter-label">Bitis</label>
        <input type="date" class="filter-input" id="gibEnd" value="${endDate}" />
      </div>
      <div class="filter-actions">
        <button class="btn btn-primary" id="gibLoadBtn" style="display:flex;align-items:center;gap:6px">${ic.refresh} Sorgula</button>
      </div>
    </div>

    <div id="gibContent" class="card">
      <div style="padding:40px;text-align:center;color:var(--text-muted)">
        ${ic.noData}
        <p style="margin-top:12px">Tarih araligi secip "Sorgula" butonuna basin</p>
      </div>
    </div>
  `;

  async function loadData() {
    const content = page.querySelector('#gibContent');
    if (!content) return;

    if (!account) {
      content.innerHTML = `<div style="padding:30px;text-align:center;color:var(--text-muted)">${ic.noData}<p>Hesap secilmedi</p></div>`;
      return;
    }

    const ds = page.querySelector('#gibStart')?.value;
    const de = page.querySelector('#gibEnd')?.value;

    content.innerHTML = `<div style="padding:40px;text-align:center;color:var(--text-muted)"><div style="animation:pulse 1.5s infinite">${ic.noData}</div><p style="margin-top:12px">GIB verileri yukleniyor...</p></div>`;

    try {
      const params = {};
      if (ds) params.StartDate = ds;
      if (de) params.EndDate = de;

      const res = await EArchive.listGibPurchases(params);
      if (!res.success) {
        content.innerHTML = `<div style="padding:30px;text-align:center;color:var(--danger)">Hata: ${res.error || 'Bilinmeyen'}</div>`;
        return;
      }

      const items = Array.isArray(res.data) ? res.data : (res.data?.Items || res.data?.Content || []);

      if (items.length === 0) {
        content.innerHTML = `<div style="padding:40px;text-align:center;color:var(--text-muted)">${ic.noData}<p style="margin-top:12px">Bu donemde GIB e-Arsiv alis faturasi bulunamadi</p></div>`;
        return;
      }

      content.innerHTML = `
        <div style="padding:16px">
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px">${items.length} fatura bulundu</div>
          <div class="table-wrapper">
            <table class="table">
              <thead>
                <tr>
                  <th>Tarih</th>
                  <th>Fatura No</th>
                  <th>Gonderen</th>
                  <th>VKN</th>
                  <th style="text-align:right">Tutar</th>
                </tr>
              </thead>
              <tbody>
                ${items.map(inv => `
                  <tr>
                    <td data-label="Tarih">${fmtDate(inv.IssueDate || inv.CreateDate)}</td>
                    <td data-label="Fatura No">${inv.InvoiceNumber || inv.DocumentNumber || '—'}</td>
                    <td data-label="Gonderen">${inv.SenderName || inv.SenderTitle || '—'}</td>
                    <td data-label="VKN">${inv.SenderIdentifier || inv.SenderTaxNumber || '—'}</td>
                    <td data-label="Tutar" style="text-align:right;font-weight:600">${fmtAmount(inv.PayableAmount || inv.TotalAmount)} TL</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    } catch (e) {
      content.innerHTML = `<div style="padding:30px;text-align:center;color:var(--danger)">Hata: ${e.message}</div>`;
    }
  }

  page.querySelector('#gibLoadBtn')?.addEventListener('click', loadData);

  return page;
}
