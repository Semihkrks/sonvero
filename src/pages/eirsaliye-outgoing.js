import { listenScoped } from '../lib/page-events.js';
import { fingerprint } from '../lib/operations.js';
import { listDocumentBatchKinds, runDocumentBatch } from '../services/document-batch.js';
import { renderBatchResults, restoreBatchResults } from '../components/batch-results.js';
import { EDespatch, EDespatchWithAccount } from '../api/nilvera.js';
import { fetchInvoicesSmart } from '../services/invoice-archive.js';
import { showToast } from '../components/toast.js';
import { showModal } from '../components/modal.js';
import { openPdfViewer } from '../components/pdf-viewer.js';
import { getActiveAccount, getActiveAccountId } from '../services/account-manager.js';
import { registerCacheReset } from '../router.js';
import { escapeHtml } from '../lib/html.js';
import { fmtDate, dateCellHtml, skeletonRowsHtml, rowCheckboxHtml } from '../lib/format.js';

const ic = {
  truck: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`,
  search: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  refresh: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>`,
  query: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  mail: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>`,
  hidden: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>`,
  plus: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  tag: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>`,
  link: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
  invoice: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v4"/><path d="M16 2v4"/><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18"/><path d="M9 14h6"/><path d="M12 17v-6"/></svg>`,
  menu: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`,
  more: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>`,
  xml: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
  pdf: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
  gear: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
  chevronDown: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`,
  archive: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>`,
  noData: `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" opacity="0.3"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
};

let cachedRows = [];
let cachedOutgoingAccountId = '';
let outgoingLoadSeq = 0;
let outgoingAbort = null;

function resetEDespatchOutgoingCache() {
  cachedRows = [];
  cachedOutgoingAccountId = '';
  outgoingLoadSeq++;
  if (outgoingAbort) { try { outgoingAbort.abort(); } catch {} outgoingAbort = null; }
}
registerCacheReset(resetEDespatchOutgoingCache);
const OUTGOING_SPECIAL_CODE_KEY = 'nilfatura_edespatch_sale_special_codes';

function loadOutgoingSpecialCodeMap() {
  try {
    const parsed = JSON.parse(localStorage.getItem(OUTGOING_SPECIAL_CODE_KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function getOutgoingSpecialCode(uuid) {
  const map = loadOutgoingSpecialCodeMap();
  return String(map[uuid] || '');
}

function setOutgoingSpecialCode(uuid, code) {
  const map = loadOutgoingSpecialCodeMap();
  map[uuid] = code;
  localStorage.setItem(OUTGOING_SPECIAL_CODE_KEY, JSON.stringify(map));
}

function getYearStartAndToday() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return { start: `${y}-01-01`, end: `${y}-${m}-${d}` };
}

function extractItems(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.Content)) return data.Content;
  if (Array.isArray(data.Items)) return data.Items;
  if (Array.isArray(data.items)) return data.items;
  return [];
}

function pick(obj, keys) {
  for (const k of keys) {
    const val = k.split('.').reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : undefined), obj);
    if (val !== undefined && val !== null && String(val).trim() !== '') return val;
  }
  return '';
}

function fmtDateTime(value) {
  if (!value) return '—';
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return String(value);
  return `${dt.toLocaleDateString('tr-TR')} ${dt.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`;
}

function rowDateTs(row) {
  const t1 = new Date(row?.issueDate || 0).getTime();
  if (Number.isFinite(t1) && t1 > 0) return t1;
  const t2 = new Date(row?.envelopeDate || 0).getTime();
  if (Number.isFinite(t2) && t2 > 0) return t2;
  return 0;
}

function buildFileUrl(content, mime) {
  if (!content) return '';
  const c = String(content).trim();
  if (!c) return '';
  if (c.startsWith('data:') || c.startsWith('http://') || c.startsWith('https://') || c.startsWith('blob:')) return c;
  const compact = c.replace(/\s+/g, '');
  if (/^[A-Za-z0-9+/=]+$/.test(compact)) return `data:${mime};base64,${compact}`;
  return `data:${mime},${encodeURIComponent(c)}`;
}

function extractFileContent(data) {
  if (!data) return '';
  if (typeof data === 'string') return data.trim();
  if (typeof data.File === 'string') return data.File.trim();
  if (typeof data.Content === 'string') return data.Content.trim();
  if (typeof data.Data === 'string') return data.Data.trim();
  if (typeof data.String === 'string') return data.String.trim();
  if (Array.isArray(data)) {
    for (const i of data) {
      const v = extractFileContent(i);
      if (v) return v;
    }
  }
  if (typeof data === 'object') {
    for (const k of Object.keys(data)) {
      const v = extractFileContent(data[k]);
      if (v) return v;
    }
  }
  return '';
}

function getUuid(row) {
  return pick(row, ['UUID', 'Uuid', 'uuid', 'DespatchInfo.UUID', 'DespatchInfo.Uuid']);
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
    toggleBtn.textContent = expanded ? 'Filtreyi Gizle' : 'Filtreyi Göster';
    toggleBtn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  };

  setExpanded(!isMobileViewport());
  toggleBtn.addEventListener('click', () => setExpanded(!filterBar.classList.contains('filters-expanded')));
  listenScoped(page, window, 'resize', () => {
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

let openMenuTrigger = null;

function closeActionDropdowns({ restoreFocus = false } = {}) {
  document.querySelectorAll('.action-dropdown').forEach((d) => d.remove());
  const trigger = openMenuTrigger;
  openMenuTrigger = null;
  if (!trigger) return;
  trigger.setAttribute('aria-expanded', 'false');
  if (restoreFocus && trigger.isConnected) trigger.focus();
}

// Menü erişilebilirliği: tetikleyicide aria-expanded, ok/Home/End ile gezinme, Escape/Tab ile kapanıp odağı tetikleyiciye geri verir.
// Aynı tetikleyiciye ikinci tıklama menüyü kapatır (false döner).
function openActionDropdown(trigger, dd) {
  const wasOpen = openMenuTrigger === trigger;
  closeActionDropdowns();
  if (wasOpen) return false;
  dd.setAttribute('role', 'menu');
  const items = [...dd.querySelectorAll('.action-dropdown-item')];
  items.forEach((it) => {
    it.type = 'button';
    it.setAttribute('role', 'menuitem');
    it.tabIndex = -1;
  });
  mountActionDropdown(trigger, dd);
  openMenuTrigger = trigger;
  trigger.setAttribute('aria-expanded', 'true');
  dd.addEventListener('click', (ev) => ev.stopPropagation());
  dd.addEventListener('keydown', (ev) => {
    const i = items.indexOf(document.activeElement);
    if (ev.key === 'Escape' || ev.key === 'Tab') {
      ev.preventDefault();
      ev.stopPropagation();
      closeActionDropdowns({ restoreFocus: true });
    } else if (ev.key === 'ArrowDown') {
      ev.preventDefault();
      items[(i + 1) % items.length]?.focus();
    } else if (ev.key === 'ArrowUp') {
      ev.preventDefault();
      items[i <= 0 ? items.length - 1 : i - 1]?.focus();
    } else if (ev.key === 'Home') {
      ev.preventDefault();
      items[0]?.focus();
    } else if (ev.key === 'End') {
      ev.preventDefault();
      items[items.length - 1]?.focus();
    }
  });
  items[0]?.focus();
  return true;
}

const TABLE_COLSPAN = 10;

function renderLoadError(tbody, message, retry) {
  tbody.innerHTML = `<tr><td colspan="${TABLE_COLSPAN}" class="table-empty"><div class="empty-state">${ic.noData}<h3>Veri alınamadı</h3><p role="alert">${escapeHtml(message)}</p><button type="button" class="btn btn-primary" data-retry>${ic.refresh} Tekrar Dene</button></div></td></tr>`;
  tbody.querySelector('[data-retry]')?.addEventListener('click', retry);
}

// Durum/cevap metni: en fazla 160px, iki satırdan sonra kırpılır; tam metin title'da.
function clampTextHtml(text) {
  const safe = escapeHtml(text);
  return `<span title="${safe}" style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;max-width:160px;font-size:11px;color:var(--text-secondary)">${safe}</span>`;
}

function normalizeRow(row) {
  const info = row.DespatchInfo || row.DispatchInfo || row.InvoiceInfo || row;
  const customer = row.CustomerInfo || row.ReceiverInfo || row;
  return {
    raw: row,
    uuid: getUuid(row),
    no: pick(info, ['DespatchNumber', 'DespatchSerieOrNumber', 'InvoiceNumber', 'InvoiceSerieOrNumber']) || '—',
    issueDate: pick(info, ['IssueDate', 'DespatchDate', 'CreateDate']),
    envelopeDate: pick(info, ['EnvelopeDate', 'CreatedDate', 'CreateDate']),
    amount: Number(pick(info, ['PayableAmount', 'LineExtensionAmount', 'TotalAmount']) || 0),
    currency: pick(info, ['CurrencyCode']) || 'TRY',
    receiverName: pick(customer, ['ReceiverName', 'CustomerName', 'Name', 'Title']) || '—',
    receiverTax: pick(customer, ['ReceiverTaxNumber', 'TaxNumber']) || '—',
    alias: pick(customer, ['ReceiverAlias', 'Alias', 'Mailbox']) || '—',
    status: pick(row, ['StatusText', 'StatusDetail', 'CurrentStatusText', 'StatusDescription', 'StatusCode', 'Status']) || 'Alıcıya Başarıyla İletildi.',
    answer: pick(row, ['AnswerStatusText', 'ResponseStatusText', 'AnswerStatus']) || '—',
    specialCode: pick(row, ['SpecialCode']) || getOutgoingSpecialCode(getUuid(row)),
    isInvoiced: String(pick(row, ['IsInvoice']) || '').toLowerCase() === 'true',
    isArchived: String(pick(row, ['IsArchive', 'IsArchived', 'Archived']) || '').toLowerCase() === 'true',
  };
}

function fmtCur(a, c) {
  const n = Number(a || 0);
  try {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: c || 'TRY' }).format(n);
  } catch {
    return `${n.toFixed(2)} ${c || 'TRY'}`;
  }
}

