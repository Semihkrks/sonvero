// ══════════════════════════════════════════
// Dashboard Page — Nilvera-Style
// ══════════════════════════════════════════
import { getActiveAccount } from '../services/account-manager.js';
import { EInvoice, EArchive } from '../api/nilvera.js';
import { navigate } from '../router.js';

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

// ── Date Helpers ──
function getMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { start, end };
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

function formatDateISO(d) {
  return d.toISOString().split('T')[0];
}

function formatDateTR(dateStr) {
  if (!dateStr) return '—';
  try { return new Date(dateStr).toLocaleDateString('tr-TR'); } catch { return dateStr; }
}

function getInvoiceDate(inv) { return inv.IssueDate || inv.issueDate || inv.CreateDate || inv.CreatedDate || (inv.InvoiceInfo || inv.invoiceInfo || {}).IssueDate || ''; }
function getInvoiceNumber(inv) { return inv.InvoiceNumber || inv.invoiceNumber || inv.InvoiceSerieOrNumber || (inv.InvoiceInfo || inv.invoiceInfo || {}).InvoiceSerieOrNumber || ''; }
function getSenderName(inv) { return inv.SenderName || inv.senderName || inv.SupplierName || (inv.SenderInfo || {}).Name || ''; }
function getReceiverName(inv) { return inv.ReceiverName || inv.receiverName || inv.CustomerName || (inv.ReceiverInfo || inv.CustomerInfo || {}).Name || ''; }
function getAmount(inv) { return inv.PayableAmount || inv.payableAmount || inv.TotalAmount || (inv.InvoiceInfo || {}).PayableAmount || 0; }
function getCurrency(inv) { return inv.CurrencyCode || inv.currencyCode || 'TRY'; }

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

  const { start, end } = getMonthRange();

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
      <div class="dash-chart-section card">
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
              <span class="dash-legend-text">Cevap Bekleyen Ticari Fatura</span>
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
          <span class="dash-chart-dot" style="background:var(--info)"></span> Gelen Kutusu
          <span class="dash-chart-dot" style="background:var(--success); margin-left:16px"></span> Giden Kutusu
        </div>
      </div>

      <!-- Right Column: Recent Invoices -->
      <div class="dash-recent card">
        <div class="dash-recent-header">
          <h3>${svgIcons.fileText} Son Gelen Faturalar</h3>
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
          <button class="btn btn-sm btn-ghost" id="refreshStats">${svgIcons.refresh}</button>
        </div>
      </div>
      <div class="dash-stats-chart">
        <canvas id="statsChart" width="100%" height="200"></canvas>
      </div>
      <div class="dash-stats-grid">
        <div class="dash-stat-box">
          <span class="dash-stat-label">Gelen Fatura Tutarı</span>
          <span class="dash-stat-value text-success" id="statGelenTutar">0,00 ₺</span>
        </div>
        <div class="dash-stat-box">
          <span class="dash-stat-label">Gelen Fatura Sayısı</span>
          <span class="dash-stat-value text-info" id="statGelenAdet">0 Adet</span>
        </div>
        <div class="dash-stat-box">
          <span class="dash-stat-label">Giden Fatura Tutarı</span>
          <span class="dash-stat-value text-success" id="statGidenTutar">0,00 ₺</span>
        </div>
        <div class="dash-stat-box">
          <span class="dash-stat-label">Giden Fatura Sayısı</span>
          <span class="dash-stat-value text-info" id="statGidenAdet">0 Adet</span>
        </div>
      </div>
    </div>

    <!-- Bottom Widgets -->
    <div class="dash-widgets-grid">
      <div class="dash-widget card">
        <div class="dash-widget-icon" style="color:var(--info)">${svgIcons.eFatura}</div>
        <div class="dash-widget-title">Kontör</div>
        <div class="dash-widget-value">1.000</div>
        <div class="dash-widget-footer">
          <div><span class="dash-widget-sub-label">Kalan</span><span class="dash-widget-sub-value">725</span></div>
          <div><span class="dash-widget-sub-label">Kullanılan</span><span class="dash-widget-sub-value">275</span></div>
        </div>
      </div>
      <div class="dash-widget card">
        <div class="dash-widget-icon" style="color:var(--success)">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
        </div>
        <div class="dash-widget-title">WhatsApp</div>
        <div class="dash-widget-value">0</div>
        <div class="dash-widget-footer">
          <div><span class="dash-widget-sub-label">Kalan</span><span class="dash-widget-sub-value">0</span></div>
          <div><span class="dash-widget-sub-label">Kullanılan</span><span class="dash-widget-sub-value">0</span></div>
        </div>
      </div>
      <div class="dash-widget card">
        <div class="dash-widget-icon" style="color:var(--warning)">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
        </div>
        <div class="dash-widget-title">Sms</div>
        <div class="dash-widget-value">0</div>
        <div class="dash-widget-footer">
          <div><span class="dash-widget-sub-label">Kalan</span><span class="dash-widget-sub-value">0</span></div>
          <div><span class="dash-widget-sub-label">Kullanılan</span><span class="dash-widget-sub-value">0</span></div>
        </div>
      </div>
      <div class="dash-widget dash-widget-currency card">
        <table class="dash-currency-table">
          <thead>
            <tr><th></th><th></th><th>Alış</th><th>Satış</th></tr>
          </thead>
          <tbody>
            <tr>
              <td><span class="dash-currency-badge" style="background:#27ae60;color:#fff">$</span></td>
              <td>Dolar</td>
              <td id="usdBuy">—</td>
              <td id="usdSell">—</td>
            </tr>
            <tr>
              <td><span class="dash-currency-badge" style="background:#2980b9;color:#fff">€</span></td>
              <td>Euro</td>
              <td id="eurBuy">—</td>
              <td id="eurSell">—</td>
            </tr>
            <tr>
              <td><span class="dash-currency-badge" style="background:#8e44ad;color:#fff">£</span></td>
              <td>Sterlin</td>
              <td id="gbpBuy">—</td>
              <td id="gbpSell">—</td>
            </tr>
          </tbody>
        </table>
        <div class="dash-currency-source">Veriler T.C.M.B'den Alınmaktadır.</div>
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
        loadDashboard(page);
      });
    });

    // Refresh
    page.querySelector('#refreshStats')?.addEventListener('click', () => loadDashboard(page));

    // Box tabs
    page.querySelectorAll('.dash-box-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const group = tab.closest('.dash-box-tabs') || tab.parentElement;
        group.querySelectorAll('.dash-box-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        if (tab.dataset.box) {
          page.querySelector('#donutLabel').textContent = tab.dataset.box === 'gelen' ? 'Gelen Kutusu' : 'Giden Kutusu';
          loadDashboard(page); // refresh view
        }
        if (tab.dataset.recent) {
          currentRecentTab = tab.dataset.recent;
          loadDashboard(page); // refresh view
        }
      });
    });

    // Draw initial donut
    drawDonut(page.querySelector('#donutChart'), 0, 0);

    // Load data
    if (account) {
      loadDashboard(page);
    }

    // Load currency rates
    loadCurrencyRates(page);
  }, 0);

  return page;
}

