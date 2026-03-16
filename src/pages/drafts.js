import { EInvoice, EArchive } from '../api/nilvera.js';
import { showToast } from '../components/toast.js';
import { showModal } from '../components/modal.js';
import { navigate } from '../router.js';

const INVOICE_EDIT_CONTEXT_KEY = 'nilfatura_invoice_edit_context';

const ic = {
  efatura: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M9 15l2 2 4-4"/></svg>`,
  search: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  refresh: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>`,
  trash: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
  send: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`,
  menu: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`,
  query: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  hidden: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>`,
  pen: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>`,
  tag: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>`,
  barcode: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5v14"/><path d="M8 5v14"/><path d="M12 5v14"/><path d="M17 5v14"/><path d="M21 5v14"/></svg>`,
  xml: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
  pdf: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
  noData: `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" opacity="0.3"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
};

let cachedDrafts = [];
let selectedSource = 'einvoice';

export async function renderDrafts() {
  const page = document.createElement('div');
  page.innerHTML = `
    <div class="nilvera-breadcrumb">
      ${ic.efatura}
      <span>Fatura İşlemleri</span>
      <span class="bc-separator">›</span>
      <span class="bc-current">Taslaklar</span>
    </div>

    <div class="nilvera-filter-bar">
      <div class="filter-group filter-search">
        <label class="filter-label">Ara</label>
        <input type="text" class="filter-input" id="searchInput" placeholder="Fatura no, alıcı veya VKN ara" style="width:100%" />
      </div>
      <div class="filter-group">
        <label class="filter-label">Başlangıç Tarihi</label>
        <input type="date" class="filter-input" id="startDate" />
      </div>
      <div class="filter-group">
        <label class="filter-label">Bitiş Tarihi</label>
        <input type="date" class="filter-input" id="endDate" />
      </div>
      <div class="filter-group">
        <label class="filter-label">Kaynak</label>
        <select class="filter-input" id="draftSource">
          <option value="einvoice">E-Fatura</option>
          <option value="earchive">E-Arşiv</option>
        </select>
      </div>
      <div class="filter-actions" style="display:flex; gap:12px; align-items:flex-end; margin-bottom:-4px;">
        <button class="btn btn-sm" id="btnSearch" style="height:34px; padding:0 20px; font-weight:600; font-size:12px; border-radius:6px; display:flex; align-items:center; gap:6px; background:var(--accent); color:white; border:none">${ic.search} ARA</button>
        <button class="btn btn-sm" id="btnRefresh" style="height:34px; padding:0 16px; font-weight:600; font-size:12px; border-radius:6px; display:flex; align-items:center; gap:6px; background:var(--bg-secondary); border:1px solid var(--border); color:var(--text-secondary)">${ic.refresh} YENİLE</button>
        <button class="btn btn-sm" id="btnSendBulk" style="height:34px; padding:0 16px; font-weight:600; font-size:12px; border-radius:6px; display:flex; align-items:center; gap:6px; background:var(--success); border:none; color:white">${ic.send} ONAYLA VE GÖNDER</button>
      </div>
    </div>

    <div class="table-container">
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th style="width:30px"><input type="checkbox" id="selectAll" /></th>
              <th>ERP</th>
              <th>Fatura Bilgisi</th>
              <th>Tarih</th>
              <th>Alıcı Bilgisi</th>
              <th>Alıcı Etiket</th>
              <th>Fatura Türü</th>
              <th>Etiket Bilgileri</th>
              <th>İşlemler</th>
            </tr>
          </thead>
          <tbody id="draftList"></tbody>
        </table>
      </div>
      <div class="table-footer" id="tableFooter" style="display:none">
        <span id="resultCount"></span>
      </div>
    </div>
  `;

  page.querySelector('#btnSearch')?.addEventListener('click', () => loadDrafts(page));
  page.querySelector('#btnRefresh')?.addEventListener('click', () => loadDrafts(page));
  page.querySelector('#draftSource')?.addEventListener('change', () => {
    selectedSource = page.querySelector('#draftSource')?.value || 'einvoice';
    loadDrafts(page);
  });
  page.querySelector('#searchInput')?.addEventListener('input', () => applyTextFilter(page));
  page.querySelector('#selectAll')?.addEventListener('change', (e) => {
    page.querySelectorAll('.row-check').forEach(cb => {
      cb.checked = e.target.checked;
    });
  });

  page.querySelector('#btnSendBulk')?.addEventListener('click', async () => {
    const selectedRows = Array.from(page.querySelectorAll('.row-check:checked'))
      .map(el => ({ uuid: el.value, alias: (el.dataset.alias || '').trim() }))
      .filter(item => item.uuid);

    const selected = selectedRows
      .map(item => item.uuid)
      .filter(Boolean);

    if (selected.length === 0) {
      showToast('Önce en az bir taslak seçin', 'warning');
      return;
    }

    const res = selectedSource === 'earchive'
      ? await EArchive.confirmAndSend(selected)
      : await EInvoice.confirmAndSend(await buildEInvoiceSendModels(selectedRows));
    showToast(res.success ? 'Taslaklar gönderildi' : `Hata: ${res.error}`, res.success ? 'success' : 'error');
    if (res.success) loadDrafts(page);
  });

  document.addEventListener('click', () => {
    document.querySelectorAll('.action-dropdown').forEach(d => d.remove());
  });

  await loadDrafts(page);
  return page;
}

async function loadDrafts(page) {
  const tbody = page.querySelector('#draftList');
  if (!tbody) return;

  selectedSource = page.querySelector('#draftSource')?.value || 'einvoice';
  const startDate = page.querySelector('#startDate')?.value || undefined;
  const endDate = page.querySelector('#endDate')?.value || undefined;

  tbody.innerHTML = `<tr><td colspan="9" class="table-empty"><div style="padding:24px;text-align:center;color:var(--text-muted)">Taslaklar yükleniyor...</div></td></tr>`;

  try {
    const api = selectedSource === 'earchive' ? EArchive : EInvoice;
    const params = {
      StartDate: startDate ? `${startDate}T00:00:00` : undefined,
      EndDate: endDate ? `${endDate}T23:59:59` : undefined,
      PageSize: 100,
    };
    const res = await api.listDrafts(params);

    if (!res.success) {
      tbody.innerHTML = emptyRow(`Hata: ${res.error}`);
      updateFooter(page, 0);
      return;
    }

    let drafts = [];
    if (Array.isArray(res.data)) drafts = res.data;
    else if (res.data && Array.isArray(res.data.Content)) drafts = res.data.Content;
    else if (res.data && Array.isArray(res.data.Items)) drafts = res.data.Items;

    cachedDrafts = drafts;
    renderRows(page, drafts);
  } catch (e) {
    tbody.innerHTML = emptyRow(`Bağlantı hatası: ${e.message}`);
    updateFooter(page, 0);
  }
}

function applyTextFilter(page) {
  const q = (page.querySelector('#searchInput')?.value || '').toLowerCase().trim();
  if (!q) {
    renderRows(page, cachedDrafts);
    return;
  }

  const filtered = cachedDrafts.filter((d) => {
    const info = d.InvoiceInfo || d.invoiceInfo || d;
    const customer = d.CustomerInfo || d.customerInfo || d;

    const no = (info.InvoiceNumber || info.InvoiceSerieOrNumber || '').toString().toLowerCase();
    const name = (customer.ReceiverName || customer.CustomerName || customer.Name || customer.name || '').toString().toLowerCase();
    const tax = (customer.ReceiverTaxNumber || customer.TaxNumber || '').toString().toLowerCase();

    return no.includes(q) || name.includes(q) || tax.includes(q);
  });

  renderRows(page, filtered);
}

function renderRows(page, drafts) {
  const tbody = page.querySelector('#draftList');
  if (!tbody) return;

  if (!drafts.length) {
    tbody.innerHTML = emptyRow('Kayıt bulunamadı');
    updateFooter(page, 0);
    return;
  }

  tbody.innerHTML = drafts.map((d, idx) => {
    const info = d.InvoiceInfo || d.invoiceInfo || d;
    const customer = d.CustomerInfo || d.customerInfo || d;

    const uuid = extractDraftUuid(d);
    const no = info.InvoiceNumber || info.InvoiceSerieOrNumber || '—';
    const amount = info.PayableAmount;
    const curr = info.CurrencyCode || 'TRY';
    const issueDate = fmtDateTime(info.IssueDate);
    const createdDate = fmtDateTime(info.CreatedDate || info.IssueDate);
    const receiverName = customer.ReceiverName || customer.CustomerName || customer.Name || customer.name || '—';
    const receiverTax = customer.ReceiverTaxNumber || customer.TaxNumber || '—';
    const alias = customer.ReceiverAlias || customer.Alias || draftAlias || 'Belirtilmemiş';
    const profile = formatProfile(info.InvoiceProfile || 'Ticari Fatura');
    const typeStr = formatType(info.InvoiceType || 'SATIS');

    return `
      <tr>
        <td><input type="checkbox" class="row-check" value="${uuid}" data-alias="${escapeHtmlAttr(alias)}" /></td>
        <td>
          <button class="action-menu-btn" data-action="preview" data-uuid="${uuid}" data-source="${selectedSource}" title="PDF Önizleme">${ic.query}</button>
        </td>
        <td>
          <div style="font-size:12px;font-weight:600">Seri/No : ${no}</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:4px;display:flex;align-items:center;gap:6px;flex-wrap:wrap">
            <span style="border:1px solid #22c55e;color:#15803d;border-radius:999px;padding:1px 8px;background:#f0fdf4;font-weight:600">${typeStr}</span>
            <span>${fmtCur(amount, curr)}</span>
          </div>
        </td>
        <td>
          <div style="font-size:11px;color:var(--text-secondary)"><strong>Fatura:</strong> ${issueDate}</div>
          <div style="font-size:11px;color:var(--text-muted)"><strong>Kayıt:</strong> ${createdDate}</div>
        </td>
        <td>
          <div style="font-size:12px;font-weight:600">${receiverName}</div>
          <div style="font-size:11px;color:var(--text-muted)">Vergi No : ${receiverTax}</div>
        </td>
        <td><span style="font-size:11px;color:var(--text-secondary)">${alias}</span></td>
        <td><span class="badge badge-info">${profile}</span></td>
        <td><span style="font-size:11px;color:var(--text-muted)">—</span></td>
        <td>
          <button class="action-menu-btn action-menu-trigger" data-idx="${idx}" data-uuid="${uuid}" data-source="${selectedSource}" data-alias="${escapeHtmlAttr(alias)}" title="İşlemler">${ic.menu}</button>
        </td>
      </tr>
    `;
  }).join('');

  tbody.querySelectorAll('[data-action="preview"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      showPdfPreviewModal(btn.dataset.uuid, btn.dataset.source);
    });
  });

  tbody.querySelectorAll('.action-menu-trigger').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.action-dropdown').forEach(d => d.remove());

      const uuid = btn.dataset.uuid;
      const source = btn.dataset.source;
      const alias = btn.dataset.alias || '';
      const dropdown = document.createElement('div');
      dropdown.className = 'action-dropdown';
      dropdown.innerHTML = `
        <button class="action-dropdown-item" data-act="edit">${ic.pen} Faturayı Düzenle</button>
        <button class="action-dropdown-item" data-act="send">${ic.send} Onayla ve Gönder</button>
        <button class="action-dropdown-item" data-act="tags">${ic.tag} Etiket Bilgileri</button>
        <button class="action-dropdown-item" data-act="code">${ic.barcode} Özel Kod Alanı</button>
        <button class="action-dropdown-item" data-act="xml">${ic.xml} XML İndir</button>
        <button class="action-dropdown-item" data-act="pdf">${ic.pdf} PDF İndir</button>
        <div class="action-dropdown-divider"></div>
        <button class="action-dropdown-item" data-act="delete" style="color:var(--danger)">${ic.trash} Sil</button>
      `;

      const rect = btn.getBoundingClientRect();
      dropdown.style.top = `${rect.bottom + 4}px`;
      document.body.appendChild(dropdown);

      setTimeout(() => {
        const dropRect = dropdown.getBoundingClientRect();
        dropdown.style.left = `${Math.max(10, rect.right - dropRect.width)}px`;
      }, 0);

      dropdown.querySelectorAll('.action-dropdown-item').forEach(item => {
        item.addEventListener('click', async (ev) => {
          ev.stopPropagation();
          dropdown.remove();
          await handleAction(page, item.dataset.act, uuid, source, alias);
        });
      });
    });
  });

  updateFooter(page, drafts.length);
}

async function handleAction(page, action, uuid, source, aliasHint = '') {
  switch (action) {
    case 'edit':
      await openDraftInInvoiceCreate(uuid, source);
      return;
    case 'pdf':
      await showPdfPreviewModal(uuid, source);
      return;
    case 'xml':
      await downloadXml(uuid, source);
      return;
    case 'send':
      if (!confirm('Bu taslağı onaylayıp göndermek istediğinize emin misiniz?')) return;
      const sendRes = source === 'earchive'
        ? await EArchive.confirmAndSend([uuid])
        : await EInvoice.confirmAndSend(await buildEInvoiceSendModels([{ uuid, alias: aliasHint }]));
      showToast(sendRes.success ? 'Taslak gönderildi' : `Hata: ${sendRes.error}`, sendRes.success ? 'success' : 'error');
      if (sendRes.success) {
        await loadDrafts(page);
      }
      return;
    case 'delete':
      if (!confirm('Bu taslağı silmek istediğinize emin misiniz?')) return;
      const del = source === 'earchive'
        ? await EArchive.deleteDrafts([uuid])
        : await EInvoice.deleteDrafts([uuid]);
      showToast(del.success ? 'Taslak silindi' : `Hata: ${del.error}`, del.success ? 'success' : 'error');
      if (del.success) {
        await loadDrafts(page);
      }
      return;
    default:
      showToast('Bu özellik yakında aktif olacak', 'info');
      return;
  }
}

async function openDraftInInvoiceCreate(uuid, source) {
  try {
    if (!uuid) {
      showToast('Taslak UUID bulunamadı', 'error');
      return;
    }

    const api = source === 'earchive' ? EArchive : EInvoice;
    const modelRes = await api.getDraftModel(uuid);
    const fullRes = source === 'earchive'
      ? { success: false }
      : await EInvoice.getDraft(uuid);

    const draftModel = modelRes?.success ? (modelRes.data?.Content || modelRes.data) : null;
    const draftRaw = fullRes?.success ? (fullRes.data?.Content || fullRes.data) : null;
    const cached = cachedDrafts.find((d) => extractDraftUuid(d) === uuid) || null;
    const draftAlias = extractDraftAlias(draftModel) || extractDraftAlias(draftRaw) || extractDraftAlias(cached) || '';

    const context = {
      source,
      uuid,
      draftModel,
      draftRaw,
      draftAlias,
      createdAt: new Date().toISOString()
    };

    sessionStorage.setItem(INVOICE_EDIT_CONTEXT_KEY, JSON.stringify(context));
    navigate('/create');
  } catch (e) {
    showToast(`Düzenleme açılamadı: ${e.message}`, 'error');
  }
}

async function showPdfPreviewModal(uuid, source) {
  if (!uuid) {
    showToast('Taslak UUID bulunamadı', 'error');
    return;
  }

  const bodyEl = document.createElement('div');
  bodyEl.style.height = '80vh';
  bodyEl.style.minHeight = '600px';
  bodyEl.style.display = 'flex';
  bodyEl.style.alignItems = 'center';
  bodyEl.style.justifyContent = 'center';
  bodyEl.innerHTML = `<div style="animation:pulse 1.5s infinite">${ic.refresh} Yükleniyor...</div>`;

  const footerEl = document.createElement('div');
  footerEl.style.cssText = 'display:flex;gap:10px;justify-content:flex-end;width:100%';
  footerEl.innerHTML = `
    <button class="btn btn-secondary" id="closePdfModal">Kapat</button>
    <button class="btn btn-success" id="downloadPdfBtn" style="display:none">${ic.pdf} İndir</button>
    <button class="btn btn-primary" id="openNewTabBtn" style="display:none">Yeni Sekmede Aç</button>
  `;

  const modal = showModal({ title: 'Taslak PDF Önizleme', body: bodyEl, footer: footerEl, size: 'xlarge' });
  footerEl.querySelector('#closePdfModal')?.addEventListener('click', () => modal?.close());

  try {
    const dlBtn = footerEl.querySelector('#downloadPdfBtn');
    const openBtn = footerEl.querySelector('#openNewTabBtn');

    const pdfContent = await getDraftPdfContent(uuid, source);
    const pdfUrl = buildPdfUrl(pdfContent);

    if (pdfUrl) {
      bodyEl.innerHTML = `<iframe src="${pdfUrl}" width="100%" height="100%" style="border:none;border-radius:4px;"></iframe>`;
      dlBtn.style.display = 'flex';
      openBtn.style.display = 'flex';

      dlBtn.addEventListener('click', () => {
        const link = document.createElement('a');
        link.href = pdfUrl;
        link.download = `Taslak_${uuid}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      });
      openBtn.addEventListener('click', () => window.open(pdfUrl, '_blank', 'noopener,noreferrer'));
      return;
    }

    const htmlRes = source === 'earchive' ? await EArchive.getDraftHtml(uuid) : await EInvoice.getDraftHtml(uuid);
    const htmlContent = extractFileContent(htmlRes?.data);
    if (htmlRes?.success && htmlContent) {
      bodyEl.innerHTML = `<iframe srcdoc="${escapeHtmlAttr(htmlContent)}" width="100%" height="100%" style="border:none;border-radius:4px;background:white"></iframe>`;
      openBtn.style.display = 'flex';
      openBtn.addEventListener('click', () => {
        const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank', 'noopener,noreferrer');
        setTimeout(() => URL.revokeObjectURL(url), 5000);
      });
      return;
    }

    throw new Error(htmlRes?.error || 'Önizleme alınamadı');
  } catch (err) {
    bodyEl.innerHTML = `<div class="empty-state">${ic.noData}<h3>Önizleme yüklenemedi</h3><p>${err.message}</p></div>`;
  }
}

