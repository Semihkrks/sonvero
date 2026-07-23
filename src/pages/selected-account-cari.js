import { EInvoiceWithAccount, EArchiveWithAccount } from '../api/nilvera.js';
import { fetchInvoicesSmart } from '../services/invoice-archive.js';
import { listAccounts } from '../services/account-manager.js';
import { listCollections } from '../services/tahsilat-manager.js';
import { showToast } from '../components/toast.js';
import { exportAllTransactions } from '../services/cari-export.js';

const ic = {
  search: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  download: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
  user: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  layers: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>`,
  noData: `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" opacity="0.3"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
};

function getInvoiceDate(inv) { return inv.IssueDate || inv.issueDate || inv.CreateDate || inv.CreatedDate || ''; }
function getInvoiceNumber(inv) { return inv.InvoiceNumber || inv.invoiceNumber || inv.InvoiceSerieOrNumber || ''; }
function getReceiverName(inv) { return inv.ReceiverName || inv.receiverName || inv.CustomerName || inv.customerName || (inv.CustomerInfo || {}).Name || ''; }
function getReceiverTaxNo(inv) { return inv.ReceiverTaxNumber || inv.receiverTaxNumber || inv.TaxNumber || inv.taxNumber || (inv.CustomerInfo || {}).TaxNumber || ''; }
function getSenderName(inv) { return inv.SenderName || inv.senderName || inv.SupplierName || (inv.SenderInfo || {}).Name || ''; }
function getSenderTaxNo(inv) { return inv.SenderTaxNumber || inv.senderTaxNumber || inv.TaxNumber || inv.taxNumber || (inv.SenderInfo || {}).TaxNumber || ''; }
function getAmount(inv) { return inv.PayableAmount || inv.payableAmount || inv.TotalAmount || inv.totalAmount || 0; }
function getStatus(inv) {
  const answerNote = String(inv?.Answer?.AnswerNote || inv?.answer?.answerNote || '').toUpperCase().trim();
  const answerCode = String(inv?.Answer?.AnswerCode || inv?.answer?.answerCode || inv?.AnswerCode || inv?.answerCode || '').trim();
  if (answerCode) return answerCode;
  if (answerNote === 'RED') return 'rejected';
  if (answerNote === 'KABUL') return 'accepted';
  const invoiceStatusCode = inv?.InvoiceStatus?.Code || inv?.invoiceStatus?.code || '';
  if (invoiceStatusCode) return invoiceStatusCode;
  return inv.StatusCode || inv.statusCode || inv.Status || inv.status || '';
}
function isRejected(inv) {
  const s = String(getStatus(inv) || '').toLowerCase();
  return s === 'rejected' || s === 'red' || s === 'reddedildi' || s === '2005' || s === 'rejectall';
}
function fmtCur(a) { try { return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(a); } catch { return `${a} TRY`; } }
function fmtDate(d) { try { return new Date(d).toLocaleDateString('tr-TR'); } catch { return d; } }
function getDefaultRange() { const now = new Date(); return { start: `${now.getFullYear()}-01-01`, end: now.toISOString().slice(0, 10) }; }

// ── State ──
let customerMap = {};
let allItems = [];            // export için ham (etiketli) hareketler
let selectedAccounts = [];    // tarama anındaki seçili hesaplar {id,name,color}
let selectedCustomerKey = null;
let isScanning = false;
let allAccounts = [];
let selectedIds = new Set();  // checkbox seçimi (hesaplar)
let direction = 'both';       // 'satis' | 'alis' | 'both'
let withTahsilat = true;
let exportCustomerKeys = new Set(); // Excel'e sadece bu müşteriler dahil edilsin (boşsa = hepsi)