function openDetailsModal(row) {
  const body = document.createElement('div');
  const field = (label, value) => `<div><dt style="font-size:11px;color:var(--text-muted)">${label}</dt><dd style="margin:2px 0 0;font-size:13px;word-break:break-word">${escapeHtml(value || '—')}</dd></div>`;
  body.innerHTML = `
    <dl style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin:0 0 16px">
      ${field('İrsaliye No', row.no)}
      ${field('İrsaliye Tarihi', row.issueDate ? fmtDateTime(row.issueDate) : '')}
      ${field('Alıcı', row.receiverName)}
      ${field('VKN', row.receiverTax)}
      ${field('Durum', row.status)}
      ${field('Tutar', fmtCur(row.amount, row.currency))}
      ${field('UUID', row.uuid)}
    </dl>
    <details class="form-group">
      <summary style="cursor:pointer;min-height:44px;display:flex;align-items:center;color:var(--text-secondary)">Teknik ayrıntı</summary>
      <pre style="white-space:pre-wrap;max-height:60vh;overflow:auto;font-size:12px;background:var(--bg-secondary);padding:12px;border-radius:8px;">${escapeHtml(JSON.stringify(row.raw, null, 2))}</pre>
    </details>`;
  showModal({ title: `İrsaliye Detayı — ${row.no}`, body, size: 'large' });
}

