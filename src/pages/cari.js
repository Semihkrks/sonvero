import {rememberExportPeriod,exportPeriod} from '../lib/export-context.js';
import { invoiceLedgerAmount, addAmount, isExcludedInvoice } from '../lib/ledger-finance.js';
import { parseTurkishAmount, istanbulDate, defaultFilterRange, Decimal } from '../lib/money.js';
import { escapeHtml } from '../lib/html.js';
// ══════════════════════════════════════════
// Canlı Cari Sistemi — Müşteri Bazlı Cari Takip
// ══════════════════════════════════════════
import { EInvoice, EArchive, EInvoiceWithAccount, EArchiveWithAccount } from '../api/nilvera.js';
import { fetchInvoicesSmart } from '../services/invoice-archive.js';
import { showToast } from '../components/toast.js';
import { showModal } from '../components/modal.js';
import { attachDatePicker } from '../lib/date-picker.js';
import { getActiveAccount, getActiveAccountId } from '../services/account-manager.js';
import { registerCacheReset } from '../router.js';
import { exportCustomerCari } from '../services/cari-export-worker-client.js';
import {groupReportItems} from '../services/report-data.js';
import {previewReport} from '../components/report-send.js';
import { addCollection, listCollections, updateCollection, deleteCollection } from '../services/tahsilat-manager.js';
import { parseUserAmount, formatUserAmount, isDecimalInProgress } from '../services/bank-statement-parser.js';

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
function isRejected(inv) { return isExcludedInvoice(inv); }

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

function parseAmountInput(value) { return Number(parseTurkishAmount(value)); }

