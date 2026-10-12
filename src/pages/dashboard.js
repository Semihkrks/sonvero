// ══════════════════════════════════════════
// Dashboard Page — Nilvera-Style
// ══════════════════════════════════════════
import { getActiveAccount, getActiveAccountId } from '../services/account-manager.js';
import { EInvoice } from '../api/nilvera.js';
import { escapeHtml } from '../lib/html.js';
import { openPdfViewer } from '../components/pdf-viewer.js';

// ── SVG Icons ──
const svgIcons = {
  eFatura: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M9 15l2 2 4-4"/></svg>`,
  eArsiv: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`,
  eIrsaliye: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`,
  outgoing: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`,
  incoming: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>`,
  draft: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
  money: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
  refresh: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>`,
  plus: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  chart: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>`,
  checkCircle: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
  xCircle: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
  clock: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  alertCircle: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
  fileText: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
  dollarSign: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
  arrowDown: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="8 12 12 16 16 12"/><line x1="12" y1="8" x2="12" y2="16"/></svg>`,
  arrowUp: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="16 12 12 8 8 12"/><line x1="12" y1="16" x2="12" y2="8"/></svg>`,
  noData: `<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" opacity="0.3"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
};

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

function localDayKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDateTR(dateStr) {
  if (!dateStr) return '—';
  try { return new Date(dateStr).toLocaleDateString('tr-TR'); } catch { return dateStr; }
}

function getInvoiceDate(inv) { return inv.IssueDate || inv.issueDate || inv.CreateDate || inv.CreatedDate || (inv.InvoiceInfo || inv.invoiceInfo || {}).IssueDate || ''; }
function getInvoiceNumber(inv) { return inv.InvoiceNumber || inv.invoiceNumber || inv.InvoiceSerieOrNumber || (inv.InvoiceInfo || inv.invoiceInfo || {}).InvoiceSerieOrNumber || ''; }
function getInvoiceUuid(inv) { return inv.UUID || inv.uuid || inv.Id || inv.id || (inv.InvoiceInfo || inv.invoiceInfo || {}).UUID || ''; }
function getSenderName(inv) { return inv.SenderName || inv.senderName || inv.SupplierName || (inv.SenderInfo || {}).Name || ''; }
function getReceiverName(inv) { return inv.ReceiverName || inv.receiverName || inv.CustomerName || (inv.ReceiverInfo || inv.CustomerInfo || {}).Name || ''; }
function getAmount(inv) { return inv.PayableAmount || inv.payableAmount || inv.TotalAmount || (inv.InvoiceInfo || {}).PayableAmount || 0; }
function getCurrency(inv) { return inv.CurrencyCode || inv.currencyCode || 'TRY'; }
function invoiceSortKey(inv) {
  const raw = String(getInvoiceDate(inv) || '');
  const day = raw.slice(0, 10);
  const time = Date.parse(raw);
  return { day: /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : '', time: Number.isFinite(time) ? time : 0, no: String(getInvoiceNumber(inv) || '') };
}
function sortNewestFirst(items) {
  return [...items].sort((a, b) => {
    const A = invoiceSortKey(a), B = invoiceSortKey(b);
    if (A.day !== B.day) return B.day.localeCompare(A.day);
    if (A.time !== B.time) return B.time - A.time;
    return B.no.localeCompare(A.no, 'tr');
  });
}

function formatCurrency(amount, currency = 'TRY') {
  if (!amount && amount !== 0) return '—';
  try {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: currency || 'TRY' }).format(amount);
  } catch { return `${amount} ${currency}`; }
}

let currentPeriod = 'month'; // 'today', 'yesterday', 'week', 'month', 'custom'
let customStartDate = '';
let customEndDate = '';
let currentRecentTab = 'gelen'; // 'gelen' or 'giden'
let currentBoxTab = 'gelen'; // donut card, independent of the recent list

function getPeriodDates() {
  if (currentPeriod === 'custom') return { start: customStartDate, end: customEndDate };
  const d = new Date();
  let start = new Date(d);
  let end = new Date(d);
  start.setHours(0,0,0,0);
  end.setHours(23,59,59,999);

  if (currentPeriod === 'yesterday') {
    start.setDate(start.getDate() - 1);
    end.setDate(end.getDate() - 1);
  } else if (currentPeriod === 'week') {
    start.setDate(start.getDate() - d.getDay() + (d.getDay() === 0 ? -6 : 1)); // Monday
  } else if (currentPeriod === 'month') {
    start.setDate(1);
  }
  return { start: start.toISOString(), end: end.toISOString() };
}

export async function renderDashboard() {
  const page = document.createElement('div');
  page.className = 'dashboard-nilvera';
  const account = await getActiveAccount();

  page.innerHTML = `
    <!-- Module Tabs -->
    <div class="dash-module-tabs">
      <button class="dash-module-tab active" data-module="efatura">
        <span class="dash-module-tab-icon">${svgIcons.eFatura}</span>
        <span>E-Fatura</span>
      </button>
      <button class="dash-module-tab" data-module="earsiv">
        <span class="dash-module-tab-icon">${svgIcons.eArsiv}</span>
        <span>E-Arşiv</span>
      </button>
      <button class="dash-module-tab" data-module="eirsaliye">
        <span class="dash-module-tab-icon">${svgIcons.eIrsaliye}</span>
        <span>E-İrsaliye</span>
      </button>
    </div>

    <!-- Main Dashboard Grid -->
    <div class="dash-grid">
      <!-- Left Column: Donut Chart Area -->
      <div class="dash-chart-section card" data-box="${currentBoxTab}">
        <div class="dash-chart-header">
          <div class="dash-box-tabs">
            <button class="dash-box-tab active" data-box="gelen">Gelen Kutusu</button>
            <button class="dash-box-tab" data-box="giden">Giden Kutusu</button>
          </div>
          <div class="dash-period-tabs">
            <button class="dash-period-tab" data-period="today">Bugün</button>
            <button class="dash-period-tab" data-period="yesterday">Dün</button>
            <button class="dash-period-tab" data-period="week">Bu Hafta</button>
            <button class="dash-period-tab active" data-period="month">Bu Ay</button>
          </div>
        </div>
        <div class="dash-chart-body">
          <div class="dash-donut-area">
            <canvas id="donutChart" width="180" height="180"></canvas>
            <div class="dash-donut-center">
              <span class="dash-donut-label" id="donutLabel">Gelen Kutusu</span>
              <span class="dash-donut-value" id="donutValue">0</span>
            </div>
          </div>
          <div class="dash-chart-legend" id="chartLegend">
            <div class="dash-legend-row">
              <span class="dash-legend-icon">${svgIcons.fileText}</span>
              <span class="dash-legend-text">Temel Fatura</span>
              <span class="dash-legend-count" id="legTemel">0</span>
            </div>
            <div class="dash-legend-row">
              <span class="dash-legend-icon">${svgIcons.fileText}</span>
              <span class="dash-legend-text">Ticari Fatura</span>
              <span class="dash-legend-count" id="legTicari">0</span>
            </div>
            <div class="dash-legend-row">
              <span class="dash-legend-icon" style="color:var(--warning)">${svgIcons.clock}</span>
              <span class="dash-legend-text" title="Cevap Bekleyen Ticari Fatura">Cevap Bekleyen Ticari Fatura</span>
              <span class="dash-legend-count" id="legBekleyen">0</span>
            </div>
            <div class="dash-legend-row">
              <span class="dash-legend-icon" style="color:var(--success)">${svgIcons.checkCircle}</span>
              <span class="dash-legend-text">Kabul Edilen Fatura</span>
              <span class="dash-legend-count" id="legKabul">0</span>
            </div>
            <div class="dash-legend-row">
              <span class="dash-legend-icon" style="color:var(--danger)">${svgIcons.xCircle}</span>
              <span class="dash-legend-text">Reddedilen Fatura</span>
              <span class="dash-legend-count" id="legRed">0</span>
            </div>
            <div class="dash-legend-row">
              <span class="dash-legend-icon" style="color:var(--success)">${svgIcons.checkCircle}</span>
              <span class="dash-legend-text">Başarılı Fatura</span>
              <span class="dash-legend-count" id="legBasarili">0</span>
            </div>
            <div class="dash-legend-row">
              <span class="dash-legend-icon" style="color:var(--danger)">${svgIcons.alertCircle}</span>
              <span class="dash-legend-text">Hatalı Fatura</span>
              <span class="dash-legend-count" id="legHatali">0</span>
            </div>
            <div class="dash-legend-row">
              <span class="dash-legend-icon" style="color:var(--warning)">${svgIcons.clock}</span>
              <span class="dash-legend-text">İşlem Bekleyen Fatura</span>
              <span class="dash-legend-count" id="legIslem">0</span>
            </div>
          </div>
        </div>
        <div class="dash-chart-footer">
          <span class="dash-chart-key" data-key="gelen"><span class="dash-chart-dot"></span>Gelen Kutusu</span>
          <span class="dash-chart-key" data-key="giden"><span class="dash-chart-dot is-out"></span>Giden Kutusu</span>
        </div>
      </div>

      <!-- Right Column: Recent Invoices -->
      <div class="dash-recent card">
        <div class="dash-recent-header">
          <h3>${svgIcons.fileText} <span id="recentTitle">Son Gelen Faturalar</span></h3>
          <div class="dash-box-tabs">
            <button class="dash-box-tab active" data-recent="gelen">Gelen Kutusu</button>
            <button class="dash-box-tab" data-recent="giden">Giden Kutusu</button>
          </div>
        </div>
        <div class="dash-recent-list" id="recentInvoicesList">
          <div class="dash-recent-empty">
            ${svgIcons.noData}
            <p>${account ? 'Veriler yükleniyor...' : 'Hesap seçilmedi'}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Stats Section -->
    <div class="dash-stats-section card">
      <div class="dash-stats-header">
        <h3>${svgIcons.chart} E-Fatura İstatistikleri</h3>
        <div class="dash-stats-dates" style="display:flex; gap:10px; align-items:center">
          <button class="btn btn-sm btn-ghost" id="refreshStats" title="Yenile" aria-label="İstatistikleri yenile">${svgIcons.refresh}</button>
        </div>
      </div>
      <div class="dash-stats-chart">
        <canvas id="statsChart" height="200"></canvas>
      </div>
      <div class="dash-stats-grid">
        <div class="dash-stat-box" data-dir="in">
          <span class="dash-stat-label">Gelen Fatura Tutarı</span>
          <span class="dash-stat-value" id="statGelenTutar">0,00 ₺</span>
        </div>
        <div class="dash-stat-box" data-dir="in">
          <span class="dash-stat-label">Gelen Fatura Sayısı</span>
          <span class="dash-stat-value" id="statGelenAdet">0 Adet</span>
        </div>
        <div class="dash-stat-box" data-dir="out">
          <span class="dash-stat-label">Giden Fatura Tutarı</span>
          <span class="dash-stat-value" id="statGidenTutar">0,00 ₺</span>
        </div>
        <div class="dash-stat-box" data-dir="out">
          <span class="dash-stat-label">Giden Fatura Sayısı</span>
          <span class="dash-stat-value" id="statGidenAdet">0 Adet</span>
        </div>
      </div>
    </div>

  `;

  // ── Event Bindings ──
  setTimeout(() => {
    // Module tabs
    page.querySelectorAll('.dash-module-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        page.querySelectorAll('.dash-module-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
      });
    });

    // Period tabs
    page.querySelectorAll('.dash-period-tab').forEach(tab => {
      if (tab.dataset.period === currentPeriod) tab.classList.add('active');
      else tab.classList.remove('active');
      
      tab.addEventListener('click', () => {
        page.querySelectorAll('.dash-period-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentPeriod = tab.dataset.period;
        renderDashboardData(page);
      });
    });

    // Refresh
    page.querySelector('#refreshStats')?.addEventListener('click', () => loadDashboard(page));

    // Box tabs
    page.querySelectorAll('.dash-box-tab').forEach(tab => {
      const state = tab.dataset.box ? currentBoxTab : currentRecentTab;
      tab.classList.toggle('active', (tab.dataset.box || tab.dataset.recent) === state);
      tab.setAttribute('aria-pressed', String(tab.classList.contains('active')));
      tab.addEventListener('click', () => {
        const group = tab.closest('.dash-box-tabs') || tab.parentElement;
        group.querySelectorAll('.dash-box-tab').forEach(t => { t.classList.remove('active'); t.setAttribute('aria-pressed', 'false'); });
        tab.classList.add('active');
        tab.setAttribute('aria-pressed', 'true');
        if (tab.dataset.box) currentBoxTab = tab.dataset.box;
        if (tab.dataset.recent) currentRecentTab = tab.dataset.recent;
        renderDashboardData(page);
      });
    });

    // Draw initial donut
    drawDonut(page.querySelector('#donutChart'), 0, 0, currentBoxTab);

    // Canvas colors come from theme tokens; repaint cached data when the theme flips
    const themeObserver = new MutationObserver(() => {
      if (!page.isConnected) { themeObserver.disconnect(); return; }
      const last = page._chartData;
      drawDonut(page.querySelector('#donutChart'), last?.incoming || 0, last?.outgoing || 0, last?.box);
      if (last) drawStatsChart(page.querySelector('#statsChart'), last.purchaseItems, last.saleItems, last.start, last.end);
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    // Load data: paint the last snapshot for this account at once, then revalidate.
    if (account) {
      const cached = dashboardCache.get(account.id);
      if (cached) {
        page._raw = cached.raw;
        renderDashboardData(page);
      }
      if (!cached || Date.now() - cached.at > DASHBOARD_FRESH_MS) loadDashboard(page);
    }
  }, 0);

  return page;
}

const DASHBOARD_FRESH_MS = 30 * 1000;
const dashboardCache = new Map();

async function loadDashboard(page) {
  const token = (page._loadToken || 0) + 1;
  page._loadToken = token;
  const accountId = getActiveAccountId();
  try {
    // Last 30 days, extended back to the 1st so "Bu Ay" is always fully covered.
    const apiEnd = new Date();
    let apiStart = new Date();
    apiStart.setDate(apiStart.getDate() - 30);
    const monthStart = new Date(apiEnd.getFullYear(), apiEnd.getMonth(), 1);
    if (monthStart < apiStart) apiStart = monthStart;

    const [salesRes, purchaseRes] = await Promise.allSettled([
      EInvoice.listSales({ PageSize: 100, StartDate: apiStart.toISOString(), EndDate: apiEnd.toISOString() }),
      EInvoice.listPurchases({ PageSize: 100, StartDate: apiStart.toISOString(), EndDate: apiEnd.toISOString() })
    ]);
    if (token !== page._loadToken || !page.isConnected) return;

    const sales = salesRes.status === 'fulfilled' && salesRes.value.success ? salesRes.value.data : null;
    const purchases = purchaseRes.status === 'fulfilled' && purchaseRes.value.success ? purchaseRes.value.data : null;

    page._raw = {
      saleItems: extractItems(sales),
      purchaseItems: extractItems(purchases),
      salesFailed: !sales,
      purchasesFailed: !purchases,
    };
    if (accountId && (sales || purchases)) dashboardCache.set(accountId, { at: Date.now(), raw: page._raw });
    renderDashboardData(page);
  } catch (e) {
    console.error('Dashboard data error:', e);
  }
}

function renderDashboardData(page) {
  const raw = page._raw;
  if (!raw || !page.isConnected) return;
  try {
    const { saleItems, purchaseItems, salesFailed, purchasesFailed } = raw;

    // TOP STATS FILTERING (Bugün, Dün, Bu Ay vs)
    const { start: fStartStr, end: fEndStr } = getPeriodDates();
    const fStart = new Date(fStartStr);
    const fEnd = new Date(fEndStr);

    const statsSaleItems = saleItems.filter(inv => {
      const d = new Date(getInvoiceDate(inv) || new Date());
      return d >= fStart && d <= fEnd;
    });
    
    const statsPurchaseItems = purchaseItems.filter(inv => {
      const d = new Date(getInvoiceDate(inv) || new Date());
      return d >= fStart && d <= fEnd;
    });

    const boxGelen = currentBoxTab === 'gelen';
    const boxFailed = boxGelen ? purchasesFailed : salesFailed;
    drawDonut(page.querySelector('#donutChart'), statsPurchaseItems.length, statsSaleItems.length, currentBoxTab);
    const donutLabel = page.querySelector('#donutLabel');
    if (donutLabel) donutLabel.textContent = boxGelen ? 'Gelen Kutusu' : 'Giden Kutusu';
    const donutVal = page.querySelector('#donutValue');
    if (donutVal) donutVal.textContent = boxFailed ? '—' : (boxGelen ? statsPurchaseItems.length : statsSaleItems.length);
    page.querySelector('.dash-chart-section')?.setAttribute('data-box', currentBoxTab);

    const isGelen = currentRecentTab === 'gelen';
    const activeStatsItems = boxGelen ? statsPurchaseItems : statsSaleItems;
    let temel = 0, ticari = 0, bekleyen = 0, kabul = 0, red = 0, basarili = 0, hatali = 0, islem = 0;

    activeStatsItems.forEach(inv => {
      const info = inv.InvoiceInfo || inv.invoiceInfo || {};
      const status = inv.Status || inv.status || {};
      
      const p = (inv.InvoiceProfile || inv.invoiceProfile || inv.ProfileId || inv.profileId || info.ProfileId || info.profileId || '').toUpperCase();
      const s = (inv.StatusCode || inv.statusCode || inv.InvoiceStatus || inv.invoiceStatus || info.StatusCode || inv.Status || status.Name || status.name || '').toUpperCase();
      
      if (p === 'TEMELFATURA') temel++;
      if (p === 'TICARIFATURA') ticari++;
      if (s === 'BEKLEYEN' || s === 'WAITING' || s === '0' || s === 'ALICIYA ILETILDI') {
        islem++;
        if (p === 'TICARIFATURA') bekleyen++;
      }
      if (s === 'KABUL_EDILDI' || s === 'APPROVED' || s === 'KABUL' || s === '2004' || s === 'SUCCEED') kabul++;
      if (s === 'REDDEDILDI' || s === 'REJECTED' || s === 'RED' || s === '2005') red++;
      if (s === 'BASARILI' || s === 'SUCCESS' || s === '2' || s === '2000' || s === '1300') basarili++;
      if (s === 'HATALI' || s === 'ERROR' || s === '3' || s === '4000' || s === '1163') hatali++;
    });

    const el = (id) => page.querySelector('#' + id);
    if (el('legTemel')) el('legTemel').textContent = temel;
    if (el('legTicari')) el('legTicari').textContent = ticari;
    if (el('legBekleyen')) el('legBekleyen').textContent = bekleyen;
    if (el('legKabul')) el('legKabul').textContent = kabul;
    if (el('legRed')) el('legRed').textContent = red;
    if (el('legBasarili')) el('legBasarili').textContent = basarili;
    if (el('legHatali')) el('legHatali').textContent = hatali;
    if (el('legIslem')) el('legIslem').textContent = islem;

    // Update aggregate stats
    let gelenTotal = 0, gidenTotal = 0;
    statsPurchaseItems.forEach(inv => { gelenTotal += parseFloat(getAmount(inv) || 0); });
    statsSaleItems.forEach(inv => { gidenTotal += parseFloat(getAmount(inv) || 0); });

    if (el('statGelenTutar')) el('statGelenTutar').textContent = formatCurrency(gelenTotal);
    if (el('statGelenAdet')) el('statGelenAdet').textContent = `${statsPurchaseItems.length} Adet`;
    if (el('statGidenTutar')) el('statGidenTutar').textContent = formatCurrency(gidenTotal);
    if (el('statGidenAdet')) el('statGidenAdet').textContent = `${statsSaleItems.length} Adet`;

    // Recent invoices: newest first, open e-fatura on click
    const recentList = page.querySelector('#recentInvoicesList');
    const recentItems = sortNewestFirst(isGelen ? purchaseItems : saleItems).slice(0, 10);
    const recentTitle = page.querySelector('#recentTitle');
    if (recentTitle) recentTitle.textContent = isGelen ? 'Son Gelen Faturalar' : 'Son Giden Faturalar';
    const accountId = getActiveAccountId();
    const belgeKind = isGelen ? 'incoming' : 'outgoing';

    if (recentList) {
      if (isGelen ? purchasesFailed : salesFailed) {
        recentList.innerHTML = `<div class="dash-recent-empty">${svgIcons.noData}<p>${isGelen ? 'Gelen' : 'Giden'} faturalar alınamadı. Yenile butonuyla tekrar deneyin.</p></div>`;
      } else if (recentItems.length === 0) {
        recentList.innerHTML = `<div class="dash-recent-empty">${svgIcons.noData}<p>Henüz fatura bulunamadı</p></div>`;
      } else {
        recentList.innerHTML = recentItems.map(inv => {
          const name = isGelen ? getSenderName(inv) : getReceiverName(inv);
          const initials = name && name !== '—' ? name.split(' ').filter(Boolean).map(w => w[0]).join('').substring(0, 2).toLocaleUpperCase('tr-TR') : '??';
          const invoiceNo = getInvoiceNumber(inv) || '—';
          const amount = formatCurrency(getAmount(inv), getCurrency(inv));
          const date = formatDateTR(getInvoiceDate(inv));
          const uuid = getInvoiceUuid(inv);
          const openable = !!(accountId && uuid);
          return `
            <button type="button" class="dash-recent-item${openable ? ' is-clickable' : ''}" ${openable ? `data-uuid="${escapeHtml(uuid)}" data-kind="${belgeKind}" data-party="${escapeHtml(name || '')}" data-number="${escapeHtml(invoiceNo)}" data-date="${escapeHtml(date)}" data-amount="${escapeHtml(amount)}"` : 'disabled'} title="${openable ? 'E-faturayı aç' : 'Belge kimliği yok'}">
              <div class="dash-recent-avatar ${isGelen ? 'is-in' : 'is-out'}" aria-hidden="true">${escapeHtml(initials)}</div>
              <div class="dash-recent-info">
                <span class="dash-recent-name" title="${escapeHtml(name || 'Bilinmiyor')}">${escapeHtml(name || 'Bilinmiyor')}</span>
                <span class="dash-recent-id">${escapeHtml(invoiceNo)}</span>
              </div>
              <div class="dash-recent-right">
                <span class="dash-recent-amount">${escapeHtml(amount)}</span>
                <span class="dash-recent-date">${escapeHtml(date)}</span>
              </div>
            </button>
          `;
        }).join('');
        recentList.querySelectorAll('.dash-recent-item.is-clickable').forEach(btn => {
          btn.addEventListener('click', () => {
            const { uuid, kind = belgeKind, party, number, date, amount } = btn.dataset;
            if (!uuid) return;
            openPdfViewer({
              load: () => kind === 'incoming' ? EInvoice.getPurchasePdf(uuid) : EInvoice.getSalePdf(uuid),
              meta: { party, number: number === '—' ? '' : number, date: date === '—' ? '' : date, amount, direction: kind },
            });
          });
        });
      }
    }

    // Draw stats chart (active period)
    const { start: chartStartStr, end: chartEndStr } = getPeriodDates();
    page._chartData = { incoming: statsPurchaseItems.length, outgoing: statsSaleItems.length, box: currentBoxTab, purchaseItems, saleItems, start: chartStartStr, end: chartEndStr };
    drawStatsChart(page.querySelector('#statsChart'), purchaseItems, saleItems, chartStartStr, chartEndStr);

  } catch (e) {
    console.error('Dashboard data error:', e);
  }
}

function chartTheme() {
  const css = getComputedStyle(document.documentElement);
  const read = (name, fallback) => css.getPropertyValue(name).trim() || fallback;
  return {
    incoming: read('--chart-in', '#2563eb'),
    outgoing: read('--chart-out', '#16a34a'),
    track: read('--surface-2', '#f6f8fb'),
    grid: read('--border', '#dce3ec'),
    label: read('--text-muted', '#64748b'),
    surface: read('--bg-card', '#ffffff'),
  };
}

function drawDonut(canvas, incoming, outgoing, active = 'gelen') {
  if (!canvas) return;
  const theme = chartTheme();
  const dpr = window.devicePixelRatio || 1;
  const size = 200;
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width = size + 'px';
  canvas.style.height = size + 'px';

  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const cx = size / 2, cy = size / 2, r = 76, lw = 16;
  const gap = 0.05;

  ctx.clearRect(0, 0, size, size);

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, 2 * Math.PI);
  ctx.strokeStyle = theme.track;
  ctx.lineWidth = lw;
  ctx.stroke();

  const total = incoming + outgoing;
  if (total === 0) return;

  const inAngle = (incoming / total) * 2 * Math.PI;
  const outAngle = (outgoing / total) * 2 * Math.PI;
  const startAngle = -Math.PI / 2;
  const both = incoming > 0 && outgoing > 0;

  const segment = (from, to, color, dim) => {
    ctx.beginPath();
    ctx.arc(cx, cy, r, from, to);
    ctx.strokeStyle = color;
    ctx.lineWidth = lw;
    ctx.lineCap = both ? 'round' : 'butt';
    ctx.globalAlpha = dim ? 0.3 : 1;
    ctx.stroke();
    ctx.globalAlpha = 1;
  };

  if (incoming > 0) segment(startAngle + (both ? gap : 0), startAngle + inAngle - (both ? gap : 0), theme.incoming, active === 'giden');
  if (outgoing > 0) segment(startAngle + inAngle + (both ? gap : 0), startAngle + inAngle + outAngle - (both ? gap : 0), theme.outgoing, active === 'gelen');
}

function drawStatsChart(canvas, purchaseItems, saleItems, startDateStr, endDateStr) {
  if (!canvas) return;
  const theme = chartTheme();
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const w = Math.max(0, canvas.parentElement.clientWidth - 24);
  const h = 200;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const padding = { top: 16, right: 16, bottom: 28, left: 16 };

  ctx.clearRect(0, 0, w, h);

  // Determine date span length between start and end
  const startD = new Date(startDateStr);
  const endD = new Date(endDateStr);
  const msPerDay = 24 * 60 * 60 * 1000;
  
  // Cap at max 14 days visually for neatness
  let numDays = Math.ceil(Math.abs((endD - startD) / msPerDay));
  if (numDays > 31) numDays = 31;
  if (numDays < 2) numDays = 2; // at least 2 points to draw a line

  const days = [];
  for (let i = numDays - 1; i >= 0; i--) {
    const d = new Date(endD);
    d.setDate(d.getDate() - i);
    days.push(d);
  }

  const countByDay = (items) => {
    const counts = new Map();
    items.forEach(inv => {
      const key = String(getInvoiceDate(inv) || '').slice(0, 10);
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return days.map(d => counts.get(localDayKey(d)) || 0);
  };
  const gelenByDay = countByDay(purchaseItems);
  const gidenByDay = countByDay(saleItems);

  const maxVal = Math.max(1, ...gelenByDay, ...gidenByDay);
  const chartW = w - padding.left - padding.right;
  const chartH = h - padding.top - padding.bottom;

  // Grid lines
  ctx.strokeStyle = theme.grid;
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = Math.round(padding.top + (chartH / 4) * i) + 0.5;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(w - padding.right, y);
    ctx.stroke();
  }

  drawArea(ctx, gelenByDay, days, maxVal, chartW, chartH, padding, theme.incoming, theme.surface);
  drawArea(ctx, gidenByDay, days, maxVal, chartW, chartH, padding, theme.outgoing, theme.surface);

  // X Labels
  ctx.fillStyle = theme.label;
  ctx.font = '500 11px Inter, sans-serif';
  const labelStep = Math.max(1, Math.ceil(days.length / Math.max(2, Math.floor(chartW / 64))));
  days.forEach((d, i) => {
    if (i % labelStep !== 0 && i !== days.length - 1) return;
    const x = padding.left + (chartW / (days.length - 1)) * i;
    ctx.textAlign = i === 0 ? 'left' : i === days.length - 1 ? 'right' : 'center';
    ctx.fillText(`${d.getDate()} ${['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'][d.getMonth()]}`, x, h - 8);
  });
}

function drawArea(ctx, data, days, maxVal, chartW, chartH, padding, lineColor, dotFill) {
  if (data.length < 2) return;
  const points = data.map((v, i) => ({
    x: padding.left + (chartW / (data.length - 1)) * i,
    y: padding.top + chartH - (v / maxVal) * chartH
  }));

  // Create smooth bezier path without loops
  const drawLinePath = (context) => {
    context.moveTo(points[0].x, points[0].y);
    for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i];
        const p2 = points[i + 1];
        const midX = (p1.x + p2.x) / 2;
        context.bezierCurveTo(midX, p1.y, midX, p2.y, p2.x, p2.y);
    }
  };

  // Fill Gradient
  ctx.beginPath();
  ctx.moveTo(points[0].x, padding.top + chartH);
  ctx.lineTo(points[0].x, points[0].y);
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    const midX = (p1.x + p2.x) / 2;
    ctx.bezierCurveTo(midX, p1.y, midX, p2.y, p2.x, p2.y);
  }
  ctx.lineTo(points[points.length - 1].x, padding.top + chartH);
  ctx.closePath();
  
  const grad = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
  ctx.save();
  ctx.globalAlpha = 0.14;
  grad.addColorStop(0, lineColor);
  grad.addColorStop(1, 'transparent');
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.restore();

  // Line
  ctx.beginPath();
  drawLinePath(ctx);
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();

  // Dots
  if (points.length > 16) return;
  points.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, 2 * Math.PI);
    ctx.fillStyle = dotFill;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = lineColor;
    ctx.stroke();
  });
}
