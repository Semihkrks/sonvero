// ══════════════════════════════════════════
// E-Archive Invoices (e-Arşiv Faturaları) Page
// Nilvera-Style with İşlemler Dropdown
// ══════════════════════════════════════════
import { EInvoice, EArchive } from '../api/nilvera.js';
import { showToast } from '../components/toast.js';
import { showModal } from '../components/modal.js';
import { exportInvoicesToExcel } from '../services/excel-export.js';
import { exportCariDefter } from '../services/cari-export.js';
import { getActiveAccount } from '../services/account-manager.js';
import { registerCacheReset } from '../router.js';

// ── SVG Icons ──
const ic = {
  search: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  calendar: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
  refresh: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>`,
  plus: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  download: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
  export: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`,
  menu: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`,
  query: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  clipboard: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>`,
  chevronDown: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`,
  cloudDownload: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
  gear: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
  tag: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>`,
  code: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
  fileText: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
  mail: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>`,
  link: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
  archive: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>`,
  xml: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
  pdf: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
  noData: `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" opacity="0.3"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
  key: `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" opacity="0.3"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>`,
  error: `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" opacity="0.3"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
  efatura: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M9 15l2 2 4-4"/></svg>`,
  globe: `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" opacity="0.3"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
};

// Current month helper
function getMonthRange() {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  const s = new Date(y, m, 1);
  const e = new Date(y, m + 1, 0);
  return {
    start: `${y}-${String(m + 1).padStart(2, '0')}-01`,
    end: `${y}-${String(m + 1).padStart(2, '0')}-${String(e.getDate()).padStart(2, '0')}`
  };
}

export async function renderEArsivInvoices() {
  resetEarsivCache();
  const page = document.createElement('div');
  const account = await getActiveAccount();
  const { start, end } = getMonthRange();

  page.innerHTML = `
    <!-- Breadcrumb -->
    <div class="nilvera-breadcrumb">
      ${ic.efatura}
      <span>e-Fatura</span>
      <span class="bc-separator">›</span>
      <span class="bc-current">Giden Kutusu</span>
    </div>

    <!-- Filter Bar -->
    <div class="nilvera-filter-bar">
      <div class="filter-group filter-search">
        <label class="filter-label">Ara</label>
        <input type="text" class="filter-input" id="searchInput" placeholder="Ara" style="width:100%" />
      </div>
      <div class="filter-group">
        <label class="filter-label">Başlangıç Tarihi</label>
        <input type="date" class="filter-input" id="dateStart" value="${start}" />
      </div>
      <div class="filter-group">
        <label class="filter-label">Bitiş Tarihi</label>
        <input type="date" class="filter-input" id="dateEnd" value="${end}" />
      </div>
      <div class="filter-group">
        <label class="filter-label">Filtre</label>
        <select class="filter-input" id="sourceFilter">
          <option value="">Tümü</option>
          <option value="efatura">E-Fatura</option>
          <option value="earsiv">E-Arşiv</option>
        </select>
      </div>
      <div class="filter-group">
        <label class="filter-label">Sıralama</label>
        <select class="filter-input" id="sortFilter">
          <option value="date-desc">Fatura Tarihi</option>
          <option value="amount-desc">Tutar (Azalan)</option>
          <option value="amount-asc">Tutar (Artan)</option>
        </select>
      </div>
      <div class="filter-group">
        <label class="filter-label">A / Z A</label>
        <select class="filter-input" id="orderFilter">
          <option value="desc">Azalan</option>
          <option value="asc">Artan</option>
        </select>
      </div>
      <div class="filter-actions" style="display:flex; gap:12px; align-items:flex-end; margin-bottom:-4px;">
        <button class="btn btn-sm" id="applyFilter" style="height:34px; padding:0 20px; font-weight:600; font-size:12px; border-radius:6px; display:flex; align-items:center; gap:6px; background:var(--accent); color:white; border:none">${ic.search} ARA</button>
        <div style="position:relative">
          <button class="btn btn-sm" id="exportBtn" style="height:34px; padding:0 16px; font-weight:600; font-size:12px; border-radius:6px; display:flex; align-items:center; gap:6px; background:var(--success); border:none; color:white">
            ${ic.cloudDownload} DIŞA AKTAR ${ic.chevronDown}
          </button>
        </div>
        <div style="position:relative">
          <button class="btn btn-sm" id="islemlerBtn" style="height:34px; padding:0 16px; font-weight:600; font-size:12px; border-radius:6px; display:flex; align-items:center; gap:6px; background:var(--info); border:none; color:white">
            ${ic.gear} İŞLEMLER ${ic.chevronDown}
          </button>
        </div>
      </div>
    </div>

    <!-- Table -->
    <div class="table-container">
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th style="width:30px"><input type="checkbox" id="selectAll" /></th>
              <th>ERP</th>
              <th>Fatura Bilgisi</th>
              <th>Tarih</th>
              <th>Alıcı Bilgisi</th>
              <th>Fatura Durumu</th>
              
              <th>Etiket Bilgileri</th>
              <th>İşlemler</th>
            </tr>
          </thead>
          <tbody id="invoiceList">
            <tr><td colspan="8" class="table-empty">
              <div style="padding:40px">
                <div class="skeleton" style="height:20px;width:60%;margin:0 auto"></div>
              </div>
            </td></tr>
          </tbody>
        </table>
      </div>
      <div class="table-footer" id="tableFooter" style="display:none">
        <span id="resultCount"></span>
        <div class="table-pagination" id="pagination"></div>
      </div>
    </div>
  `;

  // Event Listeners
  page.querySelector('#applyFilter')?.addEventListener('click', () => applyFilters(page));
  page.querySelector('#searchInput')?.addEventListener('input', () => applyFilters(page));

  // Dışa Aktar actions Dropdown
  page.querySelector('#exportBtn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    document.querySelectorAll('.action-dropdown').forEach(d => d.remove());
    const dd = document.createElement('div');
    dd.className = 'action-dropdown';
    dd.innerHTML = `
      <button class="action-dropdown-item" data-act="excel">${ic.fileText} Excel'e Aktar</button>
      <button class="action-dropdown-item" data-act="cari-excel" style="color:var(--info); font-weight:600">${ic.fileText} Cari Defter'e Aktar</button>
      <button class="action-dropdown-item" data-act="pdf-all">${ic.pdf} PDF İndir</button>
      <button class="action-dropdown-item" data-act="pdf-single">${ic.pdf} Tek Sayfa PDF İndir</button>
      <button class="action-dropdown-item" data-act="xml-all">${ic.xml} XML İndir</button>
      <button class="action-dropdown-item" data-act="xml-env">${ic.xml} Zarf XML İndir</button>
    `;
    const rect = e.target.closest('button').getBoundingClientRect();
    dd.style.top = `${rect.bottom + 4}px`;
    dd.style.left = `${rect.left}px`;
    document.body.appendChild(dd);

    dd.querySelectorAll('.action-dropdown-item').forEach(btn => {
      btn.addEventListener('click', async (ev) => {
        ev.stopPropagation();
        dd.remove();
        if (btn.dataset.act === 'excel') exportFiltered(page);
        else if (btn.dataset.act === 'cari-excel') exportCariFiltered(page);
        else if (btn.dataset.act === 'pdf-all') await bulkDownloadForFiltered(page, 'pdf');
        else if (btn.dataset.act === 'pdf-single') await bulkDownloadForFiltered(page, 'pdf');
        else if (btn.dataset.act === 'xml-all') await bulkDownloadForFiltered(page, 'xml');
        else if (btn.dataset.act === 'xml-env') await bulkDownloadForFiltered(page, 'xml');
      });
    });
  });

  // İşlemler actions Dropdown
  page.querySelector('#islemlerBtn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    document.querySelectorAll('.action-dropdown').forEach(d => d.remove());
    const dd = document.createElement('div');
    dd.className = 'action-dropdown';
    dd.innerHTML = `
      <button class="action-dropdown-item">${ic.archive} Arşiv'e Kaldır</button>
      <button class="action-dropdown-item">${ic.fileText} Taslak Oluştur</button>
      <button class="action-dropdown-item">${ic.tag} Özel Kod Alanı</button>
      <button class="action-dropdown-item">${ic.check} Aktarıldı Olarak İşaretle</button>
      <button class="action-dropdown-item">${ic.x} Aktarılmadı Olarak İşaretle</button>
    `;
    const rect = e.target.closest('button').getBoundingClientRect();
    dd.style.top = `${rect.bottom + 4}px`;
    dd.style.left = `${rect.left}px`;
    document.body.appendChild(dd);
    
    dd.querySelectorAll('.action-dropdown-item').forEach(btn => {
      btn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        dd.remove();
        showToast('Toplu işlem seçimi yapmadınız.', 'warning');
      });
    });
  });

  page.querySelector('#selectAll')?.addEventListener('change', (e) => {
    page.querySelectorAll('.row-check').forEach(cb => cb.checked = e.target.checked);
  });

  // Close dropdowns on outside click
  document.addEventListener('click', () => {
    document.querySelectorAll('.action-dropdown').forEach(d => d.remove());
  });

  loadEarsiv(page);
  return page;
}

let cachedEarsiv = [];
let filteredEarsiv = [];

function resetEarsivCache() {
  cachedEarsiv = [];
  filteredEarsiv = [];
}
registerCacheReset(resetEarsivCache);

function extractItems(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.Content)) return data.Content;
  if (Array.isArray(data.Items)) return data.Items;
  if (Array.isArray(data.items)) return data.items;
  if (typeof data === 'object') {
    for (const key of Object.keys(data)) {
      if (Array.isArray(data[key]) && key !== 'Errors') return data[key];
    }
  }
  return [];
}

async function loadEarsiv(page) {
  const tbody = page.querySelector('#invoiceList');
  if (!tbody) return;

  const account = await getActiveAccount();
  if (!account) {
    tbody.innerHTML = `<tr><td colspan="8" class="table-empty">
      <div class="empty-state">
        ${ic.key}
        <h3>Hesap seçilmedi</h3>
        <p>Fatura verilerini görüntülemek için önce bir Nilvera API hesabı eklemeniz gerekiyor</p>
        <button class="btn btn-primary" onclick="window.location.hash='#/accounts'">Hesap Ekle</button>
      </div>
    </td></tr>`;
    return;
  }

  tbody.innerHTML = `<tr><td colspan="8" class="table-empty">
    <div style="padding:40px;text-align:center">
      <div style="animation:pulse 1.5s infinite">${ic.noData}</div>
      <p style="color:var(--text-muted);margin-top:12px">E-Fatura ve E-Arşiv verileri yükleniyor...</p>
      <p style="font-size:11px;color:var(--text-muted)">${account.name} · ${account.environment === 'live' ? 'Canlı' : 'Test'}</p>
    </div>
  </td></tr>`;

  try {
    const { start, end } = getMonthRange();
    const dateStart = page.querySelector('#dateStart')?.value || start;
    const dateEnd = page.querySelector('#dateEnd')?.value || end;

    async function fetchAllPages(apiFn, baseParams) {
      let allItems = [];
      let pg = 1, totalPages = 1;
      do {
        const res = await apiFn({ ...baseParams, Page: pg, PageSize: 100 });
        if (!res.success) return { success: false, ...res };
        const items = extractItems(res.data);
        allItems.push(...items);
        totalPages = res.data?.TotalPages || 1;
        pg++;
      } while (pg <= totalPages && pg <= 10);
      return { success: true, data: allItems };
    }

    const [efaturaRes, earsivRes] = await Promise.allSettled([
      fetchAllPages(EArchive.listInvoices, { StartDate: dateStart, EndDate: dateEnd }),
      fetchAllPages(EArchive.listInvoices, { StartDate: dateStart, EndDate: dateEnd })
    ]);

    let allInvoices = [];
    if (efaturaRes.status === 'fulfilled' && efaturaRes.value.success) {
      allInvoices.push(...extractItems(efaturaRes.value.data).map(inv => ({ ...inv, _source: 'efatura' })));
    }
    if (earsivRes.status === 'fulfilled' && earsivRes.value.success) {
      allInvoices.push(...extractItems(earsivRes.value.data).map(inv => ({ ...inv, _source: 'earsiv' })));
    }

    if (allInvoices.length === 0) {
      const efOk = efaturaRes.status === 'fulfilled' && efaturaRes.value.success;
      const eaOk = earsivRes.status === 'fulfilled' && earsivRes.value.success;
      if (efOk || eaOk) {
        tbody.innerHTML = `<tr><td colspan="8" class="table-empty"><div class="empty-state">${ic.noData}<h3>Giden fatura bulunamadı</h3><p>Bu dönemde e-Fatura veya e-Arşiv gönderilmiş fatura yok</p></div></td></tr>`;
      } else {
        tbody.innerHTML = `<tr><td colspan="8" class="table-empty"><div class="empty-state">${ic.error}<h3>Veri alınamadı</h3><p>API bağlantısını kontrol edin</p><button class="btn btn-primary" id="retryBtn">${ic.refresh} Tekrar Dene</button></div></td></tr>`;
        tbody.querySelector('#retryBtn')?.addEventListener('click', () => loadEarsiv(page));
      }
      updateFooter(page, 0);
      return;
    }

    allInvoices.sort((a, b) => new Date(getInvoiceDate(b) || 0) - new Date(getInvoiceDate(a) || 0));
    cachedEarsiv = allInvoices;
    filteredEarsiv = allInvoices;
    applyFilters(page);
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="8" class="table-empty"><div class="empty-state">${ic.globe}<h3>Bağlantı hatası</h3><p>${e.message || 'Sunucuya ulaşılamıyor'}</p><button class="btn btn-primary" id="retryBtn2">${ic.refresh} Tekrar Dene</button></div></td></tr>`;
    tbody.querySelector('#retryBtn2')?.addEventListener('click', () => loadEarsiv(page));
    updateFooter(page, 0);
  }
}