async function getDraftPdfContent(uuid, source) {
  let content = '';

  // 0) Doğrudan taslak PDF endpointi
  const draftPdfRes = source === 'earchive'
    ? await EArchive.getDraftPdf(uuid)
    : await EInvoice.getDraftPdf(uuid);
  content = draftPdfRes?.success ? extractFileContent(draftPdfRes.data) : '';
  if (content) return content;

  const exportVariants = ['PDF', 'Pdf', 'pdf'];

  // 1) Draft export endpointleri (esas doğru akış)
  for (const variant of exportVariants) {
    const exportRes = source === 'earchive'
      ? await EArchive.exportDrafts(variant, [uuid])
      : await EInvoice.exportDrafts(variant, [uuid]);
    if (exportRes?.success) {
      content = extractFileContent(exportRes.data);
      if (content) return content;
    }
  }

  // 2) Fallback: bazı ortamlarda draft gönderim kuyruğuna düşmüş olabilir
  if (source === 'earchive') {
    const invPdfRes = await EArchive.getInvoicePdf(uuid);
    content = invPdfRes?.success ? extractFileContent(invPdfRes.data) : '';
    if (content) return content;
  } else {
    const salePdfRes = await EInvoice.getSalePdf(uuid);
    content = salePdfRes?.success ? extractFileContent(salePdfRes.data) : '';
    if (content) return content;
  }

  return '';
}

