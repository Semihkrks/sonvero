import { EDespatch } from '../api/nilvera.js';
import { showToast } from '../components/toast.js';
import { showModal } from '../components/modal.js';
import { getActiveAccount } from '../services/account-manager.js';

const ic = {
  inbox: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>`,
  search: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  refresh: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>`,
  query: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  mail: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>`,
  hidden: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>`,
  menu: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`,
  xml: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
  pdf: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
  plus: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  tag: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>`,
  link: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
  rule: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3h18v18H3z"/><path d="M7 3v4"/><path d="M11 3v2"/><path d="M15 3v4"/><path d="M3 7h18"/></svg>`,
  check: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  noData: `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" opacity="0.3"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
};

let cachedRows = [];
let cachedIncomingAccountId = '';
let incomingLoadSeq = 0;

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
    toggleBtn.textContent = expanded ? 'Filtreyi Gizle' : 'Filtreyi Goster';
    toggleBtn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  };

  setExpanded(!isMobileViewport());
  toggleBtn.addEventListener('click', () => setExpanded(!filterBar.classList.contains('filters-expanded')));
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

function normalizeRow(row) {
  const info = row.DespatchInfo || row.DispatchInfo || row.InvoiceInfo || row;
  const sender = row.CustomerInfo || row.SenderInfo || row;
  const answerText = pick(row, ['AnswerStatusText', 'ResponseStatusText', 'AnswerStatus']);
  const answerCode = String(pick(row, ['AnswerCode']) || '').toLowerCase();
  const issueDate = pick(info, ['IssueDate', 'DespatchDate', 'CreateDate']);
  const envelopeDate = pick(info, ['EnvelopeDate', 'CreatedDate', 'CreateDate']);
  const issueTs = Date.parse(issueDate);
  const envelopeTs = Date.parse(envelopeDate);
  // 7 gün kuralı zarf tarihine göre hesaplanır.
  const baseTs = Number.isFinite(envelopeTs) ? envelopeTs : issueTs;
  const ageDays = Number.isFinite(baseTs)
    ? Math.floor((Date.now() - baseTs) / (24 * 60 * 60 * 1000))
    : Number.POSITIVE_INFINITY;
  const withinSevenDays = ageDays >= 0 && ageDays <= 7;
  const answeredCodes = new Set(['acceptall', 'rejectall', 'documentanswered', 'documentansweredautomatically']);
  const hasAnswered = answeredCodes.has(answerCode) || Boolean(answerText);

  return {
    raw: row,
    uuid: getUuid(row),
    no: pick(info, ['DespatchNumber', 'DespatchSerieOrNumber', 'InvoiceNumber', 'InvoiceSerieOrNumber']) || '—',
    amount: Number(pick(info, ['PayableAmount', 'LineExtensionAmount', 'TotalAmount']) || 0),
    currency: pick(info, ['CurrencyCode']) || 'TRY',
    issueDate,
    issueTs: Number.isFinite(issueTs) ? issueTs : 0,
    envelopeDate,
    senderName: pick(sender, ['SenderName', 'CustomerName', 'Name', 'Title']) || '—',
    senderTax: pick(sender, ['SenderTaxNumber', 'TaxNumber']) || '—',
    alias: pick(sender, ['SenderAlias', 'Alias', 'Mailbox']) || '—',
    status: pick(row, ['StatusText', 'StatusDetail', 'CurrentStatusText', 'StatusDescription', 'StatusCode', 'Status']) || 'Alındı Yanıtı Gönderildi.',
    answer: hasAnswered ? (answerText || 'İrsaliye Otomatik Yanıtlandı.') : 'İrsaliye Otomatik Yanıtlandı.',
    answerRaw: answerText,
    canCreateAnswerCandidate: !hasAnswered && withinSevenDays,
    canCreateAnswer: false,
    isRead: String(pick(row, ['IsRead', 'Read']) || '').toLowerCase() === 'true',
    isArchived: String(pick(row, ['IsArchive', 'IsArchived', 'Archived']) || '').toLowerCase() === 'true',
  };
}

function applyAnswerEligibility(rows) {
  const candidates = rows.filter((r) => r.canCreateAnswerCandidate && r.uuid);
  let selectedUuid = '';

  if (candidates.length > 0) {
    const selected = candidates
      .slice()
      .sort((a, b) => (getSortTimestamp(b) || 0) - (getSortTimestamp(a) || 0))[0];
    selectedUuid = selected?.uuid || '';
  }

  return rows.map((r) => ({
    ...r,
    canCreateAnswer: Boolean(selectedUuid && r.uuid === selectedUuid),
    answer: r.answerRaw || 'İrsaliye Otomatik Yanıtlandı.',
  }));
}

function getSortTimestamp(row) {
  const envelopeTs = Date.parse(row?.envelopeDate || '');
  if (Number.isFinite(envelopeTs)) return envelopeTs;
  const issueTs = Date.parse(row?.issueDate || '');
  if (Number.isFinite(issueTs)) return issueTs;
  return 0;
}

function sortByNearestDate(rows) {
  return rows.slice().sort((a, b) => getSortTimestamp(b) - getSortTimestamp(a));
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
  body.innerHTML = `<pre style="white-space:pre-wrap;max-height:60vh;overflow:auto;font-size:12px;background:var(--bg-secondary);padding:12px;border-radius:8px;">${JSON.stringify(row.raw, null, 2)}</pre>`;
  showModal({ title: `İrsaliye Detayı — ${row.no}`, body, size: 'large' });
}

async function downloadFile(uuid, type) {
  if (!uuid) {
    showToast('UUID bulunamadı', 'warning');
    return;
  }

  const res = type === 'pdf' ? await EDespatch.getPurchasePdf(uuid) : await EDespatch.getPurchaseXml(uuid);
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
  a.download = `eirsaliye_gelen_${uuid}.${type}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

async function showPdfPreviewModal(uuid) {
  if (!uuid) {
    showToast('UUID bulunamadı', 'warning');
    return;
  }

  const body = document.createElement('div');
  body.style.height = '80vh';
  body.style.minHeight = '600px';
  body.style.width = '100%';
  body.style.background = '#ffffff';
  body.style.display = 'flex';
  body.style.alignItems = 'center';
  body.style.justifyContent = 'center';
  body.innerHTML = `<div>${ic.refresh} PDF yükleniyor...</div>`;

  const footer = document.createElement('div');
  footer.style.cssText = 'display:flex;gap:10px;justify-content:flex-end;width:100%';
  footer.innerHTML = `
    <button class="btn btn-secondary" id="closePdfModal">Kapat</button>
    <button class="btn btn-success" id="downloadPdfBtn" style="display:none">${ic.pdf} İndir</button>
    <button class="btn btn-primary" id="printPdfBtn" style="display:none">Yazdır</button>
  `;

  const modal = showModal({ title: 'e-İrsaliye PDF Önizleme', body, footer, size: 'xlarge' });
  const modalBody = modal?.overlay?.querySelector('.modal-body');
  if (modalBody) {
    modalBody.style.padding = '0';
    modalBody.style.background = '#f3f4f6';
  }

  footer.querySelector('#closePdfModal')?.addEventListener('click', () => modal?.close());

  const res = await EDespatch.getPurchasePdf(uuid);
  if (!res.success) {
    body.innerHTML = `<div class="empty-state">${ic.noData}<h3>PDF alınamadı</h3><p>${res.error}</p></div>`;
    return modal;
  }

  const content = extractFileContent(res.data);
  const pdfUrl = buildFileUrl(content, 'application/pdf');
  if (!pdfUrl) {
    body.innerHTML = `<div class="empty-state">${ic.noData}<h3>PDF içeriği bulunamadı</h3></div>`;
    return modal;
  }

  const finalPdfUrl = pdfUrl.includes('#') ? pdfUrl : `${pdfUrl}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`;
  body.innerHTML = `<iframe src="${finalPdfUrl}" width="100%" height="100%" style="border:none;border-radius:0;"></iframe>`;

  const dlBtn = footer.querySelector('#downloadPdfBtn');
  const printBtn = footer.querySelector('#printPdfBtn');
  dlBtn.style.display = 'flex';
  printBtn.style.display = 'flex';

  dlBtn.addEventListener('click', () => {
    const link = document.createElement('a');
    link.href = finalPdfUrl;
    link.download = `eirsaliye_gelen_${uuid}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });

  printBtn.addEventListener('click', () => {
    const iframe = body.querySelector('iframe');
    if (iframe?.contentWindow) {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    }
  });

  return modal;
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

async function sendMailing(row) {
  if (!row.uuid) {
    showToast('UUID bulunamadı', 'warning');
    return;
  }

  const input = window.prompt('Mail adresi girin (birden fazla için virgül kullanın):', '');
  if (input === null) return;

  const emailAddresses = input
    .split(/[;,\s]+/)
    .map((x) => x.trim())
    .filter(Boolean);

  if (!emailAddresses.length) {
    showToast('Geçerli en az bir e-posta adresi girin', 'warning');
    return;
  }

  const res = await EDespatch.sendPurchaseEmail({ UUID: row.uuid, emailAddresses });
  if (!res.success) {
    showToast(`Mail gönderilemedi: ${res.error}`, 'error');
    return;
  }
  showToast('Mail gönderildi', 'success');
}

async function toggleReadStatus(row, page) {
  const op = row.isRead ? 'Unread' : 'Read';
  const res = await EDespatch.setPurchaseOperation(op, [row.uuid]);
  if (!res.success) {
    showToast(`Durum güncellenemedi: ${res.error}`, 'error');
    return;
  }
  showToast(row.isRead ? 'Kayıt okunmadı yapıldı' : 'Kayıt okundu yapıldı', 'success');
  await loadIncoming(page);
}

async function toggleArchiveStatus(row, page) {
  const op = row.isArchived ? 'Unarchived' : 'Archived';
  const res = await EDespatch.setPurchaseOperation(op, [row.uuid]);
  if (!res.success) {
    showToast(`Arşiv durumu güncellenemedi: ${res.error}`, 'error');
    return;
  }
  showToast(row.isArchived ? 'Kayıt arşivden çıkarıldı' : 'Kayıt arşive alındı', 'success');
  await loadIncoming(page);
}

async function createAnswer(row, page) {
  if (!row.uuid) {
    showToast('UUID bulunamadı', 'warning');
    return;
  }

  const [seriesRes, templatesRes, linesRes] = await Promise.all([
    EDespatch.listAnswerSeries({ Page: 1, PageSize: 100, IsActive: true }),
    EDespatch.listAnswerTemplates({ Page: 1, PageSize: 100, IsActive: true }),
    EDespatch.getPurchaseLines(row.uuid),
  ]);

  if (!seriesRes.success || !templatesRes.success || !linesRes.success) {
    showToast(`Yanıt hazırlığı başarısız: ${seriesRes.error || templatesRes.error || linesRes.error}`, 'error');
    return;
  }

  const series = extractItems(seriesRes.data);
  const templates = extractItems(templatesRes.data);
  const lines = extractItems(linesRes.data);

  const now = new Date();
  const dateValue = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const timeValue = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const body = document.createElement('div');
  body.style.display = 'flex';
  body.style.flexDirection = 'column';
  body.style.gap = '16px';
  body.innerHTML = `
    <style>
      .ans-wrap { display:flex; flex-direction:column; gap:14px; }
      .ans-grid { display:grid; grid-template-columns:repeat(4,minmax(180px,1fr)); gap:12px; }
      .ans-label { font-size:12px; font-weight:700; color:#64748b; letter-spacing:.2px; display:flex; flex-direction:column; gap:6px; }
      .ans-input {
        height:38px; border:1px solid #cbd5e1; border-radius:10px; background:#fff;
        padding:0 12px; font-size:13px; color:#0f172a; outline:none; transition:all .15s ease;
      }
      .ans-input:focus { border-color:#3b82f6; box-shadow:0 0 0 3px rgba(59,130,246,.12); }
      .ans-card { border:1px solid #e2e8f0; border-radius:12px; overflow:auto; background:#fff; max-height:44vh; }
      .ans-table { width:100%; border-collapse:separate; border-spacing:0; font-size:13px; }
      .ans-table thead th {
        position:sticky; top:0; z-index:1; background:#f8fafc; color:#64748b; font-size:12px;
        text-transform:uppercase; letter-spacing:.3px; text-align:left; padding:11px 10px; border-bottom:1px solid #e2e8f0;
      }
      .ans-table tbody td { padding:10px; border-bottom:1px solid #eef2f7; color:#334155; }
      .ans-table tbody tr:hover { background:#f8fbff; }
      .ans-note { min-height:86px; padding:10px 12px; resize:vertical; }
      .ans-help { display:flex; gap:8px; align-items:center; font-size:12px; color:#64748b; }
      .ans-pill { display:inline-flex; align-items:center; border:1px solid #bfdbfe; background:#eff6ff; color:#1d4ed8; border-radius:999px; padding:4px 10px; font-weight:600; }
      @media (max-width: 1100px) { .ans-grid { grid-template-columns:repeat(2,minmax(180px,1fr)); } }
      @media (max-width: 720px) { .ans-grid { grid-template-columns:1fr; } }
    </style>

    <div class="ans-wrap">
      <div class="ans-help"><span class="ans-pill">Yanıt Akışı</span><span>Satır bazlı kabul/red miktarını girip tek tıkla gönder.</span></div>

      <div class="ans-grid">
        <label class="ans-label">Yanıt Seri
          <select id="answerSerie" class="ans-input">
            ${series.map((s) => `<option value="${String(pick(s, ['Name']) || '').replace(/"/g, '&quot;')}">${pick(s, ['Name']) || '—'}</option>`).join('')}
          </select>
        </label>
        <label class="ans-label">Yanıt Şablonu
          <select id="answerTemplate" class="ans-input">
            ${templates.map((t) => `<option value="${String(pick(t, ['UUID']) || '').replace(/"/g, '&quot;')}">${pick(t, ['Name']) || '—'}</option>`).join('')}
          </select>
        </label>
        <label class="ans-label">Teslim Tarihi
          <input id="answerDate" type="date" class="ans-input" value="${dateValue}" />
        </label>
        <label class="ans-label">Teslim Saati
          <input id="answerTime" type="time" class="ans-input" value="${timeValue}" />
        </label>
      </div>

      <div class="ans-card">
        <table class="ans-table">
          <thead>
            <tr>
              <th>Mal / Hizmet</th>
              <th>Miktar</th>
              <th>Kabul Miktar</th>
              <th>Kabul Birim</th>
              <th>Red Miktar</th>
              <th>Red Sebebi</th>
            </tr>
          </thead>
          <tbody id="answerLineRows">
            ${lines.map((ln, idx) => {
              const name = pick(ln, ['Name']) || `Satır ${idx + 1}`;
              const deliveredQty = Number(pick(ln, ['DeliveredQuantity']) || 0);
              const unitName = pick(ln, ['DeliveredUnitName']) || 'Adet';
              const unitType = pick(ln, ['DeliveredUnitType']) || 'C62';
              return `
                <tr data-line-index="${idx}" data-unit-type="${unitType}" data-delivered-qty="${deliveredQty}">
                  <td>${name}</td>
                  <td>${deliveredQty} ${unitName}</td>
                  <td><input type="number" min="0" step="0.01" data-role="accept" value="0" class="ans-input" style="width:140px;" /></td>
                  <td>${unitName}</td>
                  <td><input type="number" min="0" step="0.01" data-role="reject" value="0" class="ans-input" style="width:140px;" /></td>
                  <td><input type="text" data-role="reason" class="ans-input" placeholder="Opsiyonel" style="width:190px;" /></td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>

      <label class="ans-label">Yanıt Notu
        <textarea id="answerNotes" class="ans-input ans-note" placeholder="Yanıt notunuz varsa girin"></textarea>
      </label>
    </div>
  `;

  const footer = document.createElement('div');
  footer.style.cssText = 'display:flex;justify-content:flex-end;gap:10px;width:100%';
  footer.innerHTML = `
    <button class="btn" id="btnSendAnswer" style="background:#4f46e5;color:#fff;border:none;border-radius:10px;padding:10px 16px;font-weight:700;">YANITI GÖNDER</button>
    <button class="btn" id="btnAcceptAll" style="background:#10b981;color:#fff;border:none;border-radius:10px;padding:10px 16px;font-weight:700;">HEPSİNİ KABUL ET</button>
    <button class="btn" id="btnRejectAll" style="background:#ef4444;color:#fff;border:none;border-radius:10px;padding:10px 16px;font-weight:700;">HEPSİNİ REDDET</button>
  `;

  const modal = showModal({ title: 'İrsaliye Yanıtı Oluştur', body, footer, size: 'xlarge' });

  const tbody = body.querySelector('#answerLineRows');
  const setAll = (mode) => {
    tbody?.querySelectorAll('tr').forEach((tr) => {
      const delivered = Number(tr.getAttribute('data-delivered-qty') || 0);
      const acceptEl = tr.querySelector('[data-role="accept"]');
      const rejectEl = tr.querySelector('[data-role="reject"]');
      if (acceptEl) acceptEl.value = mode === 'accept' ? String(delivered) : '0';
      if (rejectEl) rejectEl.value = mode === 'reject' ? String(delivered) : '0';
    });
  };

  footer.querySelector('#btnAcceptAll')?.addEventListener('click', () => setAll('accept'));
  footer.querySelector('#btnRejectAll')?.addEventListener('click', () => setAll('reject'));

  footer.querySelector('#btnSendAnswer')?.addEventListener('click', async () => {
    const selectedSerie = body.querySelector('#answerSerie')?.value || '';
    const selectedTemplateUUID = body.querySelector('#answerTemplate')?.value || '';
    const selectedDate = body.querySelector('#answerDate')?.value || dateValue;
    const selectedTime = body.querySelector('#answerTime')?.value || timeValue;
    const noteText = body.querySelector('#answerNotes')?.value || '';

    const answerLines = lines.map((ln, idx) => {
      const tr = tbody?.querySelector(`tr[data-line-index="${idx}"]`);
      const unitCode = tr?.getAttribute('data-unit-type') || pick(ln, ['DeliveredUnitType']) || 'C62';
      const acceptVal = Number(tr?.querySelector('[data-role="accept"]')?.value || 0);
      const rejectVal = Number(tr?.querySelector('[data-role="reject"]')?.value || 0);
      const rejectReason = tr?.querySelector('[data-role="reason"]')?.value || '';

      return {
        Index: idx + 1,
        Received: { UnitCode: unitCode, Value: acceptVal },
        Rejected: { UnitCode: unitCode, Value: rejectVal },
        Short: { UnitCode: unitCode, Value: 0 },
        Oversupply: { UnitCode: unitCode, Value: 0 },
        RejectReason: rejectReason || null,
        SellerCode: pick(ln, ['SellerCode']) || null,
        Name: pick(ln, ['Name']) || null,
        Description: pick(ln, ['Description']) || null,
        QuantityPrice: Number(pick(ln, ['QuantityPrice']) || 0),
        LineTotal: Number(pick(ln, ['LineTotal']) || 0),
      };
    });

    const isAcceptAll = answerLines.length > 0 && answerLines.every((x, i) => {
      const delivered = Number(pick(lines[i], ['DeliveredQuantity']) || 0);
      return Math.abs((x.Received?.Value || 0) - delivered) < 0.0001 && (x.Rejected?.Value || 0) === 0;
    });

    const isRejectAll = answerLines.length > 0 && answerLines.every((x, i) => {
      const delivered = Number(pick(lines[i], ['DeliveredQuantity']) || 0);
      return Math.abs((x.Rejected?.Value || 0) - delivered) < 0.0001 && (x.Received?.Value || 0) === 0;
    });

    const payload = {
      DespatchUUID: row.uuid,
      DespatchAnswerLines: answerLines,
      Notes: noteText ? noteText.split('\n').map((n) => n.trim()).filter(Boolean) : [],
      Serie: selectedSerie || null,
      DeliveryDateTime: `${selectedDate}T${selectedTime}:00`,
      ...(selectedTemplateUUID ? { TemplateUUID: selectedTemplateUUID } : {}),
      AcceptAll: isAcceptAll,
      RejectAll: isRejectAll,
    };

    const res = await EDespatch.sendPurchaseAnswer(payload);
    if (!res.success) {
      showToast(`Yanıt gönderilemedi: ${res.error}`, 'error');
      return;
    }

    showToast('İrsaliye yanıtı başarıyla gönderildi', 'success');
    modal?.close?.();
    await loadIncoming(page);
  });
}

async function handleMenuAction(action, row, page) {
  if (!row?.uuid) {
    showToast('UUID bulunamadı', 'warning');
    return;
  }

  if (action === 'gib') {
    const res = await EDespatch.checkPurchaseFromGib(row.uuid);
    if (!res.success) {
      showToast(`GİB sorgusu başarısız: ${res.error}`, 'error');
      return;
    }

    const statusRes = await EDespatch.getPurchaseStatus(row.uuid);
    const statusText = statusRes.success
      ? pick(statusRes.data, ['StatusText', 'CurrentStatusText', 'StatusDescription', 'Status', 'Message'])
      : '';
    const checkText = pick(res.data, ['StatusText', 'StatusDetail', 'Description', 'Message']);
    const msg = statusText || checkText || 'Durum güncellendi';

    showToast(`GİB sorgusu tamamlandı: ${msg}`, 'success');
    await loadIncoming(page);
    return;
  }

  if (action === 'mark') {
    await toggleReadStatus(row, page);
    return;
  }

  if (action === 'draft') {
    const res = await EDespatch.createPurchaseDraft(row.uuid);
    if (!res.success) {
      showToast(`Taslak oluşturulamadı: ${res.error}`, 'error');
      return;
    }
    showToast('Taslak başarıyla oluşturuldu', 'success');
    return;
  }

  if (action === 'tags') {
    const existing = await EDespatch.getPurchaseTags(row.uuid);
    const currentTags = extractItems(existing.data).map((t) => pick(t, ['UUID', 'Uuid', 'uuid', 'TagUUID'])).filter(Boolean);
    const input = window.prompt('Etiket UUID listesi (virgülle ayırın):', currentTags.join(','));
    if (input === null) return;
    const tags = input.split(/[;,\s]+/).map((x) => x.trim()).filter(Boolean);
    const res = await EDespatch.setPurchaseTags(row.uuid, tags);
    if (!res.success) {
      showToast(`Etiket güncellenemedi: ${res.error}`, 'error');
      return;
    }
    showToast('Etiketler güncellendi', 'success');
    return;
  }

  if (action === 'special') {
    const code = window.prompt('Özel kod girin:', pick(row.raw, ['SpecialCode']) || '');
    if (code === null) return;
    const res = await EDespatch.setPurchaseSpecialCode(row.uuid, code);
    if (!res.success) {
      showToast(`Özel kod kaydedilemedi: ${res.error}`, 'error');
      return;
    }
    showToast('Özel kod güncellendi', 'success');
    return;
  }

  if (action === 'detail') {
    openDetailsModal(row);
    return;
  }

  if (action === 'mailing') {
    await sendMailing(row);
    return;
  }

  if (action === 'share') {
    const shareLink = `${window.location.origin}${window.location.pathname}#/eirsaliye-gelen?uuid=${encodeURIComponent(row.uuid)}`;
    try {
      await navigator.clipboard.writeText(shareLink);
      showToast('Link panoya kopyalandı', 'success');
    } catch {
      window.prompt('Linki kopyalayın:', shareLink);
    }
    return;
  }

  if (action === 'envelope') {
    const res = await EDespatch.getPurchaseEnvelopeInfo(row.uuid);
    if (!res.success) {
      showToast(`Zarf bilgisi alınamadı: ${res.error}`, 'error');
      return;
    }

    const maybeXml = extractFileContent(res.data);
    if (maybeXml) {
      downloadTextFile(`eirsaliye_zarf_${row.uuid}.xml`, maybeXml, 'application/xml');
    } else {
      downloadTextFile(`eirsaliye_zarf_${row.uuid}.json`, JSON.stringify(res.data, null, 2), 'application/json');
    }
    showToast('Zarf bilgisi indirildi', 'success');
    return;
  }
}

function renderRows(page, rows) {
  const tbody = page.querySelector('#rowList');
  const footer = page.querySelector('#resultCount');
  if (!tbody) return;

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="9" class="table-empty"><div class="empty-state">${ic.noData}<h3>Kayıt bulunamadı</h3></div></td></tr>`;
    if (footer) footer.textContent = 'Toplam Kayıt : 0';
    return;
  }

  tbody.innerHTML = rows.map((r, idx) => `
    <tr>
      <td data-label="Seçim"><input type="checkbox" class="row-check" value="${r.uuid}" /></td>
      <td data-label="ERP">
        <div style="display:flex;align-items:center;gap:8px;">
          <button class="action-menu-btn" data-act="preview" data-idx="${idx}" title="PDF Önizleme">${ic.query}</button>
          <button class="action-menu-btn" data-act="mail" data-idx="${idx}" title="Mailing">${ic.mail}</button>
          <button class="action-menu-btn" data-act="hidden" data-idx="${idx}" title="Gizle">${ic.hidden}</button>
        </div>
      </td>
      <td data-label="İrsaliye Bilgisi">
        <div style="font-size:12px;font-weight:600">${r.no}</div>
        <div style="font-size:11px;color:var(--text-muted);display:flex;align-items:center;gap:8px;">
          <span style="display:inline-flex;align-items:center;padding:1px 10px;border-radius:999px;background:#22c55e;color:white;font-weight:700">Sevk</span>
          <span>/ ${fmtCur(r.amount, r.currency)}</span>
        </div>
      </td>
      <td data-label="Tarih">
        <div style="font-size:11px;color:var(--text-secondary)"><strong>İrsaliye:</strong> ${fmtDateTime(r.issueDate)}</div>
        <div style="font-size:11px;color:var(--text-muted)"><strong>Zarf :</strong> ${fmtDateTime(r.envelopeDate)}</div>
      </td>
      <td data-label="Gönderici Bilgisi">
        <div style="font-size:12px;font-weight:600">${r.senderName}</div>
        <div style="font-size:11px;color:var(--text-muted)">Vergi No : ${r.senderTax}</div>
      </td>
      <td data-label="Durum">
        <span style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--text-secondary)">
          <span style="width:9px;height:9px;border-radius:50%;background:#4caf50;display:inline-block"></span>${r.status}
        </span>
      </td>
      <td data-label="Cevap">
        ${r.canCreateAnswer
          ? `<button class="btn btn-sm" data-act="answer" data-idx="${idx}" style="height:22px;padding:0 10px;font-size:11px;border-radius:6px;border:1px solid #10b981;color:#10b981;background:transparent;display:inline-flex;align-items:center;gap:6px;">${ic.link} YANIT OLUŞTUR</button>`
          : `<div style="font-size:11px;color:var(--text-secondary)"><div style="display:flex;align-items:center;gap:6px;">${ic.check} ${r.answer}</div><div style="display:flex;align-items:center;gap:6px;color:#4f46e5;font-weight:600;margin-top:2px;">${ic.rule} 7 Gün Kuralı</div></div>`}
      </td>
      <td data-label="Etiket"><span style="font-size:11px;color:var(--text-muted)">${r.alias}</span></td>
      <td data-label="İşlemler"><button class="action-menu-btn" data-act="menu" data-idx="${idx}">${ic.menu}</button></td>
    </tr>
  `).join('');

  tbody.querySelectorAll('[data-act="preview"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const row = rows[Number(btn.dataset.idx)];
      await showPdfPreviewModal(row.uuid);
    });
  });

  tbody.querySelectorAll('[data-act="mail"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const row = rows[Number(btn.dataset.idx)];
      await sendMailing(row);
    });
  });

  tbody.querySelectorAll('[data-act="hidden"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const row = rows[Number(btn.dataset.idx)];
      await toggleArchiveStatus(row, page);
    });
  });

  tbody.querySelectorAll('[data-act="answer"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const row = rows[Number(btn.dataset.idx)];
      await createAnswer(row, page);
    });
  });

  tbody.querySelectorAll('[data-act="menu"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.action-dropdown').forEach((d) => d.remove());
      const row = rows[Number(btn.dataset.idx)];
      const dd = document.createElement('div');
      dd.className = 'action-dropdown';
      dd.innerHTML = `
        <button class="action-dropdown-item" data-act="gib">${ic.query} GİB'den Sorgula</button>
        <button class="action-dropdown-item" data-act="mark">${ic.mail} Okundu Okunmadı</button>
        <button class="action-dropdown-item" data-act="draft">${ic.plus} Taslak Oluştur</button>
        <button class="action-dropdown-item" data-act="tags">${ic.tag} Etiket Bilgileri</button>
        <button class="action-dropdown-item" data-act="special">${ic.tag} Özel Kod Alanı</button>
        <button class="action-dropdown-item" data-act="detail">${ic.menu} İrsaliye Detayları</button>
        <button class="action-dropdown-item" data-act="mailing">${ic.mail} Mailing İşlemleri</button>
        <button class="action-dropdown-item" data-act="share">${ic.link} Link ile Paylaş</button>
        <button class="action-dropdown-item" data-file="xml">${ic.xml} XML İndir</button>
        <button class="action-dropdown-item" data-act="envelope">${ic.xml} Zarf XML İndir</button>
        <button class="action-dropdown-item" data-file="pdf">${ic.pdf} PDF İndir</button>
      `;
      mountActionDropdown(btn, dd);

      dd.querySelectorAll('.action-dropdown-item').forEach((it) => {
        it.addEventListener('click', async () => {
          dd.remove();
          if (it.dataset.file) {
            await downloadFile(row.uuid, it.dataset.file);
            return;
          }

          if (it.dataset.act === 'detail') {
            openDetailsModal(row);
            return;
          }

          await handleMenuAction(it.dataset.act, row, page);
        });
      });
    });
  });

  if (footer) footer.textContent = `Toplam Kayıt : ${rows.length}`;
}

async function loadIncoming(page, options = {}) {
  const tbody = page.querySelector('#rowList');
  if (!tbody) return;
  const archivedOnly = Boolean(options.archivedOnly);

  const account = await getActiveAccount();
  if (!account) {
    cachedRows = [];
    cachedIncomingAccountId = '';
    tbody.innerHTML = `<tr><td colspan="9" class="table-empty"><div class="empty-state">${ic.noData}<h3>Hesap seçilmedi</h3><p>Lutfen once bir hesap secin</p></div></td></tr>`;
    return;
  }
  const accountId = account.id || '';
  const seq = ++incomingLoadSeq;

  if (cachedIncomingAccountId && cachedIncomingAccountId !== accountId) {
    cachedRows = [];
  }
  cachedIncomingAccountId = accountId;

  const startDate = page.querySelector('#startDate')?.value;
  const endDate = page.querySelector('#endDate')?.value;

  tbody.innerHTML = `<tr><td colspan="9" class="table-empty"><div style="padding:24px;text-align:center;color:var(--text-muted)">e-İrsaliye verileri yükleniyor...</div></td></tr>`;

  const res = await EDespatch.listPurchases({
    StartDate: startDate,
    EndDate: endDate,
    Page: 1,
    PageSize: 150,
    ...(archivedOnly ? { IsArchived: true, Archived: true } : {}),
  });
  if (!res.success) {
    if (seq !== incomingLoadSeq || cachedIncomingAccountId !== accountId) return;
    tbody.innerHTML = `<tr><td colspan="9" class="table-empty"><div class="empty-state">${ic.noData}<h3>Hata: ${res.error}</h3></div></td></tr>`;
    return;
  }

  if (seq !== incomingLoadSeq || cachedIncomingAccountId !== accountId) return;

  cachedRows = sortByNearestDate(applyAnswerEligibility(
    extractItems(res.data)
      .map(normalizeRow)
      .filter((row) => (archivedOnly ? row.isArchived : true))
  ));
  applySearch(page);
}

function applySearch(page) {
  const q = (page.querySelector('#searchInput')?.value || '').toLowerCase().trim();
  if (!q) {
    renderRows(page, sortByNearestDate(cachedRows));
    return;
  }
  const filtered = cachedRows.filter((r) => {
    return [r.no, r.senderName, r.senderTax, r.alias].some((x) => String(x || '').toLowerCase().includes(q));
  });
  renderRows(page, sortByNearestDate(filtered));
}

export async function renderEDespatchIncoming(options = {}) {
  const page = document.createElement('div');
  const { start, end } = getYearStartAndToday();
  const moduleLabel = options.moduleLabel || 'e-İrsaliye';
  const boxLabel = options.boxLabel || 'Gelen Kutusu';

  page.innerHTML = `
    <div class="edespatch-page">
    <div class="nilvera-breadcrumb">
      ${ic.inbox}
      <span>${moduleLabel}</span>
      <span class="bc-separator">›</span>
      <span class="bc-current">${boxLabel}</span>
    </div>

    <div class="nilvera-filter-bar">
      <div class="filter-group filter-search">
        <label class="filter-label">Ara</label>
        <div class="filter-search-row">
          <input type="text" class="filter-input" id="searchInput" placeholder="İrsaliye no, gönderici veya VKN" style="width:100%" />
          <button class="btn btn-sm btn-secondary" id="toggleFiltersBtn" type="button" aria-expanded="false">Filtreyi Goster</button>
        </div>
      </div>
      <div class="filter-group filter-advanced">
        <label class="filter-label">Başlangıç Tarihi</label>
        <input type="date" class="filter-input" id="startDate" value="${start}" />
      </div>
      <div class="filter-group filter-advanced">
        <label class="filter-label">Bitiş Tarihi</label>
        <input type="date" class="filter-input" id="endDate" value="${end}" />
      </div>
      <div class="filter-actions" style="display:flex; gap:12px; align-items:flex-end; margin-bottom:-4px;">
        <button class="btn btn-sm" id="btnSearch" style="height:34px; padding:0 20px; font-weight:600; font-size:12px; border-radius:6px; display:flex; align-items:center; gap:6px; background:var(--accent); color:white; border:none">${ic.search} ARA</button>
        <button class="btn btn-sm" id="btnRefresh" style="height:34px; padding:0 16px; font-weight:600; font-size:12px; border-radius:6px; display:flex; align-items:center; gap:6px; background:var(--bg-secondary); border:1px solid var(--border); color:var(--text-secondary)">${ic.refresh} YENİLE</button>
      </div>
    </div>

    <div class="table-container">
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th style="width:30px"><input type="checkbox" id="selectAll" /></th>
              <th>ERP</th>
              <th>İrsaliye Bilgisi</th>
              <th>Tarih</th>
              <th>Gönderici Bilgisi</th>
              <th>İrsaliye Durumu</th>
              <th>Cevap</th>
              <th>Etiket Bilgileri</th>
              <th>İşlemler</th>
            </tr>
          </thead>
          <tbody id="rowList"></tbody>
        </table>
      </div>
      <div class="table-footer" style="display:flex">
        <span id="resultCount">Toplam Kayıt : 0</span>
      </div>
    </div>
    </div>
  `;

  page.querySelector('#btnSearch')?.addEventListener('click', () => loadIncoming(page, options));
  page.querySelector('#btnRefresh')?.addEventListener('click', () => loadIncoming(page, options));
  page.querySelector('#searchInput')?.addEventListener('input', () => applySearch(page));
  setupFilterToggle(page);
  page.querySelector('#selectAll')?.addEventListener('change', (e) => {
    page.querySelectorAll('.row-check').forEach((c) => { c.checked = e.target.checked; });
  });

  document.addEventListener('click', () => {
    document.querySelectorAll('.action-dropdown').forEach((d) => d.remove());
  });

  await loadIncoming(page, options);
  return page;
}