// ── Field Extractors ──
function getInvoiceDate(inv) {
  return inv.IssueDate || inv.issueDate || inv.CreateDate || inv.CreatedDate || '';
}
function getInvoiceNumber(inv) {
  return inv.InvoiceNumber || inv.invoiceNumber || inv.InvoiceSerieOrNumber || '';
}
function getReceiverName(inv) {
  return inv.ReceiverName || inv.receiverName || inv.CustomerName || inv.customerName ||
    (inv.CustomerInfo || inv.BuyerCustomerInfo || inv.ReceiverInfo || {}).Name || '';
}
function getReceiverTaxNo(inv) {
  return inv.ReceiverTaxNumber || inv.receiverTaxNumber || inv.TaxNumber || inv.taxNumber ||
    (inv.CustomerInfo || inv.BuyerCustomerInfo || inv.ReceiverInfo || {}).TaxNumber || '';
}
function getAmount(inv) { return inv.PayableAmount || inv.payableAmount || inv.TotalAmount || inv.totalAmount || 0; }
function getCurrency(inv) { return inv.CurrencyCode || inv.currencyCode || 'TRY'; }
function getStatus(inv) { return inv.StatusCode || inv.statusCode || inv.AnswerCode || inv.Status || inv.status || ''; }
function getStatusDetail(inv) { return inv.StatusDetail || inv.statusDetail || ''; }
function getEnvelopeDate(inv) { return inv.EnvelopeDate || inv.envelopeDate || ''; }

