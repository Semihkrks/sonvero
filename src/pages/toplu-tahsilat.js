// ══════════════════════════════════════════
// Toplu Tahsilat — dekont oku, kontrol et, kaydet
// ══════════════════════════════════════════
import { EInvoiceWithAccount, EArchiveWithAccount } from '../api/nilvera.js';
import { fetchInvoicesSmart } from '../services/invoice-archive.js';
import { listAccounts } from '../services/account-manager.js';
import { addCollection, listCollections } from '../services/tahsilat-manager.js';
import { showToast } from '../components/toast.js';
import {
  parseStatementFile,
  matchTransactionsToCustomers,
  routeTransactionsToAccounts,
  parseUserAmount,
  formatUserAmount,
  isDecimalInProgress
} from '../services/bank-statement-parser.js';

const ic = {
  upload: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`,
  layers: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>`
};

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function customerKey(name, taxNo) {
  const tax = String(taxNo || '').replace(/\s/g, '');
  const usableTax = tax && tax !== '—' && !tax.includes('*') ? tax : '';
  return (usableTax || name || 'bilinmeyen').toLocaleLowerCase('tr-TR').trim();
}

function rememberCustomer(map, name, taxNo) {
  const n = String(name || '').trim();
  if (!n || n === 'Bilinmeyen') return;
  const key = customerKey(n, taxNo);
  if (!key) return;
  const tax = String(taxNo || '').replace(/\s/g, '');
  if (!map[key]) map[key] = { name: n, taxNo: tax && tax !== '—' ? tax : '' };
  else if (n.length > map[key].name.length) map[key].name = n;
}