export async function renderSelectedAccountCari() {
  customerMap = {};
  allItems = [];
  selectedCustomerKey = null;
  selectedIds = new Set();
  direction = 'both';
  withTahsilat = true;
  exportCustomerKeys = new Set();

  const page = document.createElement('div');
  page.className = 'cari-page';
  const { start, end } = getDefaultRange();

  // Hesapları yükle (checkbox listesi için)
  allAccounts = await listAccounts();
  // Varsayılan: hepsi seçili
  allAccounts.forEach(a => selectedIds.add(a.id));

  const accountChips = allAccounts.map(a => `
    <label class="sac-chip" data-id="${a.id}" style="--chip-color:${a.color || '#3b82f6'}">
      <input type="checkbox" class="sac-acc-cb" value="${a.id}" checked />
      <span class="sac-dot" style="background:${a.color || '#3b82f6'}"></span>
      <span>${a.name}</span>
    </label>
  `).join('') || `<span style="color:var(--text-muted);font-size:13px">Kayıtlı hesap yok.</span>`;

  page.innerHTML = `
    <div class="nilvera-breadcrumb">
      ${ic.layers} <span>Seçili Hesaplar Cari</span> <span class="bc-separator">›</span> <span class="bc-current">Tüm İşlemler</span>
    </div>

    <div class="nilvera-filter-bar" style="flex-wrap:wrap; gap:14px;">
      <div class="filter-group" style="flex:1 1 100%;">
        <label class="filter-label">Hesaplar <button class="sac-link" id="sacSelAll" type="button">Hepsi</button> · <button class="sac-link" id="sacSelNone" type="button">Temizle</button></label>
        <div class="sac-chips" id="sacChips">${accountChips}</div>
      </div>
      <div class="filter-group"><label class="filter-label">Başlangıç Tarihi</label><input type="date" class="filter-input" id="sacDateStart" value="${start}" /></div>
      <div class="filter-group"><label class="filter-label">Bitiş Tarihi</label><input type="date" class="filter-input" id="sacDateEnd" value="${end}" /></div>
      <div class="filter-group">
        <label class="filter-label">Yön</label>
        <div class="sac-segment" id="sacDirection">
          <button type="button" data-dir="satis">Satış</button>
          <button type="button" data-dir="alis">Alış</button>
          <button type="button" data-dir="both" class="active">Her ikisi</button>
        </div>
      </div>
      <div class="filter-group">
        <label class="filter-label">Tahsilat</label>
        <label class="sac-toggle"><input type="checkbox" id="sacTahsilat" checked /> <span>Dahil et</span></label>
      </div>
      <div class="filter-group filter-search"><label class="filter-label">Müşteri Ara</label><input type="text" class="filter-input" id="sacSearchInput" placeholder="Ad veya VKN ile ara..." style="width:100%" /></div>
      <div class="filter-actions" style="display:flex; align-items:flex-end; gap:8px;">
        <button class="btn btn-sm btn-primary" id="sacApplyBtn" style="height:34px; padding:0 20px; font-weight:600; display:flex; gap:6px;">${ic.search} SEÇİLİ HESAPLARI TARA</button>
      </div>
    </div>

    <div class="sac-export-bar" id="sacExportBar" style="display:none; flex-wrap:wrap; align-items:center; gap:10px; margin:0 0 14px; padding:10px 14px; background:var(--card-bg,#fff); border:1px solid var(--border,#e5e7eb); border-radius:8px;">
      <span style="font-weight:600; font-size:13px;" id="sacExportLabel">Tüm işlemleri Excel'e aktar:</span>
      <button class="btn btn-sm btn-success" id="sacExportTum" style="display:flex; gap:6px;">${ic.download} Tek Sayfa</button>
      <button class="btn btn-sm btn-success" id="sacExportAyri" style="display:flex; gap:6px;">${ic.download} Hesaplar Ayrı</button>
      <span id="sacExportInfo" style="font-size:12px; color:var(--text-muted); margin-left:auto;"></span>
    </div>

    <div class="cari-main-content" id="sacMainContent">
      <div class="cari-customer-list-container">
        <div class="cari-customer-list-header">
          <h3>${ic.user} Müşteriler / Tedarikçiler</h3><span class="cari-customer-count" id="sacCustomerCount">0</span>
        </div>
        <div class="sac-customer-select-bar" id="sacSelectBar" style="display:none; align-items:center; gap:8px; padding:8px 16px; border-bottom:1px solid var(--border-color); font-size:12px; color:var(--text-muted);">
          <span id="sacSelectedCount">0 firma seçili</span>
          <button class="sac-link" id="sacCustSelAll" type="button">Tümünü Seç</button>
          <span>·</span>
          <button class="sac-link" id="sacCustSelNone" type="button">Seçimi Temizle</button>
          <span style="margin-left:auto; font-style:italic;">Seçim yapmazsan tüm liste aktarılır</span>
        </div>
        <div class="cari-customer-list" id="sacCustomerList">
          <div class="cari-loading-state">${ic.noData}<p>Hesapları seçip TARA butonuna basın</p></div>
        </div>
      </div>
      <div class="cari-detail-panel" id="sacDetailPanel">
        <div class="cari-detail-empty">${ic.noData}<h3>Kayıt Seçin</h3><p>Sol taraftaki listeden seçim yapın</p></div>
      </div>
    </div>
  `;

  // ── Event bindings ──
  page.querySelector('#sacApplyBtn')?.addEventListener('click', () => loadData(page));
  page.querySelector('#sacSearchInput')?.addEventListener('input', () => renderCustomerList(page));

  page.querySelectorAll('.sac-acc-cb').forEach(cb => {
    cb.addEventListener('change', () => {
      if (cb.checked) selectedIds.add(cb.value); else selectedIds.delete(cb.value);
      cb.closest('.sac-chip')?.classList.toggle('off', !cb.checked);
    });
  });
  page.querySelector('#sacSelAll')?.addEventListener('click', () => {
    selectedIds = new Set(allAccounts.map(a => a.id));
    page.querySelectorAll('.sac-acc-cb').forEach(cb => { cb.checked = true; cb.closest('.sac-chip')?.classList.remove('off'); });
  });
  page.querySelector('#sacSelNone')?.addEventListener('click', () => {
    selectedIds = new Set();
    page.querySelectorAll('.sac-acc-cb').forEach(cb => { cb.checked = false; cb.closest('.sac-chip')?.classList.add('off'); });
  });

  page.querySelectorAll('#sacDirection button').forEach(btn => {
    btn.addEventListener('click', () => {
      direction = btn.dataset.dir;
      page.querySelectorAll('#sacDirection button').forEach(b => b.classList.toggle('active', b === btn));
    });
  });
  page.querySelector('#sacTahsilat')?.addEventListener('change', (e) => { withTahsilat = e.target.checked; });

  page.querySelector('#sacExportTum')?.addEventListener('click', () => doExport(page, 'tum'));
  page.querySelector('#sacExportAyri')?.addEventListener('click', () => doExport(page, 'ayri'));

  page.querySelector('#sacCustSelAll')?.addEventListener('click', () => {
    // Sadece o an listede görünen (aramaya uyan) müşterileri seçer
    getVisibleCustomerEntries(page).forEach(([key]) => exportCustomerKeys.add(key));
    renderCustomerList(page);
  });
  page.querySelector('#sacCustSelNone')?.addEventListener('click', () => {
    exportCustomerKeys = new Set();
    renderCustomerList(page);
  });

  return page;
}