function applyFilters(page) {
  const search = (page.querySelector('#searchInput')?.value || '').toLowerCase().trim();
  const dateStart = page.querySelector('#dateStart')?.value;
  const dateEnd = page.querySelector('#dateEnd')?.value;
  const source = page.querySelector('#sourceFilter')?.value;

  filteredEarsiv = (cachedEarsiv || []).filter(inv => {
    if (source && inv._source !== source) return false;
    if (search) {
      const haystack = [getInvoiceNumber(inv), getReceiverName(inv), getReceiverTaxNo(inv), inv.UUID || ''].join(' ').toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    if (dateStart || dateEnd) {
      const d = getInvoiceDate(inv);
      if (d) {
        const date = new Date(d);
        if (dateStart && date < new Date(dateStart)) return false;
        if (dateEnd && date > new Date(dateEnd + 'T23:59:59')) return false;
      }
    }
    return true;
  });

  renderTable(page, filteredEarsiv);
  updateFooter(page, filteredEarsiv.length);
}

function renderTable(page, invoices) {
  const tbody = page.querySelector('#invoiceList');
  if (!tbody) return;

  if (invoices.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="table-empty"><div class="empty-state">${ic.noData}<h3>Filtreye uygun fatura bulunamadı</h3><p>Farklı filtreler deneyin</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = invoices.map((inv, idx) => {
    const uuid = inv.UUID || inv.uuid || inv.Id || '';
    const invoiceNo = getInvoiceNumber(inv) || '—';
    const issueDate = getInvoiceDate(inv);
    const envelopeDate = getEnvelopeDate(inv);
    const srcBadge = inv._source === 'earsiv'
      ? '<span class="badge badge-warning">E-Arşiv</span>'
      : '<span class="badge badge-success">Satış</span>';
    const amount = fmtCur(getAmount(inv), getCurrency(inv));
    const receiver = getReceiverName(inv) || '—';
    const taxNo = getReceiverTaxNo(inv) || '—';

    return `<tr>
      <td data-label="Seçim"><input type="checkbox" class="row-check" data-idx="${idx}" /></td>
      <td data-label="ERP">
        <div style="display:flex;gap:4px">
          <button class="action-menu-btn" data-action="query" data-uuid="${uuid}" title="GİB'den Sorgula">${ic.query}</button>
        </div>
      </td>
      <td data-label="Fatura Bilgisi">
        <div><strong>${invoiceNo}</strong></div>
        <div style="font-size:11px;color:var(--text-muted)">${srcBadge} / ${amount}</div>
      </td>
      <td data-label="Tarih">
        <div style="font-size:12px">Fatura : ${fmtDateFull(issueDate)}</div>
        <div style="font-size:11px;color:var(--text-muted)">Zarf : ${fmtDateFull(envelopeDate || issueDate)}</div>
      </td>
      <td data-label="Alıcı Bilgisi">
        <div style="font-size:12px;font-weight:600">${receiver}</div>
        <div style="font-size:11px;color:var(--text-muted)">Vergi No : ${taxNo}</div>
      </td>
      <td data-label="Fatura Durumu">${statusDisplay(inv)}</td>
      
      <td data-label="Etiket Bilgileri"><span style="font-size:11px;color:var(--text-muted)">—</span></td>
      <td data-label="İşlemler">
        <button class="action-menu-btn action-menu-trigger" data-idx="${idx}" data-uuid="${uuid}" data-source="${inv._source}" title="İşlemler">${ic.menu}</button>
      </td>
    </tr>`;
  }).join('');

  // İşlemler dropdown
  tbody.querySelectorAll('.action-menu-trigger').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      // Remove any existing dropdown
      document.querySelectorAll('.action-dropdown').forEach(d => d.remove());

      const uuid = btn.dataset.uuid;
      const source = btn.dataset.source;
      const dropdown = document.createElement('div');
      dropdown.className = 'action-dropdown';
      dropdown.innerHTML = `
        <button class="action-dropdown-item" data-act="gib">${ic.query} GİB'den Sorgula</button>
        <button class="action-dropdown-item" data-act="transfer">${ic.clipboard} Aktarıldı Aktarılmadı</button>
        <div class="action-dropdown-divider"></div>
        <button class="action-dropdown-item" data-act="draft">${ic.fileText} Taslak Oluştur</button>
        <button class="action-dropdown-item" data-act="tags">${ic.tag} Etiket Bilgileri</button>
        <button class="action-dropdown-item" data-act="code">${ic.code} Özel Kod Alanı</button>
        <button class="action-dropdown-item" data-act="detail">${ic.fileText} Fatura Detayları</button>
        <div class="action-dropdown-divider"></div>
        <button class="action-dropdown-item" data-act="mail">${ic.mail} Mailing İşlemleri</button>
        <button class="action-dropdown-item" data-act="link">${ic.link} Link İle Paylaş</button>
        <button class="action-dropdown-item" data-act="archive">${ic.archive} Arşiv'e Kaldır</button>
        <div class="action-dropdown-divider"></div>
        <button class="action-dropdown-item" data-act="xml">${ic.xml} XML İndir</button>
        <button class="action-dropdown-item" data-act="envelope">${ic.xml} Zarf XML İndir</button>
        <button class="action-dropdown-item" data-act="pdf">${ic.pdf} PDF İndir</button>
      `;

      // Calculate position
      const rect = btn.getBoundingClientRect();
      dropdown.style.top = `${rect.bottom + 4}px`;
      
      document.body.appendChild(dropdown);
      // Wait a tick to get dropdown width
      setTimeout(() => {
        const dropRect = dropdown.getBoundingClientRect();
        // If dropdown goes off the right edge of screen, align right edge of dropdown to right edge of button
        if (rect.left + dropRect.width > window.innerWidth) {
          dropdown.style.left = `${rect.right - dropRect.width}px`;
        } else {
          // Otherwise align left edge of dropdown to right edge of button - 200px approx
          dropdown.style.left = `${rect.right - 200}px`;
        }
      }, 0);

      // Action handlers
      dropdown.querySelectorAll('.action-dropdown-item').forEach(item => {
        item.addEventListener('click', async (ev) => {
          ev.stopPropagation();
          dropdown.remove();
          const act = item.dataset.act;
          await handleAction(act, uuid, source);
        });
      });
    });
  });

  // Query (ERP PDF Preview) buttons
  tbody.querySelectorAll('[data-action="query"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const uuid = btn.dataset.uuid;
      const source = btn.dataset.source || 'earsiv';
      showPdfPreviewModal(uuid, source);
    });
  });
}