export async function renderTopluTahsilat() {
  const page = document.createElement('div');
  page.className = 'cari-page tt-page';

  let accounts = [];
  try { accounts = await listAccounts() || []; } catch { accounts = []; }

  const customerMap = {};
  let rows = [];
  let customerCount = 0;
  let loadingCustomers = true;

  page.innerHTML = `
    <div class="nilvera-breadcrumb">
      ${ic.layers} <span>Cari</span> <span class="bc-separator">›</span> <span class="bc-current">Toplu Tahsilat</span>
    </div>
    <p class="tt-lead">Dekontları bırak. Alıcı Sonvera hesabı, gönderen müşteri, tutar ve tarih okunur. Kaydetmeden önce kontrol et; müşteriyi, tarihi, hesabı ve tutarı değiştirebilirsin.</p>
    <div class="import-upload-zone" id="ttDrop">
      <div class="import-upload-icon">${ic.upload}</div>
      <h3>Dekontları sürükle veya seç</h3>
      <p>Birden fazla PDF, Excel veya CSV. Her dekont ayrı satır olarak açılır.</p>
      <input type="file" id="ttFiles" accept=".pdf,.xlsx,.xls,.csv,application/pdf" multiple style="display:none" />
      <button class="btn btn-sm btn-primary" id="ttPick" type="button" style="margin-top:12px">Dosya Seç</button>
    </div>
    <p class="tt-status" id="ttStatus">Müşteri listesi yükleniyor…</p>
    <div id="ttReview" style="display:none"></div>
  `;

  const drop = page.querySelector('#ttDrop');
  const fileInput = page.querySelector('#ttFiles');
  const review = page.querySelector('#ttReview');
  const statusEl = page.querySelector('#ttStatus');

  const setStatus = () => {
    if (!statusEl) return;
    const n = Object.keys(customerMap).length;
    customerCount = n;
    statusEl.textContent = loadingCustomers
      ? `Müşteri listesi yükleniyor… şu an ${n} kayıt`
      : `${n} müşteri hazır. Eşleşmeyen satırda listeden seç.`;
  };

  const decorate = (tx) => {
    const routed = routeTransactionsToAccounts([{ ...tx }], accounts)[0] || tx;
    const { matched } = matchTransactionsToCustomers([routed], customerMap);
    const hit = matched[0];
    return {
      ...routed,
      ...(hit || {}),
      selected: true,
      customerTouched: false,
      accountTouched: false,
      id: crypto.randomUUID()
    };
  };

  const rematchUntouched = () => {
    rows = rows.map(row => {
      if (row.customerTouched && row.accountTouched) return row;
      const next = decorate({
        ...row,
        matchedCustomerKey: undefined,
        matchedCustomerName: undefined,
        matchedCustomerTaxNo: undefined
      });
      return {
        ...row,
        routedAccountId: row.accountTouched ? row.routedAccountId : next.routedAccountId,
        routedAccountName: row.accountTouched ? row.routedAccountName : next.routedAccountName,
        matchedCustomerKey: row.customerTouched ? row.matchedCustomerKey : next.matchedCustomerKey,
        matchedCustomerName: row.customerTouched ? row.matchedCustomerName : next.matchedCustomerName,
        matchedCustomerTaxNo: row.customerTouched ? row.matchedCustomerTaxNo : next.matchedCustomerTaxNo,
        matchScore: row.customerTouched ? row.matchScore : next.matchScore
      };
    });
  };

  const renderReview = () => {
    if (!rows.length) {
      review.style.display = 'none';
      review.innerHTML = '';
      return;
    }
    review.style.display = 'block';
    const ready = rows.filter(r => r.selected && r.matchedCustomerKey && r.routedAccountId && r.date && r.amount > 0).length;
    review.innerHTML = `
      <div class="import-summary-bar">
        <span><strong>${rows.length}</strong> dekont</span>
        <span class="import-summary-matched">${ready} kayda hazır</span>
        <label class="import-select-all" style="margin-left:auto;display:flex;align-items:center;gap:6px;cursor:pointer">
          <input type="checkbox" id="ttAll" ${rows.every(r => r.selected) ? 'checked' : ''} /> Tümünü seç
        </label>
        <button class="btn btn-sm btn-primary" id="ttSave" type="button">Seçilenleri Kaydet</button>
      </div>
      <div class="tt-list">
        ${rows.map(row => rowHtml(row, accounts)).join('')}
      </div>
    `;
    bindReview();
  };

  page.querySelector('#ttPick')?.addEventListener('click', () => fileInput?.click());
  fileInput?.addEventListener('change', () => {
    if (fileInput.files?.length) ingest(fileInput.files);
    fileInput.value = '';
  });
  drop?.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('drag-over'); });
  drop?.addEventListener('dragleave', () => drop.classList.remove('drag-over'));
  drop?.addEventListener('drop', (e) => {
    e.preventDefault();
    drop.classList.remove('drag-over');
    if (e.dataTransfer.files?.length) ingest(e.dataTransfer.files);
  });

  async function ingest(fileList) {
    const files = [...fileList];
    showToast(`${files.length} dosya okunuyor…`, 'info');
    const fresh = [];
    for (const file of files) {
      try {
        const txs = await parseStatementFile(file);
        if (!txs?.length) {
          fresh.push(decorate({
            date: '', amount: 0, description: '', senderName: '', receiverName: '',
            displayDescription: 'Gelen Ödeme (Dekont)', rawDescription: '',
            source: 'pdf-dekont', confidence: 'low', fileName: file.name
          }));
        } else {
          txs.forEach(tx => fresh.push(decorate(tx)));
        }
      } catch (e) {
        fresh.push(decorate({
          date: '', amount: 0, description: '', senderName: '', receiverName: '',
          displayDescription: 'Gelen Ödeme (Dekont)', rawDescription: e.message || '',
          source: 'pdf-dekont', confidence: 'low', fileName: file.name
        }));
      }
    }
    rows = rows.concat(fresh);
    renderReview();
    showToast(`${fresh.length} satır kontrol listesine eklendi.`, 'success');
  }

  function bindReview() {
    review.querySelector('#ttAll')?.addEventListener('change', (e) => {
      rows.forEach(r => { r.selected = e.target.checked; });
      renderReview();
    });
    review.querySelector('#ttSave')?.addEventListener('click', saveSelected);

    review.querySelectorAll('[data-field]').forEach(el => {
      const row = rows.find(r => r.id === el.dataset.id);
      if (!row) return;
      const field = el.dataset.field;

      if (field === 'selected') {
        el.addEventListener('change', () => { row.selected = el.checked; });
        return;
      }
      if (field === 'date') {
        el.addEventListener('change', () => { row.date = el.value; });
        return;
      }
      if (field === 'account') {
        el.addEventListener('change', () => {
          row.accountTouched = true;
          row.routedAccountId = el.value;
          row.routedAccountName = accounts.find(a => a.id === el.value)?.name || '';
        });
        return;
      }
      if (field === 'amount') {
        el.addEventListener('input', () => {
          row.amount = parseUserAmount(el.value);
          if (isDecimalInProgress(el.value)) return;
          const formatted = formatUserAmount(el.value);
          if (formatted && formatted !== el.value) el.value = formatted;
        });
        el.addEventListener('blur', () => {
          el.value = row.amount ? formatUserAmount(row.amount) : '';
        });
        return;
      }
      if (field === 'customer') {
        const menu = el.parentElement?.querySelector('.tt-menu');
        const paint = () => {
          if (!menu) return;
          const q = el.value.toLocaleLowerCase('tr-TR').trim();
          const hits = Object.entries(customerMap)
            .filter(([, c]) => !q || c.name.toLocaleLowerCase('tr-TR').includes(q) || String(c.taxNo || '').includes(q))
            .slice(0, 12);
          if (!hits.length) {
            menu.innerHTML = `<div class="tt-menu-empty">${customerCount ? 'Eşleşen müşteri yok' : 'Müşteri listesi henüz gelmedi'}</div>`;
          } else {
            menu.innerHTML = hits.map(([key, c]) => `
              <button type="button" class="tt-menu-item" data-key="${esc(key)}">
                <strong>${esc(c.name)}</strong>
                <span>${esc(c.taxNo || '')}</span>
              </button>
            `).join('');
          }
          menu.hidden = false;
          menu.querySelectorAll('.tt-menu-item').forEach(btn => {
            btn.addEventListener('mousedown', (ev) => {
              ev.preventDefault();
              const key = btn.dataset.key;
              const c = customerMap[key];
              if (!c) return;
              row.customerTouched = true;
              row.matchedCustomerKey = key;
              row.matchedCustomerName = c.name;
              row.matchedCustomerTaxNo = c.taxNo || '';
              row.matchScore = 100;
              el.value = c.name;
              menu.hidden = true;
            });
          });
        };
        el.addEventListener('focus', paint);
        el.addEventListener('input', () => {
          row.customerTouched = true;
          row.matchedCustomerKey = '';
          row.matchedCustomerName = '';
          row.matchedCustomerTaxNo = '';
          paint();
        });
        el.addEventListener('blur', () => {
          setTimeout(() => { if (menu) menu.hidden = true; }, 150);
        });
      }
    });
  }

  async function saveSelected() {
    const selected = rows.filter(r => r.selected);
    if (!selected.length) {
      showToast('Kaydedilecek satır seçilmedi.', 'warning');
      return;
    }
    const btn = review.querySelector('#ttSave');
    if (btn) { btn.disabled = true; btn.textContent = 'Kaydediliyor…'; }
    let ok = 0;
    let skip = 0;
    for (const row of selected) {
      if (!row.routedAccountId || !row.matchedCustomerKey || !row.date || !(row.amount > 0)) {
        skip++;
        continue;
      }
      try {
        await addCollection({
          account_id: row.routedAccountId,
          customer_key: row.matchedCustomerKey,
          customer_name: row.matchedCustomerName,
          customer_tax_no: row.matchedCustomerTaxNo || '',
          type: 'Tahsilat',
          description: 'Gelen Ödeme (Dekont)',
          amount: row.amount,
          date: row.date
        });
        ok++;
        row.saved = true;
        row.selected = false;
      } catch {
        skip++;
      }
    }
    rows = rows.filter(r => !r.saved);
    renderReview();
    if (ok) showToast(`${ok} tahsilat kaydedildi${skip ? `, ${skip} satır eksik veya hatalı` : ''}.`, 'success');
    else showToast('Kaydedilmedi. Müşteri, hesap, tarih ve tutar dolu olmalı.', 'error');
  }

  loadCustomers(accounts, customerMap, () => {
    loadingCustomers = false;
    rematchUntouched();
    const focused = page.querySelector('input:focus, select:focus, textarea:focus');
    if (!focused) renderReview();
    setStatus();
  }, () => {
    setStatus();
    rematchUntouched();
    const focused = page.querySelector('input:focus, select:focus, textarea:focus');
    if (!focused) renderReview();
  });

  setStatus();
  return page;
}

