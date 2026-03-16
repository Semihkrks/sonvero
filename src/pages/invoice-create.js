import { EInvoice, EArchive, buildEInvoiceModel, General } from '../api/nilvera.js';
import { showToast } from '../components/toast.js';
import { navigate } from '../router.js';
import { getActiveAccount, getAccountPreferences } from '../services/account-manager.js';

const INVOICE_EDIT_CONTEXT_KEY = 'nilfatura_invoice_edit_context';

const ic = {
  trash: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
  plus: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>`,
  search: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>`,
  save: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8"/><path d="M7 3v5h8"/></svg>`,
  send: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2 11 13"/><path d="m22 2-7 20-4-9-9-4 20-7z"/></svg>`
};

const UNITS = [
  { val: 'C62', lbl: 'ADET' },
  { val: 'KGM', lbl: 'KG' },
  { val: 'LTR', lbl: 'LİTRE' },
  { val: 'MTR', lbl: 'METRE' },
  { val: 'MON', lbl: 'AY' },
  { val: 'DAY', lbl: 'GÜN' },
  { val: 'HUR', lbl: 'SAAT' }
];

export async function renderInvoiceCreate() {
  const page = document.createElement('div');
  const now = new Date();
  const currentDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  page.innerHTML = `
    <div class="invoice-create-page">
    <div class="nilvera-breadcrumb">
      <span>e-Fatura</span>
      <span class="bc-separator">›</span>
      <span class="bc-current">Fatura Oluştur</span>
    </div>

    <div class="invoice-create-header" style="display:flex; justify-content:space-between; align-items:center;">
      <div class="invoice-create-title-wrap">
        <h3 class="invoice-create-title">Mal / Hizmet Faturası</h3>
        <p class="invoice-create-title-sub">Mükellef bilgileri ve satır içeriklerini düzenleyin</p>
      </div>
      <div class="invoice-create-header-actions" style="display:flex; gap:10px;">
        <button class="btn btn-secondary" id="btnDraft">${ic.save} TASLAK</button>
        <button class="btn btn-primary" id="btnSend">${ic.send} ONAYLA GÖNDER</button>
      </div>
    </div>

    <div class="invoice-create-top-grid" style="display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 20px; margin-bottom: 20px;">
      <!-- ALICI BİLGİLERİ -->
      <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
          <h3 style="font-size:16px; font-weight:700;">👥 Alıcı Bilgileri</h3>
          <span id="tagInvoiceType" style="background:var(--accent); color:#fff; padding:4px 8px; border-radius:4px; font-size:11px; font-weight:700; display:none;"></span>
        </div>
        
        <div class="form-group" style="position:relative;">
          <div style="position:relative;">
            <span style="position:absolute; left:12px; top:50%; transform:translateY(-50%); color:var(--text-muted); pointer-events:none;">${ic.search}</span>
            <input type="text" class="form-input" id="searchCustomer" placeholder="Alıcı Adını Giriniz..." style="padding-left:36px; border-color:var(--accent);" autocomplete="off">
          </div>
          <div id="searchResults" style="display:none; position:absolute; top:100%; left:0; right:0; background:var(--bg-modal); border:1px solid var(--border); z-index:99; border-radius:6px; max-height:200px; overflow-y:auto; box-shadow:0 10px 15px -3px rgba(0,0,0,0.5);"></div>
        </div>

        <div class="invoice-customer-grid" style="display:grid; grid-template-columns: 1fr 1fr; gap: 15px;">
          <div class="form-group" style="grid-column:span 2;">
            <label class="form-label">Unvan / Adı Soyadı *</label>
            <input type="text" class="form-input" id="c_name">
          </div>
          <div class="form-group">
            <label class="form-label">Etiket (Mail)</label>
            <input type="text" class="form-input" id="c_alias" placeholder="urn:mail:...">
          </div>
          <div class="form-group">
            <label class="form-label">VKN-TCKN *</label>
            <input type="text" class="form-input" id="c_vkn">
          </div>
          <div class="form-group">
            <label class="form-label">Vergi Dairesi</label>
            <input type="text" class="form-input" id="c_vd">
          </div>
          <div class="form-group">
            <label class="form-label">Adres</label>
            <input type="text" class="form-input" id="c_address">
          </div>
          <div class="form-group">
            <label class="form-label">İlçe</label>
            <input type="text" class="form-input" id="c_district">
          </div>
          <div class="form-group">
            <label class="form-label">Şehir</label>
            <input type="text" class="form-input" id="c_city">
          </div>
          <div class="form-group">
            <label class="form-label">Ülke</label>
            <select class="form-select" id="c_country">
              <option value="Türkiye">Türkiye</option>
              <option value="Almanya">Almanya</option>
              <option value="İngiltere">İngiltere</option>
              <option value="ABD">ABD</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Posta Kodu</label>
            <input type="text" class="form-input" id="c_zip">
          </div>
          <div class="form-group">
            <label class="form-label">Telefon</label>
            <input type="text" class="form-input" id="c_phone">
          </div>
          <div class="form-group">
            <label class="form-label">E-Posta</label>
            <input type="email" class="form-input" id="c_email">
          </div>
        </div>
      </div>

      <!-- GENEL BİLGİLER -->
    <div class="card invoice-general-card" style="margin-bottom:20px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
        <h3 style="font-size:16px; font-weight:700; margin:0; display:flex; align-items:center; gap:8px;">
          <svg style="width:20px; height:20px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
          Genel Bilgiler
        </h3>
        <div id="ettiBadge" style="background:#64748b; color:white; padding:4px 10px; border-radius:12px; font-size:12px; display:none; align-items:center; gap:8px;">
          <span style="font-weight:700;">ETTN</span> <span id="ettiSpan"></span>
        </div>
      </div>

      <div class="invoice-general-grid-4" style="display:grid; grid-template-columns: 1fr 0.8fr 1fr 1fr; gap: 20px; margin-bottom:15px;">
        <div class="form-group" style="margin-bottom:0;">
          <label style="font-size:10px; color:var(--text-muted); position:absolute; left:12px; top:-6px; background:var(--bg-modal, #fff); padding:0 4px; z-index:1;">Fatura Tarihi</label>
          <input type="date" class="form-input" id="g_date" value="${currentDate}" style="border-radius:4px; padding-top:12px; padding-bottom:12px; border-color:#cbd5e1;">
        </div>
        <div class="form-group" style="margin-bottom:0; position:relative;">
          <label style="font-size:10px; color:var(--text-muted); position:absolute; left:12px; top:-6px; background:var(--bg-modal, #fff); padding:0 4px; z-index:1;">Saat</label>
          <input type="time" class="form-input" id="g_time" value="${currentTime}" step="60" style="border-radius:4px; padding-top:12px; padding-bottom:12px; border-color:#cbd5e1;">
        </div>
        <div class="form-group" style="margin-bottom:0; position:relative;">
          <label style="font-size:10px; color:var(--text-muted); position:absolute; left:12px; top:-6px; background:var(--bg-modal, #fff); padding:0 4px; z-index:1;">Fatura Seri</label>
          <select class="form-select" id="g_series" style="border-radius:4px; padding-top:12px; padding-bottom:12px; border-color:#cbd5e1;">
            <option value="AKA">AKA</option>
            <option value="BIR">BIR</option>
            <option value="ABC">ABC</option>
          </select>
        </div>
        <div class="form-group" style="margin-bottom:0; position:relative;">
          <label style="font-size:10px; color:var(--text-muted); position:absolute; left:12px; top:-6px; background:var(--bg-modal, #fff); padding:0 4px; z-index:1;">Fatura Şablonu</label>
          <select class="form-select" id="g_template" style="border-radius:4px; padding-top:12px; padding-bottom:12px; border-color:#cbd5e1;">
            <option value="eFatura">eFatura</option>
            <option value="eArsiv">eArşiv</option>
          </select>
        </div>
      </div>

      <div class="invoice-general-grid-2" style="display:grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom:15px;">
        <div class="form-group" style="margin-bottom:0; position:relative;">
          <label style="font-size:10px; color:var(--text-muted); position:absolute; left:12px; top:-6px; background:var(--bg-modal, #fff); padding:0 4px; z-index:1;">Fatura Senaryosu</label>
          <select class="form-select" id="g_scenario" style="border-radius:4px; padding-top:12px; padding-bottom:12px; border-color:#cbd5e1; color:#3b82f6;">
            <option value="TICARIFATURA">Ticari Fatura</option>
            <option value="TEMELFATURA">Temel Fatura</option>
            <option value="HALTIPIFATURASI">Hal Tipi Faturası</option>
            <option value="KAMUFATURASI">Kamu Faturası</option>
            <option value="ENERJIFATURASI">Enerji Faturası</option>
            <option value="EARSIV">e-Arşiv Fatura</option>
          </select>
        </div>
        <div class="form-group" style="margin-bottom:0; position:relative;">
          <label style="font-size:10px; color:var(--text-muted); position:absolute; left:12px; top:-6px; background:var(--bg-modal, #fff); padding:0 4px; z-index:1;">Fatura Tipi</label>
          <select class="form-select" id="g_type" style="border-radius:4px; padding-top:12px; padding-bottom:12px; border-color:#cbd5e1;">
            <option value="SATIS">Satış</option>
            <option value="IADE">İade</option>
            <option value="TEVKIFAT">Tevkifat</option>
            <option value="ISTISNA">Vergi İstisna</option>
            <option value="IHRACKAYITLI">İhraç Kayıtlı</option>
            <option value="OZELMATRAH">Özel Matrah</option>
            <option value="KONAKLAMAVERGİSİ">Konaklama Vergisi</option>
          </select>
        </div>
      </div>

      <div class="invoice-general-grid-2" style="display:grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom:15px;">
        <div class="form-group" style="margin-bottom:0; position:relative;">
          <label style="font-size:10px; color:var(--text-muted); position:absolute; left:12px; top:-6px; background:var(--bg-modal, #fff); padding:0 4px; z-index:1;">Para Birimi</label>
          <select class="form-select" id="g_currency" style="border-radius:4px; padding-top:12px; padding-bottom:12px; border-color:#cbd5e1;">
            <option value="TRY">Türk Lirası</option>
            <option value="USD">Amerikan Doları</option>
            <option value="EUR">Euro</option>
          </select>
        </div>
        <div class="form-group" style="margin-bottom:0;">
          <input type="number" class="form-input" id="g_exchange" placeholder="Döviz Kuru" disabled style="border-radius:4px; padding-top:12px; padding-bottom:12px; border-color:#cbd5e1; background:#f8fafc; color:#94a3b8;">
        </div>
      </div>
      
      <div class="form-group" id="g_kdv_istisna_container" style="margin-bottom:20px; display:none;">
          <select class="form-select" id="g_kdv_istisna" style="border-radius:4px; padding-top:12px; padding-bottom:12px; border-color:#cbd5e1; color:#94a3b8;">
            <option value="">KDV İstisna Muafiyet Sebebi</option>
            <option value="351">351 - İstisna Olmayan Diğer</option>
            <option value="350">350 - Diğerleri</option>
            <option value="250">250 - İhracat Piyasası</option>
          </select>
      </div>

      <!-- İrsaliye Bilgileri -->
      <div style="display:flex; align-items:center; gap:10px; margin-bottom:15px;">
        <label style="position:relative; display:inline-block; width:44px; height:24px;">
          <input type="checkbox" id="tgglIrsaliye" style="opacity:0; width:0; height:0;" onchange="this.nextElementSibling.style.backgroundColor = this.checked ? '#10b981' : '#e2e8f0'; this.nextElementSibling.firstElementChild.style.transform = this.checked ? 'translateX(20px)' : 'translateX(0)'; document.getElementById('irsaliyeDetails').style.display = this.checked ? 'flex' : 'none';">
          <span style="position:absolute; cursor:pointer; top:0; left:0; right:0; bottom:0; background-color:#e2e8f0; transition:.4s; border-radius:24px;">
            <span style="position:absolute; content:''; height:18px; width:18px; left:3px; bottom:3px; background-color:white; transition:.4s; border-radius:50%; box-shadow:0 1px 3px rgba(0,0,0,0.3);"></span>
          </span>
        </label>
        <span style="font-size:14px; color:var(--text-muted);">İrsaliye Bilgileri</span>
      </div>
      
      <div id="irsaliyeDetails" class="invoice-irsaliye-details" style="display:none; gap:15px; align-items:flex-end;">
        <div class="form-group" style="margin-bottom:0; flex:1; position:relative;">
          <input type="text" class="form-input" id="irs_no" placeholder="İrsaliye Numarası" style="border-radius:4px; padding-top:12px; padding-bottom:12px; border-color:#cbd5e1;">
        </div>
        <div class="form-group" style="margin-bottom:0; flex:1; position:relative;">
          <label style="font-size:10px; color:var(--text-muted); position:absolute; left:12px; top:-6px; background:var(--bg-modal, #fff); padding:0 4px; z-index:1;">İrsaliye Tarihi</label>
          <input type="date" class="form-input" id="irs_date" value="${new Date().toISOString().slice(0, 10)}" style="border-radius:4px; padding-top:12px; padding-bottom:12px; border-color:#cbd5e1;">
        </div>
        <button class="btn" style="background:#10b981; color:#fff; border-radius:50%; width:44px; height:44px; display:flex; align-items:center; justify-content:center; border:none; box-shadow:0 2px 4px rgba(16,185,129,0.3); font-size:24px;">+</button>
      </div>

      <div class="card" style="margin-top:16px; background:var(--bg-secondary); border:1px solid var(--border);">
        <div style="display:flex; justify-content:space-between; margin-bottom:12px; font-size:14px;">
          <span style="color:var(--text-muted);">Mal Hizmet Toplam Tutarı:</span>
          <span id="txtGross" style="font-weight:600;">0,00</span>
        </div>
        <div style="display:flex; justify-content:space-between; margin-bottom:12px; font-size:14px;">
          <span style="color:var(--text-muted);">Toplam İskonto:</span>
          <span id="txtDiscount" style="font-weight:600;">0,00</span>
        </div>
        <div style="display:flex; justify-content:space-between; margin-bottom:12px; font-size:14px;">
          <span style="color:var(--text-muted);">Net Tutar(Matrah):</span>
          <span id="txtNet" style="font-weight:600;">0,00</span>
        </div>
        <div style="display:flex; justify-content:space-between; margin-bottom:12px; font-size:14px;">
          <span style="color:var(--text-muted);">Hesaplanan KDV:</span>
          <span id="txtTax" style="font-weight:600;">0,00</span>
        </div>
        <hr style="border:0; border-top:1px solid var(--border); margin:12px 0;">
        <div style="display:flex; justify-content:space-between; font-size:16px;">
          <span style="font-weight:700;">Ödenecek Tutar:</span>
          <span id="txtTotal" style="font-weight:800; color:var(--accent);">0,00</span>
        </div>
      </div>
    </div>
    </div>
    <!-- KALEMLER -->
    <div class="card invoice-lines-card" style="margin-bottom:20px; position:relative; z-index:10;">
      <div class="invoice-lines-header" style="display:flex; justify-content:space-between; align-items:flex-end; gap:16px; margin-bottom:15px;">
        <h3 style="font-size:16px; margin:0; font-weight:700;">🛒 Mal / Hizmet Bilgileri</h3>
        <div class="invoice-target-wrap" style="min-width:320px; max-width:380px; width:100%;">
          <label class="form-label" style="font-size:11px;">Hedef Toplam (KDV Dahil)</label>
          <input type="text" class="form-input" id="g_target_total" placeholder="Fiyat değişince miktar otomatik hesaplanır">
        </div>
      </div>
      <div class="invoice-lines-table-wrap" style="overflow:visible;">
        <table class="line-items-table" style="width:100%; text-align:left; border-collapse:collapse;">
          <thead>
            <tr style="border-bottom:1px solid var(--border); font-size:12px; color:var(--text-muted);">
              <th style="padding:10px 5px; width:35%;">Mal / Hizmetler</th>
              <th style="padding:10px 5px; width:10%;">Miktar</th>
              <th style="padding:10px 5px; width:10%;">Birim</th>
              <th style="padding:10px 5px; width:12%;">Birim Fiyat</th>
              <th style="padding:10px 5px; width:8%;">KDV (%)</th>
              <th style="padding:10px 5px; width:8%;">İskonto (%)</th>
              <th style="padding:10px 5px; width:12%; text-align:right;">Toplam Tutar</th>
              <th style="padding:10px 5px; width:5%;"></th>
            </tr>
          </thead>
          <tbody id="linesContainer">
          </tbody>
        </table>
      </div>
      <div style="margin-top:15px;">
        <button class="btn btn-primary btn-sm" id="btnAddLine">${ic.plus} YENİ SATIR EKLE</button>
      </div>
    </div>

    <textarea id="g_notes" style="display:none;"></textarea>
    </div>
  `;

  const activeAccount = await getActiveAccount();
  applyAccountSeriesDefault(page, activeAccount);
  const editContext = consumeInvoiceEditContext();

  const linesContainer = page.querySelector('#linesContainer');

    function createLine(lineData = null) {
    const tr = document.createElement('tr');
    tr.className = 'line-item-row';
    tr.style.borderBottom = '1px dashed var(--border)';
    tr.innerHTML = `
      <td data-label="Mal / Hizmet" style="padding:10px 5px; position:relative;">
        <input type="text" class="form-input line-name" placeholder="Ürün veya Hizmet" autocomplete="off">
        <div class="line-search-results" style="display:none; position:absolute; top:100%; left:5px; right:5px; background:var(--bg-modal, #fff); border:1px solid var(--border); z-index:99; border-radius:6px; max-height:200px; overflow-y:auto; box-shadow:0 10px 15px -3px rgba(0,0,0,0.5);"></div>
      </td>
      <td data-label="Miktar" style="padding:10px 5px;">
        <input type="number" class="form-input line-qty" value="1" min="0">
      </td>
      <td data-label="Birim" style="padding:10px 5px;">
        <select class="form-select line-unit">
          ${UNITS.map(u => `<option value="${u.val}">${u.lbl}</option>`).join('')}
        </select>
      </td>
      <td data-label="Birim Fiyat" style="padding:10px 5px;">
        <input type="number" class="form-input line-price" value="0" step="0.01">
      </td>
      <td data-label="KDV (%)" style="padding:10px 5px;">
        <select class="form-select line-tax">
          <option value="20">20</option>
          <option value="18">18</option>
          <option value="10">10</option>
          <option value="8">8</option>
          <option value="1">1</option>
          <option value="0">0</option>
        </select>
      </td>
      <td data-label="İskonto (%)" style="padding:10px 5px;">
        <input type="number" class="form-input line-disc" value="0" min="0" max="100">
      </td>
      <td data-label="Toplam" class="line-total-cell" style="padding:10px 5px;">
        <div class="line-total-txt" style="font-weight:600; text-align:right;">0,00</div>
      </td>
      <td data-label="İşlem" style="padding:10px 5px; text-align:center;">
        <button class="btn btn-sm line-del line-item-remove" style="background:transparent; color:tomato; padding:4px;">${ic.trash}</button>
      </td>
    `;

    tr.querySelectorAll('input, select').forEach(el => {
      el.addEventListener('input', (ev) => handleLineInput(tr, ev));
    });

    if (lineData && typeof lineData === 'object') {
      tr.querySelector('.line-name').value = lineData.name || '';
      tr.querySelector('.line-qty').value = lineData.quantity ?? 1;
      tr.querySelector('.line-price').value = lineData.unitPrice ?? 0;
      tr.querySelector('.line-disc').value = lineData.discountRate ?? 0;

      const unitSelect = tr.querySelector('.line-unit');
      if (lineData.unitType && !Array.from(unitSelect.options).some(o => o.value === lineData.unitType)) {
        const extraOpt = document.createElement('option');
        extraOpt.value = lineData.unitType;
        extraOpt.textContent = lineData.unitType;
        unitSelect.appendChild(extraOpt);
      }
      if (lineData.unitType) unitSelect.value = lineData.unitType;

      const taxSelect = tr.querySelector('.line-tax');
      const taxVal = String(lineData.taxRate ?? 20);
      if (!Array.from(taxSelect.options).some(o => o.value === taxVal)) {
        const taxOpt = document.createElement('option');
        taxOpt.value = taxVal;
        taxOpt.textContent = taxVal;
        taxSelect.appendChild(taxOpt);
      }
      taxSelect.value = taxVal;
    }

    tr.querySelector('.line-del').addEventListener('click', () => {
      tr.remove();
      calculateGrid();
    });

    // --- Search Stock Autocomplete ---
    let searchTimeout;
    const nameInput = tr.querySelector('.line-name');
    const searchResults = tr.querySelector('.line-search-results');

    nameInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      const val = e.target.value.trim();
      if (val.length < 3) {
        searchResults.style.display = 'none';
        return;
      }

      searchTimeout = setTimeout(async () => {
        searchResults.innerHTML = '<div style="padding:10px; color:var(--text-muted); text-align:center;">Aranıyor...</div>';
        searchResults.style.display = 'block';
        try {
          const res = await General.searchStock(val);
          console.log('[Stock Search Response]', res.data); // Hata ayıklama için

          let list = [];
          if (Array.isArray(res.data)) {
            list = res.data;
          } else if (res.data) {
            list = res.data.Content || res.data.Items || res.data.Data || Array.from(Object.values(res.data)).find(v => Array.isArray(v)) || [];
          }

          let validList = list.filter(c => c && (c.Name || c.StockName || c.Title));

          // Akıllı Sıralama: Tam eşleşenleri ve "ile başlayanları" en üste al
          const searchVal = val.toLowerCase('tr-TR');
          validList.sort((a, b) => {
            const nameA = (a.Name || a.StockName || a.Title || '').toLowerCase('tr-TR');
            const nameB = (b.Name || b.StockName || b.Title || '').toLowerCase('tr-TR');
            
            // Eğer tam eşleşme varsa en tepeye
            if (nameA === searchVal && nameB !== searchVal) return -1;
            if (nameB === searchVal && nameA !== searchVal) return 1;
            
            // Aranılan kelime ile başlıyorsa yukarı
            const startsA = nameA.startsWith(searchVal);
            const startsB = nameB.startsWith(searchVal);
            if (startsA && !startsB) return -1;
            if (startsB && !startsA) return 1;
            
            // Aradığımız kelimeyi içerenleri yukarı al (başlamasa da içinde geçiyorsa)
            const includesA = nameA.includes(searchVal);
            const includesB = nameB.includes(searchVal);
            if (includesA && !includesB) return -1;
            if (includesB && !includesA) return 1;

            // Kalanı alfabetik diz
            return nameA.localeCompare(nameB, 'tr');
          });

          if (res.success && validList.length > 0) {
            searchResults.innerHTML = validList.map((c, i) => {
              const displayName = c.Name || c.StockName || c.Title || 'İsimsiz Ürün';
              const price = c.Price !== undefined ? c.Price : 0;
              const tax = c.TaxPercent !== undefined ? c.TaxPercent : 20;
              return `
              <div class="stock-search-item" data-idx="${i}" style="padding:10px; cursor:pointer; border-bottom:1px solid var(--border); background:var(--bg-modal, #fff);">
                <div style="font-weight:600; font-size:13px; margin-bottom:4px;">${displayName}</div>
                <div style="font-size:11px; color:var(--text-muted); display:flex; justify-content:space-between;">
                  <span>Fiyat: ${price} TL</span>
                  <span>KDV: %${tax}</span>
                </div>
              </div>
            `;
            }).join('');

            searchResults.querySelectorAll('.stock-search-item').forEach(item => {
              item.addEventListener('click', () => {
                const stock = validList[item.getAttribute('data-idx')];
                nameInput.value = stock.Name || stock.StockName || stock.Title || '';
                tr.querySelector('.line-price').value = stock.Price !== undefined ? stock.Price : 0;
                tr.querySelector('.line-tax').value = stock.TaxPercent !== undefined ? stock.TaxPercent : 20;

                const unitOpt = Array.from(tr.querySelector('.line-unit').options).find(o => o.value == stock.UnitCode);
                if (unitOpt) tr.querySelector('.line-unit').value = stock.UnitCode;
                
                searchResults.style.display = 'none';
                adjustRowQuantityToTarget(tr);
                calculateGrid();
              });
            });
          } else {
            searchResults.innerHTML = '<div style="padding:10px; color:var(--text-muted); text-align:center;">Bulunamadı</div>';
          }
        } catch (err) {
          console.error('[Stock Search Error]', err);
          searchResults.innerHTML = '<div style="padding:10px; color:tomato; text-align:center;">Arama hatası</div>';
        }
      }, 600);
    });

    document.addEventListener('click', (e) => {
      if (!nameInput.contains(e.target) && !searchResults.contains(e.target)) {
        searchResults.style.display = 'none';
      }
    });

    linesContainer.appendChild(tr);
  }  function numFmt(val) {
    return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
  }

  function calculateGrid() {
    let sumGross = 0;
    let sumDisc = 0;
    let sumTax = 0;

    linesContainer.querySelectorAll('tr').forEach(tr => {
      const q = parseFloat(tr.querySelector('.line-qty').value) || 0;
      const p = parseFloat(tr.querySelector('.line-price').value) || 0;
      const d = parseFloat(tr.querySelector('.line-disc').value) || 0;
      const t = parseFloat(tr.querySelector('.line-tax').value) || 0;

      const gross = q * p;
      const discVal = gross * (d / 100);
      const net = gross - discVal;
      const taxVal = net * (t / 100);
      const total = net + taxVal;

      sumGross += gross;
      sumDisc += discVal;
      sumTax += taxVal;

      tr.querySelector('.line-total-txt').textContent = numFmt(total);
    });

    const matrah = sumGross - sumDisc;
    const genelToplam = matrah + sumTax;

    const needsExemption = Array.from(linesContainer.querySelectorAll('tr')).some(tr => {
      const tax = tr.querySelector('.line-tax').value;
      const price = parseFloat(tr.querySelector('.line-price').value) || 0;
      return tax === '0' || price === 0;
    });
    
    const exemptionContainer = document.getElementById('g_kdv_istisna_container');
    if (exemptionContainer) {
      exemptionContainer.style.display = needsExemption ? 'block' : 'none';
      if (!needsExemption) {
        document.getElementById('g_kdv_istisna').value = '';
      }
    }

    page.querySelector('#txtGross').textContent = numFmt(sumGross);
    page.querySelector('#txtDiscount').textContent = numFmt(sumDisc);
    page.querySelector('#txtNet').textContent = numFmt(matrah);
    page.querySelector('#txtTax').textContent = numFmt(sumTax);
    page.querySelector('#txtTotal').textContent = numFmt(genelToplam);

    return genelToplam;
  }

  function parseLocaleNumber(value) {
    const raw = String(value ?? '').trim();
    if (!raw) return NaN;

    const hasComma = raw.includes(',');
    const dotCount = (raw.match(/\./g) || []).length;
    let normalized = raw.replace(/\s+/g, '');

    if (hasComma) {
      normalized = normalized.replace(/\./g, '').replace(',', '.');
    } else if (dotCount > 1) {
      normalized = normalized.replace(/\./g, '');
    }

    return Number(normalized);
  }

  function pickPreferredAlias(aliases, fallbackObj = null) {
    const list = Array.isArray(aliases) ? aliases : [];
    const aliasNames = list
      .map((a) => {
        if (typeof a === 'string') return a.trim();
        if (a && typeof a === 'object' && typeof a.Name === 'string') return a.Name.trim();
        return '';
      })
      .filter(Boolean);

    const preferredPkAlias = aliasNames.find((n) => n.toLowerCase().includes('defaultpk@'));
    const activeAliasObj = list.find((a) => a && typeof a === 'object' && a.Name && (a.DeletionTime === null || a.DeletionTime === undefined));
    const firstAliasObj = list.find((a) => a && typeof a === 'object' && a.Name);
    const firstAliasStr = list.find((a) => typeof a === 'string' && a.trim());

    return (preferredPkAlias || activeAliasObj?.Name || firstAliasObj?.Name || firstAliasStr || fallbackObj?.Alias || fallbackObj?.ReceiverAlias || '').trim();
  }

  async function refreshAliasByTaxNumber(page, force = false) {
    const scenario = page.querySelector('#g_scenario')?.value;
    if (scenario === 'EARSIV') return;

    const vkn = page.querySelector('#c_vkn')?.value?.trim();
    if (!vkn || vkn.length < 10) return;

    const aliasInput = page.querySelector('#c_alias');
    if (!aliasInput) return;

    const currentAlias = (aliasInput.value || '').trim();
    if (!force && currentAlias && currentAlias.toLowerCase().includes('defaultpk@')) return;

    try {
      const detailRes = await General.getGlobalCustomerInfo(vkn);
      const detailData = detailRes?.success
        ? (detailRes.data?.Content || detailRes.data?.Data || detailRes.data)
        : null;
      if (!detailData || typeof detailData !== 'object') return;

      const betterAlias = pickPreferredAlias(detailData.Aliases, detailData);
      if (betterAlias) {
        aliasInput.value = betterAlias;
      }
    } catch {
      // Alias refresh is best-effort; do not block form rendering.
    }
  }

  function getRowTotal(tr) {
    const q = parseFloat(tr.querySelector('.line-qty')?.value) || 0;
    const p = parseFloat(tr.querySelector('.line-price')?.value) || 0;
    const d = parseFloat(tr.querySelector('.line-disc')?.value) || 0;
    const t = parseFloat(tr.querySelector('.line-tax')?.value) || 0;
    const net = (q * p) * (1 - (d / 100));
    return net * (1 + (t / 100));
  }

  function adjustRowQuantityToTarget(row) {
    const target = parseLocaleNumber(page.querySelector('#g_target_total')?.value);
    if (!Number.isFinite(target) || target <= 0 || !row) return;

    const rows = Array.from(linesContainer.querySelectorAll('tr'));
    if (!rows.length || !rows.includes(row)) return;

    const totalOtherRows = rows
      .filter((tr) => tr !== row)
      .reduce((sum, tr) => sum + getRowTotal(tr), 0);

    const p = parseFloat(row.querySelector('.line-price')?.value) || 0;
    const d = parseFloat(row.querySelector('.line-disc')?.value) || 0;
    const t = parseFloat(row.querySelector('.line-tax')?.value) || 0;
    const qtyInput = row.querySelector('.line-qty');

    const unitTotalWithTax = p * (1 - (d / 100)) * (1 + (t / 100));
    if (!qtyInput || unitTotalWithTax <= 0) return;

    const remaining = target - totalOtherRows;
    if (remaining < 0) return;

    const newQty = remaining / unitTotalWithTax;
    if (!Number.isFinite(newQty) || newQty < 0) return;

    qtyInput.value = newQty.toFixed(6);
  }

  function handleLineInput(row, event) {
    const target = event?.target;
    const isDriver = target?.classList?.contains('line-price')
      || target?.classList?.contains('line-tax')
      || target?.classList?.contains('line-disc');

    if (isDriver) {
      adjustRowQuantityToTarget(row);
    }

    calculateGrid();
  }

  const hydratedFromEdit = hydrateInvoiceFormFromContext(page, editContext, createLine, linesContainer);
  if (!hydratedFromEdit) {
    createLine();
  }
  if (hydratedFromEdit && editContext?.source === 'einvoice') {
    await refreshAliasByTaxNumber(page, true);
  }
  calculateGrid();
  page.querySelector('#btnAddLine').addEventListener('click', createLine);
  page.querySelector('#g_target_total')?.addEventListener('input', () => {
    const rows = Array.from(linesContainer.querySelectorAll('tr'));
    if (!rows.length) return;
    adjustRowQuantityToTarget(rows[rows.length - 1]);
    calculateGrid();
  });

  // --- Search Company ---
  let searchTimeout;
  const searchInput = page.querySelector('#searchCustomer');
  const searchResults = page.querySelector('#searchResults');

  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    const val = e.target.value.trim();
    if (val.length < 3) {
      searchResults.style.display = 'none';
      return;
    }
    
    searchTimeout = setTimeout(async () => {
      searchResults.innerHTML = '<div style="padding:10px; color:var(--text-muted); text-align:center;">Aranıyor...</div>';
      searchResults.style.display = 'block';
      try {
        const res = await General.searchCompany(val);
        // Sometimes the API returns paginated data in .Content, sometimes a flat array, or .data directly
        const list = Array.isArray(res.data) 
            ? res.data 
            : (res.data?.Content || res.data?.Items || Array.from(Object.values(res.data)).find(v => Array.isArray(v)) || []);
            
        // Filter out empty Titles like "--" securely just in case
        const validList = list.filter(c => c && c.Title && c.Title.length > 2 && c.Title !== '--');
        
        // If exact match on name exist, order them first
        validList.sort((a,b) => {
            const isA = a.Title.toLowerCase().includes(val.toLowerCase());
            const isB = b.Title.toLowerCase().includes(val.toLowerCase());
            if(isA && !isB) return -1;
            if(!isA && isB) return 1;
            return 0;
        });

        if (res.success && validList && validList.length > 0) {
          searchResults.innerHTML = validList.map((c, i) => {
            const isEInvoice = c.ModuleType === 'eInvoice' || c.IsEInvoice;
            return `
            <div class="search-item" data-idx="${i}" style="padding:10px; cursor:pointer; border-bottom:1px solid var(--border);">
              <div style="font-weight:600; font-size:13px; margin-bottom:4px;">${c.Title}</div>
              <div style="font-size:11px; color:var(--text-muted); display:flex; justify-content:space-between;">
                <span>VKN: ${c.TaxNumber || 'Yok'}</span>
                <span style="color:var(--accent)">${isEInvoice ? 'e-Fatura' : 'e-Arşiv'}</span>
              </div>
            </div>
          `}).join('');
          
          searchResults.querySelectorAll('.search-item').forEach(item => {
            item.addEventListener('click', async () => {
              const cSearch = validList[item.getAttribute('data-idx')];
              
              // Temel alanları doldur (eğer Get detayları gecikirse vs.)
              page.querySelector('#c_name').value = cSearch.Title || '';
              page.querySelector('#c_vkn').value = cSearch.TaxNumber || '';
              
              // Tıklandıktan sonra search kutusunu kapat, yükleniyor moduna al (Opsiyonel ama iyi olur)
              searchResults.innerHTML = '<div style="padding:10px; color:var(--text-muted); text-align:center;">Mükellef detayları getiriliyor...</div>';
              
              try {
                // Etiketler (Alias), VD, adres detayları için TaxNumber üzerinden ikinci sorguyu atıyoruz!
                const detailRes = await General.getGlobalCustomerInfo(cSearch.TaxNumber);
                const detailData = detailRes?.success
                  ? (detailRes.data?.Content || detailRes.data?.Data || detailRes.data)
                  : null;
                const c = (detailData && typeof detailData === 'object') ? detailData : cSearch;
                
                const isEInvoice = c.ModuleType === 'eInvoice' || c.IsEInvoice || cSearch.IsEInvoice;
                
                page.querySelector('#c_name').value = c.Title || cSearch.Title || '';
                
                // Aliases formatı API'ye göre değişebilir; aktif alias Name alanını öncelikli al.
                const aliases = Array.isArray(c.Aliases)
                  ? c.Aliases
                  : (Array.isArray(cSearch.Aliases) ? cSearch.Aliases : []);

                const aliasName = pickPreferredAlias(aliases, c);
                page.querySelector('#c_alias').value = aliasName;
                
                // Adres bilgileri
                page.querySelector('#c_address').value = c.Address?.trim() || '';
                page.querySelector('#c_district').value = c.District || '';
                page.querySelector('#c_city').value = c.City || '';
                page.querySelector('#c_country').value = c.Country || 'Türkiye';
                page.querySelector('#c_vd').value = c.TaxDepartment || '';
                page.querySelector('#c_vkn').value = c.TaxNumber || cSearch.TaxNumber || '';
                
                // Rozet ve Tür
                const tag = page.querySelector('#tagInvoiceType');
                tag.style.display = 'inline-block';
                tag.textContent = isEInvoice ? 'e-Fatura' : 'e-Arşiv';
                tag.style.background = isEInvoice ? 'var(--accent)' : '#10b981';

                // Şablon ve Senaryoları Dinamik Doldurma
                const selTemplate = page.querySelector('#g_template');
                const selScenario = page.querySelector('#g_scenario');
                if(selTemplate) selTemplate.value = isEInvoice ? 'eFatura' : 'eArsiv';
                if(selScenario) selScenario.value = isEInvoice ? 'TICARIFATURA' : 'EARSIV';
                
                // Demo ETTN
                const ettnBadge = page.querySelector('#ettiBadge');
                if(ettnBadge) {
                   ettnBadge.style.display = 'inline-flex';
                   page.querySelector('#ettiSpan').textContent = crypto.randomUUID();
                }

                searchResults.style.display = 'none';
                searchInput.value = '';
                showToast(aliasName ? (c.Title + ' bilgileri başarıyla dolduruldu.') : ('Mükellef bulundu fakat etiket bilgisi gelmedi, lütfen manuel etiket girin.'), aliasName ? 'success' : 'warning');
              } catch(e) {
                searchResults.style.display = 'none';
                showToast('Detaylar alınırken hata oluştu.', 'error');
              }
            });
          });
        } else {
          searchResults.innerHTML = '<div style="padding:10px; color:var(--text-muted); text-align:center;">Bulunamadı (e-Arşiv olarak manuel giriniz)</div>';
        }
      } catch (err) {
        searchResults.innerHTML = '<div style="padding:10px; color:tomato; text-align:center;">Arama hatası</div>';
      }
    }, 600);
  });

  document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
      searchResults.style.display = 'none';
    }
  });


  // --- TASLAK KAYDET ---
  page.querySelector('#btnDraft').addEventListener('click', async () => {
    try {
      const vkn = page.querySelector('#c_vkn').value.trim();
      const name = page.querySelector('#c_name').value.trim();
      if (!vkn || vkn.length < 10) throw new Error('Geçerli bir VKN/TCKN giriniz.');
      if (!name) throw new Error('Unvan / Adı Soyadı boş bırakılamaz.');

      const isEArchive = page.querySelector('#g_scenario').value === 'EARSIV';
      const alias = page.querySelector('#c_alias')?.value?.trim();

      if (!isEArchive && !alias) throw new Error('e-Fatura için Alıcı Etiketi (Mail) zorunludur. Geçerli bir alias seçiniz.');

      const lines = [];
      linesContainer.querySelectorAll('tr').forEach(tr => {
        const nm = tr.querySelector('.line-name').value;
        if (!nm) return;
        let _t = parseFloat(tr.querySelector('.line-tax').value);
        lines.push({
          name: nm,
          quantity: parseFloat(tr.querySelector('.line-qty').value) || 1,
          unitType: tr.querySelector('.line-unit').value,
          unitPrice: parseFloat(tr.querySelector('.line-price').value) || 0,
          discountRate: parseFloat(tr.querySelector('.line-disc').value) || 0,
          taxRate: isNaN(_t) ? 20 : _t
        });
      });

      if (lines.length === 0) throw new Error('Taslağa eklemek için en az bir kalem olmalıdır.');

      const notesTxt = page.querySelector('#g_notes')?.value || '';
      const notes = notesTxt.split('\n').filter(n => n.trim().length > 0);

      const globalExemption = document.getElementById('g_kdv_istisna')?.value || '';

      const profile = page.querySelector('#g_scenario').value;
      const model = buildEInvoiceModel({
        profile: profile === 'EARSIV' ? 'EARSIVFATURA' : profile,
        type: page.querySelector('#g_type').value,
        exemptionCode: globalExemption,
        issueDate: getIssueDateIso(page),
        currencyCode: page.querySelector('#g_currency').value,
        seriesOrNumber: page.querySelector('#g_series')?.value,
        customer: {
          taxNumber: vkn,
          name: name,
          taxOffice: page.querySelector('#c_vd')?.value,
          address: page.querySelector('#c_address')?.value,
          district: page.querySelector('#c_district')?.value,
          city: page.querySelector('#c_city')?.value,
          country: page.querySelector('#c_country')?.value,
          email: page.querySelector('#c_email')?.value,
          phone: page.querySelector('#c_phone')?.value
        },
        lines,
        notes
      });

      page.querySelector('#btnDraft').innerText = 'KAYDEDİLİYOR...';
      page.querySelector('#btnDraft').disabled = true;

      const draftPayload = isEArchive 
        ? { ArchiveInvoice: model } 
        : { EInvoice: model, CustomerAlias: alias };

      const res = isEArchive ? await EArchive.createDraft(draftPayload) : await EInvoice.createDraft(draftPayload);
      
      if (res && res.data) {
        showToast('Taslak başarıyla kaydedildi!', 'success');
        navigate('/drafts');
      } else {
        showToast('Taslak kaydedilirken bir sorun oluştu.', 'error');
      }
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      page.querySelector('#btnDraft').innerText = 'TASLAK KAYDET';
      page.querySelector('#btnDraft').disabled = false;
    }
  });

  // --- ONAYLA ve GÖNDER ---
  page.querySelector('#btnSend').addEventListener('click', async () => {
    try {
      const vkn = page.querySelector('#c_vkn').value.trim();
      const name = page.querySelector('#c_name').value.trim();
      if (!vkn || vkn.length < 10) throw new Error('Geçerli bir VKN/TCKN giriniz.');
      if (!name) throw new Error('Unvan / Adı Soyadı boş bırakılamaz.');

      const isEArchive = page.querySelector('#g_scenario').value === 'EARSIV';
      const alias = page.querySelector('#c_alias').value.trim();

      if (!isEArchive && !alias) throw new Error('e-Fatura için Alıcı Etiketi (Mail) zorunludur.');

      const lines = [];
      linesContainer.querySelectorAll('tr').forEach(tr => {
        const nm = tr.querySelector('.line-name').value;
        if (!nm) return;
        let _t = parseFloat(tr.querySelector('.line-tax').value);
        lines.push({
          name: nm,
          quantity: parseFloat(tr.querySelector('.line-qty').value) || 1,
          unitType: tr.querySelector('.line-unit').value,
          unitPrice: parseFloat(tr.querySelector('.line-price').value) || 0,
          discountRate: parseFloat(tr.querySelector('.line-disc').value) || 0,
          taxRate: isNaN(_t) ? 20 : _t
        });
      });

      if (lines.length === 0) throw new Error('Faturada en az bir kalem olmalıdır.');

      const notesTxt = page.querySelector('#g_notes').value;
      const notes = notesTxt.split('\n').filter(n => n.trim().length > 0);

      const globalExemption = document.getElementById('g_kdv_istisna')?.value || '';

      const model = buildEInvoiceModel({
        profile: page.querySelector('#g_scenario').value === 'EARSIV' ? 'EARSIVFATURA' : page.querySelector('#g_scenario').value,
        type: page.querySelector('#g_type').value,
        exemptionCode: globalExemption,
        issueDate: getIssueDateIso(page),
        currencyCode: page.querySelector('#g_currency').value,
        seriesOrNumber: page.querySelector('#g_series').value,
        customer: {
          taxNumber: vkn,
          name: name,
          taxOffice: page.querySelector('#c_vd').value,
          address: page.querySelector('#c_address').value,
          district: page.querySelector('#c_district').value,
          city: page.querySelector('#c_city').value,
          country: page.querySelector('#c_country').value,
          email: page.querySelector('#c_email').value,
          phone: page.querySelector('#c_phone').value
        },
        lines,
        notes
      });

      page.querySelector('#btnSend').innerText = 'GÖNDERİLİYOR...';
      page.querySelector('#btnSend').disabled = true;

      const res = isEArchive ? await EArchive.sendModel(model) : await EInvoice.sendModel(model);

      if (res.success) {
        showToast('Fatura başarıyla oluşturuldu!', 'success');
        navigate('/outgoing');
      } else {
        showToast('Hata: ' + res.error, 'error');
      }
    } catch (e) {
      showToast(e.message, 'warning');
    } finally {
      page.querySelector('#btnSend').disabled = false;
      page.querySelector('#btnSend').innerHTML = `${ic.send} ONAYLA GÖNDER`;
    }
  });

  page.querySelector('#g_currency').addEventListener('change', (e) => {
    const exInput = page.querySelector('#g_exchange');
    exInput.disabled = e.target.value === 'TRY';
    exInput.value = e.target.value !== 'TRY' ? '30.5000' : ''; // Mock rate
  });

  return page;
}