function extractDraftUuid(draft) {
  if (!draft || typeof draft !== 'object') return '';
  const info = draft.InvoiceInfo || draft.invoiceInfo || {};

  const direct = [
    draft.UUID,
    draft.uuid,
    draft.Uuid,
    draft.DraftUUID,
    draft.DraftUuid,
    draft.ID,
    draft.Id,
    draft.id,
    info.UUID,
    info.uuid,
    info.Uuid,
    info.DraftUUID,
    info.DraftUuid,
  ];

  const found = direct.find(v => typeof v === 'string' && v.trim());
  return found ? found.trim() : '';
}

function extractDraftAlias(draft) {
  if (!draft || typeof draft !== 'object') return '';

  const info = draft.InvoiceInfo || draft.invoiceInfo || {};
  const customer = draft.CustomerInfo || draft.customerInfo || {};
  const candidates = [
    customer.ReceiverAlias,
    customer.Alias,
    customer.Mailbox,
    customer.Tag,
    draft.CustomerAlias,
    draft.customerAlias,
    draft.ReceiverAlias,
    draft.Alias,
    info.CustomerAlias,
    info.Alias,
  ];

  const found = candidates.find(v => typeof v === 'string' && v.trim());
  return found ? found.trim() : '';
}

async function buildEInvoiceSendModels(rows) {
  if (!Array.isArray(rows)) return [];

  const models = [];

  for (const rowInfo of rows) {
    const uuid = typeof rowInfo === 'string' ? rowInfo : rowInfo?.uuid;
    const rowAlias = typeof rowInfo === 'object' ? (rowInfo.alias || '').trim() : '';
    if (!uuid) continue;

    try {
      const row = cachedDrafts.find((d) => extractDraftUuid(d) === uuid);
      let alias = rowAlias || extractDraftAlias(row);

      if (!alias) {
        const draftRes = await EInvoice.getDraft(uuid);
        const draft = draftRes?.success ? (draftRes.data?.Content || draftRes.data) : null;
        if (draft) {
          alias = extractDraftAlias(draft);
        }
      }

      models.push({
        UUID: uuid,
        ...(alias ? { Alias: alias } : {}),
      });
    } catch {
      models.push({ UUID: uuid });
    }
  }

  return models.filter((x) => x.UUID);
}