function rowHtml(row, accounts) {
  const conf = row.confidence || 'low';
  const confLabel = conf === 'high' ? 'Net' : conf === 'mid' ? 'Kontrol' : 'Eksik';
  const accountOptions = [`<option value="">Hesap seç</option>`]
    .concat(accounts.map(a => `<option value="${esc(a.id)}" ${a.id === row.routedAccountId ? 'selected' : ''}>${esc(a.name)}</option>`))
    .join('');
  return `
    <article class="tt-row ${row.confidence === 'low' ? 'tt-row-low' : ''}">
      <label class="tt-check"><input type="checkbox" data-field="selected" data-id="${esc(row.id)}" ${row.selected ? 'checked' : ''} /></label>
      <div class="tt-file">
        <span class="import-score import-score-${conf === 'high' ? 'high' : conf === 'mid' ? 'mid' : 'low'}">${confLabel}</span>
        <span title="${esc(row.fileName)}">${esc(row.fileName || 'Dekont')}</span>
      </div>
      <label class="tt-field">
        <span>Müşteri <small>gönderen: ${esc(row.senderName || '—')}</small></span>
        <div class="tt-combo">
          <input class="form-input" data-field="customer" data-id="${esc(row.id)}" value="${esc(row.matchedCustomerName || '')}" placeholder="Müşteri ara ve seç" autocomplete="off" />
          <div class="tt-menu" hidden></div>
        </div>
      </label>
      <label class="tt-field">
        <span>Hesap <small>alıcı: ${esc(row.receiverName || '—')}</small></span>
        <select class="form-input" data-field="account" data-id="${esc(row.id)}">${accountOptions}</select>
      </label>
      <label class="tt-field tt-date">
        <span>Tarih</span>
        <input class="form-input" type="date" data-field="date" data-id="${esc(row.id)}" value="${esc(row.date || '')}" />
      </label>
      <label class="tt-field tt-amt">
        <span>Tutar</span>
        <input class="form-input" inputmode="decimal" data-field="amount" data-id="${esc(row.id)}" value="${esc(row.amount ? formatUserAmount(row.amount) : '')}" placeholder="0,00" />
      </label>
    </article>
  `;
}

