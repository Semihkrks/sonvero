// ══════════════════════════════════════════
// Incoming Invoices (Gelen Faturalar) Page
// Nilvera-Style with İşlemler & Kabul/Reddet
// ══════════════════════════════════════════
import { EInvoice, EArchive, nilveraRequest } from '../api/nilvera.js';
import { showToast } from '../components/toast.js';
import { showModal } from '../components/modal.js';
import { exportInvoicesToExcel } from '../services/excel-export.js';
import { exportCariDefter } from '../services/cari-export.js';
import { getActiveAccount } from '../services/account-manager.js';

const ic = {
  search: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  refresh: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>`,
  menu: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`,
  check: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  x: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  query: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  fileText: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
  mail: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>`,
  tag: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>`,
  xml: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
  pdf: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
  link: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
  archive: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>`,
  clipboard: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>`,
  chevronDown: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`,
  cloudDownload: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
  gear: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
  inbox: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>`,
  noData: `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" opacity="0.3"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
  key: `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" opacity="0.3"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>`,
  error: `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" opacity="0.3"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
  globe: `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" opacity="0.3"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/></svg>`,
};

function getMonthRange() {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  const e = new Date(y, m + 1, 0);
  return {
    start: `${y}-${String(m + 1).padStart(2, '0')}-01`,
    end: `${y}-${String(m + 1).padStart(2, '0')}-${String(e.getDate()).padStart(2, '0')}`
  };
}

function isMobileViewport() {
  return window.innerWidth <= 768;
}

function setupFilterToggle(page) {
  const filterBar = page.querySelector('.nilvera-filter-bar');
  const toggleBtn = page.querySelector('#toggleFiltersBtn');
  if (!filterBar || !toggleBtn) return;

  const setExpanded = (expanded) => {
    filterBar.classList.toggle('filters-expanded', expanded);
    toggleBtn.textContent = expanded ? 'Filtreyi Gizle' : 'Filtreyi Goster';
    toggleBtn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  };

  setExpanded(!isMobileViewport());
  toggleBtn.addEventListener('click', () => {
    const next = !filterBar.classList.contains('filters-expanded');
    setExpanded(next);
  });

  window.addEventListener('resize', () => {
    if (!isMobileViewport()) setExpanded(true);
  });
}

function mountActionDropdown(anchorBtn, dropdownEl) {
  document.body.appendChild(dropdownEl);

  const rect = anchorBtn.getBoundingClientRect();
  const gap = 6;
  const pad = 8;
  const dropRect = dropdownEl.getBoundingClientRect();

  let left = rect.right - dropRect.width;
  if (left < pad) left = pad;
  if (left + dropRect.width > window.innerWidth - pad) {
    left = Math.max(pad, window.innerWidth - dropRect.width - pad);
  }

  const spaceBelow = window.innerHeight - rect.bottom;
  const spaceAbove = rect.top;
  const openUp = spaceBelow < dropRect.height + gap && spaceAbove > spaceBelow;
  const top = openUp ? Math.max(pad, rect.top - dropRect.height - gap) : Math.min(window.innerHeight - dropRect.height - pad, rect.bottom + gap);

  dropdownEl.style.left = `${left}px`;
  dropdownEl.style.top = `${top}px`;
}