function extractFileContent(data) {
  if (!data) return '';
  if (typeof data === 'string') return data.trim();
  if (typeof data.File === 'string') return data.File.trim();
  if (typeof data.String === 'string') return data.String.trim();
  if (typeof data.Content === 'string') return data.Content.trim();
  if (typeof data.Data === 'string') return data.Data.trim();

  if (Array.isArray(data)) {
    for (const item of data) {
      const found = extractFileContent(item);
      if (found) return found;
    }
  }

  if (typeof data === 'object') {
    for (const key of Object.keys(data)) {
      const found = extractFileContent(data[key]);
      if (found) return found;
    }
  }

  return '';
}

function buildPdfUrl(content) {
  if (!content) return '';

  const cleaned = String(content).trim();
  if (!cleaned) return '';

  if (cleaned.startsWith('data:application/pdf')) {
    return cleaned.includes('#') ? cleaned : `${cleaned}#toolbar=0&navpanes=0&scrollbar=0`;
  }

  if (cleaned.startsWith('http://') || cleaned.startsWith('https://') || cleaned.startsWith('blob:')) {
    return cleaned;
  }

  // PDF base64 imzası "JVBERi0" (%PDF)
  const compact = cleaned.replace(/\s+/g, '');
  if (compact.startsWith('JVBERi0')) {
    return `data:application/pdf;base64,${compact}#toolbar=0&navpanes=0&scrollbar=0`;
  }

  return '';
}