async function handleAction(act, uuid, source) {
  switch (act) {
    case 'gib':
        showToast('E-Arşiv için durum sorgulama desteklenmemektedir', 'info');
        break;
    case 'detail':
      showToast('Fatura detayları açılıyor...', 'info');
      break;
    case 'mail':
      showEmailModal(uuid, source);
      break;
    case 'xml':
      showToast('XML indiriliyor...', 'info');
      await downloadFile(uuid, source, 'xml');
      break;
    case 'envelope':
      showToast('Zarf XML henüz desteklenmiyor...', 'warning');
      break;
    case 'pdf':
      showToast('PDF indiriliyor...', 'info');
      await downloadFile(uuid, source, 'pdf');
      break;
    case 'link':
      showToast('Link kopyalandı', 'success');
      break;
    default:
      showToast('Bu özellik yakında aktif olacak', 'info');
  }
}

function showEmailModal(uuid, source) {
  const bodyEl = document.createElement('div');
  bodyEl.innerHTML = `<div class="form-group"><label class="form-label">E-Posta Adresi</label><input type="email" class="form-input" id="emailTo" placeholder="ornek@firma.com" /></div>`;

  const footerEl = document.createElement('div');
  footerEl.style.cssText = 'display:flex;gap:10px;justify-content:flex-end;width:100%';
  footerEl.innerHTML = `<button class="btn btn-secondary" id="cancelEmail">İptal</button><button class="btn btn-primary" id="sendEmail">Gönder</button>`;

  const modal = showModal({ title: 'E-Posta Gönder', body: bodyEl, footer: footerEl });
  footerEl.querySelector('#sendEmail')?.addEventListener('click', async () => {
    const email = bodyEl.querySelector('#emailTo')?.value;
    if (!email) return showToast('E-posta adresi girmelisiniz', 'warning');
    const fn = source === 'earsiv' ? EArchive.sendEmail : EArchive.sendEmail;
    const res = await fn({ UUID: uuid, EmailAddresses: [email] });
    showToast(res.success ? 'E-posta gönderildi' : `Hata: ${res.error}`, res.success ? 'success' : 'error');
    modal?.close();
  });
  footerEl.querySelector('#cancelEmail')?.addEventListener('click', () => modal?.close());
}

