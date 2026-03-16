// ══════════════════════════════════════════
// Outgoing Invoices (Giden Faturalar) Page
// Nilvera-Style with İşlemler Dropdown
// ══════════════════════════════════════════
import { EInvoice, EArchive } from '../api/nilvera.js';
import { showToast } from '../components/toast.js';
import { showModal } from '../components/modal.js';
import { exportInvoicesToExcel } from '../services/excel-export.js';
import { exportCariDefter } from '../services/cari-export.js';
import { getActiveAccount } from '../services/account-manager.js';

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
  check: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  x: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
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
  const e = new Date(y, m + 1, 0);
  return {
    start: `${y}-01-01`, // Yılın başından itibaren al ki eski aydaki faturalar da gelsin
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

export async function renderOutgoingInvoices(options = {}) {
  const page = document.createElement('div');
  const account = await getActiveAccount();
  const { start, end } = getMonthRange();
  const archivedOnly = Boolean(options.archivedOnly);
  const moduleLabel = options.moduleLabel || 'e-Fatura';
  const boxLabel = options.boxLabel || 'Giden Kutusu';

  page.innerHTML = `
    <!-- Breadcrumb -->
    <div class="nilvera-breadcrumb">
      ${ic.efatura}
      <span>${moduleLabel}</span>
      <span class="bc-separator">›</span>
      <span class="bc-current">${boxLabel}</span>
    </div>

    <!-- Filter Bar -->
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
          <option value="earsiv">E-Arşiv</option>
        </select>
      </div>
      <div class="filter-group filter-advanced">
        <label class="filter-label">Sıralama</label>
        <select class="filter-input" id="sortFilter">
          <option value="date-desc">Fatura Tarihi</option>
          <option value="amount-desc">Tutar (Azalan)</option>
          <option value="amount-asc">Tutar (Artan)</option>
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
              <th>Cevap</th>
              <th>Etiket Bilgileri</th>
              <th>İşlemler</th>
            </tr>
          </thead>
          <tbody id="invoiceList">
            <tr><td colspan="9" class="table-empty">
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
  page.querySelector('#applyFilter')?.addEventListener('click', () => {
    // API'den yeni tarihlerle veriyi tekrar çek
    loadOutgoing(page, options);
  });
  page.querySelector('#searchInput')?.addEventListener('input', () => applyFilters(page));
  page.querySelector('#sourceFilter')?.addEventListener('change', () => applyFilters(page));
  setupFilterToggle(page);
  page.querySelector('#sortFilter')?.addEventListener('change', () => {
    const sort = page.querySelector('#sortFilter').value;
    const order = page.querySelector('#orderFilter').value;
    sortData(sort, order);
    applyFilters(page);
  });
  page.querySelector('#orderFilter')?.addEventListener('change', () => {
    const sort = page.querySelector('#sortFilter').value;
    const order = page.querySelector('#orderFilter').value;
    sortData(sort, order);
    applyFilters(page);
  });

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
      btn.addEventListener('click', async (ev) => {
        ev.stopPropagation();
        dd.remove();
        if (btn.dataset.act === 'excel') exportFiltered(page);
        else if (btn.dataset.act === 'cari-excel') exportCariFiltered(page);
        else if (btn.dataset.act === 'pdf-all') await bulkDownloadForFiltered(page, 'pdf');
        else if (btn.dataset.act === 'pdf-single') await bulkDownloadForFiltered(page, 'pdf', { singlePageMode: true });
        else if (btn.dataset.act === 'xml-all') await bulkDownloadForFiltered(page, 'xml');
        else if (btn.dataset.act === 'xml-env') await bulkDownloadEnvelopeForFiltered(page);
      });
    });
  });

  // İşlemler actions Dropdown
  page.querySelector('#islemlerBtn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    document.querySelectorAll('.action-dropdown').forEach(d => d.remove());
    const dd = document.createElement('div');
    dd.className = 'action-dropdown';
    const archiveAction = archivedOnly ? 'unarchive' : 'archive';
    const archiveActionLabel = archivedOnly ? 'Arşivden Çıkar' : "Arşiv'e Kaldır";
    dd.innerHTML = `
      <button class="action-dropdown-item" data-act="${archiveAction}">${ic.archive} ${archiveActionLabel}</button>
      <button class="action-dropdown-item" data-act="draft">${ic.fileText} Taslak Oluştur</button>
      <button class="action-dropdown-item" data-act="special-code">${ic.tag} Özel Kod Alanı</button>
      <button class="action-dropdown-item" data-act="transferred">${ic.check} Aktarıldı Olarak İşaretle</button>
      <button class="action-dropdown-item" data-act="not-transferred">${ic.x} Aktarılmadı Olarak İşaretle</button>
    `;
    mountActionDropdown(e.target.closest('button'), dd);
    
    dd.querySelectorAll('.action-dropdown-item').forEach(btn => {
      btn.addEventListener('click', async (ev) => {
        ev.stopPropagation();
        dd.remove();
        const act = btn.dataset.act;
        if (act === 'archive') await bulkArchiveSelected(page, options);
        else if (act === 'unarchive') await bulkUnarchiveSelected(page, options);
        else if (act === 'draft') await bulkCreateDraftSelected(page);
        else if (act === 'special-code') showBulkSpecialCodeModal(page);
        else if (act === 'transferred') await bulkTransferMarkSelected(page, true);
        else if (act === 'not-transferred') await bulkTransferMarkSelected(page, false);
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

  loadOutgoing(page, options);
  return page;
}

let cachedOutgoing = [];
let filteredOutgoing = [];
let cachedOutgoingAccountId = '';
let outgoingLoadSeq = 0;

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

async function loadOutgoing(page, options = {}) {
  const tbody = page.querySelector('#invoiceList');
  if (!tbody) return;
  const archivedOnly = Boolean(options.archivedOnly);

  const account = await getActiveAccount();
  if (!account) {
    cachedOutgoing = [];
    filteredOutgoing = [];
    cachedOutgoingAccountId = '';
    tbody.innerHTML = `<tr><td colspan="9" class="table-empty">
      <div class="empty-state">
        ${ic.key}
        <h3>Hesap seçilmedi</h3>
        <p>Fatura verilerini görüntülemek için önce bir Nilvera API hesabı eklemeniz gerekiyor</p>
        <button class="btn btn-primary" onclick="window.location.hash='#/accounts'">Hesap Ekle</button>
      </div>
    </td></tr>`;
    return;
  }

  const accountId = account.id || '';
  const seq = ++outgoingLoadSeq;

  if (cachedOutgoingAccountId && cachedOutgoingAccountId !== accountId) {
    cachedOutgoing = [];
    filteredOutgoing = [];
  }
  cachedOutgoingAccountId = accountId;

  tbody.innerHTML = `<tr><td colspan="9" class="table-empty">
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
    
    // YENİ EKLEDİĞİM LOG: Seçilen tarihi burada net görsün
    console.log('📌 ARA BUTONUNA BASILDI, ALGILANAN TARİHLER:', { dateStart, dateEnd });

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

    // E-Arşiv için de aynı date formatını ve DateFilterType eklemeliyiz. .NET api bunu bekliyor
    const apiDateStart = dateStart ? (dateStart + 'T00:00:00') : undefined;
    const apiDateEnd = dateEnd ? (dateEnd + 'T23:59:59') : undefined;

    const baseEInvoiceParams = {
      StartDate: apiDateStart,
      EndDate: apiDateEnd,
      DateFilterType: 'IssueDate',
      ...(archivedOnly ? { IsArchived: true, Archived: true } : {}),
    };
    const baseEArchiveParams = {
      StartDate: apiDateStart,
      EndDate: apiDateEnd,
      DateFilterType: 'IssueDate',
      ...(archivedOnly ? { IsArchived: true, Archived: true } : {}),
    };
    const draftParams = { StartDate: apiDateStart, EndDate: apiDateEnd };

    const [efaturaRes, earsivRes, earsivDraftRes] = await Promise.allSettled([
      fetchAllPages(EInvoice.listSales, baseEInvoiceParams),
      fetchAllPages(EArchive.listInvoices, baseEArchiveParams),
      fetchAllPages(EArchive.listDrafts, draftParams)
    ]);

    console.log('E-Arşiv Giden Gelen API Yanıtı:', earsivRes);
    console.log('E-Arşiv Taslak API Yanıtı:', earsivDraftRes);

    let allInvoices = [];
    if (efaturaRes.status === 'fulfilled' && efaturaRes.value.success) {
      allInvoices.push(...extractItems(efaturaRes.value.data).map(inv => ({ ...inv, _source: 'efatura' })));
    }
    if (earsivRes.status === 'fulfilled' && earsivRes.value.success) {
      allInvoices.push(...extractItems(earsivRes.value.data).map(inv => ({ ...inv, _source: 'earsiv' })));
    }
    // E-Arşiv 'Onay Bekleyenler' ve Taslaklar
    if (earsivDraftRes.status === 'fulfilled' && earsivDraftRes.value.success) {
      allInvoices.push(...extractItems(earsivDraftRes.value.data).map(inv => ({ ...inv, _source: 'earsiv' })));
    }

    if (archivedOnly) {
      allInvoices = allInvoices.filter(isArchivedInvoice);
    }

    if (seq !== outgoingLoadSeq || cachedOutgoingAccountId !== accountId) {
      return;
    }

    if (allInvoices.length === 0) {
      const efOk = efaturaRes.status === 'fulfilled' && efaturaRes.value.success;
      const eaOk = (earsivRes.status === 'fulfilled' && earsivRes.value.success) || (earsivDraftRes.status === 'fulfilled' && earsivDraftRes.value.success);
      if (efOk || eaOk) {
        tbody.innerHTML = `<tr><td colspan="9" class="table-empty"><div class="empty-state">${ic.noData}<h3>Giden fatura bulunamadı</h3><p>Bu dönemde e-Fatura veya e-Arşiv gönderilmiş fatura yok</p></div></td></tr>`;
      } else {
        tbody.innerHTML = `<tr><td colspan="9" class="table-empty"><div class="empty-state">${ic.error}<h3>Veri alınamadı</h3><p>API bağlantısını kontrol edin</p><button class="btn btn-primary" id="retryBtn">${ic.refresh} Tekrar Dene</button></div></td></tr>`;
        tbody.querySelector('#retryBtn')?.addEventListener('click', () => loadOutgoing(page, options));
      }
      updateFooter(page, 0);
      return;
    }

    allInvoices.sort((a, b) => new Date(getInvoiceDate(b) || 0) - new Date(getInvoiceDate(a) || 0));
    cachedOutgoing = allInvoices;
    
    // Uygulanan sıralama ve filtreleri dikkate al
    const sort = page.querySelector('#sortFilter')?.value || 'date-desc';
    const order = page.querySelector('#orderFilter')?.value || 'desc';
    sortData(sort, order);

    filteredOutgoing = cachedOutgoing;
    applyFilters(page);
  } catch (e) {
    if (seq !== outgoingLoadSeq || cachedOutgoingAccountId !== accountId) {
      return;
    }
    tbody.innerHTML = `<tr><td colspan="9" class="table-empty"><div class="empty-state">${ic.globe}<h3>Bağlantı hatası</h3><p>${e.message || 'Sunucuya ulaşılamıyor'}</p><button class="btn btn-primary" id="retryBtn2">${ic.refresh} Tekrar Dene</button></div></td></tr>`;
    tbody.querySelector('#retryBtn2')?.addEventListener('click', () => loadOutgoing(page, options));
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
  const source = page.querySelector('#sourceFilter')?.value;

  filteredOutgoing = (cachedOutgoing || []).filter(inv => {
    if (source && inv._source !== source) return false;
    if (search) {
      const haystack = [getInvoiceNumber(inv), getReceiverName(inv), getReceiverTaxNo(inv), inv.UUID || ''].join(' ').toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    // Tarih filtresi artık API'den geldiği için burada local olarak sadece ek filtre yapılabilir ancak
    // 'ARA' butonuna basınca loadOutgoing ile yeniden API'ye gidiyoruz.
    return true;
  });

  renderTable(page, filteredOutgoing);
  updateFooter(page, filteredOutgoing.length);
}

function sortData(sortType, order) {
  cachedOutgoing.sort((a, b) => {
    let valA, valB;
    if (sortType === 'date-desc' || sortType === 'date-asc') {
      valA = new Date(getInvoiceDate(a) || 0).getTime();
      valB = new Date(getInvoiceDate(b) || 0).getTime();
    } else if (sortType === 'amount-desc' || sortType === 'amount-asc') {
      valA = parseFloat(getAmount(a)) || 0;
      valB = parseFloat(getAmount(b)) || 0;
    }

    if (order === 'asc') {
      return valA > valB ? 1 : (valA < valB ? -1 : 0);
    } else {
      return valA < valB ? 1 : (valA > valB ? -1 : 0);
    }
  });
}

function renderTable(page, invoices) {
  const tbody = page.querySelector('#invoiceList');
  if (!tbody) return;

  if (invoices.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="table-empty"><div class="empty-state">${ic.noData}<h3>Filtreye uygun fatura bulunamadı</h3><p>Farklı filtreler deneyin</p></div></td></tr>`;
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
          <button class="action-menu-btn" data-action="query" data-uuid="${uuid}" data-source="${inv._source}" title="PDF Önizle">${ic.query}</button>
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
      <td data-label="Cevap">${answerDisplay(inv)}</td>
      <td data-label="Etiket Bilgileri"><span style="font-size:11px;color:var(--text-muted)">—</span></td>
      <td data-label="İşlemler">
        <button class="action-menu-btn action-menu-trigger" data-idx="${idx}" data-uuid="${uuid}" data-source="${inv._source}" data-archived="${isArchivedInvoice(inv) ? '1' : '0'}" title="İşlemler">${ic.menu}</button>
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
      const rowArchived = btn.dataset.archived === '1';
      const rowArchiveAction = rowArchived ? 'unarchive' : 'archive';
      const rowArchiveLabel = rowArchived ? 'Arşivden Çıkar' : "Arşiv'e Kaldır";
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
        <button class="action-dropdown-item" data-act="${rowArchiveAction}">${ic.archive} ${rowArchiveLabel}</button>
        <div class="action-dropdown-divider"></div>
        <button class="action-dropdown-item" data-act="xml">${ic.xml} XML İndir</button>
        <button class="action-dropdown-item" data-act="envelope">${ic.xml} Zarf XML İndir</button>
        <button class="action-dropdown-item" data-act="pdf">${ic.pdf} PDF İndir</button>
      `;

      mountActionDropdown(btn, dropdown);

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
      try {
        const res = source === 'earsiv'
          ? await EArchive.getInvoiceStatus(uuid)
          : await EInvoice.getSaleStatus(uuid);
        showModal({
          title: 'GİB Sorgu Sonucu',
          body: res.success
            ? `<pre style="font-size:12px;color:var(--text-secondary);overflow-x:auto;white-space:pre-wrap;background:var(--bg-input);padding:16px;border-radius:var(--radius-sm)">${JSON.stringify(res.data, null, 2)}</pre>`
            : `<p>Hata: ${res.error}</p>`,
          size: 'lg'
        });
      } catch (e) { showToast(`Hata: ${e.message}`, 'error'); }
      break;
    case 'detail':
      await showInvoiceDetailsModal(uuid, source);
      break;
    case 'draft':
      await createDraftFromInvoice(uuid, source);
      break;
    case 'tags':
      await showTagDetails(uuid, source);
      break;
    case 'code':
      showSpecialCodeModal(uuid, source);
      break;
    case 'mail':
      showEmailModal(uuid, source);
      break;
    case 'archive':
      await archiveInvoice(uuid, source);
      break;
    case 'unarchive':
      await unarchiveInvoice(uuid, source);
      break;
    case 'transfer':
      await openTransferModal(uuid, source);
      break;
    case 'xml':
      showToast('XML indiriliyor...', 'info');
      await downloadFile(uuid, source, 'xml');
      break;
    case 'envelope':
      await downloadEnvelopeXml(uuid, source);
      break;
    case 'pdf':
      showToast('PDF indiriliyor...', 'info');
      await downloadFile(uuid, source, 'pdf');
      break;
    case 'link':
      await copyInvoiceShareLink(uuid, source);
      break;
    default:
      showToast('Desteklenmeyen işlem seçildi', 'warning');
  }
}

function getEffectiveList() {
  return (filteredOutgoing && filteredOutgoing.length > 0) ? filteredOutgoing : cachedOutgoing;
}

function getSelectedInvoices(page) {
  const list = getEffectiveList();
  const rows = [...page.querySelectorAll('.row-check:checked')];
  const selected = rows
    .map(cb => {
      const idx = Number(cb.dataset.idx);
      return Number.isInteger(idx) ? list[idx] : null;
    })
    .filter(Boolean)
    .map(inv => ({
      uuid: inv.UUID || inv.uuid || inv.Id || '',
      source: inv._source || 'efatura'
    }))
    .filter(x => x.uuid);
  return selected;
}

function summarizeBulkResult(okCount, failCount, actionLabel) {
  if (okCount > 0 && failCount === 0) {
    showToast(`${okCount} kayıt için ${actionLabel} tamamlandı`, 'success');
    return;
  }
  if (okCount > 0 && failCount > 0) {
    showToast(`${okCount} başarılı, ${failCount} başarısız`, 'warning');
    return;
  }
  showToast(`${actionLabel} başarısız`, 'error');
}

async function runBulkSelected(page, actionLabel, worker) {
  const selected = getSelectedInvoices(page);
  if (selected.length === 0) {
    showToast('Önce en az bir kayıt seçmelisiniz', 'warning');
    return { okCount: 0, failCount: 0 };
  }

  let okCount = 0;
  let failCount = 0;
  for (const item of selected) {
    try {
      const ok = await worker(item);
      if (ok) okCount++;
      else failCount++;
    } catch {
      failCount++;
    }
  }
  summarizeBulkResult(okCount, failCount, actionLabel);
  return { okCount, failCount };
}

async function bulkArchiveSelected(page, options = {}) {
  const result = await runBulkSelected(page, 'arşive kaldırma', async ({ uuid, source }) => {
    const res = await tryOperationWithFallback(source, uuid, ['Archive', 'archive', 'ArsiveKaldir']);
    return res.success;
  });
  if (result.okCount > 0) {
    await loadOutgoing(page, options);
  }
}

async function bulkUnarchiveSelected(page, options = {}) {
  const result = await runBulkSelected(page, 'arşivden çıkarma', async ({ uuid, source }) => {
    const res = await tryOperationWithFallback(source, uuid, ['Unarchive', 'UnArchive', 'ArchiveRemove', 'ArsivdenCikar']);
    return res.success;
  });
  if (result.okCount > 0) {
    await loadOutgoing(page, options);
  }
}

async function bulkCreateDraftSelected(page) {
  await runBulkSelected(page, 'taslak oluşturma', async ({ uuid, source }) => {
    const fn = source === 'earsiv' ? EArchive.createInvoiceDraft : EInvoice.createSaleDraft;
    const res = await fn(uuid);
    return !!res.success;
  });
}

async function bulkTransferMarkSelected(page, transferred) {
  const operationTypes = transferred
    ? ['Transferred', 'Aktarildi', 'SetTransferred']
    : ['NotTransferred', 'Aktarilmadi', 'SetNotTransferred'];
  await runBulkSelected(page, transferred ? 'aktarıldı işaretleme' : 'aktarılmadı işaretleme', async ({ uuid, source }) => {
    const res = await tryOperationWithFallback(source, uuid, operationTypes);
    return res.success;
  });
}

function showBulkSpecialCodeModal(page) {
  const selected = getSelectedInvoices(page);
  if (selected.length === 0) {
    showToast('Önce en az bir kayıt seçmelisiniz', 'warning');
    return;
  }

  const bodyEl = document.createElement('div');
  bodyEl.innerHTML = `
    <p style="margin:0 0 10px;color:var(--text-muted)">${selected.length} kayıt için özel kod atanacak</p>
    <div class="form-group">
      <label class="form-label">Özel Kod</label>
      <input type="text" class="form-input" id="bulkSpecialCodeInput" placeholder="Örn: TOPLU-2026" maxlength="64" />
    </div>
  `;

  const footerEl = document.createElement('div');
  footerEl.style.cssText = 'display:flex;gap:10px;justify-content:flex-end;width:100%';
  footerEl.innerHTML = `
    <button class="btn btn-secondary" id="cancelBulkCode">İptal</button>
    <button class="btn btn-primary" id="saveBulkCode">Kaydet</button>
  `;

  const modal = showModal({ title: 'Toplu Özel Kod', body: bodyEl, footer: footerEl });
  footerEl.querySelector('#cancelBulkCode')?.addEventListener('click', () => modal?.close());
  footerEl.querySelector('#saveBulkCode')?.addEventListener('click', async () => {
    const code = bodyEl.querySelector('#bulkSpecialCodeInput')?.value?.trim();
    if (!code) return showToast('Özel kod boş bırakılamaz', 'warning');

    let okCount = 0;
    let failCount = 0;
    for (const item of selected) {
      const fn = item.source === 'earsiv' ? EArchive.setInvoiceSpecialCode : EInvoice.setSaleSpecialCode;
      const res = await fn(item.uuid, code);
      if (res.success) okCount++;
      else failCount++;
    }
    summarizeBulkResult(okCount, failCount, 'özel kod atama');
    if (okCount > 0) modal?.close();
  });
}

async function bulkDownloadForFiltered(page, type, options = {}) {
  const list = getEffectiveList();
  if (!list.length) {
    showToast('İndirilecek kayıt bulunamadı', 'warning');
    return;
  }

  let okCount = 0;
  let failCount = 0;
  const capped = list.slice(0, 30);
  if (list.length > 30) {
    showToast('Performans için ilk 30 kayıt indirilecek', 'info');
  }

  for (const inv of capped) {
    const uuid = inv.UUID || inv.uuid || inv.Id || '';
    const source = inv._source || 'efatura';
    if (!uuid) {
      failCount++;
      continue;
    }
    const res = await downloadFile(uuid, source, type, { silent: true, singlePageMode: !!options.singlePageMode });
    if (res?.success) okCount++;
    else failCount++;
  }
  summarizeBulkResult(okCount, failCount, type === 'pdf' ? 'PDF indirme' : 'XML indirme');
}

async function bulkDownloadEnvelopeForFiltered(page) {
  const list = getEffectiveList();
  if (!list.length) {
    showToast('İndirilecek kayıt bulunamadı', 'warning');
    return;
  }
  const efaturaOnly = list.filter(inv => (inv._source || 'efatura') !== 'earsiv').slice(0, 30);
  if (!efaturaOnly.length) {
    showToast('Zarf XML yalnızca e-Fatura kayıtlarında mevcut', 'warning');
    return;
  }

  let okCount = 0;
  let failCount = 0;
  for (const inv of efaturaOnly) {
    const uuid = inv.UUID || inv.uuid || inv.Id || '';
    if (!uuid) {
      failCount++;
      continue;
    }
    const res = await downloadEnvelopeXml(uuid, 'efatura', { silent: true });
    if (res?.success) okCount++;
    else failCount++;
  }
  summarizeBulkResult(okCount, failCount, 'zarf XML indirme');
}

function getInvoiceRecord(uuid, source) {
  return (cachedOutgoing || []).find(i => {
    const itemUuid = i.UUID || i.uuid || i.Id || '';
    return itemUuid === uuid && (!source || i._source === source);
  }) || null;
}

function formatValue(v) {
  if (v === null || v === undefined || v === '') return '—';
  return String(v);
}

async function showInvoiceDetailsModal(uuid, source) {
  const record = getInvoiceRecord(uuid, source);
  const apiFn = source === 'earsiv' ? EArchive.getInvoiceDetails : EInvoice.getSaleDetails;
  const detailRes = await apiFn(uuid);
  const data = detailRes.success ? (detailRes.data?.Content || detailRes.data) : null;
  const effective = data || record || {};

  const invoiceNo = formatValue(getInvoiceNumber(effective));
  const invoiceDate = formatValue(fmtDateFull(getInvoiceDate(effective)));
  const receiver = formatValue(getReceiverName(effective));
  const receiverTaxNo = formatValue(getReceiverTaxNo(effective));
  const amount = formatValue(fmtCur(getAmount(effective), getCurrency(effective)));
  const status = formatValue(getStatusDetail(effective) || getStatus(effective));

  const body = document.createElement('div');
  body.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-bottom:16px">
      <div class="detail-card"><div class="filter-label">Fatura No</div><div>${invoiceNo}</div></div>
      <div class="detail-card"><div class="filter-label">Kaynak</div><div>${source === 'earsiv' ? 'E-Arşiv' : 'E-Fatura'}</div></div>
      <div class="detail-card"><div class="filter-label">Fatura Tarihi</div><div>${invoiceDate}</div></div>
      <div class="detail-card"><div class="filter-label">Durum</div><div>${status}</div></div>
      <div class="detail-card"><div class="filter-label">Alıcı</div><div>${receiver}</div></div>
      <div class="detail-card"><div class="filter-label">Vergi No</div><div>${receiverTaxNo}</div></div>
      <div class="detail-card"><div class="filter-label">Tutar</div><div>${amount}</div></div>
      <div class="detail-card"><div class="filter-label">UUID</div><div style="word-break:break-all">${formatValue(uuid)}</div></div>
    </div>
    <div class="form-group">
      <label class="form-label">Ham Yanıt</label>
      <pre style="max-height:320px;overflow:auto;background:var(--bg-input);padding:12px;border-radius:8px;font-size:12px">${JSON.stringify(effective, null, 2)}</pre>
    </div>
    ${detailRes.success ? '' : `<p style="margin-top:8px;color:var(--warning)">Detay endpoint'i hata verdi: ${detailRes.error || 'Bilinmeyen hata'}</p>`}
  `;

  const footer = document.createElement('div');
  footer.style.cssText = 'display:flex;gap:10px;justify-content:flex-end;width:100%';
  footer.innerHTML = `
    <button class="btn btn-secondary" id="detailCloseBtn">Kapat</button>
    <button class="btn btn-info" id="detailXmlBtn" style="color:white">XML İndir</button>
    <button class="btn btn-success" id="detailPdfBtn">PDF İndir</button>
  `;

  const modal = showModal({ title: 'Fatura Detayları', body, footer, size: 'xlarge' });
  footer.querySelector('#detailCloseBtn')?.addEventListener('click', () => modal?.close());
  footer.querySelector('#detailXmlBtn')?.addEventListener('click', async () => await downloadFile(uuid, source, 'xml'));
  footer.querySelector('#detailPdfBtn')?.addEventListener('click', async () => await downloadFile(uuid, source, 'pdf'));
}

async function createDraftFromInvoice(uuid, source) {
  const fn = source === 'earsiv' ? EArchive.createInvoiceDraft : EInvoice.createSaleDraft;
  const res = await fn(uuid);
  if (!res.success) {
    showToast(`Taslak oluşturulamadı: ${res.error}`, 'error');
    return;
  }
  showToast('Taslak başarıyla oluşturuldu', 'success');
}

async function showTagDetails(uuid, source) {
  const fn = source === 'earsiv' ? EArchive.getInvoiceTags : EInvoice.getSaleTags;
  const res = await fn(uuid);
  showModal({
    title: 'Etiket Bilgileri',
    body: res.success
      ? `<pre style="font-size:12px;color:var(--text-secondary);overflow-x:auto;white-space:pre-wrap;background:var(--bg-input);padding:16px;border-radius:var(--radius-sm)">${JSON.stringify(res.data, null, 2)}</pre>`
      : `<p>Etiket bilgileri alınamadı: ${res.error}</p>`,
    size: 'lg'
  });
}

function showSpecialCodeModal(uuid, source) {
  const bodyEl = document.createElement('div');
  bodyEl.innerHTML = `
    <div class="form-group">
      <label class="form-label">Özel Kod</label>
      <input type="text" class="form-input" id="specialCodeInput" placeholder="Örn: SATIS-2026" maxlength="64" />
    </div>
  `;

  const footerEl = document.createElement('div');
  footerEl.style.cssText = 'display:flex;gap:10px;justify-content:flex-end;width:100%';
  footerEl.innerHTML = `
    <button class="btn btn-secondary" id="cancelSpecialCode">İptal</button>
    <button class="btn btn-primary" id="saveSpecialCode">Kaydet</button>
  `;

  const modal = showModal({ title: 'Özel Kod Alanı', body: bodyEl, footer: footerEl });
  footerEl.querySelector('#cancelSpecialCode')?.addEventListener('click', () => modal?.close());
  footerEl.querySelector('#saveSpecialCode')?.addEventListener('click', async () => {
    const code = bodyEl.querySelector('#specialCodeInput')?.value?.trim();
    if (!code) return showToast('Özel kod boş bırakılamaz', 'warning');
    const fn = source === 'earsiv' ? EArchive.setInvoiceSpecialCode : EInvoice.setSaleSpecialCode;
    const res = await fn(uuid, code);
    showToast(res.success ? 'Özel kod atandı' : `Özel kod atanamadı: ${res.error}`, res.success ? 'success' : 'error');
    if (res.success) modal?.close();
  });
}

async function tryOperationWithFallback(source, uuid, operationTypes) {
  const fn = source === 'earsiv' ? EArchive.setInvoiceOperation : EInvoice.setSaleOperation;
  let lastErr = null;
  for (const operationType of operationTypes) {
    const res = await fn(operationType, [uuid]);
    if (res.success) return { success: true, operationType };
    lastErr = res.error || 'İşlem başarısız';
  }
  return { success: false, error: lastErr || 'İşlem tipi bulunamadı' };
}

async function archiveInvoice(uuid, source) {
  const res = await tryOperationWithFallback(source, uuid, ['Archive', 'archive', 'ArsiveKaldir']);
  if (res.success) {
    showToast('Fatura arşive alındı', 'success');
    return;
  }
  showToast(`Arşiv işlemi başarısız: ${res.error}`, 'error');
}

async function unarchiveInvoice(uuid, source) {
  const res = await tryOperationWithFallback(source, uuid, ['Unarchive', 'UnArchive', 'ArchiveRemove', 'ArsivdenCikar']);
  if (res.success) {
    showToast('Fatura arşivden çıkarıldı', 'success');
    return;
  }
  showToast(`Arşivden çıkarma başarısız: ${res.error}`, 'error');
}

async function openTransferModal(uuid, source) {
  const bodyEl = document.createElement('div');
  bodyEl.innerHTML = `<p style="margin:0 0 8px">Aktarım durumunu seç:</p>`;
  const footerEl = document.createElement('div');
  footerEl.style.cssText = 'display:flex;gap:10px;justify-content:flex-end;width:100%';
  footerEl.innerHTML = `
    <button class="btn btn-secondary" id="cancelTransfer">İptal</button>
    <button class="btn btn-warning" id="setNotTransferred">Aktarılmadı</button>
    <button class="btn btn-success" id="setTransferred">Aktarıldı</button>
  `;

  const modal = showModal({ title: 'Aktarım Durumu', body: bodyEl, footer: footerEl });
  footerEl.querySelector('#cancelTransfer')?.addEventListener('click', () => modal?.close());
  footerEl.querySelector('#setTransferred')?.addEventListener('click', async () => {
    const res = await tryOperationWithFallback(source, uuid, ['Transferred', 'Aktarildi', 'SetTransferred']);
    showToast(res.success ? 'Aktarıldı olarak işaretlendi' : `İşlem başarısız: ${res.error}`, res.success ? 'success' : 'error');
    if (res.success) modal?.close();
  });
  footerEl.querySelector('#setNotTransferred')?.addEventListener('click', async () => {
    const res = await tryOperationWithFallback(source, uuid, ['NotTransferred', 'Aktarilmadi', 'SetNotTransferred']);
    showToast(res.success ? 'Aktarılmadı olarak işaretlendi' : `İşlem başarısız: ${res.error}`, res.success ? 'success' : 'error');
    if (res.success) modal?.close();
  });
}

async function copyInvoiceShareLink(uuid, source) {
  const link = `${window.location.origin}${window.location.pathname}#/outgoing?uuid=${encodeURIComponent(uuid)}&source=${encodeURIComponent(source || 'efatura')}`;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(link);
    } else {
      const input = document.createElement('input');
      input.value = link;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
    }
    showToast('Paylaşım linki panoya kopyalandı', 'success');
  } catch {
    showToast('Link kopyalanamadı', 'error');
  }
}