export async function renderIncomingInvoices(options = {}) {
  const page = document.createElement('div');
  const account = await getActiveAccount();
  const { start, end } = getMonthRange();
  const archivedOnly = Boolean(options.archivedOnly);
  const moduleLabel = options.moduleLabel || 'e-Fatura';
  const boxLabel = options.boxLabel || 'Gelen Kutusu';

  page.innerHTML = `
    <div class="nilvera-breadcrumb">
      ${ic.inbox}
      <span>${moduleLabel}</span>
      <span class="bc-separator">›</span>
      <span class="bc-current">${boxLabel}</span>
    </div>

    <div class="nilvera-filter-bar">
      <div class="filter-group filter-search">
        <label class="filter-label">Ara</label>
        <div class="filter-search-row">
          <input type="text" class="filter-input" id="searchInput" placeholder="Ara" style="width:100%" />
          <button class="btn btn-sm btn-secondary" id="toggleFiltersBtn" type="button" aria-expanded="false">Filtreyi Goster</button>
        </div>
      </div>
      <div class="filter-group filter-advanced">
        <label class="filter-label">Başlangıç Tarihi</label>
        <input type="date" class="filter-input" id="dateStart" value="${start}" />
      </div>
      <div class="filter-group filter-advanced">
        <label class="filter-label">Bitiş Tarihi</label>
        <input type="date" class="filter-input" id="dateEnd" value="${end}" />
      </div>
      <div class="filter-group filter-advanced">
        <label class="filter-label">Filtre</label>
        <select class="filter-input" id="sourceFilter">
          <option value="">Tümü</option>
          <option value="efatura">E-Fatura</option>
          <option value="earsiv">E-Arşiv GİB</option>
        </select>
      </div>
      <div class="filter-group filter-advanced">
        <label class="filter-label">Sıralama</label>
        <select class="filter-input" id="sortFilter">
          <option value="date-desc">Fatura Tarihi</option>
          <option value="amount-desc">Tutar (Azalan)</option>
        </select>
      </div>
      <div class="filter-group filter-advanced">
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

    <div class="table-container">
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th style="width:30px"><input type="checkbox" id="selectAll" /></th>
              <th>ERP</th>
              <th>Fatura Bilgisi</th>
              <th>Tarih</th>
              <th>Gönderici Bilgisi</th>
              <th>Fatura Durumu</th>
              <th>Cevap</th>
              <th>Etiket Bilgileri</th>
              <th>İşlemler</th>
            </tr>
          </thead>
          <tbody id="invoiceList">
            <tr><td colspan="9" class="table-empty">
              <div style="padding:40px"><div class="skeleton" style="height:20px;width:60%;margin:0 auto"></div></div>
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

  page.querySelector('#applyFilter')?.addEventListener('click', () => applyFilters(page));
  page.querySelector('#searchInput')?.addEventListener('input', () => applyFilters(page));
  setupFilterToggle(page);

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
    mountActionDropdown(e.target.closest('button'), dd);

    dd.querySelectorAll('.action-dropdown-item').forEach(btn => {
      btn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        dd.remove();
        if (btn.dataset.act === 'excel') exportFiltered(page);
        else if (btn.dataset.act === 'cari-excel') exportCariFiltered(page);
        else showToast('Toplu indirme özelliği çok yakında!', 'info');
      });
    });
  });

  // İşlemler actions Dropdown
  page.querySelector('#islemlerBtn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    document.querySelectorAll('.action-dropdown').forEach(d => d.remove());
    const dd = document.createElement('div');
    dd.className = 'action-dropdown';
    const archiveActionLabel = archivedOnly ? 'Arşivden Çıkar' : "Arşiv'e Kaldır";
    dd.innerHTML = `
      <button class="action-dropdown-item">${ic.archive} ${archiveActionLabel}</button>
      <button class="action-dropdown-item">${ic.fileText} Taslak Oluştur</button>
      <button class="action-dropdown-item">${ic.tag} Özel Kod Alanı</button>
      <button class="action-dropdown-item">${ic.check} Aktarıldı Olarak İşaretle</button>
      <button class="action-dropdown-item">${ic.x} Aktarılmadı Olarak İşaretle</button>
    `;
    mountActionDropdown(e.target.closest('button'), dd);
    
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
  document.addEventListener('click', () => {
    document.querySelectorAll('.action-dropdown').forEach(d => d.remove());
  });

  loadIncoming(page, options);
  return page;
}

let cachedInvoices = [];
let filteredInvoices = [];
let cachedIncomingAccountId = '';
let incomingLoadSeq = 0;

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

async function loadIncoming(page, options = {}) {
  const tbody = page.querySelector('#invoiceList');
  if (!tbody) return;
  const archivedOnly = Boolean(options.archivedOnly);

  const account = await getActiveAccount();
  if (!account) {
    cachedInvoices = [];
    filteredInvoices = [];
    cachedIncomingAccountId = '';
    tbody.innerHTML = `<tr><td colspan="9" class="table-empty"><div class="empty-state">${ic.key}<h3>Hesap seçilmedi</h3><p>Fatura verilerini görüntülemek için bir Nilvera API hesabı eklemeniz gerekiyor</p><button class="btn btn-primary" onclick="window.location.hash='#/accounts'">Hesap Ekle</button></div></td></tr>`;
    return;
  }

  const accountId = account.id || '';
  const seq = ++incomingLoadSeq;

  if (cachedIncomingAccountId && cachedIncomingAccountId !== accountId) {
    cachedInvoices = [];
    filteredInvoices = [];
  }
  cachedIncomingAccountId = accountId;

  tbody.innerHTML = `<tr><td colspan="9" class="table-empty"><div style="padding:40px;text-align:center"><div style="animation:pulse 1.5s infinite">${ic.noData}</div><p style="color:var(--text-muted);margin-top:12px">E-Fatura ve E-Arşiv GİB verileri yükleniyor...</p></div></td></tr>`;

  try {
    const dateStart = page.querySelector('#dateStart')?.value;
    const dateEnd = page.querySelector('#dateEnd')?.value;

    async function fetchAllPages(apiFn, baseParams) {
      let allItems = [], pg = 1, totalPages = 1;
      do {
        const res = await apiFn({ ...baseParams, Page: pg, PageSize: 100 });
        if (!res.success) return { success: false, ...res };
        allItems.push(...extractItems(res.data));
        totalPages = res.data?.TotalPages || 1;
        pg++;
      } while (pg <= totalPages && pg <= 10);
      return { success: true, data: allItems };
    }

    const [efaturaRes, earsivRes] = await Promise.allSettled([
      fetchAllPages(EInvoice.listPurchases, {
        StartDate: dateStart,
        EndDate: dateEnd,
        ...(archivedOnly ? { IsArchived: true, Archived: true } : {}),
      }),
      fetchAllPages(EArchive.listGibPurchases, {
        StartDate: dateStart,
        EndDate: dateEnd,
        ...(archivedOnly ? { IsArchived: true, Archived: true } : {}),
      })
    ]);

    let allInvoices = [];
    if (efaturaRes.status === 'fulfilled' && efaturaRes.value.success) {
      allInvoices.push(...extractItems(efaturaRes.value.data).map(inv => ({ ...inv, _source: 'efatura' })));
    }
    if (earsivRes.status === 'fulfilled' && earsivRes.value.success) {
      allInvoices.push(...extractItems(earsivRes.value.data).map(inv => ({ ...inv, _source: 'earsiv' })));
    }

    if (archivedOnly) {
      allInvoices = allInvoices.filter(isArchivedInvoice);
    }

    if (seq !== incomingLoadSeq || cachedIncomingAccountId !== accountId) {
      return;
    }

    if (allInvoices.length === 0) {
      const efOk = efaturaRes.status === 'fulfilled' && efaturaRes.value.success;
      const eaOk = earsivRes.status === 'fulfilled' && earsivRes.value.success;
      if (efOk || eaOk) {
        tbody.innerHTML = `<tr><td colspan="9" class="table-empty"><div class="empty-state">${ic.noData}<h3>Gelen fatura bulunamadı</h3><p>Bu dönemde e-Fatura veya e-Arşiv gelen fatura yok</p></div></td></tr>`;
      } else {
        tbody.innerHTML = `<tr><td colspan="9" class="table-empty"><div class="empty-state">${ic.error}<h3>Veri alınamadı</h3><p>API bağlantısını kontrol edin</p><button class="btn btn-primary" id="retryBtn">${ic.refresh} Tekrar Dene</button></div></td></tr>`;
        tbody.querySelector('#retryBtn')?.addEventListener('click', () => loadIncoming(page, options));
      }
      updateFooter(page, 0);
      return;
    }

    allInvoices.sort((a, b) => new Date(getDate(b) || 0) - new Date(getDate(a) || 0));
    cachedInvoices = allInvoices;
    filteredInvoices = allInvoices;
    applyFilters(page);
  } catch (e) {
    if (seq !== incomingLoadSeq || cachedIncomingAccountId !== accountId) {
      return;
    }
    tbody.innerHTML = `<tr><td colspan="9" class="table-empty"><div class="empty-state">${ic.globe}<h3>Bağlantı hatası</h3><p>${e.message || 'Sunucuya ulaşılamıyor'}</p><button class="btn btn-primary" id="retryBtn2">${ic.refresh} Tekrar Dene</button></div></td></tr>`;
    tbody.querySelector('#retryBtn2')?.addEventListener('click', () => loadIncoming(page, options));
    updateFooter(page, 0);
  }
}

function isArchivedInvoice(inv) {
  const boolFlags = [
    inv?.IsArchived,
    inv?.Archived,
    inv?.IsInArchive,
    inv?.InArchive,
    inv?.Archive,
    inv?.IsArchive,
  ];
  if (boolFlags.some((v) => v === true || v === 1 || String(v).toLowerCase() === 'true')) return true;

  const statusText = [inv?.Status, inv?.StatusCode, inv?.StatusDetail, inv?.AnswerCode]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return statusText.includes('archive') || statusText.includes('arsiv') || statusText.includes('arşiv');
}

function getDate(inv) { return inv.IssueDate || inv.issueDate || inv.CreateDate || ''; }
function getNumber(inv) { return inv.InvoiceNumber || inv.invoiceNumber || inv.InvoiceSerieOrNumber || ''; }
function getSender(inv) { return inv.SenderName || inv.senderName || inv.CompanyName || (inv.CompanyInfo || inv.SenderInfo || {}).Name || ''; }
function getSenderTax(inv) { return inv.SenderTaxNumber || inv.senderTaxNumber || (inv.CompanyInfo || inv.SenderInfo || {}).TaxNumber || ''; }
function getAmount(inv) { return inv.PayableAmount || inv.payableAmount || inv.TotalAmount || 0; }
function getCurrency(inv) { return inv.CurrencyCode || inv.currencyCode || 'TRY'; }
function getStatus(inv) { return inv.StatusCode || inv.statusCode || inv.AnswerCode || inv.Status || inv.status || ''; }
function getStatusDetail(inv) { return inv.StatusDetail || inv.statusDetail || ''; }

function applyFilters(page) {
  const search = (page.querySelector('#searchInput')?.value || '').toLowerCase().trim();
  const dateStart = page.querySelector('#dateStart')?.value;
  const dateEnd = page.querySelector('#dateEnd')?.value;
  const source = page.querySelector('#sourceFilter')?.value;

  filteredInvoices = (cachedInvoices || []).filter(inv => {
    if (source && inv._source !== source) return false;
    if (search) {
      const h = [getNumber(inv), getSender(inv), getSenderTax(inv), inv.UUID || ''].join(' ').toLowerCase();
      if (!h.includes(search)) return false;
    }
    if (dateStart || dateEnd) {
      const d = getDate(inv);
      if (d) {
        const date = new Date(d);
        if (dateStart && date < new Date(dateStart)) return false;
        if (dateEnd && date > new Date(dateEnd + 'T23:59:59')) return false;
      }
    }
    return true;
  });

  renderTable(page, filteredInvoices);
  updateFooter(page, filteredInvoices.length);
}

function renderTable(page, invoices) {
  const tbody = page.querySelector('#invoiceList');
  if (!tbody) return;

  if (invoices.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="table-empty"><div class="empty-state">${ic.noData}<h3>Filtreye uygun fatura bulunamadı</h3></div></td></tr>`;
    return;
  }

  tbody.innerHTML = invoices.map((inv, idx) => {
    const uuid = inv.UUID || inv.uuid || inv.Id || '';
    const invoiceNo = getNumber(inv) || '—';
    const issueDate = getDate(inv);
    const srcBadge = inv._source === 'earsiv'
      ? '<span class="badge badge-warning">İstisna</span>'
      : '<span class="badge badge-info">Satış</span>';
    const amount = fmtCur(getAmount(inv), getCurrency(inv));
    const sender = getSender(inv) || '—';
    const taxNo = getSenderTax(inv) || '—';
    const status = getStatus(inv);
    const needsAnswer = status === 'waiting' || status === 'waitingForApproval';

    return `<tr>
      <td data-label="Seçim"><input type="checkbox" class="row-check" data-idx="${idx}" /></td>
      <td data-label="ERP">
        <button class="action-menu-btn" data-action="queryInv" data-uuid="${uuid}" data-source="${inv._source}" title="PDF Önizle">${ic.query}</button>
      </td>
      <td data-label="Fatura Bilgisi">
        <div><strong>${invoiceNo}</strong></div>
        <div style="font-size:11px;color:var(--text-muted)">${srcBadge} / ${amount}</div>
      </td>
      <td data-label="Tarih">
        <div style="font-size:12px">Fatura : ${fmtDateFull(issueDate)}</div>
        <div style="font-size:11px;color:var(--text-muted)">Zarf : ${fmtDateFull(issueDate)}</div>
      </td>
      <td data-label="Gönderici Bilgisi">
        <div style="font-size:12px;font-weight:600">${sender}</div>
        <div style="font-size:11px;color:var(--text-muted)">Vergi No : ${taxNo}</div>
      </td>
      <td data-label="Fatura Durumu">${statusDisplay(inv)}</td>
      <td data-label="Cevap">${answerDisplay(inv, uuid, needsAnswer)}</td>
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
      document.querySelectorAll('.action-dropdown').forEach(d => d.remove());
      const uuid = btn.dataset.uuid;
      const source = btn.dataset.source;
      const dd = document.createElement('div');
      dd.className = 'action-dropdown';
      dd.innerHTML = `
        <button class="action-dropdown-item" data-act="gib">${ic.query} GİB'den Sorgula</button>
        <button class="action-dropdown-item" data-act="transfer">${ic.clipboard} Aktarıldı Aktarılmadı</button>
        <div class="action-dropdown-divider"></div>
        <button class="action-dropdown-item" data-act="draft">${ic.fileText} Taslak Oluştur</button>
        <button class="action-dropdown-item" data-act="tags">${ic.tag} Etiket Bilgileri</button>
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
      mountActionDropdown(btn, dd);

      dd.querySelectorAll('.action-dropdown-item').forEach(item => {
        item.addEventListener('click', (ev) => {
          ev.stopPropagation();
          dd.remove();
          handleAction(item.dataset.act, uuid, source);
        });
      });
    });
  });

  // Accept/Reject buttons
  tbody.querySelectorAll('[data-action="accept"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const uuid = btn.dataset.uuid;
      const res = await EInvoice.sendAnswer({ UUID: uuid, Answer: 'KABUL', Note: 'Fatura kabul edildi' });
      showToast(res.success ? 'Fatura kabul edildi' : `Hata: ${res.error}`, res.success ? 'success' : 'error');
      if (res.success) loadIncoming(page);
    });
  });

  tbody.querySelectorAll('[data-action="reject"]').forEach(btn => {
    btn.addEventListener('click', () => showRejectModal(btn.dataset.uuid, page));
  });

  // ERP PDF Preview
  tbody.querySelectorAll('[data-action="queryInv"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const uuid = btn.dataset.uuid;
      const source = btn.dataset.source || 'efatura';
      await showPdfPreviewModal(uuid, source);
    });
  });
}