async function loadDashboard(page) {
  try {
    // ALWAYS FETCH LAST 30 DAYS FOR RECENT LIST AND CHART
    const apiEnd = new Date();
    const apiStart = new Date();
    apiStart.setDate(apiStart.getDate() - 30); // 30 days fixed

    const [salesRes, purchaseRes] = await Promise.allSettled([
      EInvoice.listSales({ PageSize: 50, StartDate: apiStart.toISOString(), EndDate: apiEnd.toISOString() }),
      EInvoice.listPurchases({ PageSize: 50, StartDate: apiStart.toISOString(), EndDate: apiEnd.toISOString() })
    ]);

    const sales = salesRes.status === 'fulfilled' && salesRes.value.success ? salesRes.value.data : null;
    const purchases = purchaseRes.status === 'fulfilled' && purchaseRes.value.success ? purchaseRes.value.data : null;

    const saleItems = extractItems(sales);
    const purchaseItems = extractItems(purchases);

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

    // Update donut with filtered items
    drawDonut(page.querySelector('#donutChart'), statsPurchaseItems.length, statsSaleItems.length);
    const donutVal = page.querySelector('#donutValue');
    if (donutVal) donutVal.textContent = currentRecentTab === 'gelen' ? statsPurchaseItems.length : statsSaleItems.length;

    // Calculate detailed legend stats for active Box
    const isGelen = currentRecentTab === 'gelen';
    const activeStatsItems = isGelen ? statsPurchaseItems : statsSaleItems;
    let temel = 0, ticari = 0, bekleyen = 0, kabul = 0, red = 0, basarili = 0, hatali = 0, islem = 0;

    activeStatsItems.forEach(inv => {
      const info = inv.InvoiceInfo || inv.invoiceInfo || {};
      const t = inv.Target || inv.target || {};
      const status = inv.Status || inv.status || {};
      
      const p = (inv.InvoiceProfile || inv.invoiceProfile || inv.ProfileId || inv.profileId || info.ProfileId || info.profileId || '').toUpperCase();
      const s = (inv.StatusCode || inv.statusCode || inv.InvoiceStatus || inv.invoiceStatus || info.StatusCode || inv.Status || status.Name || status.name || '').toUpperCase();
      
      if (p === 'TEMELFATURA') temel++;
      if (p === 'TICARIFATURA') ticari++;
      if (s === 'BEKLEYEN' || s === 'WAITING' || s === '0' || s === 'ALICIYA ILETILDI') { bekleyen++; islem++; }
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

    // Recent invoices list
    const recentList = page.querySelector('#recentInvoicesList');
    // Display ALL items based on tab!
    const recentItems = isGelen ? purchaseItems : saleItems;
    
    if (recentList) {
      if (recentItems.length === 0) {
        recentList.innerHTML = `<div class="dash-recent-empty">${svgIcons.noData}<p>Henüz fatura bulunamadı</p></div>`;
      } else {
        recentList.innerHTML = recentItems.map(inv => {
          const name = isGelen ? getSenderName(inv) : getReceiverName(inv);
          const initials = name && name !== '—' ? name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase() : '??';
          const invoiceNo = getInvoiceNumber(inv) || '—';
          const amount = formatCurrency(getAmount(inv), getCurrency(inv));
          const date = formatDateTR(getInvoiceDate(inv));
          return `
            <div class="dash-recent-item">
              <div class="dash-recent-avatar">${initials}</div>
              <div class="dash-recent-info">
                <span class="dash-recent-name" style="font-weight:600;font-size:13px;display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden">${name || 'Bilinmiyor'}</span>
                <span class="dash-recent-id" style="color:var(--text-muted);font-size:11px">${invoiceNo}</span>
              </div>
              <div class="dash-recent-right" style="text-align:right">
                <span class="dash-recent-date" style="color:var(--text-muted);font-size:11px;display:block">${date}</span>
                <span class="dash-recent-amount" style="color:${isGelen ? 'var(--info)' : 'var(--success)'};font-weight:700;font-size:12px">${amount}</span>
              </div>
            </div>
          `;
        }).join('');
      }
    }

    // Draw stats chart (active period)
    const { start: chartStartStr, end: chartEndStr } = getPeriodDates();
    drawStatsChart(page.querySelector('#statsChart'), purchaseItems, saleItems, chartStartStr, chartEndStr);

  } catch (e) {
    console.error('Dashboard data error:', e);
  }
}

function drawDonut(canvas, incoming, outgoing) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  const cx = w / 2, cy = h / 2, r = 70;

  ctx.clearRect(0, 0, w, h);

  const total = incoming + outgoing;
  if (total === 0) {
    // Empty donut
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 28;
    ctx.stroke();
    return;
  }

  const inAngle = (incoming / total) * 2 * Math.PI;
  const outAngle = (outgoing / total) * 2 * Math.PI;

  // Incoming (blue)
  ctx.beginPath();
  ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + inAngle);
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 28;
  ctx.lineCap = 'butt';
  ctx.stroke();

  // Outgoing (green)
  ctx.beginPath();
  ctx.arc(cx, cy, r, -Math.PI / 2 + inAngle, -Math.PI / 2 + inAngle + outAngle);
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 28;
  ctx.stroke();
}

