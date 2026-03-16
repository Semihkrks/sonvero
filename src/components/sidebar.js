// ══════════════════════════════════════════
// Sidebar Component — Nilvera-Inspired Navigation
// ══════════════════════════════════════════
import { listAccounts, getActiveAccountId, setActiveAccount } from '../services/account-manager.js';
import { navigate } from '../router.js';

// ── SVG Icons ──
const icons = {
  home: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  fileText: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
  filePlus: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>`,
  inbox: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>`,
  send: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`,
  archive: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>`,
  folder: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`,
  truck: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`,
  database: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>`,
  settings: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
  barChart: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>`,
  building: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><line x1="9" y1="6" x2="9" y2="6"/><line x1="15" y1="6" x2="15" y2="6"/><line x1="9" y1="10" x2="9" y2="10"/><line x1="15" y1="10" x2="15" y2="10"/><line x1="9" y1="14" x2="9" y2="14"/><line x1="15" y1="14" x2="15" y2="14"/><path d="M9 18h6v4H9z"/></svg>`,
  users: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  key: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>`,
  headphones: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>`,
  upload: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>`,
  edit: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  list: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`,
  tag: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>`,
  bell: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`,
  layers: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>`,
  box: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>`,
  mail: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>`,
  xCircle: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
  fileCheck: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M9 15l2 2 4-4"/></svg>`,
  chevron: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`,
  collapse: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`,
  expand: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`,
  package: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>`,
};