async function downloadFile(uuid, type) {
  if (!uuid) {
    showToast('UUID bulunamadı', 'warning');
    return;
  }

  const res = type === 'pdf' ? await EDespatch.getSalePdf(uuid) : await EDespatch.getSaleXml(uuid);
  if (!res.success) {
    showToast(`İndirme başarısız: ${res.error}`, 'error');
    return;
  }

  const content = extractFileContent(res.data);
  const mime = type === 'pdf' ? 'application/pdf' : 'application/xml';
  const url = buildFileUrl(content, mime);
  if (!url) {
    showToast('Dosya içeriği alınamadı', 'error');
    return;
  }

  const a = document.createElement('a');
  a.href = url;
  a.download = `eirsaliye_${uuid}.${type}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function downloadTextFile(fileName, text, mime = 'text/plain') {
  const blob = new Blob([text || ''], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function showPdfPreviewModal(row) {
  if (!row?.uuid) {
    showToast('UUID bulunamadı', 'warning');
    return;
  }
  return openPdfViewer({
    title: 'e-İrsaliye Önizleme',
    filePrefix: 'Irsaliye',
    load: () => EDespatch.getSalePdf(row.uuid),
    meta: {
      direction: 'outgoing',
      fallbackTitle: 'e-İrsaliye',
      party: row.receiverName === '—' ? '' : row.receiverName,
      number: row.no === '—' ? '' : row.no,
      date: row.issueDate ? new Date(row.issueDate).toLocaleDateString('tr-TR') : '',
      amount: row.amount > 0 ? fmtCur(row.amount, row.currency) : '',
    },
  });
}

async function sendMailing(row) {
  const input = window.prompt('Mail adresi girin (birden fazla için virgül kullanın):', '');
  if (input === null) return;
  const emailAddresses = input.split(/[;,\s]+/).map((x) => x.trim()).filter(Boolean);
  if (!emailAddresses.length) {
    showToast('Geçerli en az bir e-posta adresi girin', 'warning');
    return;
  }

  const res = await EDespatch.sendSaleEmail({ UUID: row.uuid, emailAddresses });
  if (!res.success) {
    showToast(`Mail gönderilemedi: ${res.error}`, 'error');
    return;
  }
  showToast('Mail gönderildi', 'success');
}

async function toggleArchiveStatus(row, page) {
  const op = row.isArchived ? 'Unarchived' : 'Archived';
  const res = await EDespatch.setSaleOperation(op, [row.uuid]);
  if (!res.success) {
    showToast(`Arşiv durumu güncellenemedi: ${res.error}`, 'error');
    return;
  }
  showToast(row.isArchived ? 'Kayıt arşivden çıkarıldı' : 'Kayıt arşive alındı', 'success');
  await loadOutgoing(page);
}

async function toggleInvoiceStatus(row, page) {
  if (row.isInvoiced) {
    const res = await EDespatch.setSaleOperation('UnInvoice', [row.uuid]);
    if (!res.success) {
      showToast(`Faturalı durumu kaldırılamadı: ${res.error}`, 'error');
      return;
    }
    showToast('Faturalanmadı olarak güncellendi', 'success');
  } else {
    const res = await EDespatch.toInvoice([row.uuid]);
    if (!res.success) {
      showToast(`Faturalama başarısız: ${res.error}`, 'error');
      return;
    }
    showToast('Faturalandı olarak güncellendi', 'success');
  }
  await loadOutgoing(page);
}

async function handleMenuAction(action, row, page) {
  if (!row?.uuid) {
    showToast('UUID bulunamadı', 'warning');
    return;
  }

  if (action === 'gib') {
    const res = await EDespatch.checkSaleFromGib(row.uuid);
    if (!res.success) {
      showToast(`GİB sorgusu başarısız: ${res.error}`, 'error');
      return;
    }
    const statusRes = await EDespatch.getSaleStatus(row.uuid);
    const statusText = statusRes.success
      ? pick(statusRes.data, ['StatusText', 'StatusDetail', 'CurrentStatusText', 'StatusDescription', 'Status', 'Message'])
      : '';
    const checkText = pick(res.data, ['StatusText', 'StatusDetail', 'Description', 'Message']);
    showToast(`GİB sorgusu tamamlandı: ${statusText || checkText || 'Durum güncellendi'}`, 'success');
    await loadOutgoing(page);
    return;
  }

  if (action === 'invoice') {
    await toggleInvoiceStatus(row, page);
    return;
  }

  if (action === 'draft') {
    const res = await EDespatch.createSaleDraft(row.uuid);
    if (!res.success) {
      showToast(`Taslak oluşturulamadı: ${res.error}`, 'error');
      return;
    }
    showToast('Taslak başarıyla oluşturuldu', 'success');
    return;
  }

  if (action === 'tags') {
    const existing = await EDespatch.getSaleDetails(row.uuid);
    const currentTags = extractItems(existing.data?.Tags || existing.data).map((t) => pick(t, ['UUID', 'Uuid', 'uuid', 'TagUUID'])).filter(Boolean);
    const input = window.prompt('Etiket UUID listesi (virgülle ayırın):', currentTags.join(','));
    if (input === null) return;
    const tags = input.split(/[;,\s]+/).map((x) => x.trim()).filter(Boolean);
    const res = await EDespatch.setSaleTags(row.uuid, tags);
    if (!res.success) {
      showToast(`Etiket güncellenemedi: ${res.error}`, 'error');
      return;
    }
    showToast('Etiketler güncellendi', 'success');
    return;
  }

  if (action === 'special') {
    const code = window.prompt('Özel kod girin:', row.specialCode || '');
    if (code === null) return;
    const res = await EDespatch.setSaleSpecialCode(row.uuid, code);
    if (!res.success) {
      showToast(`Özel kod kaydedilemedi: ${res.error}`, 'error');
      return;
    }
    setOutgoingSpecialCode(row.uuid, code);
    showToast('Özel kod güncellendi', 'success');
    await loadOutgoing(page);
    return;
  }

  if (action === 'detail') {
    const detail = await EDespatch.getSaleDetails(row.uuid);
    if (!detail.success) {
      showToast(`Detay alınamadı: ${detail.error}`, 'error');
      return;
    }
    openDetailsModal({ ...row, raw: detail.data || row.raw });
    return;
  }

  if (action === 'mailing') {
    await sendMailing(row);
    return;
  }

  if (action === 'share') {
    const accountId = getActiveAccountId();
    if (!accountId || !row.uuid) { showToast('Firma veya belge kimliği bulunamadı; bağlantı oluşturulamadı.', 'warning'); return; }
    const shareLink = `${window.location.origin}${window.location.pathname}#/belge/${encodeURIComponent(accountId)}/despatch/${encodeURIComponent(row.uuid)}`;
    try {
      await navigator.clipboard.writeText(shareLink);
      showToast('Link panoya kopyalandı', 'success');
    } catch {
      window.prompt('Linki kopyalayın:', shareLink);
    }
    return;
  }

  if (action === 'archive') {
    await toggleArchiveStatus(row, page);
    return;
  }

  if (action === 'envelope') {
    const res = await EDespatch.getSaleEnvelopeInfo(row.uuid);
    if (!res.success) {
      showToast(`Zarf bilgisi alınamadı: ${res.error}`, 'error');
      return;
    }
    const maybeXml = extractFileContent(res.data);
    if (maybeXml) {
      downloadTextFile(`eirsaliye_giden_zarf_${row.uuid}.xml`, maybeXml, 'application/xml');
    } else {
      downloadTextFile(`eirsaliye_giden_zarf_${row.uuid}.json`, JSON.stringify(res.data, null, 2), 'application/json');
    }
    showToast('Zarf bilgisi indirildi', 'success');
  }
}