function drawStatsChart(canvas, purchaseItems, saleItems, startDateStr, endDateStr) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width = canvas.parentElement.offsetWidth;
  const h = canvas.height = 200;
  const padding = { top: 20, right: 20, bottom: 30, left: 40 };

  ctx.clearRect(0, 0, w, h);

  // Determine date span length between start and end
  const startD = new Date(startDateStr);
  const endD = new Date(endDateStr);
  const msPerDay = 24 * 60 * 60 * 1000;
  
  // Cap at max 14 days visually for neatness
  let numDays = Math.round(Math.abs((endD - startD) / msPerDay)) + 1;
  if (numDays > 31) numDays = 31;
  if (numDays < 2) numDays = 2; // at least 2 points to draw a line

  const days = [];
  for (let i = numDays - 1; i >= 0; i--) {
    const d = new Date(endD);
    d.setDate(d.getDate() - i);
    days.push(d);
  }

  const gelenByDay = days.map(d => {
    const ds = d.toISOString().split('T')[0];
    return purchaseItems.filter(inv => {
      const iDate = (getInvoiceDate(inv) || '').split('T')[0];
      return iDate === ds;
    }).length;
  });

  const gidenByDay = days.map(d => {
    const ds = d.toISOString().split('T')[0];
    return saleItems.filter(inv => {
      const iDate = (getInvoiceDate(inv) || '').split('T')[0];
      return iDate === ds;
    }).length;
  });

  const maxVal = Math.max(1, ...gelenByDay, ...gidenByDay);
  const chartW = w - padding.left - padding.right;
  const chartH = h - padding.top - padding.bottom;

  // Grid lines
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = padding.top + (chartH / 4) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(w - padding.right, y);
    ctx.stroke();
  }

  // Draw area + line for gelen (blue)
  drawArea(ctx, gelenByDay, days, maxVal, chartW, chartH, padding, '#3b82f6', 'rgba(59,130,246,0.1)');
  // Draw area + line for giden (green)
  drawArea(ctx, gidenByDay, days, maxVal, chartW, chartH, padding, '#10b981', 'rgba(16,185,129,0.1)');

  // X Labels
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = '10px Inter, sans-serif';
  ctx.textAlign = 'center';
  days.forEach((d, i) => {
    const x = padding.left + (chartW / (days.length - 1)) * i;
    ctx.fillText(`${d.getDate()} ${['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'][d.getMonth()]}`, x, h - 8);
  });
}