function escapeHtmlAttr(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function downloadXml(uuid, source) {
  try {
    let content = '';
    let res;

    if (source === 'earchive') {
      res = await EArchive.getDraftXml(uuid);
      if (res.success) content = extractFileContent(res.data);
    } else {
      res = await EInvoice.getDraftXml(uuid);
      if (res.success) content = extractFileContent(res.data);

      if (!content) {
        const exportVariants = ['Xml', 'xml'];
        for (const variant of exportVariants) {
          const exportRes = await EInvoice.exportDrafts(variant, [uuid]);
          if (exportRes?.success) {
            content = extractFileContent(exportRes.data);
            if (content) break;
          }
        }
      }
    }

    if (!content) throw new Error(res?.error || 'XML alınamadı');

    const isBase64 = content && /^[a-zA-Z0-9+/=]+$/.test(content);
    const url = isBase64
      ? `data:application/xml;base64,${content}`
      : `data:application/xml,${encodeURIComponent(content)}`;

    const link = document.createElement('a');
    link.href = url;
    link.download = `Taslak_${uuid}.xml`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('XML indirildi', 'success');
  } catch (e) {
    showToast(`XML indirme başarısız: ${e.message}`, 'error');
  }
}

function updateFooter(page, count) {
  const footer = page.querySelector('#tableFooter');
  const el = page.querySelector('#resultCount');
  if (footer) footer.style.display = count > 0 ? 'flex' : 'none';
  if (el) el.textContent = `Toplam Kayıt : ${count}`;
}

function emptyRow(message) {
  return `<tr><td colspan="9" class="table-empty"><div class="empty-state">${ic.noData}<h3>${message}</h3></div></td></tr>`;
}

function fmtDateTime(d) {
  if (!d) return '—';
  try {
    const dt = new Date(d);
    return `${dt.toLocaleDateString('tr-TR')} ${dt.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`;
  } catch {
    return d;
  }
}

function fmtCur(a, c) {
  if (a === null || a === undefined) return '—';
  try {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: c || 'TRY' }).format(a);
  } catch {
    return `${a} ${c || 'TRY'}`;
  }
}

function formatType(str) {
  if (str === 'SATIS') return 'Satış';
  if (str === 'IADE') return 'İade';
  return str || 'Satış';
}

function formatProfile(str) {
  if (str === 'TICARIFATURA') return 'Ticari Fatura';
  if (str === 'TEMELFATURA') return 'Temel Fatura';
  if (str === 'EARSIVFATURA') return 'E-Arşiv Fatura';
  return str || 'Ticari Fatura';
}