function consumeInvoiceEditContext() {
  try {
    const raw = sessionStorage.getItem(INVOICE_EDIT_CONTEXT_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(INVOICE_EDIT_CONTEXT_KEY);
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function getIssueDateIso(page) {
  const dateVal = page.querySelector('#g_date')?.value;
  const timeVal = page.querySelector('#g_time')?.value || '00:00';

  if (!dateVal) return new Date().toISOString();

  // Nilvera IssueDate alanına local tarih-saat gönderiyoruz; UTC'ye çevirip 3 saat kaydırmıyoruz.
  return `${dateVal}T${timeVal}:00`;
}

function setSeriesSelectValue(selectEl, series) {
  if (!selectEl || !series) return;
  const val = String(series).trim().toUpperCase();
  if (!val) return;

  if (!Array.from(selectEl.options).some(o => o.value === val)) {
    const opt = document.createElement('option');
    opt.value = val;
    opt.textContent = val;
    selectEl.appendChild(opt);
  }
  selectEl.value = val;
}

function applyAccountSeriesDefault(page, activeAccount) {
  if (!activeAccount?.id) return;
  const seriesSelect = page.querySelector('#g_series');
  if (!seriesSelect) return;
  const prefs = getAccountPreferences(activeAccount.id);
  if (prefs?.invoice_series) {
    setSeriesSelectValue(seriesSelect, prefs.invoice_series);
  }
}

function normalizeLineForEditor(line) {
  if (!line || typeof line !== 'object') return null;

  const qty = Number(line.Quantity ?? line.quantity ?? 1);
  const unitPrice = Number(line.Price ?? line.UnitPrice ?? line.unitPrice ?? 0);
  const taxRate = Number(line.TaxPercent ?? line.KDVPercent ?? line.taxRate ?? 20);

  return {
    name: line.ItemInfo?.Name || line.Name || line.name || line.Description || '',
    quantity: Number.isFinite(qty) ? qty : 1,
    unitType: line.UnitType || line.UnitCode || line.unitType || 'C62',
    unitPrice: Number.isFinite(unitPrice) ? unitPrice : 0,
    discountRate: Number(line.DiscountRate ?? line.discountRate ?? 0) || 0,
    taxRate: Number.isFinite(taxRate) ? taxRate : 20,
  };
}

function normalizeDraftContext(context) {
  if (!context) return null;

  const rootModel = context.draftModel || {};
  const rootRaw = context.draftRaw || {};
  const root = context.draftModel || context.draftRaw || {};
  const model = rootModel.EInvoice || rootModel.ArchiveInvoice || rootModel.InvoiceModel || rootModel.Model
    || rootRaw.EInvoice || rootRaw.ArchiveInvoice || rootRaw.InvoiceModel || rootRaw.Model
    || root;
  const info = model.InvoiceInfo || rootModel.InvoiceInfo || rootRaw.InvoiceInfo || root.InvoiceInfo || {};
  const customer = model.CustomerInfo || rootModel.CustomerInfo || rootRaw.CustomerInfo || root.CustomerInfo || {};
  const linesRaw = model.InvoiceLine || model.InvoiceLines
    || rootModel.InvoiceLine || rootModel.InvoiceLines
    || rootRaw.InvoiceLine || rootRaw.InvoiceLines
    || root.InvoiceLine || root.InvoiceLines
    || [];
  const notesRaw = model.Notes || info.Notes || rootModel.Notes || rootRaw.Notes || root.Notes || [];

  const alias = context.draftAlias
    || customer.Alias
    || customer.ReceiverAlias
    || customer.Mailbox
    || model.CustomerAlias
    || info.CustomerAlias
    || rootModel.CustomerAlias
    || rootRaw.CustomerAlias
    || root.CustomerAlias
    || '';

  const lines = Array.isArray(linesRaw)
    ? linesRaw.map(normalizeLineForEditor).filter(Boolean)
    : [];

  return {
    source: context.source,
    invoiceDate: info.IssueDate || info.issueDate || '',
    scenario: info.InvoiceProfile || (context.source === 'earchive' ? 'EARSIV' : 'TICARIFATURA'),
    type: info.InvoiceType || 'SATIS',
    currency: info.CurrencyCode || 'TRY',
    series: info.InvoiceSerieOrNumber || info.InvoiceSeries || '',
    customer: {
      name: customer.Name || customer.ReceiverName || customer.CustomerName || '',
      taxNumber: customer.TaxNumber || customer.ReceiverTaxNumber || '',
      alias,
      taxOffice: customer.TaxOffice || customer.TaxDepartment || '',
      address: customer.Address || '',
      district: customer.District || '',
      city: customer.City || '',
      country: customer.Country || 'Türkiye',
      zip: customer.ZipCode || customer.PostalCode || '',
      phone: customer.Phone || '',
      email: customer.Email || '',
    },
    notes: Array.isArray(notesRaw)
      ? notesRaw.map(n => String(n || '')).filter(Boolean)
      : (typeof notesRaw === 'string' ? [notesRaw] : []),
    lines,
  };
}

function hydrateInvoiceFormFromContext(page, context, createLine, linesContainer) {
  const draft = normalizeDraftContext(context);
  if (!draft) return false;

  const setVal = (selector, value) => {
    const el = page.querySelector(selector);
    if (!el) return;
    if (value !== undefined && value !== null) el.value = value;
  };

  if (draft.invoiceDate) {
    try {
      const raw = String(draft.invoiceDate);
      const match = raw.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/);
      if (match) {
        setVal('#g_date', match[1]);
        setVal('#g_time', match[2]);
      } else {
        const dt = new Date(raw);
        const dateOnly = dt.toISOString().slice(0, 10);
        const timeOnly = `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
        setVal('#g_date', dateOnly);
        setVal('#g_time', timeOnly);
      }
    } catch {
      // Ignore invalid date formats.
    }
  }

  const scenario = String(draft.scenario || '').toUpperCase();
  if (scenario.includes('EARSIV')) {
    setVal('#g_scenario', 'EARSIV');
    setVal('#g_template', 'eArsiv');
  } else {
    setVal('#g_scenario', scenario || 'TICARIFATURA');
    setVal('#g_template', 'eFatura');
  }

  setVal('#g_type', draft.type || 'SATIS');
  setVal('#g_currency', draft.currency || 'TRY');

  const seriesEl = page.querySelector('#g_series');
  setSeriesSelectValue(seriesEl, draft.series);

  setVal('#c_name', draft.customer.name || '');
  setVal('#c_vkn', draft.customer.taxNumber || '');
  setVal('#c_alias', draft.customer.alias || '');
  setVal('#c_vd', draft.customer.taxOffice || '');
  setVal('#c_address', draft.customer.address || '');
  setVal('#c_district', draft.customer.district || '');
  setVal('#c_city', draft.customer.city || '');
  setVal('#c_country', draft.customer.country || 'Türkiye');
  setVal('#c_zip', draft.customer.zip || '');
  setVal('#c_phone', draft.customer.phone || '');
  setVal('#c_email', draft.customer.email || '');
  setVal('#g_notes', (draft.notes || []).join('\n'));

  linesContainer.innerHTML = '';
  if (draft.lines.length > 0) {
    draft.lines.forEach(line => createLine(line));
  } else {
    createLine();
  }

  showToast('Taslak düzenleme için form dolduruldu', 'info');
  return true;
}