async function exportFiltered(page) {
  const data = filteredEarsiv.length > 0 ? filteredEarsiv : cachedEarsiv;
  if (data.length === 0) return showToast('Dışa aktarılacak fatura yok', 'warning');
  const account = await getActiveAccount();
  const result = exportInvoicesToExcel(data, { accountName: account?.name || '', fileName: 'giden_faturalar' });
  showToast(`${result.count} fatura Excel'e aktarıldı`, 'success');
}

async function exportCariFiltered(page) {
  try {
    const data = filteredEarsiv.length > 0 ? filteredEarsiv : cachedEarsiv;
    if (data.length === 0) return showToast('Aktarılacak fatura yok', 'warning');
    const account = await getActiveAccount();
    showToast('Cari Defter hazırlanıyor...', 'info');
    const result = await exportCariDefter(data, 'giden', account?.name || '');
    if (result.success) {
      showToast(`${result.count} fatura Cari Defter'e eklendi`, 'success');
    } else {
      showToast(`Hata: ${result.error}`, 'error');
    }
  } catch(e) {
    showToast(`Bir hata oluştu: ${e.message}`, 'error');
    console.error(e);
  }
}

function getEffectiveList() {
  const checked = document.querySelectorAll('.row-check:checked');
  if (checked.length > 0) {
    return Array.from(checked).map(cb => {
      const uuid = cb.dataset.uuid;
      return filteredEarsiv.find(i => (i.UUID || i.uuid || i.Id) === uuid);
    }).filter(Boolean);
  }
  return filteredEarsiv;
}

