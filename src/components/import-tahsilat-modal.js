// ══════════════════════════════════════════
// Toplu Tahsilat Import Modal
// PDF + Excel → Otomatik Müşteri Eşleştirme
// ══════════════════════════════════════════
import { showModal } from './modal.js';
import { showToast } from './toast.js';
import { parseStatementFile, parseTextStatement, matchTransactionsToCustomers } from '../services/bank-statement-parser.js';
import { addCollection } from '../services/tahsilat-manager.js';
import { getActiveAccount } from '../services/account-manager.js';

const ic = {
  upload: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`,
  check: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  x: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  file: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
};

function fmtCur(a) {
  try { return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(a); }
  catch { return `${a} TRY`; }
}

/**
 * Toplu Tahsilat Import Modal'ını açar
 * @param {Object} customerMap - Mevcut müşteri haritası (cari.js'den)
 * @param {Function} onComplete - İşlem bitince çağrılacak callback (veriyi yenile)
 */
export function openImportTahsilatModal(customerMap, onComplete) {
  const body = document.createElement('div');
  body.className = 'import-tahsilat-modal';
  body.innerHTML = buildUploadStepHTML();

  const footer = document.createElement('div');
  footer.style.cssText = 'display:flex; gap:10px; justify-content:flex-end; width:100%';
  footer.innerHTML = `
    <button class="btn btn-secondary" id="importCancelBtn">Vazgeç</button>
    <button class="btn btn-primary" id="importConfirmBtn" style="display:none">Seçilenleri Kaydet</button>
  `;

  const modal = showModal({
    title: 'Toplu Tahsilat Yükle',
    body,
    footer,
    size: 'lg'
  });

  if (!modal) return;

  let currentMatched = [];
  let currentUnmatched = [];

  const onParsed = (matched, unmatched) => {
    currentMatched = matched;
    currentUnmatched = unmatched;
    renderResults(body, matched, unmatched);
    footer.querySelector('#importConfirmBtn').style.display = matched.length > 0 ? '' : 'none';
  };

  // Cancel
  footer.querySelector('#importCancelBtn')?.addEventListener('click', () => modal.close());

  // ── Tab switching ──
  body.querySelectorAll('.import-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      body.querySelectorAll('.import-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const tabName = tab.dataset.tab;
      body.querySelector('#importTabFile').style.display = tabName === 'file' ? '' : 'none';
      body.querySelector('#importTabText').style.display = tabName === 'text' ? '' : 'none';
    });
  });

  // ── File input ──
  setupFileUpload(body, customerMap, onParsed);

  // ── Text paste parse ──
  body.querySelector('#importParseTextBtn')?.addEventListener('click', () => {
    const text = body.querySelector('#importTextArea')?.value || '';
    if (!text.trim()) {
      showToast('Lütfen önce metin yapıştırın.', 'warning');
      return;
    }

    try {
      const transactions = parseTextStatement(text);
      if (!transactions || transactions.length === 0) {
        showToast('Metinde işlem bulunamadı. Formatı kontrol edin.', 'warning');
        return;
      }

      showToast(`${transactions.length} işlem bulundu, müşterilerle eşleştiriliyor...`, 'info');
      const { matched, unmatched } = matchTransactionsToCustomers(transactions, customerMap);

      // Metin sekmesini gizle, sonuçları göster
      body.querySelector('#importTabText').style.display = 'none';
      body.querySelector('.import-tabs').style.display = 'none';
      onParsed(matched, unmatched);
    } catch (e) {
      showToast(`Parse hatası: ${e.message}`, 'error');
    }
  });

  // Confirm
  footer.querySelector('#importConfirmBtn')?.addEventListener('click', async () => {
    const selected = currentMatched.filter(tx => tx.selected);
    if (selected.length === 0) {
      showToast('Hiçbir tahsilat seçilmedi.', 'warning');
      return;
    }

    const confirmBtn = footer.querySelector('#importConfirmBtn');
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Kaydediliyor...';

    try {
      const account = await getActiveAccount();
      if (!account?.id) throw new Error('Aktif hesap bulunamadı.');

      let successCount = 0;
      let failCount = 0;

      for (const tx of selected) {
        try {
          await addCollection({
            account_id: account.id,
            customer_key: tx.matchedCustomerKey,
            customer_name: tx.matchedCustomerName,
            customer_tax_no: tx.matchedCustomerTaxNo || '',
            type: 'Tahsilat',
            description: tx.displayDescription || tx.description || `${tx.matchedCustomerName} - banka tahsilat`,
            amount: tx.amount,
            date: tx.date
          });
          successCount++;
        } catch {
          failCount++;
        }
      }

      if (successCount > 0) {
        showToast(`${successCount} tahsilat başarıyla kaydedildi${failCount > 0 ? `, ${failCount} hata` : ''}.`, 'success');
      } else {
        showToast('Hiçbir tahsilat kaydedilemedi.', 'error');
      }

      modal.close();
      onComplete?.();
    } catch (e) {
      showToast(`Hata: ${e.message}`, 'error');
      confirmBtn.disabled = false;
      confirmBtn.textContent = 'Seçilenleri Kaydet';
    }
  });
}

// ── Upload Step HTML ──
function buildUploadStepHTML() {
  return `
    <div class="import-tabs">
      <button class="import-tab active" data-tab="file">Dosya Yükle (PDF / Excel / CSV)</button>
      <button class="import-tab" data-tab="text">Metin Yapıştır</button>
    </div>

    <!-- Dosya Sekmesi -->
    <div class="import-tab-content" id="importTabFile">
      <div class="import-upload-zone" id="importDropZone">
        <div class="import-upload-icon">${ic.upload}</div>
        <h3>Dosya Sürükleyin veya Seçin</h3>
        <p>Banka dekontu (PDF), hesap hareketi (Excel) veya CSV dosyası yükleyin</p>
        <p style="font-size:11px;color:var(--text-muted);margin-top:4px">Desteklenen: .pdf, .xlsx, .xls, .csv</p>
        <input type="file" id="importFileInput" accept=".pdf,.xlsx,.xls,.csv" style="display:none" />
        <button class="btn btn-sm btn-primary" id="importSelectFileBtn" style="margin-top:12px">
          ${ic.file} Dosya Seç
        </button>
      </div>
    </div>

    <!-- Metin Sekmesi -->
    <div class="import-tab-content" id="importTabText" style="display:none">
      <div class="import-text-area-wrap">
        <p style="font-size:12px;color:var(--text-secondary);margin:0 0 8px">
          Aşağıdaki formatta metin yapıştırın. Her müşteri adının altında tarih: tutar satırları olmalı.
        </p>
        <div style="background:var(--bg-input);border:1px solid var(--border-color);border-radius:6px;padding:10px;font-size:11px;color:var(--text-muted);margin-bottom:10px;line-height:1.6">
          <strong>Örnek format:</strong><br>
          Yavuz Tekstil Ltd. Şti.<br>
          05/01/2026: 300.000,00 TL<br>
          04/02/2026: 525.110,00 TL<br>
          Toplam: 825.110,00 TL<br><br>
          Başka Firma A.Ş.<br>
          08/01/2026: 728.000,00 TL
        </div>
        <textarea id="importTextArea" class="form-input" rows="10" placeholder="Metni buraya yapıştırın..." style="width:100%;resize:vertical;font-family:monospace;font-size:12px"></textarea>
        <button class="btn btn-sm btn-primary" id="importParseTextBtn" style="margin-top:10px">Metni Analiz Et</button>
      </div>
    </div>

    <div id="importProgressArea" style="display:none">
      <div style="text-align:center;padding:32px">
        <div class="import-spinner"></div>
        <p style="margin-top:12px;color:var(--text-secondary)">Analiz ediliyor...</p>
      </div>
    </div>
    <div id="importResultsArea" style="display:none"></div>
  `;
}

// ── File Upload Setup ──
function setupFileUpload(container, customerMap, onParsed) {
  const dropZone = container.querySelector('#importDropZone');
  const fileInput = container.querySelector('#importFileInput');
  const selectBtn = container.querySelector('#importSelectFileBtn');
  const progressArea = container.querySelector('#importProgressArea');

  selectBtn?.addEventListener('click', () => fileInput?.click());

  fileInput?.addEventListener('change', () => {
    if (fileInput.files.length > 0) processFile(fileInput.files[0]);
  });

  // Drag & Drop
  dropZone?.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });
  dropZone?.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
  });
  dropZone?.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    if (e.dataTransfer.files.length > 0) processFile(e.dataTransfer.files[0]);
  });

  async function processFile(file) {
    dropZone.style.display = 'none';
    progressArea.style.display = 'block';

    try {
      const transactions = await parseStatementFile(file);

      if (!transactions || transactions.length === 0) {
        showToast('Dosyada işlem bulunamadı. Farklı bir dosya deneyin.', 'warning');
        dropZone.style.display = '';
        progressArea.style.display = 'none';
        return;
      }

      showToast(`${transactions.length} işlem bulundu, müşterilerle eşleştiriliyor...`, 'info');

      const { matched, unmatched } = matchTransactionsToCustomers(transactions, customerMap);
      progressArea.style.display = 'none';
      onParsed(matched, unmatched);
    } catch (e) {
      showToast(`Dosya parse hatası: ${e.message}`, 'error');
      dropZone.style.display = '';
      progressArea.style.display = 'none';
    }
  }
}

// ── Render Results ──
function renderResults(container, matched, unmatched) {
  const area = container.querySelector('#importResultsArea');
  if (!area) return;
  area.style.display = 'block';

  const totalMatched = matched.reduce((s, tx) => s + tx.amount, 0);

  area.innerHTML = `
    <div class="import-summary-bar">
      <div class="import-summary-item import-summary-matched">
        ${ic.check}
        <span><strong>${matched.length}</strong> eşleşen tahsilat</span>
        <span class="import-summary-amount">${fmtCur(totalMatched)}</span>
      </div>
      <div class="import-summary-item import-summary-unmatched">
        ${ic.x}
        <span><strong>${unmatched.length}</strong> eşleşmeyen (atlanacak)</span>
      </div>
      ${matched.length > 0 ? `
        <label class="import-select-all" style="margin-left:auto;display:flex;align-items:center;gap:6px;cursor:pointer">
          <input type="checkbox" id="importSelectAll" checked /> Tümünü Seç
        </label>
      ` : ''}
    </div>

    ${matched.length > 0 ? `
      <div class="import-table-wrap">
        <table class="import-table">
          <thead>
            <tr>
              <th style="width:36px"></th>
              <th>Tarih</th>
              <th>Müşteri Eşleşmesi</th>
              <th>Açıklama</th>
              <th>Tutar</th>
              <th>Skor</th>
            </tr>
          </thead>
          <tbody>
            ${matched.map((tx, i) => `
              <tr class="import-row-matched" data-idx="${i}">
                <td><input type="checkbox" class="import-check" data-idx="${i}" ${tx.selected ? 'checked' : ''} /></td>
                <td>${formatDate(tx.date)}</td>
                <td>
                  <span class="import-customer-badge">${tx.matchedCustomerName}</span>
                </td>
                <td class="import-desc-cell" title="${escHtml(tx.rawDescription || tx.description)}">${escHtml(truncate(tx.description, 50))}</td>
                <td style="font-weight:600;color:var(--success)">${fmtCur(tx.amount)}</td>
                <td><span class="import-score import-score-${scoreClass(tx.matchScore)}">${tx.matchScore}%</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    ` : ''}

    ${unmatched.length > 0 ? `
      <details class="import-unmatched-section" ${matched.length === 0 ? 'open' : ''}>
        <summary>Eşleşmeyen İşlemler (${unmatched.length})</summary>
        <div class="import-table-wrap">
          <table class="import-table import-table-muted">
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Açıklama</th>
                <th>Tutar</th>
              </tr>
            </thead>
            <tbody>
              ${unmatched.map(tx => `
                <tr>
                  <td>${formatDate(tx.date)}</td>
                  <td class="import-desc-cell" title="${escHtml(tx.rawDescription || tx.description)}">${escHtml(truncate(tx.description, 60))}</td>
                  <td>${fmtCur(tx.amount)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </details>
    ` : ''}
  `;

  // Checkbox events
  area.querySelectorAll('.import-check').forEach(cb => {
    cb.addEventListener('change', () => {
      const idx = parseInt(cb.dataset.idx);
      if (matched[idx]) matched[idx].selected = cb.checked;
    });
  });

  // Select all
  area.querySelector('#importSelectAll')?.addEventListener('change', (e) => {
    const checked = e.target.checked;
    matched.forEach(tx => tx.selected = checked);
    area.querySelectorAll('.import-check').forEach(cb => cb.checked = checked);
  });
}

// ── Helpers ──
function formatDate(d) {
  if (!d) return '—';
  try {
    const parts = d.split('-');
    return `${parts[2]}.${parts[1]}.${parts[0]}`;
  } catch { return d; }
}

function escHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function truncate(s, n) {
  return s && s.length > n ? s.slice(0, n) + '…' : (s || '');
}

function scoreClass(score) {
  if (score >= 90) return 'high';
  if (score >= 60) return 'mid';
  return 'low';
}