function formatAmountInput(value) {
  return formatUserAmount(value);
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

// ── Default date range: yıl başı → ayın sonu ──
function getDefaultRange() {
  return defaultFilterRange();
}

// ── State ──
let allInvoices = [];
let allCollections = [];
let customerMap = {};  // { customerKey: { name, taxNo, invoices: [], totalBorc, totalAlacak } }
let selectedCustomer = null;
let currentSource = 'tumu'; // 'tumu' (giden+gelen) | 'giden' | 'gelen'
let cachedCariAccountId = '';
let cariLoadSeq = 0;
let cariAbort = null;

function resetCariCache() {
  allInvoices = [];
  allCollections = [];
  customerMap = {};
  cariLoadSeq++;
  selectedCustomer = null;
  cachedCariAccountId = '';
  if (cariAbort) { try { cariAbort.abort(); } catch {} cariAbort = null; }
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
          <option value="tumu" selected>Tümü (Giden + Gelen)</option>
          <option value="giden">Giden Kutusu (Satış)</option>
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
      <div class="filter-actions">
        <span class="filter-label filter-actions-spacer" aria-hidden="true">&nbsp;</span>
        <div class="filter-actions-row">
          <button type="button" class="btn btn-sm btn-primary" id="cariApplyBtn">${ic.search} ARA</button>
          <button type="button" class="btn btn-sm btn-warning" id="cariImportBtn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            Toplu Tahsilat
          </button>
        </div>
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

  page.querySelector('#cariImportBtn')?.addEventListener('click', () => {
    window.location.hash = '#/toplu-tahsilat';
  });

  // Sayfa açılır açılmaz verileri listele ki müşteriler ekranı boş kalmasın ve anlık filtreleme çalışsın
  setTimeout(() => loadCariData(page), 50);

  return page;
}

// ── Load Data ──
async function loadCariData(page) {
  const account = getActiveAccount();
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

  if (cariAbort) { try { cariAbort.abort(); } catch {} }
  cariAbort = new AbortController();
  const signal = cariAbort.signal;

  if (cachedCariAccountId && cachedCariAccountId !== accountId) {
    allInvoices = [];
    allCollections = [];
    customerMap = {};
    selectedCustomer = null;
  }
  cachedCariAccountId = accountId;

  currentSource = page.querySelector('#cariSourceFilter')?.value || 'tumu';
  const dateStart = page.querySelector('#cariDateStart')?.value || '';
  const dateEnd = page.querySelector('#cariDateEnd')?.value || '';

  const customerListEl = page.querySelector('#cariCustomerList');
  if (customerListEl) {
    customerListEl.innerHTML = `
      <div class="cari-loading-state">
        <div style="animation:pulse 1.5s infinite">${ic.noData}</div>
        <p>Faturalar yükleniyor...</p>
        <p style="font-size:11px;color:var(--text-muted)">${account.name} · ${currentSource === 'tumu' ? 'Giden + Gelen' : (currentSource === 'giden' ? 'Giden Kutusu' : 'Gelen Kutusu')}</p>
      </div>`;
  }

  try {
    // Akıllı fetch: 6 aydan uzun aralıklar otomatik dilimlenir (chunking),
    // kesinleşmiş aylar Supabase arşivinden okunur, son dönem API'den taze gelir.
    let fetchedInvoices = [];
    const wantGiden = currentSource === 'giden' || currentSource === 'tumu';
    const wantGelen = currentSource === 'gelen' || currentSource === 'tumu';

    // Her faturayı yönüyle (_direction) etiketliyoruz: giden=satış (borç), gelen=alım (alacak).
    // Böylece bir müşterinin hem giden hem gelen faturaları aynı cari'de birleşir.
    const tasks = [];
    if (wantGiden) {
      // Giden = Satış (E-Fatura Sale + E-Arşiv — e-arşiv daima giden/satıştır)
      tasks.push(fetchInvoicesSmart(EInvoiceWithAccount.listSales, account, 'efatura_sale', { StartDate: dateStart, EndDate: dateEnd }, { signal })
        .then(r => r.map(i => ({ ...i, _source: 'efatura', _direction: 'giden' }))));
      tasks.push(fetchInvoicesSmart(EArchiveWithAccount.listInvoices, account, 'earsiv', { StartDate: dateStart, EndDate: dateEnd }, { signal })
        .then(r => r.map(i => ({ ...i, _source: 'earsiv', _direction: 'giden' }))));
    }
    if (wantGelen) {
      // Gelen = Alım (E-Fatura Purchase)
      tasks.push(fetchInvoicesSmart(EInvoiceWithAccount.listPurchases, account, 'efatura_purchase', { StartDate: dateStart, EndDate: dateEnd }, { signal })
        .then(r => r.map(i => ({ ...i, _source: 'efatura', _direction: 'gelen' }))));
    }

    const results = await Promise.allSettled(tasks);
    results.forEach(res => {
      if (res.status === 'fulfilled' && Array.isArray(res.value)) for(const invoice of res.value)fetchedInvoices.push(invoice);
    });

    let fetchedCollections = [];
    let collectionError = null;
    try {
      fetchedCollections = await listCollections({
        accountId: account.id,
        startDate: dateStart,
        endDate: dateEnd
      });
    } catch (err) {
      collectionError = err;
      console.error('Cari tahsilat yükleme:', err);
    }

    if (seq !== cariLoadSeq || cachedCariAccountId !== accountId || getActiveAccountId() !== accountId) {
      return;
    }

    rememberExportPeriod(page,{start:dateStart,end:dateEnd,complete:!collectionError&&results.every(result=>result.status==='fulfilled')});
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
    
    if(results.some(result=>result.status==='rejected'))showToast('Bazı fatura kaynakları yüklenemedi. Görünen bakiye eksiktir; Ara ile tekrar deneyin.','warning');
    if (collectionError) {
      showToast(`Faturalar geldi ama tahsilatlar yüklenemedi: ${collectionError.message}. ARA ile tekrar deneyin.`, 'warning');
    } else if (searchValue) {
      showToast(`Arama tamamlandı: "${searchValue}" için sonuçlar listelendi.`, 'success');
    } else {
      showToast(`Veriler güncellendi: ${allInvoices.length} fatura, ${allCollections.length} tahsilat hareketi getirildi.`, 'success');
    }
  } catch (e) {
    if (seq !== cariLoadSeq || cachedCariAccountId !== accountId || getActiveAccountId() !== accountId) {
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
    // Reddedilen faturalar cari hesabına dahil edilmez (bakiyeyi şişirir).
    if (isRejected(inv) || invoiceLedgerAmount(inv) === null) return;

    // Yön faturanın kendi etiketinden gelir (_direction). 'tumu' modunda her fatura
    // kendi yönüne göre işlenir: giden→alıcı/borç, gelen→gönderici/alacak.
    const isGiden = (inv._direction || currentSource) === 'giden';
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

    const amount = Number(invoiceLedgerAmount(inv));

    if (isGiden) {
      // Giden = Satış faturası = Müşteriye borç yazılır
      customerMap[key].totalBorc = new Decimal(customerMap[key].totalBorc).plus(amount).toNumber();
    } else {
      // Gelen = Alım faturası = Müşteriden alacak
      customerMap[key].totalAlacak = new Decimal(customerMap[key].totalAlacak).plus(amount).toNumber();
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

  const foldKey = (s) => String(s || '')
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .trim();
  const keyByFold = {};
  Object.entries(customerMap).forEach(([k, c]) => {
    keyByFold[foldKey(k)] = keyByFold[foldKey(k)] || k;
    if (c.name && c.name !== 'Bilinmeyen') keyByFold[foldKey(c.name)] = keyByFold[foldKey(c.name)] || k;
  });

  allCollections.forEach(col => {
    const name = col.customer_name || 'Bilinmeyen';
    const taxNo = col.customer_tax_no || '—';
    let key = col.customer_key || getCustomerKey(name, taxNo);
    if (!customerMap[key]) {
      key = keyByFold[foldKey(key)]
        || (col.customer_tax_no && keyByFold[foldKey(col.customer_tax_no)])
        || keyByFold[foldKey(name)]
        || key;
    }

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
    customerMap[key].totalAlacak = new Decimal(customerMap[key].totalAlacak).plus(amount).toNumber();
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
      <div class="cari-customer-item ${selectedCustomer === key ? 'active' : ''}" data-key="${escapeHtml(key)}">
        <div class="cari-customer-avatar">${escapeHtml(initials)}</div>
        <div class="cari-customer-info">
          <span class="cari-customer-name">${escapeHtml(customer.name)}</span>
          <span class="cari-customer-vkn">VKN: ${escapeHtml(customer.taxNo)}</span>
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
      const key = item.getAttribute('data-key');
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

  const invoiceMoves = customer.movements.filter((mv) => !mv._isCollection);
  const tahsilatMoves = customer.movements.filter((mv) => mv._isCollection);

  const invoiceRows = invoiceMoves.map((mv) => {
    const borc = Number(mv.borc || 0);
    const alacak = Number(mv.alacak || 0);
    const badgeClass = mv.type?.includes('Alım') || currentSource === 'gelen' ? 'badge-warning' : 'badge-info';
    const turText = escapeHtml(mv.type || 'Satış Faturası');
    const aciklama = escapeHtml(mv.description || customer.name || 'Bilinmeyen Cari');
    return `<tr>
      <td data-label="Tarih">${fmtDate(mv.date)}</td>
      <td data-label="Tür"><span class="badge ${badgeClass}">${turText}</span></td>
      <td data-label="Fatura No">${aciklama}</td>
      <td data-label="Borç" class="cari-num cari-col-borc">${borc > 0 ? fmtCur(borc, 'TRY') : ''}</td>
      <td data-label="Alacak" class="cari-num cari-col-alacak">${alacak > 0 ? fmtCur(alacak, 'TRY') : ''}</td>
    </tr>`;
  }).join('');

  const tahsilatRows = tahsilatMoves.map((mv) => {
    const alacak = Number(mv.alacak || 0);
    const aciklama = escapeHtml(mv.description || 'Tahsilat');
    const id = mv.raw?.id ? escapeHtml(String(mv.raw.id)) : '';
    const actions = id
      ? `<div class="cari-row-actions">
          <button type="button" class="btn btn-sm btn-secondary" data-action="edit-collection" data-collection-id="${id}">Düzenle</button>
          <button type="button" class="btn btn-sm btn-danger" data-action="delete-collection" data-collection-id="${id}">Sil</button>
        </div>`
      : '<span class="cari-row-actions-empty">—</span>';
    return `<tr>
      <td data-label="Tarih">${fmtDate(mv.date)}</td>
      <td data-label="Tür"><span class="badge badge-success">${escapeHtml(mv.type || 'Tahsilat')}</span></td>
      <td data-label="Açıklama">${aciklama}</td>
      <td data-label="Tutar" class="cari-num cari-col-alacak">${alacak > 0 ? fmtCur(alacak, 'TRY') : ''}</td>
      <td data-label="İşlem" class="cari-col-actions">${actions}</td>
    </tr>`;
  }).join('');

  const invoiceCards = invoiceMoves.map((mv) => {
    const borc = Number(mv.borc || 0);
    const alacak = Number(mv.alacak || 0);
    return `<article class="cari-movement-card">
      <div class="cari-movement-top">
        <span class="cari-movement-date">${fmtDate(mv.date)}</span>
        <span class="badge badge-info">${escapeHtml(mv.type || 'Fatura')}</span>
      </div>
      <div class="cari-movement-desc">${escapeHtml(mv.description || '')}</div>
      <div class="cari-movement-amounts">
        <div class="cari-movement-pill"><span class="cari-movement-pill-label">Borç</span><span class="cari-movement-pill-value">${borc > 0 ? fmtCur(borc, 'TRY') : '—'}</span></div>
        <div class="cari-movement-pill"><span class="cari-movement-pill-label">Alacak</span><span class="cari-movement-pill-value">${alacak > 0 ? fmtCur(alacak, 'TRY') : '—'}</span></div>
      </div>
    </article>`;
  }).join('');

  const tahsilatCards = tahsilatMoves.map((mv) => {
    const alacak = Number(mv.alacak || 0);
    const id = mv.raw?.id ? escapeHtml(String(mv.raw.id)) : '';
    const actions = id
      ? `<div class="cari-row-actions">
          <button type="button" class="btn btn-sm btn-secondary" data-action="edit-collection" data-collection-id="${id}">Düzenle</button>
          <button type="button" class="btn btn-sm btn-danger" data-action="delete-collection" data-collection-id="${id}">Sil</button>
        </div>`
      : '';
    return `<article class="cari-movement-card">
      <div class="cari-movement-top">
        <span class="cari-movement-date">${fmtDate(mv.date)}</span>
        <span class="badge badge-success">${escapeHtml(mv.type || 'Tahsilat')}</span>
      </div>
      <div class="cari-movement-desc">${escapeHtml(mv.description || '')}</div>
      <div class="cari-movement-amounts">
        <div class="cari-movement-pill"><span class="cari-movement-pill-label">Tutar</span><span class="cari-movement-pill-value">${alacak > 0 ? fmtCur(alacak, 'TRY') : '—'}</span></div>
      </div>
      ${actions}
    </article>`;
  }).join('');

  panel.innerHTML = `
    <div class="cari-detail-header">
      <div class="cari-detail-title">
        <h3>${escapeHtml(customer.name)}</h3>
        <span class="cari-detail-vkn">VKN: ${escapeHtml(customer.taxNo)}</span>
      </div>
      <div class="cari-detail-actions">
        <button class="btn btn-sm btn-warning" id="toggleTahsilatFormBtn">+ Tahsilat Ekle</button>
        <button class="btn btn-sm btn-success" id="exportCariBtn">${ic.download} Excel'e Aktar</button>
        <button class="btn btn-sm btn-primary" id="cariWhatsAppBtn" type="button">WhatsApp’a gönder</button>
      </div>
    </div>

    <div id="tahsilatFormWrap" class="cari-tahsilat-form" hidden>
      <div class="cari-tahsilat-form-head">
        <div>
          <h4>Yeni Tahsilat</h4>
          <p>Bu cariye TRY tahsilat kaydı ekleyin.</p>
        </div>
      </div>
      <div class="cari-tahsilat-grid">
        <div>
          <label class="cari-tahsilat-label" for="tahsilatDate">Tarih</label>
          <input type="date" id="tahsilatDate" class="form-input" value="${istanbulDate()}" />
        </div>
        <div>
          <label class="cari-tahsilat-label" for="tahsilatType">Tür</label>
          <input type="text" id="tahsilatType" class="form-input" value="Tahsilat" />
        </div>
        <div>
          <label class="cari-tahsilat-label" for="tahsilatAmount">Tutar (TRY)</label>
          <input type="text" inputmode="decimal" id="tahsilatAmount" class="form-input cari-amount-input" placeholder="0,00" />
        </div>
        <div class="cari-tahsilat-full">
          <label class="cari-tahsilat-label" for="tahsilatDesc">Açıklama</label>
          <input type="text" id="tahsilatDesc" class="form-input" placeholder="Örn: Nakit tahsilat / Havale" />
        </div>
      </div>
      <div class="cari-tahsilat-actions">
        <button type="button" class="btn btn-sm btn-secondary" id="cancelTahsilatBtn">Vazgeç</button>
        <button type="button" class="btn btn-sm btn-primary" id="saveTahsilatBtn">Kaydet</button>
      </div>
    </div>

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
        <span class="cari-detail-stat-value" style="color:var(--warning)">${fmtCur(customer.totalBorc, 'TRY')}</span>
      </div>
      <div class="cari-detail-stat">
        <span class="cari-detail-stat-label">Toplam Alacak (Alım + Tahsilat)</span>
        <span class="cari-detail-stat-value" style="color:var(--success)">${fmtCur(customer.totalAlacak, 'TRY')}</span>
      </div>
      <div class="cari-detail-stat">
        <span class="cari-detail-stat-label">Bakiye</span>
        <span class="cari-detail-stat-value ${bakiyeClass}">${fmtCur(Math.abs(bakiye), 'TRY')} ${bakiye > 0 ? '(Alacak)' : bakiye < 0 ? '(Borçlu)' : ''}</span>
      </div>
    </div>

    <div class="cari-tabs" role="tablist" aria-label="Hareket türü">
      <button type="button" class="cari-tab active" role="tab" aria-selected="true" data-cari-tab="faturalar">
        Faturalar <span class="cari-tab-count">${invoiceMoves.length}</span>
      </button>
      <button type="button" class="cari-tab" role="tab" aria-selected="false" data-cari-tab="tahsilatlar">
        Tahsilatlar <span class="cari-tab-count">${tahsilatMoves.length}</span>
      </button>
    </div>

    <section class="cari-tab-panel active" data-cari-panel="faturalar" role="tabpanel" aria-label="Faturalar">
      <div class="cari-mobile-movements">${invoiceCards || '<div class="cari-section-empty">Bu dönemde fatura yok</div>'}</div>
      <div class="cari-detail-table-wrap">
        <table class="cari-detail-table">
          <thead><tr><th>Tarih</th><th>Tür</th><th>Fatura No</th><th class="cari-num">Borç</th><th class="cari-num">Alacak</th></tr></thead>
          <tbody>${invoiceRows || '<tr><td colspan="5" class="cari-section-empty">Bu dönemde fatura yok</td></tr>'}</tbody>
        </table>
      </div>
    </section>

    <section class="cari-tab-panel" data-cari-panel="tahsilatlar" role="tabpanel" aria-label="Tahsilatlar" hidden>
      <div class="cari-mobile-movements">${tahsilatCards || '<div class="cari-section-empty">Bu dönemde tahsilat yok</div>'}</div>
      <div class="cari-detail-table-wrap">
        <table class="cari-detail-table">
          <thead><tr><th>Tarih</th><th>Tür</th><th>Açıklama</th><th class="cari-num">Tutar</th><th class="cari-col-actions">İşlem</th></tr></thead>
          <tbody>${tahsilatRows || '<tr><td colspan="5" class="cari-section-empty">Bu dönemde tahsilat yok</td></tr>'}</tbody>
        </table>
      </div>
    </section>
  `;

  panel.querySelectorAll('[data-cari-tab]').forEach((tab) => {
    tab.addEventListener('click', () => {
      const name = tab.getAttribute('data-cari-tab');
      panel.querySelectorAll('[data-cari-tab]').forEach((t) => {
        const on = t === tab;
        t.classList.toggle('active', on);
        t.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      panel.querySelectorAll('[data-cari-panel]').forEach((p) => {
        const on = p.getAttribute('data-cari-panel') === name;
        p.classList.toggle('active', on);
        p.hidden = !on;
      });
    });
  });

  let editingCollectionId = null;
  const tahsilatDateInput = panel.querySelector('#tahsilatDate');
  attachDatePicker(tahsilatDateInput);

  const amountInput = panel.querySelector('#tahsilatAmount');
  amountInput?.addEventListener('input', (e) => {
    const raw = e.target.value;
    // iOS klavyesinde ondalık noktadır; virgül de kabul edilir. Kuruş yazılırken biçimleme kesilmesin.
    if (isDecimalInProgress(raw)) return;
    const cursorAtEnd = e.target.selectionStart === e.target.value.length;
    const formatted = formatAmountInput(raw);
    e.target.value = formatted;
    if (cursorAtEnd) {
      e.target.setSelectionRange(formatted.length, formatted.length);
    }
  });
  amountInput?.addEventListener('blur', (e) => {
    e.target.value = formatAmountInput(e.target.value);
  });

  const tahsilatWrap = panel.querySelector('#tahsilatFormWrap');
  const saveBtn = panel.querySelector('#saveTahsilatBtn');
  const formAccountId = getActiveAccount()?.id;
  let savingCollection = false;
  let editingVersion = null;

  const switchCariTab = (name) => {
    panel.querySelectorAll('[data-cari-tab]').forEach((t) => {
      const on = t.getAttribute('data-cari-tab') === name;
      t.classList.toggle('active', on);
      t.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    panel.querySelectorAll('[data-cari-panel]').forEach((p) => {
      const on = p.getAttribute('data-cari-panel') === name;
      p.classList.toggle('active', on);
      p.hidden = !on;
    });
  };

  const setTahsilatFormOpen = (open) => {
    if (!tahsilatWrap) return;
    tahsilatWrap.hidden = !open;
    if (open) switchCariTab('tahsilatlar');
  };

  const resetTahsilatForm = () => {
    editingCollectionId = null;
    const today = istanbulDate();
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
    editingVersion = movement.raw.version;
    if (tahsilatDateInput?._flatpickr) {
      tahsilatDateInput._flatpickr.setDate(movement.date || '', true, 'Y-m-d');
    } else if (tahsilatDateInput) {
      tahsilatDateInput.value = movement.date || '';
    }
    if (panel.querySelector('#tahsilatType')) panel.querySelector('#tahsilatType').value = movement.type || 'Tahsilat';
    if (panel.querySelector('#tahsilatAmount')) panel.querySelector('#tahsilatAmount').value = formatAmountInput(movement.alacak || movement.amount || 0);
    if (panel.querySelector('#tahsilatDesc')) panel.querySelector('#tahsilatDesc').value = movement.description || '';
    if (saveBtn) saveBtn.textContent = 'Güncelle';
    setTahsilatFormOpen(true);
  };

  const confirmDeleteModal = () => new Promise((resolve) => {
    const body = document.createElement('div');
    body.innerHTML = `
      <p style="margin:0; color: var(--text-secondary); line-height:1.5;">
        Bu tahsilat iptal edilecek. İşlem geçmişi korunacak. Devam etmek istiyor musunuz?
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
    const nextOpen = tahsilatWrap.hidden;
    setTahsilatFormOpen(nextOpen);
    if (!nextOpen) resetTahsilatForm();
  });
  panel.querySelector('#cancelTahsilatBtn')?.addEventListener('click', () => {
    setTahsilatFormOpen(false);
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
        const accountId = formAccountId;
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
    if (savingCollection) return;
    savingCollection = true;
    saveBtn.disabled = true;
    saveBtn.textContent = 'Kaydediliyor…';
    const frozenControls = [...panel.querySelectorAll('input,select,button')].filter(el => !el.disabled);
    frozenControls.forEach(el => el.disabled = true);
    let committed = false;
    try {
      const accountId = formAccountId;
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
          version: editingVersion,
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

      committed = true;
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
      showToast(committed ? 'Tahsilat kaydedildi; görünüm yenilenemedi. Sayfayı yenileyin, tekrar kayıt oluşturmayın.' : `Tahsilat kaydedilemedi: ${e.message}`, committed ? 'warning' : 'error');
    } finally {
      savingCollection = false;
      frozenControls.forEach(el => el.disabled = false);
      saveBtn.disabled = false;
      saveBtn.textContent = editingCollectionId ? 'Güncelle' : 'Kaydet';
    }
  });

  // Export button
  panel.querySelector('#cariWhatsAppBtn')?.addEventListener('click',async()=>{
    const button=panel.querySelector('#cariWhatsAppBtn');button.disabled=true;
    try{
      const period=exportPeriod(page,'#cariDateStart','#cariDateEnd');
      if(page.querySelector('#cariSourceFilter').value!==currentSource)throw new Error('İşlem yönü değişti. Önce Ara ile yenileyin.');
      const account=getActiveAccount();if(!account)throw new Error('Hesap seçin.');
      const groups=groupReportItems(customer.movements,[account]);
      await previewReport({groups,accounts:[account],options:{...period,scope:'cari',direction:currentSource==='giden'?'satis':currentSource==='gelen'?'alis':'both',withCollections:true},exportSpec:{name:'exportCustomerCari',args:[customer.movements,customer.name,currentSource,{dateRange:period}]}});
    }catch(error){showToast(error.message,'error');}finally{button.disabled=false;}
  });
  panel.querySelector('#exportCariBtn')?.addEventListener('click', async () => {
    try {
      showToast('Cari defter hazırlanıyor...', 'info');
      const result = await exportCustomerCari(customer.movements, customer.name, currentSource, {dateRange:exportPeriod(page,'#cariDateStart','#cariDateEnd')});
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