function getSelectedItems(page) {
  const uuids = [...page.querySelectorAll('.row-check:checked')].map((cb) => cb.dataset.uuid).filter(Boolean);
  return [...new Set(uuids)].map((uuid) => ({ uuid }));
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

// Each item is one write; an uncertain result is never retried under another operation name.
async function runBulkSelected(page, kind, actionLabel, execute, items = getSelectedItems(page)) {
  const empty = { okCount: 0, failCount: 0, results: [] };
  if (page.dataset.batchBusy === 'true') return empty;
  const account = getActiveAccount();
  if (!items.length || !account) {
    showToast('Önce firma ve kayıt seçin.', 'warning');
    return empty;
  }
  page.dataset.batchBusy = 'true';
  page.inert = true;
  try {
    const results = await runDocumentBatch({
      accountId: account.id,
      kind,
      items,
      execute,
      onProgress: (progress) => renderBatchResults(page, { accountId: account.id, kind, results: progress, total: items.length }),
    });
    const okCount = results.filter((row) => row.status === 'succeeded').length;
    const failCount = results.length - okCount;
    summarizeBulkResult(okCount, failCount, actionLabel);
    return { okCount, failCount, results };
  } catch (error) {
    showToast(error.message, 'error');
    return { ...empty, failCount: items.length };
  } finally {
    page.dataset.batchBusy = 'false';
    page.inert = false;
  }
}

async function bulkSetArchived(page, archived, options = {}) {
  const operation = archived ? 'Archived' : 'Unarchived';
  const result = await runBulkSelected(
    page,
    archived ? 'despatch-out:archive' : 'despatch-out:unarchive',
    archived ? 'arşive kaldırma' : 'arşivden çıkarma',
    ({ uuid }) => EDespatch.setSaleOperation(operation, [uuid]),
  );
  if (result.okCount > 0) await loadOutgoing(page, options);
}

async function bulkCreateDraft(page) {
  await runBulkSelected(page, 'despatch-out:draft', 'taslak oluşturma', ({ uuid }) => EDespatch.createSaleDraft(uuid));
}

async function bulkToInvoice(page, options = {}) {
  const result = await runBulkSelected(page, 'despatch-out:to-invoice', 'faturalandırma', ({ uuid }) => EDespatch.toInvoice([uuid]));
  if (result.okCount > 0) await loadOutgoing(page, options);
}

function showBulkSpecialCodeModal(page) {
  const items = getSelectedItems(page);
  if (!items.length) {
    showToast('Önce en az bir kayıt seçmelisiniz', 'warning');
    return;
  }

  const bodyEl = document.createElement('div');
  bodyEl.innerHTML = `
    <p style="margin:0 0 10px;color:var(--text-muted)">${items.length} kayıt için özel kod atanacak</p>
    <div class="form-group">
      <label class="form-label" for="bulkSpecialCodeInput">Özel Kod</label>
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
  const saveBtn = footerEl.querySelector('#saveBulkCode');
  let busy = false;
  saveBtn?.addEventListener('click', async () => {
    if (busy) return;
    const code = bodyEl.querySelector('#bulkSpecialCodeInput')?.value?.trim();
    if (!code) return showToast('Özel kod boş bırakılamaz', 'warning');
    busy = true;
    bodyEl.inert = true;
    saveBtn.disabled = true;
    try {
      const kind = 'despatch-out:special-code:' + await fingerprint(code);
      const { okCount, results } = await runBulkSelected(page, kind, 'özel kod atama', ({ uuid }) => EDespatch.setSaleSpecialCode(uuid, code), items);
      results.filter((row) => row.status === 'succeeded').forEach((row) => setOutgoingSpecialCode(row.id, code));
      if (okCount === items.length) modal?.close();
    } finally {
      busy = false;
      bodyEl.inert = false;
      saveBtn.disabled = false;
    }
  });
}

function renderRows(page, rows) {
  const tbody = page.querySelector('#rowList');
  const footer = page.querySelector('#resultCount');
  if (!tbody) return;

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="${TABLE_COLSPAN}" class="table-empty"><div class="empty-state">${ic.noData}<h3>Kayıt bulunamadı</h3></div></td></tr>`;
    if (footer) footer.textContent = 'Toplam Kayıt : 0';
    return;
  }

  tbody.innerHTML = rows.map((r, idx) => {
    const safeNo = escapeHtml(r.no);
    const safeUuid = escapeHtml(r.uuid);
    const hasAnswer = r.answer && r.answer !== '—';
    const hasAlias = r.alias && r.alias !== '—';
    return `
    <tr>
      <td data-label="Seçim">${rowCheckboxHtml(`class="row-check" value="${safeUuid}" data-uuid="${safeUuid}"`, `${safeNo} seç`)}</td>
      <td data-label="ERP">
        <button type="button" class="action-menu-btn" data-act="erp-menu" data-idx="${idx}" title="Belge işlemleri" aria-label="${safeNo} belge işlemleri" aria-haspopup="menu" aria-expanded="false">${ic.more}</button>
      </td>
      <td data-label="İrsaliye Bilgisi">
        <div style="font-size:12px;font-weight:600;white-space:nowrap">${safeNo}</div>
        <div style="font-size:11px;color:var(--text-muted);display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:2px"><span class="badge badge-success">Sevk</span>${r.isInvoiced ? '<span class="badge badge-info">Faturalandı</span>' : ''}</div>
      </td>
      <td data-label="Tarih">${dateCellHtml(r.issueDate, { secondary: r.envelopeDate ? `Zarf ${fmtDate(r.envelopeDate)}` : '' })}</td>
      <td class="sv-number" data-label="Tutar">${fmtCur(r.amount, r.currency)}</td>
      <td data-label="Alıcı Bilgisi">
        <div style="font-size:12px;font-weight:600">${escapeHtml(r.receiverName)}</div>
        <div style="font-size:11px;color:var(--text-muted);white-space:nowrap">VKN ${escapeHtml(r.receiverTax)}</div>
      </td>
      <td data-label="Durum">${clampTextHtml(r.status)}</td>
      <td data-label="Cevap"${hasAnswer ? '' : ' class="sv-hide-mobile"'}>${hasAnswer ? clampTextHtml(r.answer) : '<span style="font-size:11px;color:var(--text-muted)">—</span>'}</td>
      <td data-label="Etiket"${hasAlias ? '' : ' class="sv-hide-mobile"'}><span style="font-size:11px;color:var(--text-muted)">${escapeHtml(r.alias)}</span></td>
      <td data-label="İşlemler"><button type="button" class="action-menu-btn" data-act="menu" data-idx="${idx}" title="İşlemler" aria-label="${safeNo} işlemleri" aria-haspopup="menu" aria-expanded="false">${ic.menu}</button></td>
    </tr>
  `;
  }).join('');

  // ERP menüsü: önceki üç ikon düğmesinin (önizle / faturalandı / arşiv) aynı işleyicileri.
  tbody.querySelectorAll('[data-act="erp-menu"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const row = rows[Number(btn.dataset.idx)];
      const dd = document.createElement('div');
      dd.className = 'action-dropdown';
      dd.setAttribute('aria-label', `${row.no} belge işlemleri`);
      dd.innerHTML = `
        <button class="action-dropdown-item" data-act="preview" data-idx="${btn.dataset.idx}">${ic.query} PDF Önizle</button>
        <button class="action-dropdown-item" data-act="invoice" data-idx="${btn.dataset.idx}">${ic.invoice} ${row.isInvoiced ? 'Faturalandı İşaretini Kaldır' : 'Faturalandı Olarak İşaretle'}</button>
        <button class="action-dropdown-item" data-act="archive" data-idx="${btn.dataset.idx}">${ic.hidden} ${row.isArchived ? 'Arşivden Çıkar' : "Arşiv'e Kaldır"}</button>
      `;
      if (!openActionDropdown(btn, dd)) return;

      dd.querySelector('[data-act="preview"]')?.addEventListener('click', () => {
        closeActionDropdowns({ restoreFocus: true });
        showPdfPreviewModal(row);
      });
      dd.querySelector('[data-act="invoice"]')?.addEventListener('click', async () => {
        closeActionDropdowns({ restoreFocus: true });
        await toggleInvoiceStatus(row, page);
      });
      dd.querySelector('[data-act="archive"]')?.addEventListener('click', async () => {
        closeActionDropdowns({ restoreFocus: true });
        await toggleArchiveStatus(row, page);
      });
    });
  });

  tbody.querySelectorAll('[data-act="menu"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const row = rows[Number(btn.dataset.idx)];
      const dd = document.createElement('div');
      dd.className = 'action-dropdown';
      dd.innerHTML = `
        <button class="action-dropdown-item" data-act="gib">${ic.query} GİB'den Sorgula</button>
        <button class="action-dropdown-item" data-act="invoice">${ic.invoice} Faturalandı Faturalanmadı</button>
        <button class="action-dropdown-item" data-act="draft">${ic.plus} Taslak Oluştur</button>
        <button class="action-dropdown-item" data-act="tags">${ic.tag} Etiket Bilgileri</button>
        <button class="action-dropdown-item" data-act="special">${ic.tag} Özel Kod Alanı</button>
        <button class="action-dropdown-item" data-act="detail">${ic.menu} İrsaliye Detayları</button>
        <button class="action-dropdown-item" data-act="mailing">${ic.mail} Mailing İşlemleri</button>
        <button class="action-dropdown-item" data-act="share">${ic.link} Link ile Paylaş</button>
        <button class="action-dropdown-item" data-act="archive">${ic.hidden} Arşiv'e Kaldır</button>
        <button class="action-dropdown-item" data-file="xml">${ic.xml} XML İndir</button>
        <button class="action-dropdown-item" data-act="envelope">${ic.xml} Zarf XML İndir</button>
        <button class="action-dropdown-item" data-file="pdf">${ic.pdf} PDF İndir</button>
      `;
      if (!openActionDropdown(btn, dd)) return;

      dd.querySelectorAll('.action-dropdown-item').forEach((it) => {
        it.addEventListener('click', async () => {
          closeActionDropdowns({ restoreFocus: true });
          if (it.dataset.file) {
            await downloadFile(row.uuid, it.dataset.file);
            return;
          }
          await handleMenuAction(it.dataset.act, row, page);
        });
      });
    });
  });

  if (footer) footer.textContent = `Toplam Kayıt : ${rows.length}`;
}