async function loadData(page) {
  if (isScanning) return;
  if (selectedIds.size === 0) { showToast('En az bir hesap seçin.', 'error'); return; }
  isScanning = true;
  customerMap = {};
  allItems = [];
  selectedCustomerKey = null;
  exportCustomerKeys = new Set(); // yeni tarama = önceki firma seçimi geçersiz

  const listEl = page.querySelector('#sacCustomerList');
  const panelEl = page.querySelector('#sacDetailPanel');
  const exportBar = page.querySelector('#sacExportBar');
  if (exportBar) exportBar.style.display = 'none';
  if (panelEl) panelEl.innerHTML = `<div class="cari-detail-empty">${ic.noData}<h3>Kayıt Seçin</h3><p>Sol taraftan seçim yapın</p></div>`;

  allAccounts = await listAccounts();
  const accountsToScan = allAccounts.filter(a => selectedIds.has(a.id));
  selectedAccounts = accountsToScan.map(a => ({ id: a.id, name: a.name, color: a.color }));

  const startDate = page.querySelector('#sacDateStart')?.value || '';
  const endDate = page.querySelector('#sacDateEnd')?.value || '';
  const searchText = page.querySelector('#sacSearchInput')?.value.trim() || '';

  const wantSatis = direction === 'satis' || direction === 'both';
  const wantAlis = direction === 'alis' || direction === 'both';

  if (listEl) listEl.innerHTML = `<div class="cari-loading-state"><div style="animation:pulse 1.5s infinite">${ic.noData}</div><p>${accountsToScan.length} hesap taranıyor...</p></div>`;

  let totalSatis = 0, totalAlis = 0, totalTah = 0;
  const pendingInvoices = []; // { inv, acc, dir }
  const pendingTahsilats = []; // { t, acc }

  for (const acc of accountsToScan) {
    try {
      // Akıllı fetch: 6 ay limiti chunking ile aşılır, kesin aylar arşivden gelir.
      const baseParams = { StartDate: startDate, EndDate: endDate, ...(searchText && { Search: searchText }) };
      const tasks = [];
      if (wantSatis) {
        tasks.push(['satis-ef', fetchInvoicesSmart(EInvoiceWithAccount.listSales, acc, 'efatura_sale', baseParams)]);
        tasks.push(['satis-ea', fetchInvoicesSmart(EArchiveWithAccount.listInvoices, acc, 'earsiv', baseParams)]);
      }
      if (wantAlis) {
        tasks.push(['alis-ef', fetchInvoicesSmart(EInvoiceWithAccount.listPurchases, acc, 'efatura_purchase', baseParams)]);
      }
      if (withTahsilat) {
        tasks.push(['tahsilat', listCollections({ accountId: acc.id, startDate, endDate, searchText })]);
      }

      const results = await Promise.allSettled(tasks.map(t => t[1]));
      results.forEach((res, idx) => {
        if (res.status !== 'fulfilled') return;
        const kind = tasks[idx][0];
        if (kind === 'tahsilat') {
          (res.value || []).forEach(t => pendingTahsilats.push({ t: { ...t, _type: 'tahsilat' }, acc }));
        } else if (kind.startsWith('satis')) {
          res.value.forEach(i => pendingInvoices.push({ inv: { ...i, _type: kind === 'satis-ea' ? 'earsiv' : 'efatura', _direction: 'giden' }, acc }));
        } else {
          res.value.forEach(i => pendingInvoices.push({ inv: { ...i, _type: 'alis', _direction: 'gelen' }, acc }));
        }
      });
    } catch (e) {
      console.error(`Error scanning account ${acc.name}:`, e);
    }
  }

  function ensureCustomer(key, name, taxNo) {
    if (!customerMap[key]) customerMap[key] = { name, taxNo, items: [], totalSatis: 0, totalAlis: 0, totalTahsilat: 0, accountBreakdown: {} };
    if (name && name !== 'Bilinmeyen' && customerMap[key].name === 'Bilinmeyen') customerMap[key].name = name;
  }
  function ensureBreakdown(key, acc) {
    if (!customerMap[key].accountBreakdown[acc.id]) customerMap[key].accountBreakdown[acc.id] = { name: acc.name, color: acc.color, count: 0, satis: 0, alis: 0, tahsilat: 0 };
  }
  const customerKey = (taxNo, name) => (taxNo !== '—' && taxNo ? taxNo : name).toLocaleLowerCase('tr-TR').trim();

  // GEÇİŞ 1 — Faturalar (satış=giden / alış=gelen)
  for (const { inv, acc } of pendingInvoices) {
    if (isRejected(inv)) continue;
    const isGelen = inv._direction === 'gelen';
    const name = (isGelen ? getSenderName(inv) : getReceiverName(inv)) || 'Bilinmeyen';
    const taxNo = (isGelen ? getSenderTaxNo(inv) : getReceiverTaxNo(inv)) || '—';
    const amount = parseFloat(getAmount(inv) || 0);
    const key = customerKey(taxNo, name);

    ensureCustomer(key, name, taxNo);
    customerMap[key].items.push({ ...inv, _accountName: acc.name, _accountId: acc.id, _accountColor: acc.color });
    ensureBreakdown(key, acc);
    if (isGelen) { customerMap[key].totalAlis += amount; customerMap[key].accountBreakdown[acc.id].alis += amount; totalAlis++; }
    else { customerMap[key].totalSatis += amount; customerMap[key].accountBreakdown[acc.id].satis += amount; totalSatis++; }
    customerMap[key].accountBreakdown[acc.id].count++;

    allItems.push({ ...inv, _accountName: acc.name, _accountId: acc.id, _accountColor: acc.color });
  }

  // GEÇİŞ 2 — Tahsilatlar
  for (const { t, acc } of pendingTahsilats) {
    let name = t.customer_name || 'Bilinmeyen';
    let taxNo = t.customer_tax_no || '—';
    const amount = parseFloat(t.amount || 0);
    let key = customerKey(taxNo, name);

    if (taxNo === '—' || !taxNo) {
      const normName = name.toLocaleLowerCase('tr-TR').trim();
      const match = Object.entries(customerMap).find(([, c]) => {
        const cName = c.name.toLocaleLowerCase('tr-TR').trim();
        if (cName === normName) return true;
        if (cName.includes(normName) && normName.length > 4) return true;
        if (normName.includes(cName) && cName.length > 4) return true;
        return false;
      });
      if (match) { key = match[0]; name = match[1].name; taxNo = match[1].taxNo; }
    }

    ensureCustomer(key, name, taxNo);
    customerMap[key].items.push({ ...t, _accountName: acc.name, _accountId: acc.id, _accountColor: acc.color });
    ensureBreakdown(key, acc);
    customerMap[key].totalTahsilat += amount;
    customerMap[key].accountBreakdown[acc.id].tahsilat += amount;
    totalTah++;

    allItems.push({ ...t, _accountName: acc.name, _accountId: acc.id, _accountColor: acc.color });
  }

  Object.values(customerMap).forEach(c => {
    c.items.sort((a, b) => {
      const dateA = a._type === 'tahsilat' ? a.date : getInvoiceDate(a);
      const dateB = b._type === 'tahsilat' ? b.date : getInvoiceDate(b);
      return new Date(dateB || 0).getTime() - new Date(dateA || 0).getTime();
    });
  });

  isScanning = false;
  if (exportBar && allItems.length > 0) {
    exportBar.style.display = 'flex';
    const info = page.querySelector('#sacExportInfo');
    if (info) info.textContent = `${totalSatis} satış · ${totalAlis} alış · ${totalTah} tahsilat`;
  }
  showToast(`${accountsToScan.length} hesap tarandı: ${totalSatis} satış, ${totalAlis} alış, ${totalTah} tahsilat.`, 'success');
  renderCustomerList(page);
}