function drawArea(ctx, data, days, maxVal, chartW, chartH, padding, lineColor, fillColor) {
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
  grad.addColorStop(0, fillColor);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fill();

  // Line
  ctx.beginPath();
  drawLinePath(ctx);
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();

  // Dots
  points.forEach(p => {
    if (p.y <= padding.top + chartH) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, 2 * Math.PI);
      ctx.fillStyle = '#1e293b'; // inner dark dot
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = lineColor;
      ctx.stroke();
    }
  });
}

async function loadCurrencyRates(page) {
  try {
    const res = await fetch('https://api.exchangerate.host/latest?base=TRY&symbols=USD,EUR,GBP');
    if (res.ok) {
      const data = await res.json();
      if (data.rates) {
        const usdRate = 1 / data.rates.USD;
        const eurRate = 1 / data.rates.EUR;
        const gbpRate = 1 / data.rates.GBP;
        const el = (id) => page.querySelector('#' + id);
        if (el('usdBuy')) el('usdBuy').textContent = usdRate.toFixed(2);
        if (el('usdSell')) el('usdSell').textContent = (usdRate * 1.004).toFixed(2);
        if (el('eurBuy')) el('eurBuy').textContent = eurRate.toFixed(2);
        if (el('eurSell')) el('eurSell').textContent = (eurRate * 1.004).toFixed(2);
        if (el('gbpBuy')) el('gbpBuy').textContent = gbpRate.toFixed(2);
        if (el('gbpSell')) el('gbpSell').textContent = (gbpRate * 1.004).toFixed(2);
      }
    }
  } catch (e) {
    console.log('Currency rates unavailable');
  }
}