async function loadCustomers(accounts, map, onDone, onTick) {
  const tick = () => onTick?.();
  await Promise.all(accounts.map(async (acc) => {
    try {
      const cols = await listCollections({ accountId: acc.id });
      (cols || []).forEach(c => rememberCustomer(map, c.customer_name, c.customer_tax_no));
    } catch { /* hesap supabase'de yoksa geç */ }
  }));
  tick();

  const year = new Date().getFullYear();
  const start = `${year}-01-01`;
  const end = new Date().toISOString().slice(0, 10);
  for (const acc of accounts) {
    try {
      const [sales, earsiv] = await Promise.all([
        fetchInvoicesSmart(EInvoiceWithAccount.listSales, acc, 'efatura_sale', { StartDate: start, EndDate: end }),
        fetchInvoicesSmart(EArchiveWithAccount.listInvoices, acc, 'earsiv', { StartDate: start, EndDate: end })
      ]);
      for (const inv of [...(sales || []), ...(earsiv || [])]) {
        const name = inv.ReceiverName || inv.receiverName || inv.CustomerName || inv.customerName || (inv.CustomerInfo || {}).Name || '';
        const tax = inv.ReceiverTaxNumber || inv.receiverTaxNumber || inv.TaxNumber || inv.taxNumber || (inv.CustomerInfo || {}).TaxNumber || '';
        rememberCustomer(map, name, tax);
      }
      tick();
    } catch (e) {
      console.error('Toplu tahsilat müşteri yükleme:', acc?.name, e);
    }
  }
  onDone?.();
}
