// ══════════════════════════════════════════
// Excel Export Config Page
// ══════════════════════════════════════════
import { INVOICE_COLUMNS, LINE_COLUMNS, exportInvoicesToExcel } from '../services/excel-export.js';
import { EInvoice } from '../api/nilvera.js';
import { getActiveAccount } from '../services/account-manager.js';
import { showToast } from '../components/toast.js';

const ic = {
  chart: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
  settings: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
  download: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
  list: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`,
  loader: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="spin"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>`
};

export async function renderExportPage() {
  const page = document.createElement('div');
  const account = await getActiveAccount();

  page.innerHTML = `
    <div class="page-header">
      <div>
        <h2 style="display:flex;align-items:center;gap:8px">${ic.chart} Excel Export</h2>
        <p class="page-header-sub">Faturalarınızı özelleştirilmiş Excel dosyası olarak indirin</p>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
      <!-- Export Options -->
      <div class="card">
        <h3 style="margin-bottom:16px;font-size:15px;font-weight:700;display:flex;align-items:center;gap:6px">${ic.settings} Export Ayarları</h3>

        <div class="form-group">
          <label class="form-label">Fatura Kaynağı</label>
          <select class="form-select" id="exportSource">
            <option value="outgoing">Giden Faturalar</option>
            <option value="incoming">Gelen Faturalar</option>
          </select>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Başlangıç Tarihi</label>
            <input type="date" class="form-input" id="dateStart" />
          </div>
          <div class="form-group">
            <label class="form-label">Bitiş Tarihi</label>
            <input type="date" class="form-input" id="dateEnd" />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Dosya Adı</label>
          <input type="text" class="form-input" id="fileName" placeholder="efatura_export" value="efatura_export_${new Date().toISOString().slice(0, 10)}" />
        </div>

        <div class="form-group" style="display:flex;gap:16px">
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px">
            <input type="checkbox" id="includeLines" checked /> Kalem detayları ekle
          </label>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px">
            <input type="checkbox" id="includeSummary" checked /> Özet sayfası ekle
          </label>
        </div>

        <button class="btn btn-primary btn-lg" id="exportBtn" style="width:100%;margin-top:12px;display:flex;align-items:center;justify-content:center;gap:6px">
          ${ic.download} Excel Olarak İndir
        </button>
      </div>

      <!-- Column Selection -->
      <div class="card">
        <h3 style="margin-bottom:16px;font-size:15px;font-weight:700;display:flex;align-items:center;gap:6px">${ic.list} Sütun Seçimi</h3>
        <p style="font-size:12px;color:var(--text-muted);margin-bottom:12px">Export dosyasına dahil edilecek sütunları seçin</p>

        <div style="margin-bottom:16px">
          <div style="font-size:12px;font-weight:700;color:var(--text-secondary);margin-bottom:8px">Fatura Sütunları</div>
          <div id="invoiceCols" style="display:flex;flex-direction:column;gap:4px">
            ${INVOICE_COLUMNS.map(c => `
              <label style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:4px 8px;border-radius:4px;transition:all 0.15s;font-size:13px" class="col-option">
                <input type="checkbox" data-key="${c.key}" ${c.checked ? 'checked' : ''} />
                ${c.label}
              </label>
            `).join('')}
          </div>
        </div>

        <div>
          <div style="font-size:12px;font-weight:700;color:var(--text-secondary);margin-bottom:8px">Kalem Sütunları</div>
          <div id="lineCols" style="display:flex;flex-direction:column;gap:4px">
            ${LINE_COLUMNS.map(c => `
              <label style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:4px 8px;border-radius:4px;transition:all 0.15s;font-size:13px" class="col-option">
                <input type="checkbox" data-key="${c.key}" ${c.checked ? 'checked' : ''} />
                ${c.label}
              </label>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;

  page.querySelector('#exportBtn')?.addEventListener('click', async () => {
    const source = page.querySelector('#exportSource')?.value;
    const btn = page.querySelector('#exportBtn');
    btn.disabled = true;
    btn.innerHTML = `${ic.loader} Yükleniyor...`;

    try {
      let res;
      if (source === 'incoming') {
        res = await EInvoice.listPurchases({ PageSize: 200 });
      } else {
        res = await EInvoice.listSales({ PageSize: 200 });
      }

      if (!res.success) {
        showToast(`API hatası: ${res.error}`, 'error');
        return;
      }

      const invoices = res.data?.Items || res.data || [];
      if (invoices.length === 0) {
        showToast('Dışa aktarılacak fatura bulunamadı', 'warning');
        return;
      }

      const selectedInv = [];
      page.querySelectorAll('#invoiceCols input:checked').forEach(cb => {
        const col = INVOICE_COLUMNS.find(c => c.key === cb.dataset.key);
        if (col) selectedInv.push(col);
      });

      const selectedLine = [];
      page.querySelectorAll('#lineCols input:checked').forEach(cb => {
        const col = LINE_COLUMNS.find(c => c.key === cb.dataset.key);
        if (col) selectedLine.push(col);
      });

      const result = exportInvoicesToExcel(invoices, {
        fileName: page.querySelector('#fileName')?.value || 'export',
        accountName: account?.name || '',
        selectedColumns: selectedInv.length > 0 ? selectedInv : INVOICE_COLUMNS.filter(c => c.checked),
        selectedLineColumns: selectedLine.length > 0 ? selectedLine : LINE_COLUMNS.filter(c => c.checked),
        includeLines: page.querySelector('#includeLines')?.checked ?? true,
        includeSummary: page.querySelector('#includeSummary')?.checked ?? true,
        dateRange: {
          start: page.querySelector('#dateStart')?.value || null,
          end: page.querySelector('#dateEnd')?.value || null
        }
      });

      showToast(`${result.count} fatura "${result.fileName}" olarak indirildi`, 'success');
    } catch (e) {
      showToast(`Hata: ${e.message}`, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = `${ic.download} Excel Olarak İndir`;
    }
  });

  return page;
}
