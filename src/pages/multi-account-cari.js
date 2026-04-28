import { EInvoiceWithAccount, EArchiveWithAccount } from '../api/nilvera.js';
import { listAccounts } from '../services/account-manager.js';
import { showToast } from '../components/toast.js';
import { attachDatePicker } from '../lib/date-picker.js';
import { exportMultiAccountCari } from '../services/cari-export.js';

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
function getAmount(inv) { return inv.PayableAmount || inv.payableAmount || inv.TotalAmount || inv.totalAmount || 0; }
function fmtCur(a) { try { return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(a); } catch { return `${a} TRY`; } }
function fmtDate(d) { try { return new Date(d).toLocaleDateString('tr-TR'); } catch { return d; } }
function getDefaultRange() { const now = new Date(); return { start: `${now.getFullYear()}-01-01`, end: now.toISOString().slice(0,10) }; }

let customerMap = {};
let selectedCustomerKey = null;
let isScanning = false;
let allAccounts = [];

export async function renderMultiAccountCari() {
  customerMap = {};
  selectedCustomerKey = null;
  const page = document.createElement('div');
  page.className = 'cari-page';
  const { start, end } = getDefaultRange();

  page.innerHTML = `
    <div class="nilvera-breadcrumb">
      ${ic.layers} <span>Tüm Hesaplar Cari</span> <span class="bc-separator">›</span> <span class="bc-current">Satış Faturaları</span>
    </div>
    <div class="nilvera-filter-bar">
      <div class="filter-group"><label class="filter-label">Başlangıç Tarihi</label><input type="date" class="filter-input" id="macDateStart" value="${start}" /></div>
      <div class="filter-group"><label class="filter-label">Bitiş Tarihi</label><input type="date" class="filter-input" id="macDateEnd" value="${end}" /></div>
      <div class="filter-group filter-search"><label class="filter-label">Müşteri Ara</label><input type="text" class="filter-input" id="macSearchInput" placeholder="Ad veya VKN ile ara..." style="width:100%" /></div>
      <div class="filter-actions" style="display:flex; align-items:flex-end;">
        <button class="btn btn-sm btn-primary" id="macApplyBtn" style="height:34px; padding:0 20px; font-weight:600; display:flex; gap:6px;">${ic.search} TÜM HESAPLARI TARA</button>
      </div>
    </div>
    <div class="cari-main-content" id="macMainContent">
      <div class="cari-customer-list-container">
        <div class="cari-customer-list-header">
          <h3>${ic.user} Müşteriler</h3><span class="cari-customer-count" id="macCustomerCount">0</span>
        </div>
        <div class="cari-customer-list" id="macCustomerList">
          <div class="cari-loading-state">${ic.noData}<p>Verileri yüklemek için TARA butonuna basın</p></div>
        </div>
      </div>
      <div class="cari-detail-panel" id="macDetailPanel">
        <div class="cari-detail-empty">${ic.noData}<h3>Müşteri Seçin</h3><p>Sol taraftaki listeden bir müşteri seçin</p></div>
      </div>
    </div>
  `;

  page.querySelector('#macApplyBtn')?.addEventListener('click', () => loadMultiAccountData(page));
  page.querySelector('#macSearchInput')?.addEventListener('input', () => renderCustomerList(page));

  return page;
}

function extractItems(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.Content)) return data.Content;
  if (Array.isArray(data.Items)) return data.Items;
  if (Array.isArray(data.items)) return data.items;
  return [];
}

async function fetchAllPagesForAccount(apiFn, account, baseParams) {
  let items = [];
  let pg = 1, totalPages = 1;
  do {
    const res = await apiFn(account, { ...baseParams, Page: pg, PageSize: 100 });
    if (!res.success) break;
    items.push(...extractItems(res.data));
    totalPages = res.data?.TotalPages || 1;
    pg++;
  } while (pg <= totalPages && pg <= 20);
  return items;
}

