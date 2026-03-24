// ══════════════════════════════════════════
// Canlı Cari Sistemi — Müşteri Bazlı Cari Takip
// ══════════════════════════════════════════
import { EInvoice, EArchive } from '../api/nilvera.js';
import { showToast } from '../components/toast.js';
import { showModal } from '../components/modal.js';
import { attachDatePicker } from '../lib/date-picker.js';
import { getActiveAccount } from '../services/account-manager.js';
import { registerCacheReset } from '../router.js';
import { exportCustomerCari } from '../services/cari-export.js';
import { addCollection, listCollections, updateCollection, deleteCollection } from '../services/tahsilat-manager.js';

// ── SVG Icons ──
const ic = {
  search: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  calendar: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
  refresh: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>`,
  download: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
  users: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  user: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  layers: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>`,
  fileText: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
  trendUp: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`,
  trendDown: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>`,
  dollarSign: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
  noData: `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" opacity="0.3"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
  key: `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" opacity="0.3"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>`,
  arrowLeft: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>`,
};

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
function getSenderName(inv) {
  return inv.SenderName || inv.senderName || inv.SupplierName || (inv.SenderInfo || {}).Name || '';
}
function getSenderTaxNo(inv) {
  return inv.SenderTaxNumber || inv.senderTaxNumber || (inv.SenderInfo || {}).TaxNumber || '';
}
function getAmount(inv) {
  return inv.PayableAmount || inv.payableAmount || inv.TotalAmount || inv.totalAmount || 0;
}
function getCurrency(inv) {
  return inv.CurrencyCode || inv.currencyCode || 'TRY';
}

function fmtCur(a, c) {
  if (!a && a !== 0) return '—';
  try { return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: c || 'TRY' }).format(a); }
  catch { return `${a} ${c}`; }
}
function fmtDate(d) {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('tr-TR'); }
  catch { return d; }
}

function toTs(v) {
  const t = new Date(v || 0).getTime();
  return Number.isFinite(t) ? t : 0;
}

function parseAmountInput(value) {
  if (!value) return 0;
  const normalized = String(value)
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(/,/g, '.');
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

function formatAmountInput(value) {
  const n = parseAmountInput(value);
  if (!n) return '';
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(n);
}

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

// ── Default date range: last 3 months ──
function getDefaultRange() {
  const now = new Date();
  const e = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const s = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  const start = `${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, '0')}-01`;
  return { start, end: e };
}

// ── State ──
let allInvoices = [];
let allCollections = [];
let customerMap = {};  // { customerKey: { name, taxNo, invoices: [], totalBorc, totalAlacak } }
let selectedCustomer = null;
let currentSource = 'giden'; // 'giden' or 'gelen'
let cachedCariAccountId = '';
let cariLoadSeq = 0;

function resetCariCache() {
  allInvoices = [];
  allCollections = [];
  customerMap = {};
  cariLoadSeq++;
  selectedCustomer = null;
  cachedCariAccountId = '';
}
registerCacheReset(resetCariCache);

function getCustomerKey(name, taxNo) {
  return (taxNo || name || 'bilinmeyen').toLowerCase().trim();
}

export async function renderCariPage() {
  resetCariCache();
  const page = document.createElement('div');
  page.className = 'cari-page';
  const account = await getActiveAccount();
  const { start, end } = getDefaultRange();

  page.innerHTML = `
    <!-- Breadcrumb -->
    <div class="nilvera-breadcrumb">
      ${ic.layers}
      <span>Canlı Cari</span>
      <span class="bc-separator">›</span>
      <span class="bc-current">Müşteri Cari Takip</span>
    </div>

    <!-- Filter Bar -->
    <div class="nilvera-filter-bar">
      <div class="filter-group">
        <label class="filter-label">Kaynak</label>
        <select class="filter-input" id="cariSourceFilter">
          <option value="giden" selected>Giden Kutusu (Satış)</option>
          <option value="gelen">Gelen Kutusu (Alım)</option>
        </select>
      </div>
      <div class="filter-group">
        <label class="filter-label">Başlangıç Tarihi</label>
        <input type="date" class="filter-input" id="cariDateStart" value="${start}" />
      </div>
      <div class="filter-group">
        <label class="filter-label">Bitiş Tarihi</label>
        <input type="date" class="filter-input" id="cariDateEnd" value="${end}" />
      </div>
      <div class="filter-group filter-search">
        <label class="filter-label">Müşteri Ara</label>
        <input type="text" class="filter-input" id="cariSearchInput" placeholder="Ad veya VKN ile ara..." style="width:100%" />
      </div>
      <div class="filter-actions" style="display:flex; gap:12px; align-items:flex-end; margin-bottom:-4px;">
        <button class="btn btn-sm" id="cariApplyBtn" style="height:34px; padding:0 20px; font-weight:600; font-size:12px; border-radius:6px; display:flex; align-items:center; gap:6px; background:var(--accent); color:white; border:none">${ic.search} ARA</button>
      </div>
    </div>

    <!-- Summary Cards -->
    <div class="cari-summary-cards" id="cariSummaryCards">
      <div class="cari-card cari-card-total">
        <div class="cari-card-icon">${ic.users}</div>
        <div class="cari-card-content">
          <span class="cari-card-label">Toplam Müşteri</span>
          <span class="cari-card-value" id="totalCustomers">0</span>
        </div>
      </div>
      <div class="cari-card cari-card-borc">
        <div class="cari-card-icon">${ic.trendUp}</div>
        <div class="cari-card-content">
          <span class="cari-card-label">Toplam Borç</span>
          <span class="cari-card-value" id="totalBorc">₺0</span>
        </div>
      </div>
      <div class="cari-card cari-card-alacak">
        <div class="cari-card-icon">${ic.trendDown}</div>
        <div class="cari-card-content">
          <span class="cari-card-label">Toplam Alacak</span>
          <span class="cari-card-value" id="totalAlacak">₺0</span>
        </div>
      </div>
      <div class="cari-card cari-card-bakiye">
        <div class="cari-card-icon">${ic.dollarSign}</div>
        <div class="cari-card-content">
          <span class="cari-card-label">Net Bakiye</span>
          <span class="cari-card-value" id="totalBakiye">₺0</span>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="cari-main-content" id="cariMainContent">
      <!-- Customer List (Left) -->
      <div class="cari-customer-list-container">
        <div class="cari-customer-list-header">
          <h3>${ic.user} Müşteriler</h3>
          <span class="cari-customer-count" id="customerCount">0</span>
        </div>
        <div class="cari-customer-list" id="cariCustomerList">
          <div class="cari-loading-state">
            ${ic.noData}
            <p>${account ? 'Verileri yüklemek için ARA butonuna basın' : 'Hesap seçilmedi'}</p>
          </div>
        </div>
      </div>

      <!-- Detail Panel (Right) -->
      <div class="cari-detail-panel" id="cariDetailPanel">
        <div class="cari-detail-empty">
          ${ic.noData}
          <h3>Müşteri Seçin</h3>
          <p>Sol taraftaki listeden bir müşteri seçerek cari hareketlerini görüntüleyin</p>
        </div>
      </div>
    </div>
  `;

  // ── Event Bindings ──
  page.querySelector('#cariApplyBtn')?.addEventListener('click', () => loadCariData(page));
  page.querySelector('#cariSearchInput')?.addEventListener('input', () => filterCustomerList(page));

  // Sayfa açılır açılmaz verileri listele ki müşteriler ekranı boş kalmasın ve anlık filtreleme çalışsın
  setTimeout(() => loadCariData(page), 50);

  return page;
}

// ── Load Data ──
async function loadCariData(page) {
  const account = await getActiveAccount();
  if (!account) {
    allInvoices = [];
    allCollections = [];
    customerMap = {};
    selectedCustomer = null;
    cachedCariAccountId = '';
    showToast('Hesap seçilmedi, lütfen bir hesap seçin.', 'warning');
    return;
  }

  const accountId = account.id || '';
  const seq = ++cariLoadSeq;

  if (cachedCariAccountId && cachedCariAccountId !== accountId) {
    allInvoices = [];
    allCollections = [];
    customerMap = {};
    selectedCustomer = null;
  }
  cachedCariAccountId = accountId;

  currentSource = page.querySelector('#cariSourceFilter')?.value || 'giden';
  const dateStart = page.querySelector('#cariDateStart')?.value || '';
  const dateEnd = page.querySelector('#cariDateEnd')?.value || '';

  const customerListEl = page.querySelector('#cariCustomerList');
  if (customerListEl) {
    customerListEl.innerHTML = `
      <div class="cari-loading-state">
        <div style="animation:pulse 1.5s infinite">${ic.noData}</div>
        <p>Faturalar yükleniyor...</p>
        <p style="font-size:11px;color:var(--text-muted)">${account.name} · ${currentSource === 'giden' ? 'Giden Kutusu' : 'Gelen Kutusu'}</p>
      </div>`;
  }

  try {
    // Fetch all pages of invoices
    async function fetchAllPages(apiFn, baseParams) {
      let items = [];
      let pg = 1, totalPages = 1;
      do {
        const res = await apiFn({ ...baseParams, Page: pg, PageSize: 100 });
        if (!res.success) break;
        const pageItems = extractItems(res.data);
        items.push(...pageItems);
        totalPages = res.data?.TotalPages || 1;
        pg++;
      } while (pg <= totalPages && pg <= 20);
      return items;
    }

    let fetchedInvoices = [];

    if (currentSource === 'giden') {
      // Giden = Sales (E-Fatura + E-Arşiv)
      const [efRes, eaRes] = await Promise.allSettled([
        fetchAllPages(EInvoice.listSales, { StartDate: dateStart, EndDate: dateEnd }),
        fetchAllPages(EArchive.listInvoices, { StartDate: dateStart, EndDate: dateEnd })
      ]);
      if (efRes.status === 'fulfilled') fetchedInvoices.push(...efRes.value.map(i => ({ ...i, _source: 'efatura' })));
      if (eaRes.status === 'fulfilled') fetchedInvoices.push(...eaRes.value.map(i => ({ ...i, _source: 'earsiv' })));
    } else {
      // Gelen = Purchases
      const [efRes, eaRes] = await Promise.allSettled([
        fetchAllPages(EInvoice.listPurchases, { StartDate: dateStart, EndDate: dateEnd }),
        fetchAllPages(EArchive.listInvoices, { StartDate: dateStart, EndDate: dateEnd })
      ]);
      if (efRes.status === 'fulfilled') fetchedInvoices.push(...efRes.value.map(i => ({ ...i, _source: 'efatura' })));
      if (eaRes.status === 'fulfilled') fetchedInvoices.push(...eaRes.value.map(i => ({ ...i, _source: 'earsiv' })));
    }

    const fetchedCollections = await listCollections({
      accountId: account.id,
      startDate: dateStart,
      endDate: dateEnd
    });

    if (seq !== cariLoadSeq || cachedCariAccountId !== accountId) {
      return;
    }

    allInvoices = fetchedInvoices;
    allCollections = fetchedCollections;
    buildCustomerMap();
    renderCustomerList(page);
    renderSummaryCards(page);

    // Reset detail panel
    selectedCustomer = null;
    const detailPanel = page.querySelector('#cariDetailPanel');
    if (detailPanel) {
      detailPanel.innerHTML = `
        <div class="cari-detail-empty">
          ${ic.noData}
          <h3>Müşteri Seçin</h3>
          <p>Sol taraftaki listeden bir müşteri seçerek cari hareketlerini görüntüleyin</p>
        </div>`;
    }

    const searchInput = page.querySelector('#cariSearchInput');
    const searchValue = searchInput ? searchInput.value.trim() : '';
    
    if (searchValue) {
      showToast(`Arama tamamlandı: "${searchValue}" için sonuçlar listelendi.`, 'success');
    } else {
      showToast(`Veriler güncellendi: ${allInvoices.length} fatura, ${allCollections.length} tahsilat hareketi getirildi.`, 'success');
    }
  } catch (e) {
    if (seq !== cariLoadSeq || cachedCariAccountId !== accountId) {
      return;
    }
    console.error('Cari data load error:', e);
    showToast(`Veri yükleme hatası: ${e.message}`, 'error');
    if (customerListEl) {
      customerListEl.innerHTML = `
        <div class="cari-loading-state">
          ${ic.noData}
          <h3>Veri alınamadı</h3>
          <p>${e.message}</p>
        </div>`;
    }
  }
}

// ── Build Customer Map ──
function buildCustomerMap() {
  customerMap = {};

  allInvoices.forEach(inv => {
    const isGiden = currentSource === 'giden';
    const name = isGiden ? getReceiverName(inv) : getSenderName(inv);
    const taxNo = isGiden ? getReceiverTaxNo(inv) : getSenderTaxNo(inv);
    const key = getCustomerKey(name, taxNo);

    if (!key) return;

    if (!customerMap[key]) {
      customerMap[key] = {
        name: name || 'Bilinmeyen',
        taxNo: taxNo || '—',
        invoices: [],
        movements: [],
        invoiceCount: 0,
        tahsilatCount: 0,
        totalBorc: 0,
        totalAlacak: 0,
      };
    }

    // Use better name if available
    if (name && customerMap[key].name === 'Bilinmeyen') {
      customerMap[key].name = name;
    }

    const amount = parseFloat(getAmount(inv) || 0);

    if (isGiden) {
      // Giden = Satış faturası = Müşteriye borç yazılır
      customerMap[key].totalBorc += amount;
    } else {
      // Gelen = Alım faturası = Müşteriden alacak
      customerMap[key].totalAlacak += amount;
    }

    customerMap[key].invoices.push(inv);
    customerMap[key].invoiceCount += 1;
    customerMap[key].movements.push({
      _isCollection: false,
      date: getInvoiceDate(inv),
      type: isGiden ? 'Satış Faturası' : 'Alım Faturası',
      description: getInvoiceNumber(inv) ? `${customerMap[key].name} — ${getInvoiceNumber(inv)}` : (customerMap[key].name || 'Bilinmeyen Cari'),
      amount,
      borc: isGiden ? amount : 0,
      alacak: !isGiden ? amount : 0,
      raw: inv
    });
  });

  allCollections.forEach(col => {
    const name = col.customer_name || 'Bilinmeyen';
    const taxNo = col.customer_tax_no || '—';
    const key = col.customer_key || getCustomerKey(name, taxNo);

    if (!customerMap[key]) {
      customerMap[key] = {
        name,
        taxNo,
        invoices: [],
        movements: [],
        invoiceCount: 0,
        tahsilatCount: 0,
        totalBorc: 0,
        totalAlacak: 0,
      };
    }

    const amount = Number(col.amount) || 0;
    customerMap[key].totalAlacak += amount;
    customerMap[key].tahsilatCount += 1;
    customerMap[key].movements.push({
      _isCollection: true,
      date: col.date,
      type: col.type || 'Tahsilat',
      description: col.description || `${customerMap[key].name} tahsilat`,
      amount,
      borc: 0,
      alacak: amount,
      raw: col
    });
  });

  // Sort invoices by date within each customer
  Object.values(customerMap).forEach(c => {
    c.invoices.sort((a, b) => toTs(getInvoiceDate(b)) - toTs(getInvoiceDate(a)));
    c.movements.sort((a, b) => toTs(b.date) - toTs(a.date));
  });
}

// ── Render Customer List ──
function renderCustomerList(page) {
  const listEl = page.querySelector('#cariCustomerList');
  const countEl = page.querySelector('#customerCount');
  if (!listEl) return;

  const normalizeStr = (str) => {
    if (!str) return '';
    return str.toLocaleLowerCase('tr-TR')
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ş/g, 's')
      .replace(/ı/g, 'i')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c')
      .replace(/i̇/g, 'i');
  };

  const searchRaw = page.querySelector('#cariSearchInput')?.value || '';
  const search = normalizeStr(searchRaw).trim();

  const entries = Object.entries(customerMap)
    .filter(([key, c]) => {
      if (!search) return true;
      const nName = normalizeStr(c.name);
      const nTaxNo = normalizeStr(c.taxNo);
      const nKey = normalizeStr(key);
      return nName.includes(search) || nTaxNo.includes(search) || nKey.includes(search);
    })
    .sort((a, b) => (b[1].totalBorc + b[1].totalAlacak) - (a[1].totalBorc + a[1].totalAlacak));

  if (countEl) countEl.textContent = entries.length;

  if (entries.length === 0) {
    listEl.innerHTML = `
      <div class="cari-loading-state">
        ${ic.noData}
        <h3>Müşteri bulunamadı</h3>
        <p>${search ? 'Farklı bir arama deneyin' : 'Bu dönemde fatura verisi yok'}</p>
      </div>`;
    return;
  }

  listEl.innerHTML = entries.map(([key, customer]) => {
    const bakiye = customer.totalBorc - customer.totalAlacak;
    const bakiyeClass = bakiye > 0 ? 'cari-bakiye-positive' : bakiye < 0 ? 'cari-bakiye-negative' : 'cari-bakiye-zero';
    const tahsilatTotal = customer.totalAlacak || 0;
    const initials = customer.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase() || '??';

    return `
      <div class="cari-customer-item ${selectedCustomer === key ? 'active' : ''}" data-key="${key}">
        <div class="cari-customer-avatar">${initials}</div>
        <div class="cari-customer-info">
          <span class="cari-customer-name">${customer.name}</span>
          <span class="cari-customer-vkn">VKN: ${customer.taxNo}</span>
          <span class="cari-customer-meta">${customer.invoiceCount} fatura · ${customer.tahsilatCount} tahsilat · ${fmtCur(tahsilatTotal, 'TRY')}</span>
        </div>
        <div class="cari-customer-amounts">
          <span class="cari-customer-bakiye ${bakiyeClass}">${fmtCur(Math.abs(bakiye), 'TRY')}</span>
          <span class="cari-customer-bakiye-label">${bakiye > 0 ? 'Alacak' : bakiye < 0 ? 'Borçlu' : 'Dengede'}</span>
        </div>
      </div>`;
  }).join('');

  // Click events
  listEl.querySelectorAll('.cari-customer-item').forEach(item => {
    item.addEventListener('click', () => {
      const key = item.dataset.key;
      selectedCustomer = key;
      // Mark active
      listEl.querySelectorAll('.cari-customer-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      renderDetailPanel(page, customerMap[key], key);
    });
  });
}

function filterCustomerList(page) {
  renderCustomerList(page);
}

// ── Render Summary Cards ──
function renderSummaryCards(page) {
  const customers = Object.values(customerMap);
  let totalBorc = 0, totalAlacak = 0;
  customers.forEach(c => {
    totalBorc += c.totalBorc;
    totalAlacak += c.totalAlacak;
  });
  const bakiye = totalBorc - totalAlacak;

  const el = (id) => page.querySelector('#' + id);
  if (el('totalCustomers')) el('totalCustomers').textContent = customers.length;
  if (el('totalBorc')) el('totalBorc').textContent = fmtCur(totalBorc, 'TRY');
  if (el('totalAlacak')) el('totalAlacak').textContent = fmtCur(totalAlacak, 'TRY');
  if (el('totalBakiye')) {
    el('totalBakiye').textContent = fmtCur(Math.abs(bakiye), 'TRY');
    el('totalBakiye').style.color = bakiye > 0 ? 'var(--success)' : bakiye < 0 ? 'var(--danger)' : 'var(--text-primary)';
  }
}

// ── Render Detail Panel ──
function renderDetailPanel(page, customer, key) {
  const panel = page.querySelector('#cariDetailPanel');
  if (!panel) return;

  const bakiye = customer.totalBorc - customer.totalAlacak;
  const bakiyeClass = bakiye > 0 ? 'cari-bakiye-positive' : bakiye < 0 ? 'cari-bakiye-negative' : 'cari-bakiye-zero';

  // Liste en yeni -> en eski sıralı olduğu için ilk satır güncel toplam bakiyeyi göstermelidir.
  let runningBakiye = bakiye;
  const movementViews = customer.movements.map((mv) => {
    const isCollection = !!mv._isCollection;
    const date = mv.date;
    const borc = Number(mv.borc || 0);
    const alacak = Number(mv.alacak || 0);
    const bakiyeAtRow = runningBakiye;
    const bakiyeRowClass = bakiyeAtRow > 0 ? 'cari-bakiye-positive' : bakiyeAtRow < 0 ? 'cari-bakiye-negative' : '';
    const badgeClass = isCollection ? 'badge-success' : (currentSource === 'giden' ? 'badge-info' : 'badge-warning');
    const turText = mv.type || (isCollection ? 'Tahsilat' : (currentSource === 'giden' ? 'Satış Faturası' : 'Alım Faturası'));
    const aciklama = mv.description || (customer.name || 'Bilinmeyen Cari');
    const collectionActions = isCollection && mv.raw?.id
      ? `<div class="cari-movement-actions">
          <button class="btn btn-sm btn-secondary" data-action="edit-collection" data-collection-id="${mv.raw.id}">Duzenle</button>
          <button class="btn btn-sm btn-danger" data-action="delete-collection" data-collection-id="${mv.raw.id}">Sil</button>
        </div>`
      : '';

    const view = {
      date,
      borc,
      alacak,
      runningBakiye: bakiyeAtRow,
      turText,
      aciklama,
      badgeClass,
      bakiyeRowClass,
      collectionActions,
    };

    // Bir sonraki (daha eski) satıra geçerken mevcut hareket etkisini geri al.
    runningBakiye -= (borc - alacak);

    return view;
  });

    const rows = movementViews.map((mv) => `<tr>
      <td data-label="Tarih">${fmtDate(mv.date)}</td>
      <td data-label="Tür"><span class="badge ${mv.badgeClass}">${mv.turText}</span></td>
      <td data-label="Fatura No / Aç.">${mv.aciklama}${mv.collectionActions}</td>
      <td data-label="Borç (Satış)" class="cari-col-borc">${mv.borc > 0 ? fmtCur(mv.borc, 'TRY') : ''}</td>
      <td data-label="Alacak (Tahs.)" class="cari-col-alacak">${mv.alacak > 0 ? fmtCur(mv.alacak, 'TRY') : ''}</td>
      <td data-label="Bakiye" class="${mv.bakiyeRowClass}" style="font-weight:600">${fmtCur(Math.abs(mv.runningBakiye), 'TRY')}</td>
    </tr>`).join('');

  const mobileCards = movementViews.map((mv) => `
    <article class="cari-movement-card">
      <div class="cari-movement-top">
        <span class="cari-movement-date">${fmtDate(mv.date)}</span>
        <span class="badge ${mv.badgeClass}">${mv.turText}</span>
      </div>
      <div class="cari-movement-desc">${mv.aciklama}</div>
      <div class="cari-movement-amounts">
        <div class="cari-movement-pill">
          <span class="cari-movement-pill-label">Borç</span>
          <span class="cari-movement-pill-value cari-col-borc">${mv.borc > 0 ? fmtCur(mv.borc, 'TRY') : '—'}</span>
        </div>
        <div class="cari-movement-pill">
          <span class="cari-movement-pill-label">Alacak</span>
          <span class="cari-movement-pill-value cari-col-alacak">${mv.alacak > 0 ? fmtCur(mv.alacak, 'TRY') : '—'}</span>
        </div>
        <div class="cari-movement-pill">
          <span class="cari-movement-pill-label">Bakiye</span>
          <span class="cari-movement-pill-value ${mv.bakiyeRowClass}">${fmtCur(Math.abs(mv.runningBakiye), 'TRY')}</span>
        </div>
      </div>
      ${mv.collectionActions}
    </article>
  `).join('');

  panel.innerHTML = `
    <div class="cari-detail-header">
      <div class="cari-detail-title">
        <h3>${customer.name}</h3>
        <span class="cari-detail-vkn">VKN: ${customer.taxNo}</span>
      </div>
      <div class="cari-detail-actions">
        <button class="btn btn-sm btn-warning" id="toggleTahsilatFormBtn">
          + Tahsilat Ekle
        </button>
        <button class="btn btn-sm btn-success" id="exportCariBtn">
          ${ic.download} Excel'e Aktar
        </button>
      </div>
    </div>

    <div id="tahsilatFormWrap" class="cari-tahsilat-form" style="display:none;">
      <div class="cari-tahsilat-grid">
        <div>
          <label class="cari-tahsilat-label">Tarih</label>
          <input type="date" id="tahsilatDate" class="form-input" value="${new Date().toISOString().slice(0, 10)}" />
        </div>
        <div>
          <label class="cari-tahsilat-label">Tür</label>
          <input type="text" id="tahsilatType" class="form-input" value="Tahsilat" />
        </div>
        <div>
          <label class="cari-tahsilat-label">Tutar (TRY)</label>
          <input type="text" inputmode="decimal" id="tahsilatAmount" class="form-input cari-amount-input" placeholder="0" />
        </div>
        <div class="cari-tahsilat-full">
          <label class="cari-tahsilat-label">Açıklama</label>
          <input type="text" id="tahsilatDesc" class="form-input" placeholder="Orn: Nakit tahsilat" />
        </div>
      </div>
      <div class="cari-tahsilat-actions">
        <button class="btn btn-sm btn-secondary" id="cancelTahsilatBtn">Vazgec</button>
        <button class="btn btn-sm btn-primary" id="saveTahsilatBtn">Kaydet</button>
      </div>
    </div>

    <!-- Customer Summary -->
    <div class="cari-detail-summary">
      <div class="cari-detail-stat">
        <span class="cari-detail-stat-label">Fatura Sayısı</span>
        <span class="cari-detail-stat-value">${customer.invoiceCount}</span>
      </div>
      <div class="cari-detail-stat">
        <span class="cari-detail-stat-label">Tahsilat Sayısı</span>
        <span class="cari-detail-stat-value">${customer.tahsilatCount}</span>
      </div>
      <div class="cari-detail-stat">
        <span class="cari-detail-stat-label">Toplam Borç (Satış)</span>
        <span class="cari-detail-stat-value" style="color:var(--info)">${fmtCur(customer.totalBorc, 'TRY')}</span>
      </div>
      <div class="cari-detail-stat">
        <span class="cari-detail-stat-label">Toplam Alacak (Tahsilat)</span>
        <span class="cari-detail-stat-value" style="color:var(--success)">${fmtCur(customer.totalAlacak, 'TRY')}</span>
      </div>
      <div class="cari-detail-stat">
        <span class="cari-detail-stat-label">Bakiye</span>
        <span class="cari-detail-stat-value ${bakiyeClass}">${fmtCur(Math.abs(bakiye), 'TRY')} ${bakiye > 0 ? '(Alacak)' : bakiye < 0 ? '(Borçlu)' : ''}</span>
      </div>
    </div>

    <!-- Hareket Tablosu -->
    <div class="cari-mobile-movements">
      ${mobileCards || '<div class="cari-loading-state"><p>Hareket bulunamadi</p></div>'}
    </div>

    <div class="cari-detail-table-wrap">
      <table class="cari-detail-table">
        <thead>
          <tr>
            <th>Tarih</th>
            <th>Tür</th>
            <th>Fatura No / Açıklama</th>
            <th>Borç (Satış)</th>
            <th>Alacak (Tahsilat)</th>
            <th>Bakiye</th>
          </tr>
        </thead>
        <tbody>${rows || '<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--text-muted)">Hareket bulunamadı</td></tr>'}</tbody>
      </table>
    </div>
  `;

  let editingCollectionId = null;
  const tahsilatDateInput = panel.querySelector('#tahsilatDate');
  attachDatePicker(tahsilatDateInput);

  const amountInput = panel.querySelector('#tahsilatAmount');
  amountInput?.addEventListener('input', (e) => {
    const cursorAtEnd = e.target.selectionStart === e.target.value.length;
    const formatted = formatAmountInput(e.target.value);
    e.target.value = formatted;
    if (cursorAtEnd) {
      e.target.setSelectionRange(formatted.length, formatted.length);
    }
  });

  const tahsilatWrap = panel.querySelector('#tahsilatFormWrap');
  const saveBtn = panel.querySelector('#saveTahsilatBtn');

  const resetTahsilatForm = () => {
    editingCollectionId = null;
    const today = new Date().toISOString().slice(0, 10);
    if (tahsilatDateInput?._flatpickr) {
      tahsilatDateInput._flatpickr.setDate(today, true, 'Y-m-d');
    } else if (tahsilatDateInput) {
      tahsilatDateInput.value = today;
    }
    if (panel.querySelector('#tahsilatType')) panel.querySelector('#tahsilatType').value = 'Tahsilat';
    if (panel.querySelector('#tahsilatAmount')) panel.querySelector('#tahsilatAmount').value = '';
    if (panel.querySelector('#tahsilatDesc')) panel.querySelector('#tahsilatDesc').value = '';
    if (saveBtn) saveBtn.textContent = 'Kaydet';
  };

  const openEditForm = (collectionId) => {
    const movement = customer.movements.find((mv) => mv._isCollection && mv.raw?.id === collectionId);
    if (!movement) return;
    editingCollectionId = collectionId;
    if (tahsilatDateInput?._flatpickr) {
      tahsilatDateInput._flatpickr.setDate(movement.date || '', true, 'Y-m-d');
    } else if (tahsilatDateInput) {
      tahsilatDateInput.value = movement.date || '';
    }
    if (panel.querySelector('#tahsilatType')) panel.querySelector('#tahsilatType').value = movement.type || 'Tahsilat';
    if (panel.querySelector('#tahsilatAmount')) panel.querySelector('#tahsilatAmount').value = formatAmountInput(movement.alacak || movement.amount || 0);
    if (panel.querySelector('#tahsilatDesc')) panel.querySelector('#tahsilatDesc').value = movement.description || '';
    if (saveBtn) saveBtn.textContent = 'Guncelle';
    if (tahsilatWrap) tahsilatWrap.style.display = 'block';
  };

  const confirmDeleteModal = () => new Promise((resolve) => {
    const body = document.createElement('div');
    body.innerHTML = `
      <p style="margin:0; color: var(--text-secondary); line-height:1.5;">
        Bu tahsilat kaydi kalici olarak silinecek. Devam etmek istiyor musunuz?
      </p>
    `;

    const footer = document.createElement('div');
    footer.style.cssText = 'display:flex; gap:10px; justify-content:flex-end; width:100%';
    footer.innerHTML = `
      <button class="btn btn-secondary" id="cancelDeleteCollectionBtn">Vazgec</button>
      <button class="btn btn-danger" id="confirmDeleteCollectionBtn">Sil</button>
    `;

    let settled = false;
    const settle = (val) => {
      if (settled) return;
      settled = true;
      resolve(val);
    };

    const modal = showModal({
      title: 'Tahsilat Kaydini Sil',
      body,
      footer,
      onClose: () => settle(false)
    });

    footer.querySelector('#cancelDeleteCollectionBtn')?.addEventListener('click', () => {
      settle(false);
      modal?.close?.();
    });

    footer.querySelector('#confirmDeleteCollectionBtn')?.addEventListener('click', () => {
      settle(true);
      modal?.close?.();
    });
  });

  panel.querySelector('#toggleTahsilatFormBtn')?.addEventListener('click', () => {
    if (!tahsilatWrap) return;
    tahsilatWrap.style.display = tahsilatWrap.style.display === 'none' ? 'block' : 'none';
    if (tahsilatWrap.style.display === 'none') resetTahsilatForm();
  });
  panel.querySelector('#cancelTahsilatBtn')?.addEventListener('click', () => {
    if (tahsilatWrap) tahsilatWrap.style.display = 'none';
    resetTahsilatForm();
  });

  panel.querySelectorAll('[data-action="edit-collection"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const collectionId = btn.getAttribute('data-collection-id');
      if (!collectionId) return;
      openEditForm(collectionId);
    });
  });

  panel.querySelectorAll('[data-action="delete-collection"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const collectionId = btn.getAttribute('data-collection-id');
      if (!collectionId) return;
      const confirmed = await confirmDeleteModal();
      if (!confirmed) return;

      try {
        const accountId = (await getActiveAccount())?.id;
        if (!accountId) throw new Error('Aktif hesap bulunamadi.');
        await deleteCollection(collectionId, accountId);
        showToast('Tahsilat silindi.', 'success');
        await loadCariData(page);
        if (customerMap[key]) {
          selectedCustomer = key;
          renderDetailPanel(page, customerMap[key], key);
        }
      } catch (e) {
        showToast(`Tahsilat silinemedi: ${e.message}`, 'error');
      }
    });
  });

  panel.querySelector('#saveTahsilatBtn')?.addEventListener('click', async () => {
    try {
      const accountId = (await getActiveAccount())?.id;
      const date = panel.querySelector('#tahsilatDate')?.value || '';
      const type = panel.querySelector('#tahsilatType')?.value?.trim() || 'Tahsilat';
      const amountRaw = panel.querySelector('#tahsilatAmount')?.value || '';
      const description = panel.querySelector('#tahsilatDesc')?.value?.trim() || `${customer.name} tahsilat`;
      const amount = parseAmountInput(amountRaw);

      if (!accountId) throw new Error('Aktif hesap bulunamadı.');
      if (!date) throw new Error('Tarih zorunludur.');
      if (!amount || amount <= 0) throw new Error('Geçerli bir tutar girin.');

      let savedCollection = null;

      if (editingCollectionId) {
        savedCollection = await updateCollection(editingCollectionId, accountId, {
          type,
          description,
          amount,
          date
        });
        showToast('Tahsilat guncellendi.', 'success');
      } else {
        savedCollection = await addCollection({
          account_id: accountId,
          customer_key: key,
          customer_name: customer.name,
          customer_tax_no: customer.taxNo,
          type,
          description,
          amount,
          date
        });
        showToast('Tahsilat kaydedildi.', 'success');
      }

      if (savedCollection?.id) {
        const idx = allCollections.findIndex((c) => c.id === savedCollection.id);
        if (idx >= 0) allCollections[idx] = savedCollection;
        else allCollections.push(savedCollection);
      }

      buildCustomerMap();
      renderCustomerList(page);
      renderSummaryCards(page);

      resetTahsilatForm();
      if (customerMap[key]) {
        selectedCustomer = key;
        renderDetailPanel(page, customerMap[key], key);
      }
    } catch (e) {
      showToast(`Tahsilat kaydedilemedi: ${e.message}`, 'error');
    }
  });

  // Export button
  panel.querySelector('#exportCariBtn')?.addEventListener('click', async () => {
    try {
      showToast('Cari defter hazırlanıyor...', 'info');
      const result = await exportCustomerCari(customer.movements, customer.name, currentSource);
      if (result.success) {
        showToast(`${customer.name} — ${result.count} hareket Excel'e aktarıldı`, 'success');
      } else {
        showToast(`Hata: ${result.error}`, 'error');
      }
    } catch (e) {
      showToast(`Bir hata oluştu: ${e.message}`, 'error');
      console.error(e);
    }
  });
}