// ── Menu Structure ──
const menuItems = [
  { id: 'dashboard', label: 'Ana Sayfa', icon: 'home', route: '/dashboard' },
  {
    id: 'fatura-islemleri', label: 'Fatura İşlemleri', icon: 'filePlus',
    children: [
      {
        id: 'fatura-olustur', label: 'Fatura Oluştur', icon: 'edit',
        children: [
          { id: 'mal-hizmet', label: 'Mal / Hizmet', route: '/create' },
          { id: 'ihracat', label: 'İhracat', route: '/create-export' },
        ]
      },
      { id: 'taslaklar', label: 'Taslaklar', icon: 'fileText', route: '/drafts' },
      {
        id: 'dosya-yukleme', label: 'Dosya Yükleme', icon: 'upload',
        children: [
          { id: 'xml-yukle', label: 'XML Yükle', route: '/upload-xml' },
          { id: 'excel-yukle', label: 'Excel Yükle', route: '/upload-excel' },
          { id: 'sgk-pdf', label: 'SGK Pdf Yükle', route: '/upload-sgk' },
        ]
      },
    ]
  },
  {
    id: 'efatura', label: 'e-Fatura', icon: 'fileCheck',
    children: [
      { id: 'ef-giden', label: 'Giden Kutusu', icon: 'send', route: '/outgoing' },
      { id: 'ef-gelen', label: 'Gelen Kutusu', icon: 'inbox', route: '/incoming' },
      {
        id: 'ef-arsiv', label: 'Arşiv', icon: 'archive',
        children: [
          { id: 'ef-arsiv-giden', label: 'Giden Kutusu', route: '/efatura-arsiv-giden' },
          { id: 'ef-arsiv-gelen', label: 'Gelen Kutusu', route: '/efatura-arsiv-gelen' },
        ]
      },
      {
        id: 'ef-eski', label: 'Eski Faturalar', icon: 'folder',
        children: [
          { id: 'ef-eski-giden', label: 'Giden Kutusu', route: '/efatura-eski-giden' },
          { id: 'ef-eski-gelen', label: 'Gelen Kutusu', route: '/efatura-eski-gelen' },
        ]
      },
      {
        id: 'ef-tanimlamalar', label: 'Tanımlamalar', icon: 'settings',
        children: [
          { id: 'ef-seriler', label: 'Seriler', route: '/efatura-seriler' },
          { id: 'ef-sablonlar', label: 'Şablonlar', route: '/efatura-sablonlar' },
        ]
      },
      {
        id: 'ef-bildirim', label: 'Bildirim Ayarları', icon: 'bell',
        children: [
          { id: 'ef-bildirim-giden', label: 'Giden Fatura', route: '/efatura-bildirim-giden' },
          { id: 'ef-bildirim-gelen', label: 'Gelen Fatura', route: '/efatura-bildirim-gelen' },
        ]
      },
      { id: 'ef-etiketler', label: 'Etiketler', icon: 'tag', route: '/efatura-etiketler' },
    ]
  },
  {
    id: 'earsiv', label: 'e-Arşiv', icon: 'folder',
    children: [
      { id: 'ea-faturalar', label: 'e-Arşiv Faturaları', icon: 'fileText', route: '/earsiv-faturalar' },
      { id: 'ea-iptal', label: 'İptal Faturaları', icon: 'xCircle', route: '/earsiv-iptal' },
      {
        id: 'ea-rapor', label: 'Rapor İşlemleri', icon: 'barChart',
        children: [
          { id: 'ea-rapor-liste', label: 'Rapor Listesi', route: '/earsiv-rapor-liste' },
          { id: 'ea-rapor-olustur', label: 'Rapor Oluştur', route: '/earsiv-rapor-olustur' },
        ]
      },
      { id: 'ea-eski', label: 'Eski Faturalar', icon: 'folder', route: '/earsiv-eski' },
      { id: 'ea-tanimlamalar', label: 'Tanımlamalar', icon: 'settings', route: '/earsiv-tanimlamalar' },
      { id: 'ea-bildirim', label: 'Bildirim Ayarları', icon: 'bell', route: '/earsiv-bildirim' },
      { id: 'ea-etiketler', label: 'Etiketler', icon: 'tag', route: '/earsiv-etiketler' },
    ]
  },
  {
    id: 'eirsaliye', label: 'e-İrsaliye', icon: 'truck',
    children: [
      {
        id: 'ei-islemleri', label: 'İrsaliye İşlemleri', icon: 'edit',
        children: [
          { id: 'ei-olustur', label: 'İrsaliye Oluştur', route: '/eirsaliye-olustur' },
          { id: 'ei-taslaklar', label: 'Taslaklar', route: '/eirsaliye-taslaklar' },
        ]
      },
      { id: 'ei-dosya', label: 'Dosya Yükleme', icon: 'upload', route: '/eirsaliye-dosya' },
      { id: 'ei-giden', label: 'Giden Kutusu', icon: 'send', route: '/eirsaliye-giden' },
      { id: 'ei-gelen', label: 'Gelen Kutusu', icon: 'inbox', route: '/eirsaliye-gelen' },
      {
        id: 'ei-arsiv', label: 'Arşiv', icon: 'archive',
        children: [
          { id: 'ei-arsiv-giden', label: 'Giden Kutusu', route: '/eirsaliye-arsiv-giden' },
          { id: 'ei-arsiv-gelen', label: 'Gelen Kutusu', route: '/eirsaliye-arsiv-gelen' },
        ]
      },
      { id: 'ei-tanimlamalar', label: 'Tanımlamalar', icon: 'settings', route: '/eirsaliye-tanimlamalar' },
      { id: 'ei-bildirim', label: 'Bildirim Ayarları', icon: 'bell', route: '/eirsaliye-bildirim' },
      { id: 'ei-etiketler', label: 'Etiketler', icon: 'tag', route: '/eirsaliye-etiketler' },
    ]
  },
  { id: 'gib-earsiv', label: 'GİB E-Arşiv', icon: 'database', route: '/gib-earsiv' },
  {
    id: 'tanimlamalar', label: 'Tanımlamalar', icon: 'settings',
    children: [
      { id: 'stoklar', label: 'Stoklar', icon: 'package', route: '/stoklar' },
      { id: 'musteriler', label: 'Müşteriler', icon: 'users', route: '/musteriler' },
      { id: 'mailing', label: 'Mailing Ayarları', icon: 'mail', route: '/mailing' },
    ]
  },
  {
    id: 'raporlar', label: 'Raporlar', icon: 'barChart', route: '/raporlar',
  },
  {
    id: 'canli-cari', label: 'Canlı Cari', icon: 'layers', route: '/cari',
  },
];