function extractFileContent(data) {
  if (!data) return '';
  if (typeof data === 'string') return data;
  if (Array.isArray(data)) return data[0] || '';
  return data.File || data.String || data.Content || '';
}

function buildDataUrl(content, type) {
  const base64Pattern = /^[A-Za-z0-9+/=\r\n]+$/;
  if (base64Pattern.test(content) && content.length % 4 === 0) {
    return `data:application/${type === 'pdf' ? 'pdf' : 'xml'};base64,${content}`;
  }
  return `data:application/${type === 'pdf' ? 'pdf' : 'xml'};charset=utf-8,${encodeURIComponent(content)}`;
}

async function downloadEnvelopeXml(uuid, source, options = {}) {
  const { silent = false } = options;
  if (source === 'earsiv') {
    if (!silent) showToast('E-Arşiv için zarf XML endpointi bulunmuyor', 'warning');
    return { success: false, error: 'E-Arşiv için zarf XML endpointi bulunmuyor' };
  }
  const res = await EInvoice.getSaleEnvelopeInfo(uuid);
  if (!res.success) {
    if (!silent) showToast(`Zarf bilgisi alınamadı: ${res.error}`, 'error');
    return { success: false, error: res.error };
  }

  const payload = res.data?.Content || res.data || {};
  const xml = `<EnvelopeInfo>\n  <UUID>${uuid}</UUID>\n  <Payload>${encodeURIComponent(JSON.stringify(payload))}</Payload>\n</EnvelopeInfo>`;
  const link = document.createElement('a');
  link.href = `data:application/xml;charset=utf-8,${xml}`;
  link.download = `Zarf_${uuid}.xml`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  if (!silent) showToast('Zarf XML indirildi', 'success');
  return { success: true };
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
    const fn = source === 'earsiv' ? EArchive.sendEmail : EInvoice.sendSaleEmail;
    const res = await fn({ UUID: uuid, EmailAddresses: [email] });
    showToast(res.success ? 'E-posta gönderildi' : `Hata: ${res.error}`, res.success ? 'success' : 'error');
    modal?.close();
  });
  footerEl.querySelector('#cancelEmail')?.addEventListener('click', () => modal?.close());
}