async function loadMultiAccountData(page) {
  if (isScanning) return;
  isScanning = true;
  customerMap = {};
  selectedCustomerKey = null;

  const listEl = page.querySelector('#macCustomerList');
  const panelEl = page.querySelector('#macDetailPanel');
  if (panelEl) panelEl.innerHTML = `<div class="cari-detail-empty">${ic.noData}<h3>Müşteri Seçin</h3><p>Sol taraftan seçim yapın</p></div>`;
  
  allAccounts = await listAccounts();
  if (allAccounts.length === 0) {
    showToast('Kayıtlı hesap bulunamadı.', 'error');
    isScanning = false;
    return;
  }

  const startDate = page.querySelector('#macDateStart')?.value || '';
  const endDate = page.querySelector('#macDateEnd')?.value || '';

  if (listEl) {
    listEl.innerHTML = `<div class="cari-loading-state"><div style="animation:pulse 1.5s infinite">${ic.noData}</div><p>${allAccounts.length} hesap taranıyor...</p></div>`;
  }

  let totalInvoices = 0;
  await Promise.allSettled(allAccounts.map(async (acc) => {
    try {
      const [efRes, eaRes] = await Promise.allSettled([
        fetchAllPagesForAccount(EInvoiceWithAccount.listSales, acc, { StartDate: startDate, EndDate: endDate }),
        fetchAllPagesForAccount(EArchiveWithAccount.listInvoices, acc, { StartDate: startDate, EndDate: endDate })
      ]);
      const invs = [];
      if (efRes.status === 'fulfilled') invs.push(...efRes.value.map(i => ({ ...i, _type: 'efatura' })));
      if (eaRes.status === 'fulfilled') invs.push(...eaRes.value.map(i => ({ ...i, _type: 'earsiv' })));

      invs.forEach(inv => {
        const name = getReceiverName(inv) || 'Bilinmeyen';
        const taxNo = getReceiverTaxNo(inv) || '—';
        const key = (taxNo !== '—' && taxNo ? taxNo : name).toLowerCase().trim();
        const amount = parseFloat(getAmount(inv) || 0);
        
        if (!customerMap[key]) {
          customerMap[key] = { name, taxNo, invoices: [], totalAmount: 0, accountBreakdown: {} };
        }
        if (name !== 'Bilinmeyen') customerMap[key].name = name;
        
        customerMap[key].invoices.push({ ...inv, _accountName: acc.name, _accountId: acc.id, _accountColor: acc.color });
        customerMap[key].totalAmount += amount;
        
        if (!customerMap[key].accountBreakdown[acc.id]) {
          customerMap[key].accountBreakdown[acc.id] = { name: acc.name, color: acc.color, invoiceCount: 0, totalAmount: 0 };
        }
        customerMap[key].accountBreakdown[acc.id].invoiceCount++;
        customerMap[key].accountBreakdown[acc.id].totalAmount += amount;
        totalInvoices++;
      });
    } catch (e) {
      console.error(`Error scanning account ${acc.name}:`, e);
    }
  }));

  Object.values(customerMap).forEach(c => {
    c.invoices.sort((a, b) => new Date(getInvoiceDate(b) || 0).getTime() - new Date(getInvoiceDate(a) || 0).getTime());
  });

  isScanning = false;
  showToast(`${allAccounts.length} hesaptan toplam ${totalInvoices} satış faturası tarandı.`, 'success');
  renderCustomerList(page);
}