const adminItems = [
  { id: 'firma', label: 'Firma Bilgileri', icon: 'building', route: '/firma' },
  { id: 'kullanicilar', label: 'Kullanıcılar', icon: 'users', route: '/kullanicilar' },
  { id: 'api', label: 'API Tanımları', icon: 'key', route: '/api-tanimlari' },
  { id: 'destek', label: 'Destek Talepleri', icon: 'headphones', route: '/destek' },
];

// ── State ──
let expandedSections = {};
let isCollapsed = false;

function isRouteActive(route, currentRoute) {
  if (!route || !currentRoute) return false;
  const clean = route.replace(/^\//, '');
  const cleanCur = currentRoute.replace(/^\//, '');
  return clean === cleanCur;
}

function hasActiveChild(item, currentRoute) {
  if (item.route && isRouteActive(item.route, '/' + currentRoute)) return true;
  if (item.children) return item.children.some(c => hasActiveChild(c, currentRoute));
  return false;
}

// Auto-expand sections that contain the active route
function autoExpand(items, currentRoute) {
  items.forEach(item => {
    if (item.children && hasActiveChild(item, currentRoute)) {
      expandedSections[item.id] = true;
      autoExpand(item.children, currentRoute);
    }
  });
}

// ── Render Functions ──
function renderMenuItem(item, currentRoute, depth = 0) {
  const hasChildren = item.children && item.children.length > 0;
  const isActive = item.route && isRouteActive(item.route, '/' + currentRoute);
  const isExpanded = expandedSections[item.id] || false;
  const iconHtml = item.icon && icons[item.icon] ? `<span class="nav-item-icon">${icons[item.icon]}</span>` : (depth > 0 ? `<span class="nav-item-dot"></span>` : '');

  if (hasChildren) {
    const childrenHtml = item.children.map(c => renderMenuItem(c, currentRoute, depth + 1)).join('');
    return `
      <div class="nav-group ${isExpanded ? 'expanded' : ''}" data-depth="${depth}">
        <button class="nav-item nav-item-parent ${hasActiveChild(item, currentRoute) ? 'has-active' : ''}" data-id="${item.id}" data-depth="${depth}">
          ${iconHtml}
          <span class="nav-item-label">${item.label}</span>
          <span class="nav-item-chevron">${icons.chevron}</span>
        </button>
        <div class="nav-children" data-parent="${item.id}">
          ${childrenHtml}
        </div>
      </div>
    `;
  }

  return `
    <button class="nav-item nav-item-link ${isActive ? 'active' : ''}" data-href="${item.route}" data-depth="${depth}">
      ${iconHtml}
      <span class="nav-item-label">${item.label}</span>
    </button>
  `;
}

export function renderSidebar(currentRoute) {
  // Auto-expand sections
  autoExpand(menuItems, currentRoute);
  autoExpand(adminItems, currentRoute);

  const sidebar = document.createElement('aside');
  sidebar.className = `sidebar ${isCollapsed ? 'sidebar-collapsed' : ''}`;
  sidebar.id = 'mainSidebar';

  const menuHtml = menuItems.map(item => renderMenuItem(item, currentRoute, 0)).join('');
  const adminHtml = adminItems.map(item => renderMenuItem(item, currentRoute, 0)).join('');

  sidebar.innerHTML = `
    <div class="sidebar-brand">
      <div class="sidebar-brand-icon">SV</div>
      <div class="sidebar-brand-text">
        <h1>Sonvera 2.0</h1>
        <span>E-Fatura Platformu</span>
      </div>
      <button class="sidebar-collapse-btn" id="sidebarCollapseBtn" title="Menüyü Daralt">
        ${icons.collapse}
      </button>
    </div>

    <div class="account-switcher" id="accountSwitcher">
      <div class="account-switcher-current">
        <span class="account-dot" id="accountDot" style="background:#6366f1"></span>
        <span class="account-switcher-name" id="accountName">Hesap Seçin</span>
        <span class="account-switcher-env" id="accountEnv">TEST</span>
      </div>
      <div class="account-dropdown" id="accountDropdown"></div>
    </div>

    <nav class="sidebar-nav" id="sidebarNav">
      ${menuHtml}
      <div class="nav-section-divider"></div>
      <div class="nav-section-label">Yönetim Paneli</div>
      ${adminHtml}
    </nav>

    <div class="sidebar-footer">
      <div class="sidebar-version">© 2026 Sonvera 2.0</div>
    </div>
  `;

  // ── Event Bindings ──
  setTimeout(() => {
    // Collapse toggle
    const collapseBtn = sidebar.querySelector('#sidebarCollapseBtn');
    collapseBtn?.addEventListener('click', (e) => {
      e.stopPropagation();

      if (window.innerWidth <= 768) {
        sidebar.classList.remove('sidebar-mobile-open');
        document.getElementById('sidebarOverlay')?.classList.remove('active');
        return;
      }

      isCollapsed = !isCollapsed;
      sidebar.classList.toggle('sidebar-collapsed', isCollapsed);
      collapseBtn.innerHTML = isCollapsed ? icons.expand : icons.collapse;
    });

    // Accordion toggle
    sidebar.querySelectorAll('.nav-item-parent').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = item.dataset.id;
        expandedSections[id] = !expandedSections[id];
        const group = item.closest('.nav-group');
        group?.classList.toggle('expanded', expandedSections[id]);
      });
    });

    // Nav link clicks
    sidebar.querySelectorAll('.nav-item-link').forEach(item => {
      item.addEventListener('click', () => {
        const href = item.dataset.href;
        if (href) navigate(href);
        
        // Mobile drawer auto-close
        if (window.innerWidth <= 768) {
          sidebar.classList.remove('sidebar-mobile-open');
          document.getElementById('sidebarOverlay')?.classList.remove('active');
        }
      });
    });

    // Account switcher
    const switcher = sidebar.querySelector('#accountSwitcher');
    const dropdown = sidebar.querySelector('#accountDropdown');
    switcher?.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown?.classList.toggle('open');
    });
    document.addEventListener('click', () => {
      dropdown?.classList.remove('open');
    });
    loadAccountSwitcher(sidebar);
  }, 0);

  return sidebar;
}

