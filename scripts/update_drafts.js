const fs = require('fs');

const content = `// ══════════════════════════════════════════
// Drafts Page (Taslaklar) - Nilvera Clone Redesign
// ══════════════════════════════════════════
import { EInvoice, EArchive } from '../api/nilvera.js';
import { showToast } from '../components/toast.js';
import { navigate } from '../router.js';

const ic = {
  search: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
  trash: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
  send: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',
  magnifier: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#334155" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
  eyeSlash: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>',
  hamburger: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>',
  pen: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>',
  tag: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>',
  barcode: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5v14"/><path d="M8 5v14"/><path d="M12 5v14"/><path d="M17 5v14"/><path d="M21 5v14"/></svg>',
  xml: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>'
};

export async function renderDrafts() {
  const page = document.createElement('div');
  page.innerHTML = \`
    <style>
      .btn-hover:hover { background: #f1f5f9 !important; }
      .row-hover:hover { background: #f8fafc !important; }
    </style>
    <!-- Top Filter Bar -->
    <div style="background: white; padding: 12px 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; font-size: 13px;">
      <div style="display: flex; gap: 10px; align-items: center; flex-wrap:wrap;">
         <div style="position:relative;">
           <span style="position:absolute; left:10px; top:50%; transform:translateY(-50%); color:#94a3b8;">\${ic.search}</span>
           <input type="text" id="searchInput" placeholder="Ara" style="border: 1px solid #cbd5e1; padding: 8px 12px 8px 30px; border-radius: 4px; width: 250px; outline:none;">
         </div>
         <input type="date" id="startDate" style="border: 1px solid #cbd5e1; padding: 8px 12px; border-radius: 4px; color: #64748b; outline:none;">
         <input type="date" id="endDate" style="border: 1px solid #cbd5e1; padding: 8px 12px; border-radius: 4px; color: #64748b; outline:none;">
         <label style="display:flex; align-items:center; gap:4px; margin-left:10px; cursor:pointer;">
            <input type="radio" name="draft_type" value="einvoice" checked style="accent-color:#10b981;"> E-Fatura
         </label>
         <label style="display:flex; align-items:center; gap:4px; cursor:pointer;">
            <input type="radio" name="draft_type" value="earchive" style="accent-color:#10b981;"> E-Arşiv
         </label>
      </div>
      <div style="display: flex; gap: 8px;">
         <button id="btnSearch" class="btn-hover" style="background: white; color: #3b82f6; border: 1px solid #3b82f6; padding: 8px 16px; border-radius:4px; font-weight:600; font-size:12px; display:flex; align-items:center; gap:6px; cursor:pointer;">\${ic.magnifier} ARA</button>
         <button id="btnDeleteBulk" style="background: #ef4444; color: white; padding: 8px 16px; border:none; border-radius:4px; font-weight:600; font-size:12px; display:flex; align-items:center; gap:6px; cursor:pointer;">\${ic.trash} SİL</button>
         <button id="btnSendBulk" style="background: #84cc16; color: white; padding: 8px 16px; border:none; border-radius:4px; font-weight:600; font-size:12px; display:flex; align-items:center; gap:6px; cursor:pointer;">\${ic.send} ONAYLA VE GÖNDER</button>
      </div>
    </div>

    <!-- Breadcrumb -->
    <div style="padding: 15px 20px; background: #f8fafc;">
      <div style="background: #e0e7ff; padding: 12px 16px; border-radius: 6px; font-size: 13px; color: #4338ca; font-weight: 500; display:inline-block; width:100%; border-left: 4px solid #4f46e5;">
        <span style="margin-right:5px; font-size:15px; vertical-align:middle;">≡</span>
        <span>Fatura İşlemleri <span style="margin:0 5px;">&gt;</span> <span style="font-weight:700;">Taslaklar</span></span>
      </div>
    </div>

    <!-- Table Container -->
    <div style="padding: 0 20px 20px 20px; background: #f8fafc; min-height:calc(100vh - 160px);">
      <div style="background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: visible;">
        <table style="width: 100%; text-align: left; border-collapse: collapse; font-size: 12px; color: #334155;">
          <thead>
            <tr style="border-bottom: 2px solid #e2e8f0; font-weight: 700; color: #64748b; font-size:11px;">
              <th style="padding: 16px 12px; width: 40px; text-align:center;"><input type="checkbox" id="chkAll"></th>
              <th style="padding: 16px 0px; width: 60px;"></th>
              <th style="padding: 16px 12px;">FATURA BİLGİSİ</th>
              <th style="padding: 16px 12px;">TARİH</th>
              <th style="padding: 16px 12px;">ALICI BİLGİSİ</th>
              <th style="padding: 16px 12px;">ALICI ETİKET</th>
              <th style="padding: 16px 12px;">FATURA TÜRÜ</th>
              <th style="padding: 16px 12px;">ETİKET BİLGİLERİ</th>
              <th style="padding: 16px 12px; text-align:center; width:80px;">İŞLEMLER</th>
            </tr>
          </thead>
          <tbody id="draftList">
            <tr><td colspan="9" style="padding:40px; text-align:center; color:#94a3b8;">Yükleniyor...</td></tr>
          </tbody>
        </table>

        <!-- Table Footer -->
        <div style="display: flex; justify-content: space-between; padding: 12px 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; align-items: center;">
          <div id="lblTotal" style="background:#f1f5f9; padding:6px 12px; border-radius:4px; font-weight:600;">Toplam Kayıt : 0</div>
          <div style="display: flex; align-items: center; gap: 15px;">
             <span>Sayfa Başına Kayıt 
               <select style="border:none; border-bottom:1px solid #cbd5e1; outline:none; background:transparent; margin-left:5px; color:#334155; font-weight:600;">
                 <option>30</option><option>50</option><option>100</option>
               </select>
             </span>
             <div style="display:flex; gap:5px; align-items:center;">
               <button style="border:1px solid #e2e8f0; background:white; width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer;">&lt;</button>
               <button style="border:none; background:#4f46e5; color:white; width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:600;">1</button>
               <button style="border:1px solid #e2e8f0; background:white; width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer;">&gt;</button>
             </div>
          </div>
        </div>

      </div>
    </div>
  \`;

  page.querySelector('#btnSearch').addEventListener('click', () => {
     const type = page.querySelector('input[name="draft_type"]:checked').value;
     loadDrafts(page, type);
  });

  loadDrafts(page, 'einvoice');
  return page;
}

document.addEventListener('click', (e) => {
  if (!e.target.closest('.action-btn-container')) {
    document.querySelectorAll('.action-dropdown').forEach(el => el.style.display = 'none');
  }
});

async function loadDrafts(page, type) {
  const tbody = page.querySelector('#draftList');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="9" style="padding:40px; text-align:center; color:#94a3b8;">Yükleniyor...</td></tr>';
  
  try {
    const api = type === 'earchive' ? EArchive : EInvoice;
    const res = await api.listDrafts({ PageSize: 50 });
    
    if (!res.success) {
      tbody.innerHTML = \`<tr><td colspan="9" style="padding:20px; text-align:center; color:#ef4444;">Hata: \${res.error}</td></tr>\`;
      return;
    }

    let drafts = [];
    if (res.data && Array.isArray(res.data.Content)) drafts = res.data.Content;
    else if (res.data && Array.isArray(res.data.Items)) drafts = res.data.Items;
    else if (Array.isArray(res.data)) drafts = res.data;

    page.querySelector('#lblTotal').textContent = \`Toplam Kayıt : \${drafts.length}\`;

    if (drafts.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" style="padding:40px; text-align:center; color:#94a3b8;">Kayıt bulunamadı</td></tr>';
      return;
    }

    tbody.innerHTML = drafts.map((d, index) => {
      const no = d.InvoiceNumber || d.InvoiceSerieOrNumber || '—';
      const typeStr = d.InvoiceType || 'Satış';
      const amount = d.PayableAmount || 0;
      const curr = d.CurrencyCode || 'TRY';
      const issueDate = fmtDateTime(d.IssueDate);
      const createdDate = fmtDateTime(d.CreatedDate);
      const receiverName = d.ReceiverName || d.CustomerName || d.Name || '—';
      const receiverTax = d.ReceiverTaxNumber || d.TaxNumber || '—';
      const alias = d.ReceiverAlias || d.Alias || 'Belirtilmemiş';
      const profile = d.InvoiceProfile || 'Ticari Fatura';
      const uuid = d.UUID || d.uuid;

      return \`
        <tr class="row-hover" style="border-bottom: 1px solid #f1f5f9; transition: background 0.2s;">
          <td style="padding: 16px 12px; text-align:center;"><input type="checkbox" class="row-chk" value="\${uuid}"></td>
          <td style="padding: 16px 0px; white-space:nowrap;">
             <span style="cursor:pointer; display:inline-block; padding:4px;" title="İncele">\${ic.magnifier}</span>
             <span style="cursor:pointer; display:inline-block; padding:4px;" title="Gizle">\${ic.eyeSlash}</span>
          </td>
          <td style="padding: 16px 12px; line-height:1.6;">
            <div><strong style="color:#0f172a;">Seri/No :</strong> \${no}</div>
            <div style="margin-top:4px;">
              <span style="background:#22c55e; color:white; padding:2px 6px; border-radius:4px; font-size:10px; font-weight:600;">\${formatType(typeStr)}</span> 
              <span style="color:#64748b; font-weight:600;">/ \${fmtCur(amount, curr)}</span>
            </div>
          </td>
          <td style="padding: 16px 12px; line-height:1.6; color:#475569;">
            <div><strong style="color:#0f172a;">Fatura :</strong> \${issueDate}</div>
            <div><strong style="color:#0f172a;">Kayıt :</strong> \${createdDate}</div>
          </td>
          <td style="padding: 16px 12px; line-height:1.6; color:#475569;">
            <div style="font-weight:600; color:#0f172a;">\${receiverName}</div>
            <div><strong style="color:#0f172a;">Vergi No :</strong> \${receiverTax}</div>
          </td>
          <td style="padding: 16px 12px; max-width:180px;">
            <select style="width:100%; border:none; border-bottom:1px solid #cbd5e1; outline:none; background:transparent; font-size:11px; padding-bottom:4px; color:#475569; text-overflow: ellipsis; cursor:pointer;">
              <option>\${alias}</option>
            </select>
          </td>
          <td style="padding: 16px 12px;">
             <div style="display:flex; align-items:center; gap:6px; color:#475569; font-weight:500;">
                <div style="width:8px; height:8px; border-radius:50%; background:#f59e0b;"></div>
                \${formatProfile(profile)}
             </div>
          </td>
          <td style="padding: 16px 12px;"></td>
          <td style="padding: 16px 12px; text-align:center; position:relative;" class="action-btn-container">
             <button class="btn-action-trigger btn-hover" style="background:transparent; border:1px solid #e2e8f0; border-radius:4px; cursor:pointer; padding:6px; display:inline-flex; align-items:center;">
                \${ic.hamburger}
             </button>
             
             <!-- Dropdown Popover -->
             <div class="action-dropdown" style="display:none; position:absolute; right:45px; top:20px; background:white; border-radius:6px; box-shadow:0 10px 25px rgba(0,0,0,0.15); border:1px solid #e2e8f0; width:180px; text-align:left; z-index:9999;">
               <div class="action-item" style="padding:10px 15px; cursor:pointer; border-bottom:1px solid #f1f5f9; display:flex; align-items:center; gap:10px; font-weight:500; font-size:12px; color:#334155;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='white'">
                  \${ic.pen} Faturayı Düzenle
               </div>
               <div class="action-item" style="padding:10px 15px; cursor:pointer; border-bottom:1px solid #f1f5f9; display:flex; align-items:center; gap:10px; font-weight:500; font-size:12px; color:#334155;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='white'">
                  \${ic.send} Onayla ve Gönder
               </div>
               <div class="action-item" style="padding:10px 15px; cursor:pointer; border-bottom:1px solid #f1f5f9; display:flex; align-items:center; gap:10px; font-weight:500; font-size:12px; color:#334155;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='white'">
                  \${ic.tag} Etiket Bilgileri
               </div>
               <div class="action-item" style="padding:10px 15px; cursor:pointer; border-bottom:1px solid #f1f5f9; display:flex; align-items:center; gap:10px; font-weight:500; font-size:12px; color:#334155;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='white'">
                  \${ic.barcode} Özel Kod Alanı
               </div>
               <div class="action-item" style="padding:10px 15px; cursor:pointer; border-bottom:1px solid #f1f5f9; display:flex; align-items:center; gap:10px; font-weight:500; font-size:12px; color:#334155;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='white'">
                  \${ic.xml} XML İndir
               </div>
               <div class="action-item action-delete" data-uuid="\${uuid}" style="padding:10px 15px; cursor:pointer; display:flex; align-items:center; gap:10px; font-weight:500; font-size:12px; color:#4f46e5;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='white'">
                  <span style="color:#4f46e5;">\${ic.trash}</span> Sil
               </div>
             </div>
          </td>
        </tr>
      \`;
    }).join('');

    tbody.querySelectorAll('.btn-action-trigger').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const drop = btn.nextElementSibling;
        const isVisible = drop.style.display === 'block';
        document.querySelectorAll('.action-dropdown').forEach(el => el.style.display = 'none');
        if (!isVisible) drop.style.display = 'block';
      });
    });

    tbody.querySelectorAll('.action-delete').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (confirm('Bu taslağı silmek istediğinize emin misiniz?')) {
          const resDel = await api.deleteDraft(btn.dataset.uuid);
          showToast(resDel.success ? 'Taslak silindi' : \`Hata: \${resDel.error}\`, resDel.success ? 'success' : 'error');
          loadDrafts(page, type);
        }
      });
    });

  } catch (e) {
    tbody.innerHTML = \`<tr><td colspan="9" style="padding:20px; text-align:center; color:#ef4444;">Bağlantı hatası: \${e.message}</td></tr>\`;
  }
}

function fmtDateTime(d) {
  if (!d) return '—';
  try {
    const dt = new Date(d);
    return dt.toLocaleDateString('tr-TR') + ' ' + dt.toLocaleTimeString('tr-TR', {hour:'2-digit', minute:'2-digit'});
  } catch { return d; }
}

function fmtCur(val, curr) {
  if (val === undefined || val === null) return '0,00 TRY';
  try {
    return new Intl.NumberFormat('tr-TR', { minimumFractionDigits:2, maximumFractionDigits:2 }).format(val) + ' ' + (curr || 'TRY');
  } catch { return val + ' ' + curr; }
}

function formatType(str) {
  if(str === 'SATIS') return 'Satış';
  if(str === 'IADE') return 'İade';
  return str;
}

function formatProfile(str) {
  if(str === 'TICARIFATURA') return 'Ticari Fatura';
  if(str === 'TEMELFATURA') return 'Temel Fatura';
  if(str === 'EARSIVFATURA') return 'E-Arşiv Fatura';
  return str;
}
`;

fs.writeFileSync('src/pages/drafts.js', content, 'utf8');
console.log('Update complete.');