async function exportFiltered(page) {
  const data = filteredOutgoing.length > 0 ? filteredOutgoing : cachedOutgoing;
  if (data.length === 0) return showToast('Dışa aktarılacak fatura yok', 'warning');
  const account = await getActiveAccount();
  const result = exportInvoicesToExcel(data, { accountName: account?.name || '', fileName: 'giden_faturalar' });
  showToast(`${result.count} fatura Excel'e aktarıldı`, 'success');
}

async function exportCariFiltered(page) {
  try {
    const data = filteredOutgoing.length > 0 ? filteredOutgoing : cachedOutgoing;
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

async function downloadFile(uuid, source, type, options = {}) {
  const { silent = false } = options;
  try {
    let res;
    if (source === 'earsiv') {
      res = type === 'pdf' ? await EArchive.getInvoicePdf(uuid) : await EArchive.getInvoiceXml(uuid);
    } else {
      res = type === 'pdf' ? await EInvoice.getSalePdf(uuid) : await EInvoice.getSaleXml(uuid);
    }

    if (res.success && res.data) {
      const content = extractFileContent(res.data);
      if (!content) throw new Error('Dosya içeriği bulunamadı');

      const url = buildDataUrl(content, type);

      const link = document.createElement('a');
      link.href = url;
      link.download = `Fatura_${uuid}.${type}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      if (!silent) showToast('Dosya indirildi', 'success');
      return { success: true };
    } else {
      if (!silent) showToast(`Hata: ${res.error}`, 'error');
      return { success: false, error: res.error };
    }
  } catch (e) {
    if (!silent) showToast(`İndirme başarısız: ${e.message}`, 'error');
    return { success: false, error: e.message };
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
    const res = source === 'earsiv' ? await EArchive.getInvoicePdf(uuid) : await EInvoice.getSalePdf(uuid);
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