// Arama kutusuna uyan müşterileri döner (aynı sıralama/filtre mantığı listeyle paylaşılır).
function getVisibleCustomerEntries(page) {
  const search = (page.querySelector('#sacSearchInput')?.value || '').toLocaleLowerCase('tr-TR').trim();
  return Object.entries(customerMap).filter(([key, c]) => {
    if (!search) return true;
    return c.name.toLocaleLowerCase('tr-TR').includes(search) || c.taxNo.includes(search) || key.includes(search);
  }).sort((a, b) => (b[1].totalSatis + b[1].totalAlis) - (a[1].totalSatis + a[1].totalAlis));
}

function renderCustomerList(page) {
  const listEl = page.querySelector('#sacCustomerList');
  const countEl = page.querySelector('#sacCustomerCount');
  if (!listEl) return;

  const entries = getVisibleCustomerEntries(page);

  if (countEl) countEl.textContent = entries.length;
  updateExportBar(page);

  if (entries.length === 0) {
    listEl.innerHTML = `<div class="cari-loading-state">${ic.noData}<h3>Kayıt bulunamadı</h3></div>`;
    return;
  }

  listEl.innerHTML = entries.map(([key, c]) => {
    const initials = c.name.substring(0, 2).toUpperCase() || '??';
    const satisCount = c.items.filter(x => x._type !== 'tahsilat' && x._direction !== 'gelen').length;
    const alisCount = c.items.filter(x => x._direction === 'gelen').length;
    const tahCount = c.items.filter(x => x._type === 'tahsilat').length;
    const bakiye = c.totalSatis - c.totalAlis - c.totalTahsilat;
    const isChecked = exportCustomerKeys.has(key);
    return `
      <div class="cari-customer-item ${selectedCustomerKey === key ? 'active' : ''} ${isChecked ? 'export-selected' : ''}" data-key="${key}">
        <label class="sac-customer-check" title="Excel'e dahil et">
          <input type="checkbox" class="sac-customer-cb" value="${key}" ${isChecked ? 'checked' : ''} />
        </label>
        <div class="cari-customer-avatar">${initials}</div>
        <div class="cari-customer-info">
          <span class="cari-customer-name">${c.name}</span>
          <span class="cari-customer-vkn">VKN: ${c.taxNo}</span>
          <span class="cari-customer-meta">${satisCount} satış · ${alisCount} alış · ${tahCount} tahsilat · ${Object.keys(c.accountBreakdown).length} hesap</span>
        </div>
        <div class="cari-customer-amounts" style="display:flex; gap:10px; margin-top:8px;">
          <div style="text-align:right"><div class="cari-customer-bakiye" style="color:var(--success);font-size:12px">${fmtCur(c.totalSatis)}</div><div class="cari-customer-bakiye-label" style="font-size:10px">Satış</div></div>
          <div style="text-align:right"><div class="cari-customer-bakiye" style="color:var(--warning);font-size:12px">${fmtCur(c.totalAlis)}</div><div class="cari-customer-bakiye-label" style="font-size:10px">Alış</div></div>
          <div style="text-align:right"><div class="cari-customer-bakiye" style="color:var(--info);font-size:12px">${fmtCur(c.totalTahsilat)}</div><div class="cari-customer-bakiye-label" style="font-size:10px">Tahsilat</div></div>
          <div style="text-align:right"><div class="cari-customer-bakiye" style="color:${bakiye > 0 ? 'var(--warning)' : 'var(--success)'};font-size:14px;font-weight:700">${fmtCur(bakiye)}</div><div class="cari-customer-bakiye-label" style="font-size:10px">Bakiye</div></div>
        </div>
      </div>`;
  }).join('');

  listEl.querySelectorAll('.cari-customer-item').forEach(item => {
    item.addEventListener('click', () => {
      selectedCustomerKey = item.dataset.key;
      listEl.querySelectorAll('.cari-customer-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      renderDetailPanel(page, customerMap[selectedCustomerKey]);
    });

    // Checkbox: satırın "detay göster" tıklamasını tetiklemeden Excel seçimini değiştirir.
    const cb = item.querySelector('.sac-customer-cb');
    cb?.addEventListener('click', (e) => e.stopPropagation());
    cb?.addEventListener('change', () => {
      const key = item.dataset.key;
      if (cb.checked) exportCustomerKeys.add(key); else exportCustomerKeys.delete(key);
      item.classList.toggle('export-selected', cb.checked);
      updateExportBar(page);
    });
  });
}

// Excel export barındaki etiket, sayaç ve "seçili firma" bandını günceller.
function updateExportBar(page) {
  const selectBar = page.querySelector('#sacSelectBar');
  const selectedCountEl = page.querySelector('#sacSelectedCount');
  const exportLabel = page.querySelector('#sacExportLabel');
  const count = exportCustomerKeys.size;

  if (selectBar) selectBar.style.display = Object.keys(customerMap).length > 0 ? 'flex' : 'none';
  if (selectedCountEl) selectedCountEl.textContent = count > 0 ? `${count} firma seçili` : 'Hiç firma seçili değil';
  if (exportLabel) {
    exportLabel.textContent = count > 0
      ? `Seçili ${count} firmanın işlemlerini Excel'e aktar:`
      : `Tüm işlemleri Excel'e aktar:`;
  }
}

function renderDetailPanel(page, customer) {
  const panel = page.querySelector('#sacDetailPanel');
  if (!panel) return;

  const breakdownHtml = Object.values(customer.accountBreakdown).sort((a, b) => (b.satis + b.alis) - (a.satis + a.alis)).map(acc => `
    <div class="cari-detail-stat" style="border-left: 4px solid ${acc.color || '#ccc'}; flex: 1; min-width: 150px;">
      <span class="cari-detail-stat-label">${acc.name}</span>
      <span class="cari-detail-stat-value" style="font-size:12px">${acc.count} hareket</span>
      <div style="display:flex;flex-direction:column;gap:2px;margin-top:4px;">
        <span class="cari-detail-stat-value" style="color:var(--success);font-size:12px">Satış: ${fmtCur(acc.satis)}</span>
        <span class="cari-detail-stat-value" style="color:var(--warning);font-size:12px">Alış: ${fmtCur(acc.alis)}</span>
        <span class="cari-detail-stat-value" style="color:var(--info);font-size:12px">Tahsilat: ${fmtCur(acc.tahsilat)}</span>
      </div>
    </div>
  `).join('');

  const rows = customer.items.map(inv => {
    const isTahsilat = inv._type === 'tahsilat';
    const isGelen = inv._direction === 'gelen';
    const tur = isTahsilat ? 'Tahsilat' : (isGelen ? 'Alış' : 'Satış');
    const turColor = isTahsilat ? 'var(--info)' : (isGelen ? 'var(--warning)' : 'var(--success)');
    const amount = isTahsilat ? inv.amount : getAmount(inv);
    return `
    <tr>
      <td>${fmtDate(isTahsilat ? inv.date : getInvoiceDate(inv))}</td>
      <td><span class="badge" style="background:${inv._accountColor || '#666'};color:#fff">${inv._accountName}</span></td>
      <td><span style="color:${turColor};font-weight:600">${tur}</span></td>
      <td>${isTahsilat ? (inv.description || '—') : getInvoiceNumber(inv)}</td>
      <td style="text-align:right; font-weight:600; color:${turColor}">${fmtCur(amount)}</td>
    </tr>`;
  }).join('');

  const bakiye = customer.totalSatis - customer.totalAlis - customer.totalTahsilat;

  panel.innerHTML = `
    <div class="cari-detail-header">
      <div class="cari-detail-title">
        <h3>${customer.name}</h3><span class="cari-detail-vkn">VKN: ${customer.taxNo}</span>
      </div>
      <div class="cari-detail-actions" style="font-weight:700; color:${bakiye > 0 ? 'var(--warning)' : 'var(--success)'}">Bakiye: ${fmtCur(bakiye)}</div>
    </div>

    <div style="margin-bottom:15px">
      <h4 style="margin-bottom:10px; font-size:13px; color:var(--text-muted); text-transform:uppercase;">Hesaplara Göre Kırılım</h4>
      <div class="cari-detail-summary">${breakdownHtml}</div>
    </div>

    <div class="cari-detail-table-wrap">
      <table class="cari-detail-table">
        <thead><tr><th>Tarih</th><th>Hesap</th><th>Tür</th><th>Belge</th><th style="text-align:right">Tutar</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="5">Kayıt yok</td></tr>'}</tbody>
      </table>
    </div>
  `;
}

// Firma seçimi yapıldıysa sadece o firmaların hareketlerini döner, yoksa hepsini.
function getExportItems() {
  if (exportCustomerKeys.size === 0) return allItems;
  const items = [];
  exportCustomerKeys.forEach((key) => {
    const c = customerMap[key];
    if (c) items.push(...c.items);
  });
  return items;
}

async function doExport(page, layout) {
  const items = getExportItems();
  if (items.length === 0) {
    showToast(allItems.length === 0 ? 'Önce tarama yapın.' : 'Seçili firmalarda hareket bulunamadı.', 'error');
    return;
  }
  try {
    const selCount = exportCustomerKeys.size;
    showToast(selCount > 0 ? `${selCount} firma için Excel hazırlanıyor...` : 'Excel hazırlanıyor...', 'info');
    const res = await exportAllTransactions(items, selectedAccounts, { layout, direction, withTahsilat });
    if (res.success) showToast(`Excel indirildi (${res.count} hareket${selCount > 0 ? `, ${selCount} firma` : ''}).`, 'success');
    else showToast('Hata: ' + res.error, 'error');
  } catch (e) {
    showToast('Hata: ' + e.message, 'error');
  }
}