async function handleAction(act, uuid, source) {
  switch (act) {
    case 'gib':
      await showGibStatusModal(uuid, source);
      break;
    case 'mail': showEmailModal(uuid, source); break;
    case 'xml': 
      showToast('XML indiriliyor...', 'info'); 
      await downloadFile(uuid, source, 'xml');
      break;
    case 'envelope': showToast('Zarf XML henüz desteklenmiyor...', 'warning'); break;
    case 'pdf': 
      showToast('PDF indiriliyor...', 'info'); 
      await downloadFile(uuid, source, 'pdf');
      break;
    case 'link': showToast('Link kopyalandı', 'success'); break;
    default: showToast('Bu özellik yakında aktif olacak', 'info');
  }
}

function statusDisplay(inv) {
  const s = getStatus(inv);
  const map = {
    succeed: ['Alındı Yanıtı Gönderildi.', 'success'],
    waiting: ['Alındı Yanıtı Gönderildi.', 'info'],
    approved: ['Fatura Onaylandı.', 'success'],
    rejected: ['Reddedildi', 'danger'],
  };
  const [text, color] = map[s] || map[s?.toLowerCase()] || [s || '—', 'default'];
  const icon = color === 'success'
    ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`
    : color === 'danger'
    ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`
    : `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--info)" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
  return `<div style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--text-secondary)">${icon} ${text}</div>`;
}

