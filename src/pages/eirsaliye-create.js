// ══════════════════════════════════════════
// e-İrsaliye Oluştur (Create Despatch) Page
// Full form matching Nilvera despatch creation
// ══════════════════════════════════════════
import { EDespatch, General } from '../api/nilvera.js';
import { showToast } from '../components/toast.js';
import { showModal } from '../components/modal.js';
import { getActiveAccount } from '../services/account-manager.js';
import { navigate } from '../router.js';

const ic = {
  truck: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`,
  save: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>`,
  send: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`,
  eye: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
  xml: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
  plus: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  trash: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
  search: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  user: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
};

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function nowTime() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

let lineCounter = 0;

export async function renderEirsaliyeCreate() {
  const page = document.createElement('div');
  page.className = 'invoice-create-page';
  const account = await getActiveAccount();
  const despatchSeries = account?.despatch_series || 'AYK';
  lineCounter = 0;

  page.innerHTML = `
    <div class="nilvera-breadcrumb">
      ${ic.truck}
      <span>e-Irsaliye</span>
      <span class="bc-separator">›</span>
      <span class="bc-current">Irsaliye Olustur</span>
    </div>

    <!-- Top Action Bar -->
    <div class="invoice-create-header">
      <h2 style="display:flex;align-items:center;gap:8px;font-size:16px">${ic.truck} Irsaliye Olustur</h2>
      <div class="invoice-create-header-actions">
        <button class="btn btn-secondary" id="btnXmlPreview" style="display:flex;align-items:center;gap:6px">${ic.xml} XML Indir</button>
        <button class="btn btn-secondary" id="btnPreview" style="display:flex;align-items:center;gap:6px">${ic.eye} Onizle</button>
        <button class="btn btn-warning" id="btnSaveDraft" style="display:flex;align-items:center;gap:6px">${ic.save} Taslak Olarak Kaydet</button>
        <button class="btn btn-primary" id="btnSend" style="display:flex;align-items:center;gap:6px">${ic.send} Onayla ve Gonder</button>
      </div>
    </div>

    <!-- 1) Alici Bilgileri — full width -->
    <div class="card invoice-general-card" style="margin-top:0">
      <h3 style="margin-bottom:16px">${ic.user} Alici Bilgileri</h3>
      <div class="form-group" style="position:relative">
        <input type="text" class="form-input" id="receiverSearch" placeholder="Firma adi veya VKN ile arayiniz..." autocomplete="off" style="padding-left:36px" />
        <span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--text-muted);pointer-events:none">${ic.search}</span>
        <div id="receiverSuggestions" class="receiver-suggestions" style="display:none"></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px">
        <div class="form-group"><label class="form-label">Unvan / Adi Soyadi</label><input type="text" class="form-input" id="receiverName" /></div>
        <div class="form-group"><label class="form-label">Etiket</label>
          <select class="form-input" id="receiverAlias"><option value="">Lutfen Etiket Seciniz</option></select>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group"><label class="form-label">VKN-TCKN</label><input type="text" class="form-input" id="receiverTaxNo" /></div>
        <div class="form-group"><label class="form-label">Vergi Dairesi</label><input type="text" class="form-input" id="receiverTaxOffice" /></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group"><label class="form-label">Adres</label><input type="text" class="form-input" id="receiverAddress" /></div>
        <div class="form-group"><label class="form-label">Ilce</label><input type="text" class="form-input" id="receiverDistrict" /></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
        <div class="form-group"><label class="form-label">Sehir</label><input type="text" class="form-input" id="receiverCity" /></div>
        <div class="form-group"><label class="form-label">Ulke</label>
          <select class="form-input" id="receiverCountry"><option value="Turkiye">Turkiye</option></select>
        </div>
        <div class="form-group"><label class="form-label">Posta Kodu</label><input type="text" class="form-input" id="receiverPostalCode" /></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
        <div class="form-group"><label class="form-label">Telefon</label><input type="text" class="form-input" id="receiverPhone" /></div>
        <div class="form-group"><label class="form-label">Faks</label><input type="text" class="form-input" id="receiverFax" /></div>
        <div class="form-group"><label class="form-label">Web Site Adresi</label><input type="text" class="form-input" id="receiverWeb" /></div>
      </div>
      <div class="form-group"><label class="form-label">E-Posta</label><input type="email" class="form-input" id="receiverEmail" /></div>
    </div>

    <!-- 2) Genel Bilgiler — full width -->
    <div class="card invoice-general-card" style="margin-top:20px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
        <h3>Genel Bilgiler</h3>
        <span class="badge" id="ettnBadge" style="font-size:10px;padding:4px 10px;background:var(--accent-bg);color:var(--accent);border-radius:20px;font-family:monospace;max-width:380px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"><strong>ETTN</strong> <span id="ettnValue">otomatik</span></span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group"><label class="form-label">Irsaliye Tarihi</label><input type="date" class="form-input" id="despatchDate" value="${todayStr()}" /></div>
        <div class="form-group"><label class="form-label">Irsaliye Saati</label><input type="time" class="form-input" id="despatchTime" value="${nowTime()}" /></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group"><label class="form-label">Irsaliye Senaryosu</label>
          <select class="form-input" id="despatchScenario">
            <option value="TEMELFATURA">Temel Irsaliye</option>
            <option value="HALTIP">Hal Tipi</option>
            <option value="INSAATDEMIRI">Insaat Demiri Izleme Sistemi</option>
          </select>
        </div>
        <div class="form-group"><label class="form-label">Irsaliye Tipi</label>
          <select class="form-input" id="despatchType">
            <option value="SEVK">Sevk</option>
            <option value="MATBUDAN">Matbudan</option>
          </select>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
        <div class="form-group"><label class="form-label">Irsaliye Seri</label><input type="text" class="form-input" id="despatchSerial" value="${despatchSeries}" maxlength="3" /></div>
        <div class="form-group"><label class="form-label">Irsaliye Sablonu</label>
          <select class="form-input" id="despatchTemplate"><option value="eIrsaliye">eIrsaliye</option></select>
        </div>
        <div class="form-group"><label class="form-label">Para Birimi</label>
          <select class="form-input" id="currency">
            <option value="TRY">Turk Lirasi</option><option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option>
          </select>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
        <div class="form-group"><label class="form-label">Sevk Tarihi</label><input type="date" class="form-input" id="shipmentDate" value="${todayStr()}" /></div>
        <div class="form-group"><label class="form-label">Sevk Saati</label><input type="time" class="form-input" id="shipmentTime" value="${nowTime()}" /></div>
        <div class="form-group"><label class="form-label">Arac Plaka</label><input type="text" class="form-input" id="vehiclePlate" placeholder="34 ABC 123" /></div>
      </div>
    </div>

    <!-- 3) Dorse Plaka — full width -->
    <div class="card invoice-general-card" style="margin-top:20px">
      <h3 style="margin-bottom:14px">Dorse Plaka</h3>
      <div style="display:flex;gap:8px;align-items:flex-end">
        <div class="form-group" style="flex:1;margin-bottom:0"><input type="text" class="form-input" id="trailerPlate" placeholder="Plaka" /></div>
        <button class="btn btn-success btn-sm" id="addTrailerBtn" style="display:flex;align-items:center;gap:4px;white-space:nowrap">${ic.plus} PLAKA EKLE</button>
      </div>
      <div id="trailerList" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:10px"></div>
    </div>

    <!-- 4) Sofor Bilgileri — full width -->
    <div class="card invoice-general-card" style="margin-top:20px">
      <h3 style="margin-bottom:14px">${ic.user} Sofor Bilgileri</h3>
      <div style="display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap">
        <div class="form-group" style="flex:1;min-width:140px;margin-bottom:0"><label class="form-label">Ad</label><input type="text" class="form-input" id="driverFirstName" /></div>
        <div class="form-group" style="flex:1;min-width:140px;margin-bottom:0"><label class="form-label">Soyad</label><input type="text" class="form-input" id="driverLastName" /></div>
        <div class="form-group" style="flex:1;min-width:140px;margin-bottom:0"><label class="form-label">TCKN</label><input type="text" class="form-input" id="driverTckn" /></div>
        <button class="btn btn-success btn-sm" id="addDriverBtn" style="display:flex;align-items:center;gap:4px;white-space:nowrap">${ic.plus} SOFOR EKLE</button>
      </div>
      <div id="driverList" style="display:flex;flex-direction:column;gap:6px;margin-top:10px"></div>
    </div>

    <!-- 5) Address Tabs — full width -->
    <div class="card" style="margin-top:20px">
      <div class="despatch-tabs">
        <button class="despatch-tab active" data-tab="delivery">Teslimat Adresi</button>
        <button class="despatch-tab" data-tab="carrier">Tasiyici Firma Bilgileri</button>
        <button class="despatch-tab" data-tab="buyer">Satin Alan Taraf Bilgileri</button>
        <button class="despatch-tab" data-tab="seller">Mallari Saglayan Taraf Bilgileri</button>
        <button class="despatch-tab" data-tab="origin">Mallarin Alinmasini Baslatan Taraf Bilgileri</button>
      </div>
      <div id="tabContent" style="padding:20px">
        <div class="form-group" style="margin-bottom:16px">
          <label style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--text-secondary);cursor:pointer">
            <input type="checkbox" id="useReceiverAsDelivery" checked /> Alici Adresini Teslimat Adresi Olarak Kullan
          </label>
        </div>
        <div style="display:grid;grid-template-columns:2fr 1fr;gap:12px">
          <div class="form-group"><label class="form-label">Adres</label><input type="text" class="form-input" id="deliveryAddress" /></div>
          <div class="form-group"><label class="form-label">Ilce</label><input type="text" class="form-input" id="deliveryDistrict" /></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
          <div class="form-group"><label class="form-label">Sehir</label><input type="text" class="form-input" id="deliveryCity" /></div>
          <div class="form-group"><label class="form-label">Ulke</label>
            <select class="form-input" id="deliveryCountry"><option value="Turkiye">Turkiye</option></select>
          </div>
          <div class="form-group"><label class="form-label">Posta Kodu</label><input type="text" class="form-input" id="deliveryPostalCode" /></div>
        </div>
      </div>
    </div>

    <!-- 6) Mal / Hizmet Bilgileri — full width -->
    <div class="card invoice-lines-card" style="margin-top:20px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
        <h3>Mal / Hizmet Bilgileri</h3>
      </div>
      <div class="table-wrapper">
        <table class="table" id="linesTable">
          <thead>
            <tr>
              <th style="width:30px"></th>
              <th>Mal / Hizmetler</th>
              <th>Kimye Numarasi</th>
              <th style="width:80px">Miktar</th>
              <th style="width:90px">Birim</th>
              <th style="width:100px">Birim Fiyat</th>
              <th style="width:100px">Toplam Tutar</th>
              <th style="width:40px"></th>
            </tr>
          </thead>
          <tbody id="linesBody"></tbody>
        </table>
      </div>
      <button class="btn btn-success btn-sm" id="addLineBtn" style="margin-top:12px;display:flex;align-items:center;gap:6px">${ic.plus} Yeni Satir Ekle</button>
    </div>

    <!-- 7) Bottom Tabs — full width -->
    <div class="card" style="margin-top:20px">
      <div class="despatch-tabs">
        <button class="despatch-tab active" data-tab="notes">Irsaliye Notu</button>
        <button class="despatch-tab" data-tab="order">Siparis Bilgileri</button>
        <button class="despatch-tab" data-tab="attachments">Irsaliye Ek Dosyalari</button>
        <button class="despatch-tab" data-tab="codes">Kodlar</button>
      </div>
      <div id="bottomTabContent" style="padding:20px">
        <div class="form-group">
          <textarea class="form-input" id="despatchNote" rows="4" placeholder="Irsaliye Notunuz Varsa Giriniz."></textarea>
        </div>
      </div>
    </div>
  `;

  // ── Add initial line ──
  addLine(page);

  // ── Tab switching ──
  page.querySelectorAll('.despatch-tabs').forEach(tabBar => {
    tabBar.querySelectorAll('.despatch-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        tabBar.querySelectorAll('.despatch-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
      });
    });
  });

  // ── Receiver search (GIB lookup — fills ALL fields like e-fatura) ──
  let searchTimeout;
  const searchInput = page.querySelector('#receiverSearch');
  const suggestions = page.querySelector('#receiverSuggestions');

  searchInput?.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    const q = searchInput.value.trim();
    if (q.length < 3) { suggestions.style.display = 'none'; return; }
    searchTimeout = setTimeout(async () => {
      suggestions.innerHTML = '<div style="padding:10px;color:var(--text-muted);text-align:center">Araniyor...</div>';
      suggestions.style.display = 'block';
      try {
        const res = await General.searchCompany(q);
        const list = Array.isArray(res.data) ? res.data : (res.data?.Content || res.data?.Items || []);
        const validList = list.filter(c => c && c.Title && c.Title.length > 2 && c.Title !== '--');
        validList.sort((a, b) => {
          const vl = q.toLowerCase();
          const sa = (a.Title || '').toLowerCase().startsWith(vl);
          const sb = (b.Title || '').toLowerCase().startsWith(vl);
          if (sa && !sb) return -1;
          if (sb && !sa) return 1;
          return 0;
        });

        if (res.success && validList.length > 0) {
          suggestions.innerHTML = validList.slice(0, 10).map((c, i) => `
            <div class="receiver-suggestion-item" data-idx="${i}">
              <div style="font-weight:600;font-size:13px">${c.Title || '—'}</div>
              <div style="font-size:11px;color:var(--text-muted);display:flex;justify-content:space-between">
                <span>VKN: ${c.TaxNumber || c.Identifier || 'Yok'}</span>
              </div>
            </div>
          `).join('');
          suggestions.querySelectorAll('.receiver-suggestion-item').forEach(item => {
            item.addEventListener('click', async () => {
              const cSearch = validList[parseInt(item.dataset.idx)];
              applyReceiverToForm(page, cSearch);
              suggestions.innerHTML = '<div style="padding:10px;color:var(--text-muted);text-align:center">Detaylar getiriliyor...</div>';
              try {
                const detailRes = await General.getGlobalCustomerInfo(cSearch.TaxNumber || cSearch.Identifier);
                const detailData = detailRes?.success ? (detailRes.data?.Content || detailRes.data?.Data || detailRes.data) : null;
                if (detailData && typeof detailData === 'object') applyReceiverToForm(page, detailData, cSearch);
                suggestions.style.display = 'none';
                searchInput.value = '';
                showToast('Mukellef bilgileri dolduruldu', 'success');
              } catch {
                suggestions.style.display = 'none';
                searchInput.value = '';
                showToast('Temel bilgiler dolduruldu, detay alinamadi', 'warning');
              }
            });
          });
        } else {
          suggestions.innerHTML = '<div style="padding:10px;color:var(--text-muted);text-align:center">Bulunamadi</div>';
        }
      } catch { suggestions.innerHTML = '<div style="padding:10px;color:tomato;text-align:center">Arama hatasi</div>'; }
    }, 500);
  });

  document.addEventListener('click', (e) => {
    if (!suggestions.contains(e.target) && e.target !== searchInput) suggestions.style.display = 'none';
  });

  // ── Trailer plates ──
  const trailers = [];
  page.querySelector('#addTrailerBtn')?.addEventListener('click', () => {
    const input = page.querySelector('#trailerPlate');
    const val = input.value.trim();
    if (!val) return;
    trailers.push(val);
    input.value = '';
    renderTrailers(page, trailers);
  });

  // ── Drivers ──
  const drivers = [];
  page.querySelector('#addDriverBtn')?.addEventListener('click', () => {
    const fn = page.querySelector('#driverFirstName').value.trim();
    const ln = page.querySelector('#driverLastName').value.trim();
    const tc = page.querySelector('#driverTckn').value.trim();
    if (!fn && !ln) return;
    drivers.push({ firstName: fn, lastName: ln, tckn: tc });
    page.querySelector('#driverFirstName').value = '';
    page.querySelector('#driverLastName').value = '';
    page.querySelector('#driverTckn').value = '';
    renderDrivers(page, drivers);
  });

  // ── Add line button ──
  page.querySelector('#addLineBtn')?.addEventListener('click', () => addLine(page));

  // ── Use receiver as delivery ──
  page.querySelector('#useReceiverAsDelivery')?.addEventListener('change', (e) => {
    if (e.target.checked) {
      page.querySelector('#deliveryAddress').value = page.querySelector('#receiverAddress').value;
      page.querySelector('#deliveryDistrict').value = page.querySelector('#receiverDistrict').value;
      page.querySelector('#deliveryCity').value = page.querySelector('#receiverCity').value;
      page.querySelector('#deliveryPostalCode').value = page.querySelector('#receiverPostalCode').value;
    }
  });

  // ── Action Buttons ──
  page.querySelector('#btnSaveDraft')?.addEventListener('click', async () => {
    const model = buildDespatchModel(page, drivers, trailers);
    if (!model) return;
    showToast('Taslak kaydediliyor...', 'info');
    try {
      const res = await EDespatch.createDraft(model);
      if (res.success) {
        showToast('Taslak kaydedildi', 'success');
        navigate('/eirsaliye-taslaklar');
      } else {
        showToast(`Hata: ${res.error}`, 'error');
      }
    } catch (e) { showToast(`Hata: ${e.message}`, 'error'); }
  });

  page.querySelector('#btnSend')?.addEventListener('click', async () => {
    const model = buildDespatchModel(page, drivers, trailers);
    if (!model) return;

    const confirmed = await new Promise(resolve => {
      const body = document.createElement('div');
      body.innerHTML = `<p>Bu irsaliyeyi onaylayip gondermek istediginize emin misiniz?</p><p style="color:var(--warning);font-size:12px;margin-top:8px">Bu islem geri alinamaz.</p>`;
      const footer = document.createElement('div');
      footer.style.cssText = 'display:flex;gap:10px;justify-content:flex-end;width:100%';
      footer.innerHTML = `<button class="btn btn-secondary" id="cancelSend">Iptal</button><button class="btn btn-primary" id="confirmSend">${ic.send} Onayla ve Gonder</button>`;
      const modal = showModal({ title: 'Irsaliye Gonderimi', body, footer });
      footer.querySelector('#cancelSend').addEventListener('click', () => { modal?.close(); resolve(false); });
      footer.querySelector('#confirmSend').addEventListener('click', () => { modal?.close(); resolve(true); });
    });

    if (!confirmed) return;
    showToast('Irsaliye gonderiliyor...', 'info');
    try {
      const res = await EDespatch.sendModel(model);
      if (res.success) {
        showToast('Irsaliye basariyla gonderildi!', 'success');
        navigate('/eirsaliye-giden');
      } else {
        showToast(`Hata: ${res.error}`, 'error');
      }
    } catch (e) { showToast(`Hata: ${e.message}`, 'error'); }
  });

  page.querySelector('#btnXmlPreview')?.addEventListener('click', async () => {
    const model = buildDespatchModel(page, drivers, trailers);
    if (!model) return;
    showToast('XML olusturuluyor...', 'info');
    try {
      const res = await EDespatch.sendXmlPreview(model);
      const xml = res.success ? (typeof res.data === 'string' ? res.data : JSON.stringify(res.data, null, 2)) : `Hata: ${res.error}`;
      const body = document.createElement('div');
      body.innerHTML = `<pre style="font-size:11px;overflow:auto;max-height:70vh;white-space:pre-wrap;background:var(--bg-input);padding:16px;border-radius:var(--radius-sm);color:var(--text-secondary)">${xml}</pre>`;
      showModal({ title: 'XML Onizleme', body, size: 'lg' });
    } catch (e) { showToast(`Hata: ${e.message}`, 'error'); }
  });

  page.querySelector('#btnPreview')?.addEventListener('click', () => {
    const model = buildDespatchModel(page, drivers, trailers);
    if (!model) return;
    const body = document.createElement('div');
    body.innerHTML = `<pre style="font-size:11px;overflow:auto;max-height:70vh;white-space:pre-wrap;background:var(--bg-input);padding:16px;border-radius:var(--radius-sm);color:var(--text-secondary)">${JSON.stringify(model, null, 2)}</pre>`;
    showModal({ title: 'Irsaliye Onizleme (JSON)', body, size: 'lg' });
  });

  return page;
}

function addLine(page) {
  const tbody = page.querySelector('#linesBody');
  if (!tbody) return;
  const idx = lineCounter++;
  const tr = document.createElement('tr');
  tr.dataset.lineIdx = idx;
  tr.innerHTML = `
    <td><input type="checkbox" class="line-check" /></td>
    <td style="position:relative">
      <input type="text" class="form-input form-input-sm" data-field="name" placeholder="Mal/Hizmet adi yazin (stok arama)" autocomplete="off" />
      <div class="line-search-results receiver-suggestions" style="display:none;top:100%;left:0;right:0;z-index:80"></div>
    </td>
    <td><input type="text" class="form-input form-input-sm" data-field="batchNo" placeholder="" /></td>
    <td><input type="number" class="form-input form-input-sm" data-field="quantity" value="0" min="0" step="1" /></td>
    <td>
      <select class="form-input form-input-sm" data-field="unit">
        <option value="ADET">ADET</option>
        <option value="KG">KG</option>
        <option value="LT">LT</option>
        <option value="MT">MT</option>
        <option value="M2">M2</option>
        <option value="M3">M3</option>
        <option value="PAKET">PAKET</option>
        <option value="KUTU">KUTU</option>
        <option value="TON">TON</option>
      </select>
    </td>
    <td><input type="number" class="form-input form-input-sm" data-field="unitPrice" value="0" min="0" step="0.01" /></td>
    <td><input type="number" class="form-input form-input-sm" data-field="total" value="0" readonly style="background:var(--bg-glass)" /></td>
    <td><button class="btn-icon" data-remove="${idx}" title="Satiri Sil">${ic.trash}</button></td>
  `;

  // Auto-calculate total
  const qtyInput = tr.querySelector('[data-field="quantity"]');
  const priceInput = tr.querySelector('[data-field="unitPrice"]');
  const totalInput = tr.querySelector('[data-field="total"]');

  const calcTotal = () => {
    const q = parseFloat(qtyInput.value) || 0;
    const p = parseFloat(priceInput.value) || 0;
    totalInput.value = (q * p).toFixed(2);
  };
  qtyInput.addEventListener('input', calcTotal);
  priceInput.addEventListener('input', calcTotal);

  // ── Stock search autocomplete (same as e-fatura) ──
  let stockTimeout;
  const nameInput = tr.querySelector('[data-field="name"]');
  const searchResults = tr.querySelector('.line-search-results');

  nameInput.addEventListener('input', (e) => {
    clearTimeout(stockTimeout);
    const val = e.target.value.trim();
    if (val.length < 3) { searchResults.style.display = 'none'; return; }
    stockTimeout = setTimeout(async () => {
      searchResults.innerHTML = '<div style="padding:10px;color:var(--text-muted);text-align:center">Araniyor...</div>';
      searchResults.style.display = 'block';
      try {
        const res = await General.searchStock(val);
        let list = [];
        if (Array.isArray(res.data)) { list = res.data; }
        else if (res.data) { list = res.data.Content || res.data.Items || res.data.Data || []; }
        const validList = list.filter(c => c && (c.Name || c.StockName || c.Title));
        const sv = val.toLowerCase();
        validList.sort((a, b) => {
          const na = (a.Name || a.StockName || a.Title || '').toLowerCase();
          const nb = (b.Name || b.StockName || b.Title || '').toLowerCase();
          if (na === sv && nb !== sv) return -1;
          if (nb === sv && na !== sv) return 1;
          if (na.startsWith(sv) && !nb.startsWith(sv)) return -1;
          if (nb.startsWith(sv) && !na.startsWith(sv)) return 1;
          return na.localeCompare(nb, 'tr');
        });

        if (res.success && validList.length > 0) {
          searchResults.innerHTML = validList.slice(0, 10).map((c, i) => {
            const dn = c.Name || c.StockName || c.Title || '';
            const price = c.Price !== undefined ? c.Price : 0;
            return `<div class="stock-search-item receiver-suggestion-item" data-idx="${i}">
              <div style="font-weight:600;font-size:13px">${dn}</div>
              <div style="font-size:11px;color:var(--text-muted);display:flex;justify-content:space-between">
                <span>Fiyat: ${price} TL</span>
                <span>Birim: ${c.UnitCode || 'ADET'}</span>
              </div>
            </div>`;
          }).join('');
          searchResults.querySelectorAll('.stock-search-item').forEach(item => {
            item.addEventListener('click', () => {
              const stock = validList[parseInt(item.dataset.idx)];
              nameInput.value = stock.Name || stock.StockName || stock.Title || '';
              priceInput.value = stock.Price !== undefined ? stock.Price : 0;
              const unitOpt = Array.from(tr.querySelector('[data-field="unit"]').options).find(o => o.value == stock.UnitCode);
              if (unitOpt) tr.querySelector('[data-field="unit"]').value = stock.UnitCode;
              searchResults.style.display = 'none';
              calcTotal();
            });
          });
        } else {
          searchResults.innerHTML = '<div style="padding:10px;color:var(--text-muted);text-align:center">Bulunamadi</div>';
        }
      } catch { searchResults.innerHTML = '<div style="padding:10px;color:tomato;text-align:center">Arama hatasi</div>'; }
    }, 500);
  });

  document.addEventListener('click', (e) => {
    if (!nameInput.contains(e.target) && !searchResults.contains(e.target)) searchResults.style.display = 'none';
  });

  tr.querySelector(`[data-remove="${idx}"]`).addEventListener('click', () => {
    if (tbody.children.length <= 1) { showToast('En az 1 satir olmali', 'warning'); return; }
    tr.remove();
  });

  tbody.appendChild(tr);
}

function renderTrailers(page, trailers) {
  const list = page.querySelector('#trailerList');
  list.innerHTML = trailers.map((t, i) => `
    <span class="badge badge-info" style="display:flex;align-items:center;gap:4px;padding:4px 10px">
      ${t} <button class="btn-icon" data-remove-trailer="${i}" style="padding:0;width:16px;height:16px">&times;</button>
    </span>
  `).join('');
  list.querySelectorAll('[data-remove-trailer]').forEach(btn => {
    btn.addEventListener('click', () => {
      trailers.splice(parseInt(btn.dataset.removeTrailer), 1);
      renderTrailers(page, trailers);
    });
  });
}

function renderDrivers(page, drivers) {
  const list = page.querySelector('#driverList');
  list.innerHTML = drivers.map((d, i) => `
    <div class="badge badge-info" style="display:flex;align-items:center;gap:8px;padding:6px 12px">
      ${ic.user} ${d.firstName} ${d.lastName} ${d.tckn ? `(${d.tckn})` : ''}
      <button class="btn-icon" data-remove-driver="${i}" style="padding:0;width:16px;height:16px">&times;</button>
    </div>
  `).join('');
  list.querySelectorAll('[data-remove-driver]').forEach(btn => {
    btn.addEventListener('click', () => {
      drivers.splice(parseInt(btn.dataset.removeDriver), 1);
      renderDrivers(page, drivers);
    });
  });
}

function buildDespatchModel(page, drivers, trailers) {
  const receiverName = page.querySelector('#receiverName')?.value?.trim();
  const receiverTaxNo = page.querySelector('#receiverTaxNo')?.value?.trim();

  if (!receiverName) {
    showToast('Alici adi zorunludur', 'warning');
    return null;
  }

  // Collect lines
  const rows = page.querySelectorAll('#linesBody tr');
  const lines = [];
  rows.forEach(tr => {
    const name = tr.querySelector('[data-field="name"]')?.value?.trim();
    const quantity = parseFloat(tr.querySelector('[data-field="quantity"]')?.value) || 0;
    const unit = tr.querySelector('[data-field="unit"]')?.value || 'ADET';
    const unitPrice = parseFloat(tr.querySelector('[data-field="unitPrice"]')?.value) || 0;
    const batchNo = tr.querySelector('[data-field="batchNo"]')?.value?.trim();

    if (name && quantity > 0) {
      lines.push({
        Name: name,
        Quantity: quantity,
        UnitType: unit,
        Price: unitPrice,
        Amount: quantity * unitPrice,
        ...(batchNo ? { BatchNumber: batchNo } : {}),
      });
    }
  });

  if (!lines.length) {
    showToast('En az 1 mal/hizmet satiri ekleyin', 'warning');
    return null;
  }

  const useReceiverAddr = page.querySelector('#useReceiverAsDelivery')?.checked;

  const model = {
    DespatchInfo: {
      UUID: crypto.randomUUID(),
      IssueDate: page.querySelector('#despatchDate')?.value || todayStr(),
      IssueTime: (page.querySelector('#despatchTime')?.value || nowTime()) + ':00',
      DespatchType: page.querySelector('#despatchType')?.value || 'SEVK',
      ProfileId: page.querySelector('#despatchScenario')?.value || 'TEMELFATURA',
      SerieOrNumber: page.querySelector('#despatchSerial')?.value || 'AYK',
      CurrencyCode: page.querySelector('#currency')?.value || 'TRY',
      TemplateName: page.querySelector('#despatchTemplate')?.value || 'eIrsaliye',
    },
    ReceiverInfo: {
      Name: receiverName,
      TaxNumber: receiverTaxNo || '',
      TaxOffice: page.querySelector('#receiverTaxOffice')?.value?.trim() || '',
      Address: page.querySelector('#receiverAddress')?.value?.trim() || '',
      District: page.querySelector('#receiverDistrict')?.value?.trim() || '',
      City: page.querySelector('#receiverCity')?.value?.trim() || '',
      Country: page.querySelector('#receiverCountry')?.value || 'Turkiye',
      PostalCode: page.querySelector('#receiverPostalCode')?.value?.trim() || '',
      Phone: page.querySelector('#receiverPhone')?.value?.trim() || '',
      Fax: page.querySelector('#receiverFax')?.value?.trim() || '',
      Mail: page.querySelector('#receiverEmail')?.value?.trim() || '',
      WebSite: page.querySelector('#receiverWeb')?.value?.trim() || '',
      ...(page.querySelector('#receiverAlias')?.value ? { ReceiverAlias: page.querySelector('#receiverAlias').value } : {}),
    },
    ShipmentInfo: {
      ActualShipmentDate: page.querySelector('#shipmentDate')?.value || todayStr(),
      ActualShipmentTime: (page.querySelector('#shipmentTime')?.value || nowTime()) + ':00',
      LicensePlateId: page.querySelector('#vehiclePlate')?.value?.trim() || '',
      ...(trailers.length ? { TrailerLicensePlates: trailers } : {}),
    },
    DeliveryAddress: useReceiverAddr ? {
      Address: page.querySelector('#receiverAddress')?.value?.trim() || '',
      District: page.querySelector('#receiverDistrict')?.value?.trim() || '',
      City: page.querySelector('#receiverCity')?.value?.trim() || '',
      Country: page.querySelector('#receiverCountry')?.value || 'Turkiye',
      PostalCode: page.querySelector('#receiverPostalCode')?.value?.trim() || '',
    } : {
      Address: page.querySelector('#deliveryAddress')?.value?.trim() || '',
      District: page.querySelector('#deliveryDistrict')?.value?.trim() || '',
      City: page.querySelector('#deliveryCity')?.value?.trim() || '',
      Country: page.querySelector('#deliveryCountry')?.value || 'Turkiye',
      PostalCode: page.querySelector('#deliveryPostalCode')?.value?.trim() || '',
    },
    DespatchLines: lines,
    ...(drivers.length ? {
      DriverInfo: drivers.map(d => ({
        FirstName: d.firstName,
        FamilyName: d.lastName,
        ...(d.tckn ? { CitizenshipId: d.tckn } : {}),
      }))
    } : {}),
    Notes: page.querySelector('#despatchNote')?.value?.trim() ? [page.querySelector('#despatchNote').value.trim()] : [],
  };

  return model;
}
