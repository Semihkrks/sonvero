// ══════════════════════════════════════════
// Toplu Tahsilat — dekont oku, gözle kontrol et, kaydet
// ══════════════════════════════════════════
import '../styles/toplu-tahsilat.css';
import { EInvoiceWithAccount, EArchiveWithAccount } from '../api/nilvera.js';
import { fetchInvoicesSmart } from '../services/invoice-archive.js';
import { listAccounts } from '../services/account-manager.js';
import { addCollection, listCollections } from '../services/tahsilat-manager.js';
import { showToast } from '../components/toast.js';
import {
  parseStatementFile,
  parseDekontFromText,
  openPdf,
  extractPdfText,
  matchTransactionsToCustomers,
  routeTransactionsToAccounts,
  parseUserAmount,
  formatUserAmount,
  isDecimalInProgress
} from '../services/bank-statement-parser.js';

const ic = {
  upload: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`,
  plus: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  file: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
  eye: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
  close: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  left: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`,
  right: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`,
  zoomIn: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>`,
  zoomOut: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>`,
  external: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`,
  check: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  trash: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`,
  alert: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
};

const STATUS_LABEL = { ready: 'Hazır', check: 'Kontrol et', missing: 'Eksik' };

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function fmtCur(n) {
  try { return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n || 0); }
  catch { return `${n} TL`; }
}

function fmtDate(d) {
  if (!d) return '';
  const [y, m, day] = String(d).split('-');
  return y && m && day ? `${day}.${m}.${y}` : d;
}

function norm(s) {
  return String(s || '').toLocaleLowerCase('tr-TR').replace(/[^a-z0-9çğıöşü]/g, '');
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

function isPdfFile(file) {
  return file?.type === 'application/pdf' || /\.pdf$/i.test(file?.name || '');
}

async function renderThumb(pdf) {
  try {
    const page = await pdf.getPage(1);
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: 180 / base.width });
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext('2d');
    await page.render({ canvas, canvasContext: ctx, viewport }).promise;
    return canvas.toDataURL('image/jpeg', 0.78);
  } catch {
    return '';
  }
}

export async function renderTopluTahsilat() {
  let accounts = [];
  try { accounts = await listAccounts() || []; } catch { accounts = []; }

  const view = createTopluTahsilatView({ accounts, save: addCollection });
  loadCustomerData(accounts, view);
  return view.el;
}

async function loadCustomerData(accounts, view) {
  view.setCustomerProgress({ done: 0, total: accounts.length, finished: false });

  await Promise.all(accounts.map(async (acc) => {
    try {
      const cols = await listCollections({ accountId: acc.id });
      view.addExisting(cols || []);
      const found = {};
      (cols || []).forEach(c => rememberCustomer(found, c.customer_name, c.customer_tax_no));
      view.addCustomers(found);
    } catch { /* hesap Supabase'de yoksa geç */ }
  }));

  const year = new Date().getFullYear();
  const params = { StartDate: `${year - 1}-01-01`, EndDate: new Date().toISOString().slice(0, 10) };
  let done = 0;
  for (const acc of accounts) {
    try {
      const [sales, earsiv] = await Promise.all([
        fetchInvoicesSmart(EInvoiceWithAccount.listSales, acc, 'efatura_sale', params),
        fetchInvoicesSmart(EArchiveWithAccount.listInvoices, acc, 'earsiv', params)
      ]);
      const found = {};
      for (const inv of [...(sales || []), ...(earsiv || [])]) {
        const name = inv.ReceiverName || inv.receiverName || inv.CustomerName || inv.customerName || (inv.CustomerInfo || {}).Name || '';
        const tax = inv.ReceiverTaxNumber || inv.receiverTaxNumber || inv.TaxNumber || inv.taxNumber || (inv.CustomerInfo || {}).TaxNumber || '';
        rememberCustomer(found, name, tax);
      }
      view.addCustomers(found);
    } catch (e) {
      console.error('Toplu tahsilat müşteri yükleme:', acc?.name, e);
    }
    done++;
    view.setCustomerProgress({ done, total: accounts.length, finished: false });
  }
  view.setCustomerProgress({ done, total: accounts.length, finished: true });
}

export function createTopluTahsilatView({ accounts, save }) {
  const accountById = Object.fromEntries(accounts.map(a => [a.id, a]));
  const customers = {};
  const existing = [];
  let rows = [];
  let filter = 'all';
  let reading = { done: 0, total: 0 };
  let custProgress = { done: 0, total: accounts.length, finished: false };
  let saving = false;
  let viewer = null;

  const el = document.createElement('div');
  el.className = 'tt-page';
  el.innerHTML = `
    <header class="tt-head">
      <div class="tt-head-text">
        <h1>Toplu Tahsilat</h1>
        <p>Dekontları yükle, gözle kontrol et, tek seferde kaydet. Alıcı hangi hesaba, gönderen hangi müşteriye yazılacağını belirler.</p>
      </div>
      <div class="tt-head-side">
        <span class="tt-pill" data-ref="cust"></span>
        <button class="btn btn-primary tt-add-btn" type="button" data-act="pick" data-ref="addBtn" hidden>${ic.plus}<span>Dekont ekle</span></button>
      </div>
    </header>
    <div class="tt-progress" data-ref="progress" hidden><div class="tt-progress-bar"><span></span></div><p></p></div>
    <section class="tt-empty" data-ref="empty">
      <div class="tt-drop" data-act="pick">
        <div class="tt-drop-icon">${ic.upload}</div>
        <h2>Dekontları buraya bırak</h2>
        <p>PDF, Excel veya CSV. Aynı anda istediğin kadar dosya seçebilirsin.</p>
        <button class="btn btn-primary" type="button">${ic.file}<span>Dosya seç</span></button>
      </div>
      <ol class="tt-steps">
        <li><b>1</b><div><strong>Yükle</strong><span>Dekontlar okunur: gönderen, alıcı, tutar, tarih.</span></div></li>
        <li><b>2</b><div><strong>Kontrol et</strong><span>Dekontu yanında gör, müşteriyi ve hesabı düzelt.</span></div></li>
        <li><b>3</b><div><strong>Kaydet</strong><span>Seçtiklerin doğru hesaba tahsilat olarak yazılır.</span></div></li>
      </ol>
    </section>
    <section class="tt-stats" data-ref="stats" hidden></section>
    <section class="tt-board" data-ref="board" hidden>
      <div class="tt-toolbar">
        <div class="tt-tabs" data-ref="tabs"></div>
        <label class="tt-selall"><input type="checkbox" data-ref="selAll" /> <span>Hepsini seç</span></label>
      </div>
      <div class="tt-thead">
        <span></span><span></span><span>Müşteri</span><span>Hesap</span><span>Tarih</span><span class="tt-r">Tutar</span><span>Durum</span><span></span>
      </div>
      <div class="tt-list" data-ref="list"></div>
    </section>
    <div class="tt-savebar" data-ref="savebar" hidden></div>
    <input type="file" data-ref="file" accept=".pdf,.xlsx,.xls,.csv,application/pdf" multiple hidden />
    <div class="tt-drag-veil"><div>${ic.upload}<span>Bırak, okuyalım</span></div></div>
  `;

  const ref = (name) => el.querySelector(`[data-ref="${name}"]`);
  const fileInput = ref('file');

  // ── Dosya alma ──
  el.addEventListener('click', (e) => {
    if (e.target.closest('[data-act="pick"]')) fileInput.click();
  });
  fileInput.addEventListener('change', () => {
    if (fileInput.files?.length) ingest([...fileInput.files]);
    fileInput.value = '';
  });
  let dragDepth = 0;
  el.addEventListener('dragenter', (e) => {
    if (!e.dataTransfer?.types?.includes('Files')) return;
    dragDepth++;
    el.classList.add('tt-dragging');
  });
  el.addEventListener('dragleave', () => {
    dragDepth = Math.max(0, dragDepth - 1);
    if (!dragDepth) el.classList.remove('tt-dragging');
  });
  el.addEventListener('dragover', (e) => { if (e.dataTransfer?.types?.includes('Files')) e.preventDefault(); });
  el.addEventListener('drop', (e) => {
    if (!e.dataTransfer?.files?.length) return;
    e.preventDefault();
    dragDepth = 0;
    el.classList.remove('tt-dragging');
    ingest([...e.dataTransfer.files]);
  });

  // ── Eşleştirme ──
  function autoMatch(row) {
    if (!row.accountTouched) {
      row.accountId = '';
      if (row.receiverName) {
        const routed = routeTransactionsToAccounts([{ receiverName: row.receiverName, rawDescription: row.receiverName, description: row.receiverName }], accounts)[0];
        row.accountId = routed?.routedAccountId || '';
      }
      if (!row.accountId && accounts.length === 1) row.accountId = accounts[0].id;
    }
    if (!row.customerTouched) {
      row.customerKey = '';
      row.customerName = '';
      row.customerTaxNo = '';
      row.matchScore = 0;
      if (row.senderName && Object.keys(customers).length) {
        const { matched } = matchTransactionsToCustomers([{ senderName: row.senderName, description: row.senderName }], customers);
        const hit = matched[0];
        if (hit) {
          row.customerKey = hit.matchedCustomerKey;
          row.customerName = hit.matchedCustomerName;
          row.customerTaxNo = hit.matchedCustomerTaxNo && hit.matchedCustomerTaxNo !== '—' ? hit.matchedCustomerTaxNo : '';
          row.matchScore = hit.matchScore;
        }
      }
    }
  }

  function duplicateInfo(row) {
    const sameAmount = (a, b) => Math.abs((Number(a) || 0) - (Number(b) || 0)) < 0.01;
    const inDb = !!row.date && row.amount > 0 && existing.some(c =>
      c.date === row.date && sameAmount(c.amount, row.amount) &&
      ((row.customerKey && c.customer_key === row.customerKey) || (!row.customerKey && c.account_id === row.accountId))
    );
    const inList = !!row.date && row.amount > 0 && rows.some(o =>
      o !== row && o.date === row.date && sameAmount(o.amount, row.amount) &&
      norm(o.senderName) === norm(row.senderName)
    );
    return { inDb, inList };
  }

  function assess(row) {
    const missing = [];
    if (!row.customerKey) missing.push('müşteri');
    if (!row.accountId) missing.push('hesap');
    if (!row.date) missing.push('tarih');
    if (!(row.amount > 0)) missing.push('tutar');

    const notes = [];
    if (row.readError) notes.push({ tone: 'bad', text: 'Dosyadan yazı okunamadı. Dekontu görüp bilgileri elle gir.' });
    if (missing.length) notes.push({ tone: 'bad', text: `Eksik: ${missing.join(', ')}.` });

    const dup = duplicateInfo(row);
    if (dup.inDb) notes.push({ tone: 'warn', text: 'Bu müşteriye aynı tarih ve tutarda kayıtlı bir tahsilat zaten var.' });
    if (dup.inList) notes.push({ tone: 'warn', text: 'Listede aynı dekont bir kez daha var.' });

    if (!row.confirmed) {
      if (!row.readError && row.confidence !== 'high' && row.source !== 'excel') notes.push({ tone: 'warn', text: 'Bazı bilgiler etiketten değil tahminle okundu.' });
      if (row.customerKey && !row.customerTouched && row.matchScore < 90) notes.push({ tone: 'warn', text: `Müşteri eşleşmesi zayıf (%${row.matchScore}). Doğru müşteri mi?` });
      if (row.senderName && !row.customerKey && !missing.includes('müşteri')) notes.push({ tone: 'warn', text: 'Gönderen listede yok.' });
    }

    let status = 'ready';
    if (missing.length) status = 'missing';
    else if (!row.confirmed && (dup.inDb || dup.inList || notes.some(n => n.tone === 'warn'))) status = 'check';
    return { status, notes, dup };
  }

  function newRow(tx, file, extras = {}) {
    const row = {
      id: crypto.randomUUID(),
      file,
      fileName: tx.fileName || file?.name || 'Dekont',
      isPdf: !!extras.pdf,
      pdf: extras.pdf || null,
      thumb: extras.thumb || '',
      source: tx.source || '',
      senderName: tx.senderName || tx.description || '',
      receiverName: tx.receiverName || '',
      date: tx.date || '',
      amount: Number(tx.amount) || 0,
      confidence: tx.confidence || 'low',
      readError: !!extras.readError,
      read: {
        senderName: tx.senderName || tx.description || '',
        receiverName: tx.receiverName || '',
        date: tx.date || '',
        amount: Number(tx.amount) || 0
      },
      accountId: '',
      customerKey: '',
      customerName: '',
      customerTaxNo: '',
      matchScore: 0,
      customerTouched: false,
      accountTouched: false,
      confirmed: false,
      selected: true
    };
    autoMatch(row);
    if (duplicateInfo(row).inDb) row.selected = false;
    return row;
  }

  async function ingest(files) {
    if (!files.length) return;
    reading.total += files.length;
    renderProgress();
    let added = 0;
    for (const file of files) {
      try {
        if (isPdfFile(file)) {
          const pdf = await openPdf(file);
          const text = await extractPdfText(pdf);
          const thumb = await renderThumb(pdf);
          const txs = parseDekontFromText(text, file.name);
          const readError = !text.replace(/\s/g, '').length;
          if (!txs.length) rows.push(newRow({ fileName: file.name, source: 'pdf-dekont' }, file, { pdf, thumb, readError }));
          else txs.forEach(tx => rows.push(newRow(tx, file, { pdf, thumb, readError })));
          added += Math.max(1, txs.length);
        } else {
          const txs = await parseStatementFile(file);
          if (!txs.length) rows.push(newRow({ fileName: file.name, source: 'excel' }, file, { readError: true }));
          else txs.forEach(tx => rows.push(newRow(tx, file)));
          added += Math.max(1, txs.length);
        }
      } catch (e) {
        console.error('Dekont okunamadı:', file?.name, e);
        rows.push(newRow({ fileName: file.name }, file, { readError: true }));
        added++;
      }
      reading.done++;
      renderProgress();
      render();
    }
    if (reading.done >= reading.total) {
      reading = { done: 0, total: 0 };
      renderProgress();
    }
    showToast(`${added} dekont kontrol listesine eklendi.`, 'success');
  }

  // ── Çizim ──
  function renderProgress() {
    const box = ref('progress');
    if (!reading.total) { box.hidden = true; return; }
    box.hidden = false;
    box.querySelector('span').style.width = `${Math.round((reading.done / reading.total) * 100)}%`;
    box.querySelector('p').textContent = `${reading.done} / ${reading.total} dosya okundu`;
  }

  function renderCustomerPill() {
    const pill = ref('cust');
    const count = Object.keys(customers).length;
    if (custProgress.finished) {
      pill.className = 'tt-pill tt-pill-ok';
      pill.textContent = `${count} müşteri hazır`;
    } else {
      pill.className = 'tt-pill tt-pill-wait';
      pill.innerHTML = `<i></i>Müşteriler yükleniyor ${custProgress.done}/${custProgress.total || 0}`;
    }
  }

  function accountChip(accountId, fallback = 'Hesap seç') {
    const acc = accountById[accountId];
    if (!acc) return `<span class="tt-chip tt-chip-empty">${esc(fallback)}</span>`;
    return `<span class="tt-chip" style="--c:${esc(acc.color || '#3b82f6')}"><i></i>${esc(acc.name)}</span>`;
  }

  function thumbHtml(row, cls = 'tt-thumb') {
    if (row.thumb) return `<span class="${cls}"><img src="${row.thumb}" alt="" loading="lazy" /></span>`;
    const ext = (row.fileName.split('.').pop() || 'DOS').slice(0, 4).toUpperCase();
    return `<span class="${cls} tt-thumb-ph">${esc(ext)}</span>`;
  }

  function render() {
    renderCustomerPill();
    const has = rows.length > 0;
    ref('empty').hidden = has;
    ref('stats').hidden = !has;
    ref('board').hidden = !has;
    ref('savebar').hidden = !has;
    ref('addBtn').hidden = !has;
    if (!has) return;

    const assessed = rows.map(r => ({ row: r, ...assess(r) }));
    const counts = { all: rows.length, ready: 0, check: 0, missing: 0 };
    assessed.forEach(a => { counts[a.status]++; });
    const savable = assessed.filter(a => a.row.selected && a.status !== 'missing');
    const savableTotal = savable.reduce((s, a) => s + a.row.amount, 0);

    ref('stats').innerHTML = `
      <div class="tt-stat"><span>Dekont</span><strong>${counts.all}</strong></div>
      <div class="tt-stat tt-stat-ok"><span>Hazır</span><strong>${counts.ready}</strong></div>
      <div class="tt-stat tt-stat-warn"><span>Kontrol</span><strong>${counts.check}</strong></div>
      <div class="tt-stat tt-stat-bad"><span>Eksik</span><strong>${counts.missing}</strong></div>
    `;

    const tabs = [['all', 'Tümü'], ['check', 'Kontrol'], ['missing', 'Eksik'], ['ready', 'Hazır']];
    ref('tabs').innerHTML = tabs.map(([key, label]) => `
      <button type="button" class="tt-tab ${filter === key ? 'active' : ''}" data-filter="${key}">${label}<em>${counts[key]}</em></button>
    `).join('');

    const visible = assessed.filter(a => filter === 'all' || a.status === filter);
    const selAll = ref('selAll');
    selAll.checked = visible.length > 0 && visible.every(a => a.row.selected);
    selAll.indeterminate = !selAll.checked && visible.some(a => a.row.selected);

    ref('list').innerHTML = visible.length ? visible.map(({ row, status, dup }) => `
      <div class="tt-row tt-st-${status} ${row.selected ? '' : 'tt-off'}" data-id="${row.id}" tabindex="0" role="button" aria-label="${esc(row.customerName || row.senderName || row.fileName)} dekontunu incele">
        <label class="tt-c-check" data-stop><input type="checkbox" data-sel="${row.id}" ${row.selected ? 'checked' : ''} /></label>
        ${thumbHtml(row)}
        <div class="tt-c-customer">
          <strong class="${row.customerKey ? '' : 'tt-muted-strong'}">${esc(row.customerName || 'Müşteri seçilmedi')}</strong>
          <span>Gönderen: ${esc(row.senderName || '—')}</span>
        </div>
        <div class="tt-c-account">
          ${accountChip(row.accountId)}
          <span class="tt-sub">Alıcı: ${esc(row.receiverName || '—')}</span>
          <span class="tt-m-date">${esc(fmtDate(row.date) || 'Tarih yok')}</span>
        </div>
        <div class="tt-c-date">${esc(fmtDate(row.date) || '—')}</div>
        <div class="tt-c-amount">${row.amount > 0 ? esc(fmtCur(row.amount)) : '<span class="tt-muted">—</span>'}</div>
        <div class="tt-c-status"><span class="tt-badge tt-badge-${status}">${row.confirmed && status === 'ready' ? ic.check : ''}${STATUS_LABEL[status]}</span>${dup.inDb ? '<span class="tt-dup">kayıtlı olabilir</span>' : ''}</div>
        <div class="tt-c-go"><span class="tt-icon-btn" title="Dekontu incele">${ic.eye}</span></div>
      </div>
    `).join('') : `<div class="tt-list-empty">Bu sekmede dekont yok.</div>`;

    const perAccount = {};
    savable.forEach(({ row }) => {
      perAccount[row.accountId] = perAccount[row.accountId] || { count: 0, total: 0 };
      perAccount[row.accountId].count++;
      perAccount[row.accountId].total += row.amount;
    });
    ref('savebar').innerHTML = `
      <div class="tt-save-info">
        <strong>${savable.length} tahsilat<span class="tt-save-dot"> · </span><br class="tt-save-br" />${esc(fmtCur(savableTotal))}</strong>
        <div class="tt-save-split">${Object.entries(perAccount).map(([id, v]) => `${accountChip(id)}<span>${v.count} · ${esc(fmtCur(v.total))}</span>`).join('') || '<span class="tt-muted">Kaydedilecek satır seçilmedi</span>'}</div>
      </div>
      <div class="tt-save-actions">
        ${counts.check ? `<button class="btn btn-secondary" type="button" data-act="review">${ic.eye}<span>Kontrol edilecekleri incele</span></button>` : ''}
        <button class="btn btn-primary" type="button" data-act="save" ${savable.length && !saving ? '' : 'disabled'}>${saving ? 'Kaydediliyor…' : `${ic.check}<span>${savable.length} tahsilatı kaydet</span>`}</button>
      </div>
    `;
  }

  // ── Liste etkileşimleri ──
  el.addEventListener('click', (e) => {
    const tab = e.target.closest('[data-filter]');
    if (tab) { filter = tab.dataset.filter; render(); return; }
    if (e.target.closest('[data-act="save"]')) { saveSelected(); return; }
    if (e.target.closest('[data-act="review"]')) {
      const first = rows.find(r => assess(r).status === 'check');
      if (first) openViewer(first.id);
      return;
    }
    if (e.target.closest('[data-stop]')) return;
    const rowEl = e.target.closest('.tt-row');
    if (rowEl) openViewer(rowEl.dataset.id);
  });
  el.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.classList?.contains('tt-row')) {
      e.preventDefault();
      openViewer(e.target.dataset.id);
    }
  });
  el.addEventListener('change', (e) => {
    const sel = e.target.closest('[data-sel]');
    if (sel) {
      const row = rows.find(r => r.id === sel.dataset.sel);
      if (row) row.selected = sel.checked;
      render();
      return;
    }
    if (e.target === ref('selAll')) {
      const on = e.target.checked;
      rows.forEach(r => { if (filter === 'all' || assess(r).status === filter) r.selected = on; });
      render();
    }
  });

  async function saveSelected() {
    if (saving) return;
    const targets = rows.filter(r => r.selected && assess(r).status !== 'missing');
    if (!targets.length) {
      showToast('Kaydedilecek satır yok. Eksik bilgileri tamamla veya satır seç.', 'warning');
      return;
    }
    saving = true;
    render();
    let ok = 0;
    let fail = 0;
    for (const row of targets) {
      try {
        const saved = await save({
          account_id: row.accountId,
          customer_key: row.customerKey,
          customer_name: row.customerName,
          customer_tax_no: row.customerTaxNo || '',
          type: 'Tahsilat',
          description: 'Gelen Ödeme (Dekont)',
          amount: row.amount,
          date: row.date
        });
        existing.push(saved || { account_id: row.accountId, customer_key: row.customerKey, date: row.date, amount: row.amount });
        row.saved = true;
        ok++;
      } catch (e) {
        row.saveError = e.message || 'Kaydedilemedi';
        fail++;
      }
    }
    rows = rows.filter(r => !r.saved);
    saving = false;
    render();
    if (ok && !fail) showToast(`${ok} tahsilat kaydedildi.`, 'success');
    else if (ok) showToast(`${ok} tahsilat kaydedildi, ${fail} satır kaydedilemedi.`, 'warning');
    else showToast('Kaydedilemedi. Bağlantıyı ve hesap yetkisini kontrol et.', 'error');
  }

  // ══════════════════════════════════════════
  // Dekont görüntüleyici + düzenleme
  // ══════════════════════════════════════════
  function openViewer(rowId) {
    const row = rows.find(r => r.id === rowId);
    if (!row) return;
    if (!viewer) {
      viewer = document.createElement('div');
      viewer.className = 'tt-viewer';
      viewer.innerHTML = `
        <div class="tt-vpanel" role="dialog" aria-modal="true">
          <header class="tt-vhead">
            <div class="tt-vtitle"><span data-v="badge"></span><strong data-v="name"></strong><em data-v="count"></em></div>
            <button class="tt-icon-btn" type="button" data-v="close" aria-label="Kapat">${ic.close}</button>
          </header>
          <div class="tt-vbody">
            <section class="tt-doc">
              <div class="tt-doc-tools">
                <button class="tt-icon-btn" type="button" data-v="zout" title="Uzaklaştır">${ic.zoomOut}</button>
                <span data-v="zoom">100%</span>
                <button class="tt-icon-btn" type="button" data-v="zin" title="Yakınlaştır">${ic.zoomIn}</button>
                <button class="tt-doc-fit" type="button" data-v="zfit">Sığdır</button>
                <button class="tt-doc-open" type="button" data-v="open">${ic.external}<span>Yeni sekmede aç</span></button>
              </div>
              <div class="tt-doc-scroll" data-v="pages"></div>
            </section>
            <section class="tt-form" data-v="form"></section>
          </div>
          <footer class="tt-vfoot">
            <button class="btn tt-btn-ghost-danger" type="button" data-v="remove">${ic.trash}<span>Listeden çıkar</span></button>
            <div class="tt-vnav">
              <button class="btn btn-secondary" type="button" data-v="prev">${ic.left}<span>Önceki</span></button>
              <button class="btn btn-secondary" type="button" data-v="next"><span>Sonraki</span>${ic.right}</button>
              <button class="btn btn-primary" type="button" data-v="confirm"></button>
            </div>
          </footer>
        </div>
      `;
      viewer.addEventListener('click', onViewerClick);
      viewer.addEventListener('mousedown', (e) => { if (e.target === viewer) viewer._downOnVeil = true; });
      document.addEventListener('keydown', onViewerKey);
      window.addEventListener('resize', onViewerResize);
      document.body.appendChild(viewer);
      document.body.classList.add('tt-viewer-open');
      requestAnimationFrame(() => viewer?.classList.add('show'));
    }
    viewer._rowId = rowId;
    viewer._zoom = 1;
    paintViewer();
  }

  function closeViewer() {
    if (!viewer) return;
    document.removeEventListener('keydown', onViewerKey);
    window.removeEventListener('resize', onViewerResize);
    document.body.classList.remove('tt-viewer-open');
    const v = viewer;
    viewer = null;
    v.classList.remove('show');
    setTimeout(() => v.remove(), 180);
    render();
  }

  function currentRow() {
    return viewer ? rows.find(r => r.id === viewer._rowId) : null;
  }

  function paintViewer() {
    const row = currentRow();
    if (!row) { closeViewer(); return; }
    const q = (s) => viewer.querySelector(`[data-v="${s}"]`);
    q('name').textContent = row.fileName;
    paintViewerMeta();
    paintForm(row);
    paintDoc(row);
  }

  function paintViewerMeta() {
    const row = currentRow();
    if (!row) return;
    const q = (s) => viewer.querySelector(`[data-v="${s}"]`);
    const { status, notes } = assess(row);
    const idx = rows.indexOf(row);
    q('badge').innerHTML = `<span class="tt-badge tt-badge-${status}">${STATUS_LABEL[status]}</span>`;
    q('count').textContent = `${idx + 1} / ${rows.length}`;
    q('prev').disabled = idx <= 0;
    q('next').disabled = idx >= rows.length - 1;
    const confirm = q('confirm');
    confirm.disabled = status === 'missing';
    confirm.innerHTML = status === 'missing'
      ? '<span>Eksikleri doldur</span>'
      : `${ic.check}<span>${row.confirmed ? 'Onaylandı · Sonraki' : 'Onayla'}</span>`;
    const notesBox = viewer.querySelector('[data-v="notes"]');
    if (notesBox) {
      notesBox.innerHTML = notes.length
        ? notes.map(n => `<li class="tt-note-${n.tone}">${ic.alert}<span>${esc(n.text)}</span></li>`).join('')
        : `<li class="tt-note-ok">${ic.check}<span>Bilgiler dekontla uyumlu görünüyor.</span></li>`;
    }
  }

  async function paintDoc(row) {
    const pages = viewer.querySelector('[data-v="pages"]');
    const tools = viewer.querySelector('.tt-doc-tools');
    const token = Symbol('doc');
    viewer._docToken = token;
    tools.hidden = !row.isPdf;
    viewer.querySelector('[data-v="zoom"]').textContent = `${Math.round(viewer._zoom * 100)}%`;

    if (!row.isPdf || !row.pdf) {
      pages.innerHTML = `
        <div class="tt-doc-none">
          ${ic.file}
          <strong>${row.source === 'excel' ? 'Excel / CSV satırı' : 'Önizleme yok'}</strong>
          <span>${row.source === 'excel' ? 'Bu kayıt hesap hareketi dosyasındaki bir satırdan geldi.' : 'Dosya görüntülenemedi. Bilgileri elle kontrol et.'}</span>
        </div>`;
      return;
    }

    const prevScroll = pages._rowId === row.id ? { top: pages.scrollTop, left: pages.scrollLeft } : null;
    pages._rowId = row.id;
    if (!prevScroll) pages.innerHTML = `<div class="tt-doc-loading"><span class="import-spinner"></span></div>`;

    try {
      const pdf = row.pdf;
      const width = Math.max(240, pages.clientWidth - 32);
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      const frag = document.createDocumentFragment();
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        if (viewer?._docToken !== token) return;
        const base = page.getViewport({ scale: 1 });
        const scale = (width / base.width) * viewer._zoom;
        const viewport = page.getViewport({ scale: scale * dpr });
        const canvas = document.createElement('canvas');
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        canvas.style.width = `${Math.floor(viewport.width / dpr)}px`;
        canvas.style.height = `${Math.floor(viewport.height / dpr)}px`;
        canvas.className = 'tt-doc-page';
        await page.render({ canvas, canvasContext: canvas.getContext('2d'), viewport }).promise;
        if (viewer?._docToken !== token) return;
        frag.appendChild(canvas);
      }
      pages.innerHTML = '';
      pages.appendChild(frag);
      if (prevScroll) { pages.scrollTop = prevScroll.top; pages.scrollLeft = prevScroll.left; }
    } catch (e) {
      console.error('Dekont çizilemedi:', e);
      if (viewer?._docToken === token) {
        pages.innerHTML = `<div class="tt-doc-none">${ic.file}<strong>Dekont çizilemedi</strong><span>“Yeni sekmede aç” ile görüntüleyebilirsin.</span></div>`;
      }
    }
  }

  function paintForm(row) {
    const form = viewer.querySelector('[data-v="form"]');
    const read = row.read;
    form.innerHTML = `
      <div class="tt-read">
        <h3>Dekontta okunan</h3>
        <dl>
          <div><dt>Gönderen</dt><dd>${esc(read.senderName || '—')}</dd></div>
          <div><dt>Alıcı</dt><dd>${esc(read.receiverName || '—')}</dd></div>
          <div><dt>Tutar</dt><dd>${read.amount ? esc(fmtCur(read.amount)) : '—'}</dd></div>
          <div><dt>Tarih</dt><dd>${esc(fmtDate(read.date) || '—')}</dd></div>
        </dl>
      </div>

      <ul class="tt-notes" data-v="notes"></ul>

      <div class="tt-field">
        <label for="ttCust">Müşteri <small>tahsilat bu cariye yazılır</small></label>
        <div class="tt-combo">
          <input id="ttCust" class="form-input" data-f="customer" value="${esc(row.customerName)}" placeholder="Müşteri adı veya VKN ara" autocomplete="off" />
          <div class="tt-menu" data-f="menu" hidden></div>
        </div>
        <span class="tt-field-hint" data-f="custHint">${row.customerTaxNo ? `VKN ${esc(row.customerTaxNo)}` : row.customerKey ? 'Gönderen adıyla cari' : ''}</span>
      </div>

      <div class="tt-field">
        <label>Hesap <small>parayı alan Sonvera hesabı</small></label>
        <div class="tt-accs">
          ${accounts.map(a => `
            <button type="button" class="tt-acc ${a.id === row.accountId ? 'active' : ''}" data-acc="${esc(a.id)}" style="--c:${esc(a.color || '#3b82f6')}">
              <i></i><span>${esc(a.name)}</span>
            </button>`).join('') || '<span class="tt-muted">Kayıtlı hesap yok. Önce Hesaplar sayfasından ekle.</span>'}
        </div>
      </div>

      <div class="tt-field-row">
        <div class="tt-field">
          <label for="ttDate">Tarih</label>
          <input id="ttDate" class="form-input" type="date" data-f="date" value="${esc(row.date)}" />
        </div>
        <div class="tt-field">
          <label for="ttAmt">Tutar</label>
          <div class="tt-amt">
            <input id="ttAmt" class="form-input" inputmode="decimal" data-f="amount" value="${row.amount ? esc(formatUserAmount(row.amount)) : ''}" placeholder="0,00" autocomplete="off" />
            <span>TL</span>
          </div>
        </div>
      </div>
    `;
    bindForm(row, form);
    paintViewerMeta();
  }

  function touch(row) {
    row.confirmed = false;
    paintViewerMeta();
    render();
  }

  function bindForm(row, form) {
    const custInput = form.querySelector('[data-f="customer"]');
    const menu = form.querySelector('[data-f="menu"]');
    const hint = form.querySelector('[data-f="custHint"]');

    const pickCustomer = (key, c) => {
      row.customerTouched = true;
      row.customerKey = key;
      row.customerName = c.name;
      row.customerTaxNo = c.taxNo || '';
      row.matchScore = 100;
      custInput.value = c.name;
      hint.textContent = c.taxNo ? `VKN ${c.taxNo}` : 'Gönderen adıyla cari';
      menu.hidden = true;
      touch(row);
    };

    const paintMenu = () => {
      const q = custInput.value.toLocaleLowerCase('tr-TR').trim();
      const hits = Object.entries(customers)
        .filter(([, c]) => !q || c.name.toLocaleLowerCase('tr-TR').includes(q) || String(c.taxNo || '').includes(q))
        .sort((a, b) => a[1].name.localeCompare(b[1].name, 'tr'))
        .slice(0, 30);
      const sender = row.read.senderName || row.senderName;
      const senderKey = sender ? customerKey(sender, '') : '';
      const offerNew = sender && !customers[senderKey];
      const items = [];
      if (offerNew) {
        items.push(`<button type="button" class="tt-menu-item tt-menu-new" data-new="1"><strong>+ Yeni cari: ${esc(sender)}</strong><span>Gönderen adıyla kaydet</span></button>`);
      }
      hits.forEach(([key, c]) => {
        items.push(`<button type="button" class="tt-menu-item ${key === row.customerKey ? 'active' : ''}" data-key="${esc(key)}"><strong>${esc(c.name)}</strong><span>${esc(c.taxNo || 'VKN yok')}</span></button>`);
      });
      if (!hits.length) {
        items.push(`<div class="tt-menu-empty">${custProgress.finished ? 'Eşleşen müşteri yok.' : 'Müşteri listesi hâlâ yükleniyor…'}</div>`);
      }
      menu.innerHTML = items.join('');
      menu.hidden = false;
    };

    custInput.addEventListener('focus', () => {
      custInput.select();
      paintMenu();
      if (window.matchMedia('(max-width: 768px)').matches) {
        setTimeout(() => custInput.closest('.tt-field')?.scrollIntoView({ block: 'start', behavior: 'smooth' }), 60);
      }
    });
    custInput.addEventListener('input', paintMenu);
    custInput.addEventListener('blur', () => {
      setTimeout(() => {
        menu.hidden = true;
        if (custInput.value.trim() !== row.customerName) custInput.value = row.customerName;
      }, 160);
    });
    custInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const first = menu.querySelector('.tt-menu-item');
        first?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      }
      if (e.key === 'Escape') { e.stopPropagation(); custInput.blur(); }
    });
    menu.addEventListener('mousedown', (e) => {
      const item = e.target.closest('.tt-menu-item');
      if (!item) return;
      e.preventDefault();
      if (item.dataset.new) {
        const name = row.read.senderName || row.senderName;
        const key = customerKey(name, '');
        customers[key] = customers[key] || { name, taxNo: '' };
        pickCustomer(key, customers[key]);
        return;
      }
      const c = customers[item.dataset.key];
      if (c) pickCustomer(item.dataset.key, c);
    });

    form.querySelectorAll('[data-acc]').forEach(btn => {
      btn.addEventListener('click', () => {
        row.accountTouched = true;
        row.accountId = btn.dataset.acc;
        form.querySelectorAll('[data-acc]').forEach(b => b.classList.toggle('active', b === btn));
        touch(row);
      });
    });

    form.querySelector('[data-f="date"]').addEventListener('change', (e) => {
      row.date = e.target.value;
      touch(row);
    });

    const amt = form.querySelector('[data-f="amount"]');
    amt.addEventListener('input', () => {
      row.amount = parseUserAmount(amt.value);
      if (!isDecimalInProgress(amt.value)) {
        const formatted = formatUserAmount(amt.value);
        if (formatted && formatted !== amt.value) amt.value = formatted;
      }
      touch(row);
    });
    amt.addEventListener('blur', () => { amt.value = row.amount ? formatUserAmount(row.amount) : ''; });
  }

  function step(dir) {
    const row = currentRow();
    if (!row) return;
    const idx = rows.indexOf(row) + dir;
    if (idx < 0 || idx >= rows.length) return;
    viewer._rowId = rows[idx].id;
    viewer._zoom = 1;
    paintViewer();
  }

  function onViewerClick(e) {
    if (e.target === viewer) {
      if (viewer._downOnVeil) closeViewer();
      viewer && (viewer._downOnVeil = false);
      return;
    }
    const btn = e.target.closest('[data-v]');
    if (!btn) return;
    const row = currentRow();
    switch (btn.dataset.v) {
      case 'close': closeViewer(); break;
      case 'prev': step(-1); break;
      case 'next': step(1); break;
      case 'zin': viewer._zoom = Math.min(3, +(viewer._zoom + 0.25).toFixed(2)); paintDoc(row); break;
      case 'zout': viewer._zoom = Math.max(0.5, +(viewer._zoom - 0.25).toFixed(2)); paintDoc(row); break;
      case 'zfit': viewer._zoom = 1; paintDoc(row); break;
      case 'open': {
        if (!row?.file) break;
        row.fileUrl = row.fileUrl || URL.createObjectURL(row.file);
        window.open(row.fileUrl, '_blank', 'noopener');
        break;
      }
      case 'remove': {
        if (!row) break;
        const idx = rows.indexOf(row);
        rows.splice(idx, 1);
        if (!rows.length) { closeViewer(); break; }
        viewer._rowId = rows[Math.min(idx, rows.length - 1)].id;
        paintViewer();
        render();
        break;
      }
      case 'confirm': {
        if (!row || assess(row).status === 'missing') break;
        row.confirmed = true;
        row.selected = true;
        render();
        const idx = rows.indexOf(row);
        const next = rows.slice(idx + 1).find(r => assess(r).status !== 'ready')
          || rows.slice(0, idx).find(r => assess(r).status !== 'ready');
        if (next) {
          viewer._rowId = next.id;
          viewer._zoom = 1;
          paintViewer();
        } else {
          closeViewer();
          showToast('Tüm dekontlar kontrol edildi. Kaydetmeye hazır.', 'success');
        }
        break;
      }
      default: break;
    }
  }

  function onViewerKey(e) {
    if (!viewer) return;
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName || '');
    if (e.key === 'Escape') { closeViewer(); return; }
    if (typing) return;
    if (e.key === 'ArrowRight') step(1);
    if (e.key === 'ArrowLeft') step(-1);
  }

  let resizeTimer = null;
  function onViewerResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { const row = currentRow(); if (row) paintDoc(row); }, 200);
  }

  // ── Dışarıya açık ──
  function rematch() {
    rows.forEach(autoMatch);
    render();
    if (!viewer) return;
    const editing = viewer.querySelector('[data-v="form"]')?.contains(document.activeElement);
    const row = currentRow();
    if (row && !editing) paintForm(row);
    else paintViewerMeta();
  }

  render();

  return {
    el,
    addFiles: ingest,
    addCustomers(map) {
      Object.entries(map || {}).forEach(([key, c]) => {
        if (!customers[key]) customers[key] = c;
        else if (c.name.length > customers[key].name.length) customers[key].name = c.name;
      });
      rematch();
    },
    addExisting(list) {
      existing.push(...(list || []));
      render();
    },
    setCustomerProgress(p) {
      custProgress = p;
      renderCustomerPill();
    }
  };
}