async function loadOutgoing(page, options = {}) {
  const tbody = page.querySelector('#rowList');
  if (!tbody) return;
  const archivedOnly = Boolean(options.archivedOnly);

  const account = getActiveAccount();
  if (!account) {
    cachedRows = [];
    cachedOutgoingAccountId = '';
    tbody.innerHTML = `<tr><td colspan="${TABLE_COLSPAN}" class="table-empty"><div class="empty-state">${ic.noData}<h3>Hesap seçilmedi</h3><p>Lütfen önce bir hesap seçin</p></div></td></tr>`;
    return;
  }
  const accountId = account.id || '';
  const seq = ++outgoingLoadSeq;

  if (outgoingAbort) { try { outgoingAbort.abort(); } catch {} }
  outgoingAbort = new AbortController();
  const signal = outgoingAbort.signal;

  if (cachedOutgoingAccountId && cachedOutgoingAccountId !== accountId) {
    cachedRows = [];
  }
  cachedOutgoingAccountId = accountId;

  const startDate = page.querySelector('#startDate')?.value;
  const endDate = page.querySelector('#endDate')?.value;

  tbody.innerHTML = skeletonRowsHtml(TABLE_COLSPAN, { label: 'Giden e-İrsaliye verileri yükleniyor…' });
  const retry = () => loadOutgoing(page, options);

  // Arşiv destekli fetch: kesinleşmiş aylar Supabase'den, son dönem API'den + arşive yazılır.
  // 6 ay limiti chunking ile aşılır; IsArchived filtresi varsa arşiv otomatik bypass olur.
  const stats = { failed: false };
  let fetchedItems;
  try {
    fetchedItems = await fetchInvoicesSmart(EDespatchWithAccount.listSales, account, 'eirsaliye_sale', {
      StartDate: startDate,
      EndDate: endDate,
      ...(archivedOnly ? { IsArchived: true, Archived: true } : {}),
    }, { signal, stats, maxPages: 10 });
  } catch (error) {
    if (seq !== outgoingLoadSeq || cachedOutgoingAccountId !== accountId || getActiveAccountId() !== accountId) return;
    renderLoadError(tbody, error?.message || 'Sunucuya ulaşılamıyor. Bağlantınızı kontrol edin.', retry);
    return;
  }
  if (fetchedItems.length === 0 && stats.failed) {
    if (seq !== outgoingLoadSeq || cachedOutgoingAccountId !== accountId || getActiveAccountId() !== accountId) return;
    renderLoadError(tbody, 'e-İrsaliye listesi alınamadı. API bağlantısını kontrol edip tekrar deneyin.', retry);
    return;
  }

  if (seq !== outgoingLoadSeq || cachedOutgoingAccountId !== accountId || getActiveAccountId() !== accountId) return;

  cachedRows = fetchedItems
    .map(normalizeRow)
    .filter((row) => (archivedOnly ? row.isArchived : true))
    .sort((a, b) => rowDateTs(b) - rowDateTs(a));
  applySearch(page);
}