function answerDisplay(inv, uuid, needsAnswer) {
  if (needsAnswer) {
    return `<div style="display:flex;gap:4px">
      <button class="btn btn-sm btn-success" data-action="accept" data-uuid="${uuid}" style="font-size:10px;padding:3px 8px">${ic.check} Kabul Et</button>
      <button class="btn btn-sm btn-danger" data-action="reject" data-uuid="${uuid}" style="font-size:10px;padding:3px 8px">${ic.x} Reddet</button>
    </div>`;
  }
  const status = getStatus(inv);
  if (status === 'succeed' || status === 'approved') {
    return `<div style="font-size:11px;color:var(--text-muted)">Temel Fatura Cevaplanmamaktadır.</div>`;
  }
  return `<span style="font-size:11px;color:var(--text-muted)">—</span>`;
}

function showRejectModal(uuid, page) {
  const bodyEl = document.createElement('div');
  bodyEl.innerHTML = `<div class="form-group"><label class="form-label">Red Gerekçesi</label><textarea class="form-textarea" id="rejectNote" placeholder="Red sebebini yazınız..."></textarea></div>`;
  const footerEl = document.createElement('div');
  footerEl.style.cssText = 'display:flex;gap:10px;justify-content:flex-end;width:100%';
  footerEl.innerHTML = `<button class="btn btn-secondary" id="cancelReject">İptal</button><button class="btn btn-danger" id="confirmReject">Reddet</button>`;
  const modal = showModal({ title: 'Fatura Reddi', body: bodyEl, footer: footerEl });
  footerEl.querySelector('#confirmReject')?.addEventListener('click', async () => {
    const note = bodyEl.querySelector('#rejectNote')?.value || 'Fatura reddedildi';
    const res = await EInvoice.sendAnswer({ UUID: uuid, Answer: 'RED', Note: note });
    showToast(res.success ? 'Fatura reddedildi' : `Hata: ${res.error}`, res.success ? 'warning' : 'error');
    modal?.close();
    if (res.success) loadIncoming(page);
  });
  footerEl.querySelector('#cancelReject')?.addEventListener('click', () => modal?.close());
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
    const fn = source === 'earsiv' ? EArchive.sendEmail : EInvoice.sendPurchaseEmail;
    const res = await fn({ UUID: uuid, EmailAddresses: [email] });
    showToast(res.success ? 'E-posta gönderildi' : `Hata: ${res.error}`, res.success ? 'success' : 'error');
    modal?.close();
  });
  footerEl.querySelector('#cancelEmail')?.addEventListener('click', () => modal?.close());
}