async function loadAccountSwitcher(sidebar) {
  const accounts = await listAccounts();
  const activeId = getActiveAccountId();
  const active = accounts.find(a => a.id === activeId);

  if (active) {
    const dot = sidebar.querySelector('#accountDot');
    const name = sidebar.querySelector('#accountName');
    const env = sidebar.querySelector('#accountEnv');
    if (dot) dot.style.background = active.color || '#6366f1';
    if (name) name.textContent = active.name;
    if (env) {
      env.textContent = active.environment === 'live' ? 'CANLI' : 'TEST';
      env.style.background = active.environment === 'live' ? 'var(--success-bg)' : '';
      env.style.color = active.environment === 'live' ? 'var(--success)' : '';
    }
  }

  const dropdown = sidebar.querySelector('#accountDropdown');
  if (!dropdown) return;

  dropdown.innerHTML = accounts.map(acc => `
    <button class="account-dropdown-item ${acc.id === activeId ? 'active' : ''}" data-id="${acc.id}">
      <span class="account-dot" style="background:${acc.color || '#6366f1'}"></span>
      ${acc.name}
      <span class="account-switcher-env" style="${acc.environment === 'live' ? 'background:var(--success-bg);color:var(--success)' : ''}">${acc.environment === 'live' ? 'CANLI' : 'TEST'}</span>
    </button>
  `).join('') + `
    <button class="account-dropdown-item account-dropdown-add" data-action="add">
      ＋ Yeni Hesap Ekle
    </button>
  `;

  dropdown.querySelectorAll('.account-dropdown-item').forEach(item => {
    item.addEventListener('click', async (e) => {
      e.stopPropagation();
      const action = item.dataset.action;
      if (action === 'add') {
        navigate('/accounts');
      } else {
        const id = item.dataset.id;
        if (id) {
          await setActiveAccount(id);
          window.dispatchEvent(new CustomEvent('accountChanged', { detail: { accountId: id } }));
        }
      }
    });
  });
}