function applySearch(page) {
  const q = (page.querySelector('#searchInput')?.value || '').toLowerCase().trim();
  if (!q) {
    renderRows(page, cachedRows.slice().sort((a, b) => rowDateTs(b) - rowDateTs(a)));
    return;
  }
  const filtered = cachedRows.filter((r) => {
    return [r.no, r.receiverName, r.receiverTax, r.alias].some((x) => String(x || '').toLowerCase().includes(q));
  }).sort((a, b) => rowDateTs(b) - rowDateTs(a));
  renderRows(page, filtered);
}

export async function renderEDespatchOutgoing(options = {}) {
  resetEDespatchOutgoingCache();
  const page = document.createElement('div');
  const { start, end } = getYearStartAndToday();
  const moduleLabel = options.moduleLabel || 'e-İrsaliye';
  const boxLabel = options.boxLabel || 'Giden Kutusu';

  page.innerHTML = `
    <div class="edespatch-page">
    <div class="nilvera-breadcrumb">
      ${ic.truck}
      <span>${moduleLabel}</span>
      <span class="bc-separator">›</span>
      <span class="bc-current">${boxLabel}</span>
    </div>

    <div class="nilvera-filter-bar">
      <div class="filter-group filter-search">
        <label class="filter-label" for="searchInput">Ara</label>
        <div class="filter-search-row">
          <input type="search" class="filter-input" id="searchInput" placeholder="İrsaliye no, alıcı veya VKN" style="width:100%" />
          <button class="btn btn-sm btn-secondary" id="toggleFiltersBtn" type="button" aria-expanded="false">Filtreyi Göster</button>
        </div>
      </div>
      <div class="filter-group filter-advanced">
        <label class="filter-label" for="startDate">Başlangıç Tarihi</label>
        <input type="date" class="filter-input" id="startDate" value="${start}" />
      </div>
      <div class="filter-group filter-advanced">
        <label class="filter-label" for="endDate">Bitiş Tarihi</label>
        <input type="date" class="filter-input" id="endDate" value="${end}" />
      </div>
      <div class="filter-actions"><span class="filter-label filter-actions-spacer" aria-hidden="true">&nbsp;</span><div class="filter-actions-row">
        <button type="button" class="btn btn-sm btn-primary" id="btnSearch" style="height:34px; padding:0 20px; font-weight:600; font-size:12px; border-radius:6px; display:flex; align-items:center; gap:6px">${ic.search} ARA</button>
        <button type="button" class="btn btn-sm btn-secondary" id="btnRefresh" style="height:34px; padding:0 16px; font-weight:600; font-size:12px; border-radius:6px; display:flex; align-items:center; gap:6px">${ic.refresh} YENİLE</button>
        <div style="position:relative">
          <button type="button" class="btn btn-sm btn-secondary" id="islemlerBtn" aria-haspopup="menu" aria-expanded="false" style="height:34px; padding:0 16px; font-weight:600; font-size:12px; border-radius:6px; display:flex; align-items:center; gap:6px">
            ${ic.gear} İŞLEMLER ${ic.chevronDown}
          </button>
        </div>
      </div>
      </div>
    </div>

    <div class="table-container">
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th style="width:30px"><label class="sv-row-check" style="display:inline-flex;align-items:center;justify-content:center;min-width:24px;min-height:24px;cursor:pointer"><input type="checkbox" id="selectAll" aria-label="Tümünü seç" /></label></th>
              <th>ERP</th>
              <th>İrsaliye Bilgisi</th>
              <th>Tarih</th>
              <th class="sv-number">Tutar</th>
              <th>Alıcı Bilgisi</th>
              <th>İrsaliye Durumu</th>
              <th>Cevap</th>
              <th>Etiket</th>
              <th>İşlemler</th>
            </tr>
          </thead>
          <tbody id="rowList">${skeletonRowsHtml(TABLE_COLSPAN, { label: 'Giden e-İrsaliye verileri yükleniyor…' })}</tbody>
        </table>
      </div>
      <div class="table-footer" style="display:flex">
        <span id="resultCount">Toplam Kayıt : 0</span>
      </div>
    </div>
    </div>
  `;

  page.querySelector('#btnSearch')?.addEventListener('click', () => loadOutgoing(page, options));
  page.querySelector('#btnRefresh')?.addEventListener('click', () => loadOutgoing(page, options));
  page.querySelector('#searchInput')?.addEventListener('input', () => applySearch(page));
  setupFilterToggle(page);
  page.querySelector('#selectAll')?.addEventListener('change', (e) => {
    page.querySelectorAll('.row-check').forEach((c) => { c.checked = e.target.checked; });
  });

  const islemlerBtn = page.querySelector('#islemlerBtn');
  islemlerBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    const dd = document.createElement('div');
    dd.className = 'action-dropdown';
    dd.innerHTML = `
      <button class="action-dropdown-item" data-act="archive">${ic.archive} Arşiv'e Kaldır</button>
      <button class="action-dropdown-item" data-act="unarchive">${ic.archive} Arşivden Çıkar</button>
      <button class="action-dropdown-item" data-act="draft">${ic.plus} Taslak Oluştur</button>
      <button class="action-dropdown-item" data-act="invoice">${ic.invoice} Faturalandı Olarak İşaretle</button>
      <button class="action-dropdown-item" data-act="special-code">${ic.tag} Özel Kod Alanı</button>
    `;
    if (!openActionDropdown(islemlerBtn, dd)) return;

    dd.querySelectorAll('.action-dropdown-item').forEach((btn) => {
      btn.addEventListener('click', async (ev) => {
        ev.stopPropagation();
        closeActionDropdowns({ restoreFocus: true });
        const act = btn.dataset.act;
        if (act === 'archive') await bulkSetArchived(page, true, options);
        else if (act === 'unarchive') await bulkSetArchived(page, false, options);
        else if (act === 'draft') await bulkCreateDraft(page);
        else if (act === 'invoice') await bulkToInvoice(page, options);
        else if (act === 'special-code') showBulkSpecialCodeModal(page);
      });
    });
  });

  listenScoped(page, document, 'click', () => closeActionDropdowns());

  // Sayfa hemen döner; liste iskelet satırlarla açılır, yükleyici tbody'yi doldurur (hata da sayfa içinde gösterilir).
  void loadOutgoing(page, options);
  const batchAccountId = getActiveAccountId();
  if (batchAccountId) {
    for (const kind of listDocumentBatchKinds(batchAccountId)) {
      if (kind.startsWith('despatch-out:')) restoreBatchResults(page, batchAccountId, kind);
    }
  }
  return page;
}