async function exportFiltered(page) {
  const data = filteredInvoices.length > 0 ? filteredInvoices : cachedInvoices;
  if (data.length === 0) return showToast('Dışa aktarılacak fatura yok', 'warning');
  const account = await getActiveAccount();
  const result = exportInvoicesToExcel(data, { accountName: account?.name || '', fileName: 'gelen_faturalar' });
  showToast(`${result.count} fatura Excel'e aktarıldı`, 'success');
}

async function exportCariFiltered(page) {
  try {
    const data = filteredInvoices.length > 0 ? filteredInvoices : cachedInvoices;
    if (data.length === 0) return showToast('Aktarılacak fatura yok', 'warning');
    const account = await getActiveAccount();
    showToast('Cari Defter hazırlanıyor...', 'info');
    const result = await exportCariDefter(data, 'gelen', account?.name || '');
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

async function downloadFile(uuid, source, type) {
  try {
    let res;
    if (source === 'earsiv') {
      res = type === 'pdf' ? await EArchive.getInvoicePdf(uuid) : await EArchive.getInvoiceXml(uuid);
    } else {
      res = type === 'pdf' ? await EInvoice.getPurchasePdf(uuid) : await EInvoice.getPurchaseXml(uuid);
    }

    if (res.success && res.data) {
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

async function showGibStatusModal(uuid, source) {
  let res;
  try {
    if (source === 'earsiv') {
      res = await nilveraRequest('GET', `/earchive/Gib/Purchase/${uuid}/Status`);
      if (!res.success) {
        res = await EArchive.getInvoiceStatus(uuid);
      }
    } else {
      res = await nilveraRequest('GET', `/einvoice/Purchase/${uuid}/Status`);
      if (!res.success) {
        res = await EInvoice.getPurchase(uuid);
      }
    }

    showModal({
      title: 'GİB Sorgu Sonucu',
      body: res.success
        ? `<pre style="font-size:12px;color:var(--text-secondary);overflow-x:auto;white-space:pre-wrap;background:var(--bg-input);padding:16px;border-radius:var(--radius-sm)">${JSON.stringify(res.data, null, 2)}</pre>`
        : `<p>Hata: ${res.error}</p>`,
      size: 'lg'
    });
  } catch (e) {
    showToast(`GİB sorgu hatası: ${e.message}`, 'error');
  }
}

function updateFooter(page, count) {
  const footer = page.querySelector('#tableFooter');
  const el = page.querySelector('#resultCount');
  if (footer) footer.style.display = count > 0 ? 'flex' : 'none';
  if (el) el.textContent = `Toplam Kayıt : ${count}`;
}

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
    <button class="btn btn-success" id="downloadPdfBtn" style="display:none">${ic.cloudDownload} İndir</button>
    <button class="btn btn-primary" id="printPdfBtn" style="display:none">${ic.fileText} Yazdır</button>
  `;
  const modal = showModal({ title: 'Fatura Önizleme', body: bodyEl, footer: footerEl, size: 'xlarge' });

  footerEl.querySelector('#closePdfModal')?.addEventListener('click', () => modal?.close());

  try {
    const res = source === 'earsiv' ? await EArchive.getInvoicePdf(uuid) : await EInvoice.getPurchasePdf(uuid);
    if (!res.success || !res.data) throw new Error(res.error || 'PDF alınamadı');

    const content = typeof res.data === 'string' ? res.data : (res.data.File || res.data.String || res.data[0]);
    const isBase64 = content.match(/^[a-zA-Z0-9+/=]+$/);
    const pdfUrl = isBase64 ? `data:application/pdf;base64,${content}#toolbar=0&navpanes=0&scrollbar=0` : `data:application/pdf,${encodeURIComponent(content)}#toolbar=0&navpanes=0&scrollbar=0`;

    bodyEl.innerHTML = `<iframe src="${pdfUrl}" width="100%" height="100%" style="border:none;border-radius:4px;"></iframe>`;

    const mailBtn = footerEl.querySelector('#mailPdfBtn');
    const dlBtn = footerEl.querySelector('#downloadPdfBtn');
    const printBtn = footerEl.querySelector('#printPdfBtn');
    
    mailBtn.style.display = 'flex';
    dlBtn.style.display = 'flex';
    printBtn.style.display = 'flex';

    mailBtn.addEventListener('click', () => { modal?.close(); showEmailModal(uuid, source); });
    dlBtn.addEventListener('click', () => {
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = `Fatura_${uuid}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
    printBtn.addEventListener('click', () => {
      const iframe = bodyEl.querySelector('iframe');
      if (iframe) {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      }
    });

  } catch (err) {
    bodyEl.innerHTML = `<div class="empty-state">${ic.error}<h3>Önizleme Yüklenemedi</h3><p>${err.message}</p></div>`;
  }
}

