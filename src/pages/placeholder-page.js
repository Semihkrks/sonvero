// ══════════════════════════════════════════
// Placeholder Page — For Unimplemented Routes
// All SVG Icons — No Emojis
// ══════════════════════════════════════════

const svgIcons = {
  default: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
  export: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
  upload: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`,
  outbox: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`,
  inbox: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>`,
  folder: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`,
  list: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`,
  template: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>`,
  bell: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`,
  tag: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>`,
  cancel: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
  chart: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>`,
  settings: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
  truck: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`,
  building: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="2" width="22" height="20" rx="2" ry="2"/><line x1="7" y1="8" x2="7.01" y2="8"/><line x1="12" y1="8" x2="12.01" y2="8"/><line x1="17" y1="8" x2="17.01" y2="8"/><line x1="7" y1="12" x2="7.01" y2="12"/><line x1="12" y1="12" x2="12.01" y2="12"/><line x1="17" y1="12" x2="17.01" y2="12"/></svg>`,
  box: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>`,
  users: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  mail: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>`,
  key: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>`,
  headphones: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>`,
};

const pageIconMap = {
  'create-export': 'export', 'upload-xml': 'upload', 'upload-excel': 'upload', 'upload-sgk': 'upload',
  'efatura-arsiv-giden': 'outbox', 'efatura-arsiv-gelen': 'inbox',
  'efatura-eski-giden': 'folder', 'efatura-eski-gelen': 'folder',
  'efatura-seriler': 'list', 'efatura-sablonlar': 'template',
  'efatura-bildirim-giden': 'bell', 'efatura-bildirim-gelen': 'bell',
  'efatura-etiketler': 'tag',
  'earsiv-faturalar': 'default', 'earsiv-iptal': 'cancel',
  'earsiv-rapor-liste': 'chart', 'earsiv-rapor-olustur': 'chart',
  'earsiv-eski': 'folder', 'earsiv-tanimlamalar': 'settings',
  'earsiv-bildirim': 'bell', 'earsiv-etiketler': 'tag',
  'eirsaliye-olustur': 'truck', 'eirsaliye-taslaklar': 'default',
  'eirsaliye-dosya': 'upload',
  'eirsaliye-giden': 'outbox', 'eirsaliye-gelen': 'inbox',
  'eirsaliye-arsiv-giden': 'outbox', 'eirsaliye-arsiv-gelen': 'inbox',
  'eirsaliye-tanimlamalar': 'settings', 'eirsaliye-bildirim': 'bell',
  'eirsaliye-etiketler': 'tag',
  'gib-earsiv': 'building', 'stoklar': 'box',
  'musteriler': 'users', 'mailing': 'mail', 'raporlar': 'chart',
  'firma': 'building', 'kullanicilar': 'users',
  'api-tanimlari': 'key', 'destek': 'headphones',
};

const pageTitles = {
  'create-export': 'İhracat Faturası Oluştur', 'upload-xml': 'XML Yükle',
  'upload-excel': 'Excel Yükle', 'upload-sgk': 'SGK Pdf Yükle',
  'efatura-arsiv-giden': 'e-Fatura Arşiv — Giden Kutusu',
  'efatura-arsiv-gelen': 'e-Fatura Arşiv — Gelen Kutusu',
  'efatura-eski-giden': 'e-Fatura Eski Faturalar — Giden',
  'efatura-eski-gelen': 'e-Fatura Eski Faturalar — Gelen',
  'efatura-seriler': 'e-Fatura Seriler', 'efatura-sablonlar': 'e-Fatura Şablonlar',
  'efatura-bildirim-giden': 'Giden Fatura Bildirimleri',
  'efatura-bildirim-gelen': 'Gelen Fatura Bildirimleri',
  'efatura-etiketler': 'e-Fatura Etiketler',
  'earsiv-faturalar': 'e-Arşiv Faturaları', 'earsiv-iptal': 'İptal Faturaları',
  'earsiv-rapor-liste': 'Rapor Listesi', 'earsiv-rapor-olustur': 'Rapor Oluştur',
  'earsiv-eski': 'e-Arşiv Eski Faturalar', 'earsiv-tanimlamalar': 'e-Arşiv Tanımlamalar',
  'earsiv-bildirim': 'e-Arşiv Bildirim Ayarları', 'earsiv-etiketler': 'e-Arşiv Etiketler',
  'eirsaliye-olustur': 'İrsaliye Oluştur', 'eirsaliye-taslaklar': 'İrsaliye Taslakları',
  'eirsaliye-dosya': 'İrsaliye Dosya Yükleme', 'eirsaliye-giden': 'e-İrsaliye Giden Kutusu',
  'eirsaliye-gelen': 'e-İrsaliye Gelen Kutusu',
  'eirsaliye-arsiv-giden': 'e-İrsaliye Arşiv — Giden',
  'eirsaliye-arsiv-gelen': 'e-İrsaliye Arşiv — Gelen',
  'eirsaliye-tanimlamalar': 'e-İrsaliye Tanımlamalar',
  'eirsaliye-bildirim': 'e-İrsaliye Bildirim Ayarları',
  'eirsaliye-etiketler': 'e-İrsaliye Etiketler',
  'gib-earsiv': 'GİB E-Arşiv', 'stoklar': 'Stoklar',
  'musteriler': 'Müşteriler', 'mailing': 'Mailing Ayarları',
  'raporlar': 'Raporlar', 'firma': 'Firma Bilgileri',
  'kullanicilar': 'Kullanıcılar', 'api-tanimlari': 'API Tanımları',
  'destek': 'Destek Talepleri',
};

export function renderPlaceholderPage(routeKey) {
  const page = document.createElement('div');
  page.className = 'placeholder-page';

  const title = pageTitles[routeKey] || routeKey;
  const iconKey = pageIconMap[routeKey] || 'default';
  const icon = svgIcons[iconKey] || svgIcons.default;

  page.innerHTML = `
    <div class="placeholder-container">
      <div class="placeholder-card">
        <div class="placeholder-icon-wrapper">
          <span class="placeholder-icon">${icon}</span>
          <div class="placeholder-pulse"></div>
        </div>
        <h2 class="placeholder-title">${title}</h2>
        <p class="placeholder-subtitle">Bu sayfa yakında aktif olacaktır</p>
        <div class="placeholder-info">
          <div class="placeholder-info-item">
            <span class="placeholder-info-dot"></span>
            Nilvera API entegrasyonu hazırlanıyor
          </div>
          <div class="placeholder-info-item">
            <span class="placeholder-info-dot"></span>
            Modül geliştirme aşamasında
          </div>
        </div>
      </div>
      
      <div class="placeholder-table-preview">
        <div class="placeholder-table-header">
          <div class="placeholder-bar" style="width: 120px"></div>
          <div class="placeholder-bar" style="width: 80px"></div>
        </div>
        <div class="placeholder-table-rows">
          ${Array(5).fill('').map((_, i) => `
            <div class="placeholder-table-row" style="animation-delay: ${i * 0.1}s">
              <div class="placeholder-bar" style="width: ${60 + Math.random() * 40}%"></div>
              <div class="placeholder-bar" style="width: ${30 + Math.random() * 30}%"></div>
              <div class="placeholder-bar" style="width: ${20 + Math.random() * 20}%"></div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  return page;
}