function summarizeBulkResult(ok, fail, label) {
  if (ok > 0 && fail === 0) showToast(`${ok} kayıt ${label} başarılı`, 'success');
  else if (ok > 0) showToast(`${ok} başarılı, ${fail} başarısız — ${label}`, 'warning');
  else showToast(`${label} başarısız (${fail} hata)`, 'error');
}

async function bulkDownloadForFiltered(page, type) {
  const list = getEffectiveList();
  if (!list.length) {
    showToast('İndirilecek kayıt bulunamadı', 'warning');
    return;
  }
  let okCount = 0, failCount = 0;
  const capped = list.slice(0, 30);
  if (list.length > 30) showToast('Performans için ilk 30 kayıt indirilecek', 'info');

  for (const inv of capped) {
    const uuid = inv.UUID || inv.uuid || inv.Id || '';
    if (!uuid) { failCount++; continue; }
    try {
      const res = type === 'pdf' ? await EArchive.getInvoicePdf(uuid) : await EArchive.getInvoiceXml(uuid);
      if (res.success && res.data) {
        const content = typeof res.data === 'string' ? res.data : (res.data.File || res.data.String || res.data[0]);
        if (content) {
          const isBase64 = content.match(/^[a-zA-Z0-9+/=]+$/);
          const url = isBase64
            ? `data:application/${type};base64,${content}`
            : `data:application/${type},${encodeURIComponent(content)}`;
          const link = document.createElement('a');
          link.href = url;
          link.download = `Fatura_${uuid}.${type}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          okCount++;
        } else { failCount++; }
      } else { failCount++; }
    } catch { failCount++; }
  }
  summarizeBulkResult(okCount, failCount, type === 'pdf' ? 'PDF indirme' : 'XML indirme');
}

async function downloadFile(uuid, source, type) {
  try {
    let res;
    if (source === 'earsiv') {
      res = type === 'pdf' ? await EArchive.getInvoicePdf(uuid) : await EArchive.getInvoiceHtml(uuid); // EArchive has getInvoicePdf, missing XML handling directly, fallback handled if needed
      // To strictly download EArchive XML, API usually lacks isolated XML endpoint, but let's assume it returns standard base64 from generic if needed
      if (type === 'xml') return showToast('E-Arşiv XML indirme için güncelleniyor...', 'info');
    } else {
      res = type === 'pdf' ? await EArchive.getInvoicePdf(uuid) : await EArchive.getInvoiceXml(uuid);
    }

    if (res.success && res.data) {
      // Nilvera API commonly returns PDF/XML strings directly or wrapped in data/String/File property
      const content = typeof res.data === 'string' ? res.data : (res.data.File || res.data.String || res.data[0]);
      if (!content) throw new Error('Dosya içeriği bulunamadı');

      const isBase64 = content.match(/^[a-zA-Z0-9+/=]+$/);
      const url = isBase64 
        ? `data:application/${type === 'pdf' ? 'pdf' : 'xml'};base64,${content}`
        : `data:application/${type === 'pdf' ? 'pdf' : 'xml'},${encodeURIComponent(content)}`;

      const link = document.createElement('a');
      link.href = url;
      link.download = `Fatura_${uuid}.${type}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Dosya indirildi', 'success');
    } else {
      showToast(`Hata: ${res.error}`, 'error');
    }
  } catch (e) {
    showToast(`İndirme başarısız: ${e.message}`, 'error');
  }
}


function updateFooter(page, count) {
  const footer = page.querySelector('#tableFooter');
  const el = page.querySelector('#resultCount');
  if (footer) footer.style.display = count > 0 ? 'flex' : 'none';
  if (el) el.textContent = `Toplam Kayıt : ${count}`;
}

function statusDisplay(inv) {
  const s = getStatus(inv);
  const detail = getStatusDetail(inv);
  const map = {
    succeed: ['Fatura Otomatik Onaylandı.', 'success'],
    waiting: ['İşlem Bekliyor', 'warning'],
    approved: ['Fatura Onaylandı.', 'success'],
    rejected: ['Reddedildi', 'danger'],
    cancelled: ['İptal Edildi', 'danger'],
    sent: ['Gönderildi', 'info'],
  };
  const [text, color] = map[s] || map[s?.toLowerCase()] || [detail || s || '—', 'default'];
  const icon = color === 'success'
    ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`
    : color === 'danger'
    ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`
    : `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
  return `<div style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--text-secondary)">${icon} ${text}</div>`;
}

function answerDisplay(inv) {
  const status = getStatus(inv);
  if (status === 'succeed' || status === 'approved') {
    return `<div style="font-size:11px;color:var(--text-muted)">Alıcıya Başarıylı İletildi.</div>`;
  }
  return `<span style="font-size:11px;color:var(--text-muted)">—</span>`;
}

function fmtDate(d) { if (!d) return '—'; try { return new Date(d).toLocaleDateString('tr-TR'); } catch { return d; } }
function fmtDateFull(d) {
  if (!d) return '—';
  try {
    const dt = new Date(d);
    return `${dt.toLocaleDateString('tr-TR')} ${dt.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`;
  } catch { return d; }
}
function fmtCur(a, c) { if (!a && a !== 0) return '—'; try { return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: c || 'TRY' }).format(a); } catch { return `${a} ${c}`; } }