function renderCustomerList(page) {
  const listEl = page.querySelector('#macCustomerList');
  const countEl = page.querySelector('#macCustomerCount');
  if (!listEl) return;

  const searchRaw = page.querySelector('#macSearchInput')?.value || '';
  const search = searchRaw.toLocaleLowerCase('tr-TR').trim();

  const entries = Object.entries(customerMap).filter(([key, c]) => {
    if (!search) return true;
    return c.name.toLocaleLowerCase('tr-TR').includes(search) || c.taxNo.includes(search) || key.includes(search);
  }).sort((a, b) => b[1].totalAmount - a[1].totalAmount);

  if (countEl) countEl.textContent = entries.length;

  if (entries.length === 0) {
    listEl.innerHTML = `<div class="cari-loading-state">${ic.noData}<h3>Müşteri bulunamadı</h3></div>`;
    return;
  }

  listEl.innerHTML = entries.map(([key, c]) => {
    const initials = c.name.substring(0, 2).toUpperCase() || '??';
    return `
      <div class="cari-customer-item ${selectedCustomerKey === key ? 'active' : ''}" data-key="${key}">
        <div class="cari-customer-avatar">${initials}</div>
        <div class="cari-customer-info">
          <span class="cari-customer-name">${c.name}</span>
          <span class="cari-customer-vkn">VKN: ${c.taxNo}</span>
          <span class="cari-customer-meta">${c.invoices.length} fatura · ${Object.keys(c.accountBreakdown).length} hesap</span>
        </div>
        <div class="cari-customer-amounts">
          <span class="cari-customer-bakiye cari-bakiye-positive">${fmtCur(c.totalAmount)}</span>
          <span class="cari-customer-bakiye-label">Toplam Satış</span>
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
  });
}

function renderDetailPanel(page, customer) {
  const panel = page.querySelector('#macDetailPanel');
  if (!panel) return;

  const breakdownHtml = Object.values(customer.accountBreakdown).sort((a,b) => b.totalAmount - a.totalAmount).map(acc => `
    <div class="cari-detail-stat" style="border-left: 4px solid ${acc.color || '#ccc'}">
      <span class="cari-detail-stat-label">${acc.name}</span>
      <span class="cari-detail-stat-value" style="font-size:14px">${acc.invoiceCount} fatura</span>
      <span class="cari-detail-stat-value" style="color:var(--success)">${fmtCur(acc.totalAmount)}</span>
    </div>
  `).join('');

  const rows = customer.invoices.map(inv => `
    <tr>
      <td>${fmtDate(getInvoiceDate(inv))}</td>
      <td><span class="badge" style="background:${inv._accountColor || '#666'};color:#fff">${inv._accountName}</span></td>
      <td>${getInvoiceNumber(inv)}</td>
      <td style="text-align:right; font-weight:600; color:var(--success)">${fmtCur(getAmount(inv))}</td>
    </tr>
  `).join('');

  panel.innerHTML = `
    <div class="cari-detail-header">
      <div class="cari-detail-title">
        <h3>${customer.name}</h3><span class="cari-detail-vkn">VKN: ${customer.taxNo}</span>
      </div>
      <div class="cari-detail-actions">
        <button class="btn btn-sm btn-success" id="macExportBtn">${ic.download} Excel'e Aktar</button>
      </div>
    </div>
    
    <div style="margin-bottom:15px">
      <h4 style="margin-bottom:10px; font-size:13px; color:var(--text-muted); text-transform:uppercase;">Hesaplara Göre Satış Kırılımı</h4>
      <div class="cari-detail-summary">${breakdownHtml}</div>
    </div>

    <div class="cari-detail-table-wrap">
      <table class="cari-detail-table">
        <thead><tr><th>Tarih</th><th>Hesap</th><th>Fatura No</th><th style="text-align:right">Tutar (Satış)</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="4">Kayıt yok</td></tr>'}</tbody>
      </table>
    </div>
  `;

  panel.querySelector('#macExportBtn')?.addEventListener('click', async () => {
    try {
      showToast('Excel hazırlanıyor...', 'info');
      await exportMultiAccountCari(customer.invoices, customer.name, customer.accountBreakdown);
      showToast('Excel başarıyla indirildi.', 'success');
    } catch (e) {
      showToast('Hata: ' + e.message, 'error');
    }
  });
}