async function showPdfPreviewModal(uuid, source) {
  const bodyEl = document.createElement('div');
  bodyEl.style.height = '80vh';
  bodyEl.style.minHeight = '600px';
  bodyEl.style.display = 'flex';
  bodyEl.style.alignItems = 'center';
  bodyEl.style.justifyContent = 'center';
  bodyEl.innerHTML = `<div style="animation:pulse 1.5s infinite">${ic.refresh} Yükleniyor...</div>`;

  const footerEl = document.createElement('div');
  footerEl.style.cssText = 'display:flex;gap:10px;justify-content:flex-end;width:100%';
  footerEl.innerHTML = `
    <button class="btn btn-secondary" id="closePdfModal">Kapat</button>
    <button class="btn btn-info" id="mailPdfBtn" style="color:white;display:none">${ic.mail} Mail Gönder</button>
    <button class="btn btn-success" id="downloadPdfBtn" style="display:none">${ic.download} İndir</button>
    <button class="btn btn-primary" id="printPdfBtn" style="display:none">${ic.fileText} Yazdır</button>
  `;
  const modal = showModal({ title: 'Fatura Önizleme', body: bodyEl, footer: footerEl, size: 'xlarge' });

  footerEl.querySelector('#closePdfModal')?.addEventListener('click', () => modal?.close());

  try {
    const res = source === 'earsiv' ? await EArchive.getInvoicePdf(uuid) : await EArchive.getInvoicePdf(uuid);
    if (!res.success || !res.data) throw new Error(res.error || 'PDF alınamadı');

    const content = typeof res.data === 'string' ? res.data : (res.data.File || res.data.String || res.data[0]);
    if (!content) throw new Error('PDF içeriği boş');

    const isBase64 = content.match(/^[a-zA-Z0-9+/=\s]+$/);
    let blobUrl;
    if (isBase64) {
      const byteChars = atob(content.replace(/\s/g, ''));
      const byteNumbers = new Uint8Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
      blobUrl = URL.createObjectURL(new Blob([byteNumbers], { type: 'application/pdf' }));
    } else {
      blobUrl = URL.createObjectURL(new Blob([content], { type: 'application/pdf' }));
    }

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;
    if (isMobile) {
      bodyEl.style.height = 'auto'; bodyEl.style.minHeight = 'auto';
      bodyEl.innerHTML = `
        <div style="text-align:center;padding:30px">
          <div style="width:64px;height:64px;border-radius:16px;background:var(--accent-bg);display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          </div>
          <h3 style="font-size:16px;margin-bottom:8px">PDF Hazır</h3>
          <p style="font-size:13px;color:var(--text-muted);margin-bottom:20px">Mobil tarayıcıda önizleme için PDF'i yeni sekmede açın</p>
          <div style="display:flex;flex-direction:column;gap:10px;max-width:280px;margin:0 auto">
            <a href="${blobUrl}" target="_blank" rel="noopener" class="btn btn-primary" style="display:flex;align-items:center;justify-content:center;gap:8px;text-decoration:none">${ic.fileText} PDF'i Aç</a>
            <a href="${blobUrl}" download="Fatura_${uuid}.pdf" class="btn btn-secondary" style="display:flex;align-items:center;justify-content:center;gap:8px;text-decoration:none">${ic.download} PDF İndir</a>
          </div>
        </div>`;
    } else {
      bodyEl.innerHTML = `<iframe src="${blobUrl}#toolbar=0&navpanes=0&scrollbar=0" width="100%" height="100%" style="border:none;border-radius:4px;"></iframe>`;
    }

    const mailBtn = footerEl.querySelector('#mailPdfBtn');
    const dlBtn = footerEl.querySelector('#downloadPdfBtn');
    const printBtn = footerEl.querySelector('#printPdfBtn');
    if (!isMobile) { mailBtn.style.display = 'flex'; dlBtn.style.display = 'flex'; printBtn.style.display = 'flex'; }

    mailBtn.addEventListener('click', () => { modal?.close(); showEmailModal(uuid, source); });
    dlBtn.addEventListener('click', () => {
      const link = document.createElement('a'); link.href = blobUrl; link.download = `Fatura_${uuid}.pdf`;
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
    });
    printBtn.addEventListener('click', () => {
      const iframe = bodyEl.querySelector('iframe');
      if (iframe) { iframe.contentWindow.focus(); iframe.contentWindow.print(); }
    });

    const origClose = modal?.close?.bind(modal);
    if (modal && origClose) { modal.close = () => { URL.revokeObjectURL(blobUrl); origClose(); }; }

  } catch (err) {
    bodyEl.innerHTML = `<div class="empty-state">${ic.error}<h3>Önizleme Yüklenemedi</h3><p>${err.message}</p></div>`;
  }
}



