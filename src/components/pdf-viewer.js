import { showModal } from './modal.js';
import { escapeHtml } from '../lib/html.js';
import { redactNilveraFooter, base64ToBytes, getPdfjs } from '../services/pdf-redact.js';

const icon = {
  print: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>',
  external: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>',
  download: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
  minus: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  plus: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  alert: '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
};

const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const safeFileName = value => String(value || 'Fatura').replace(/[\\/:*?"<>|\s]+/g, '_').slice(0, 80);

const metaValue = value => (value && value !== '—' ? String(value) : '');

export function pdfMetaAttrs({ party, number, date, amount } = {}) {
  return `data-party="${escapeHtml(metaValue(party))}" data-number="${escapeHtml(metaValue(number))}" data-date="${escapeHtml(metaValue(date))}" data-amount="${escapeHtml(metaValue(amount))}"`;
}

export function readPdfMeta(el) {
  const { party = '', number = '', date = '', amount = '' } = el?.dataset || {};
  return { party, number, date, amount };
}

function findFileContent(data) {
  if (!data) return null;
  if (typeof data === 'string') return data.trim() || null;
  if (data instanceof Uint8Array) return data;
  for (const key of ['File', 'String', 'Content', 'Data']) {
    if (typeof data[key] === 'string' && data[key].trim()) return data[key].trim();
  }
  const values = Array.isArray(data) ? data : (typeof data === 'object' ? Object.values(data) : []);
  for (const value of values) {
    const found = findFileContent(value);
    if (found) return found;
  }
  return null;
}

async function toPdfBytes(res) {
  if (!res?.success || !res.data) throw new Error(res?.error || 'PDF alınamadı');
  let content = findFileContent(res.data);
  if (!content) throw new Error('PDF içeriği boş');
  if (content instanceof Uint8Array) return content;
  content = content.replace(/^data:application\/pdf;base64,/i, '').replace(/#.*$/, '');
  if (/^[a-zA-Z0-9+/=\s]+$/.test(content)) return redactNilveraFooter(base64ToBytes(content));
  return new TextEncoder().encode(content);
}

/**
 * `load` resolves to an API result ({ success, data, error }); `{ success: true, html }` renders a sandboxed HTML preview instead.
 * @param {{
 *   load: () => Promise<any>,
 *   title?: string,
 *   filePrefix?: string,
 *   meta?: { party?: string, number?: string, date?: string, amount?: string, direction?: 'incoming'|'outgoing', badge?: string, fallbackTitle?: string },
 *   actions?: Array<{ label: string, icon?: string, onClick: (ctx: { close: () => void }) => void }>,
 * }} options
 */
export function openPdfViewer({ load, meta = {}, title = 'Fatura Önizleme', filePrefix = 'Fatura', actions = [] }) {
  let blobUrl = '';
  let pdfDoc = null;
  let zoom = 1;
  let renderToken = 0;
  let disposed = false;
  const fileName = `${filePrefix}_${safeFileName(meta.number)}.pdf`;
  const direction = meta.direction === 'incoming' ? 'incoming' : 'outgoing';
  const badge = meta.badge || (direction === 'incoming' ? 'Gelen' : 'Giden');

  const root = document.createElement('div');
  root.className = 'pdfv';
  root.innerHTML = `
    <div class="pdfv-bar">
      <div class="pdfv-meta">
        <span class="pdfv-kind is-${direction}">${escapeHtml(badge)}</span>
        <div class="pdfv-meta-text">
          <strong class="pdfv-party" title="${escapeHtml(meta.party || '')}">${escapeHtml(meta.party || meta.fallbackTitle || 'E-Fatura')}</strong>
          <span class="pdfv-sub">${[meta.number, meta.date].filter(Boolean).map(escapeHtml).join(' · ')}</span>
        </div>
        ${meta.amount ? `<span class="pdfv-amount">${escapeHtml(meta.amount)}</span>` : ''}
      </div>
      <div class="pdfv-actions">
        ${actions.map((action, i) => `<button type="button" class="btn btn-secondary btn-sm" data-extra="${i}">${action.icon || ''}<span>${escapeHtml(action.label)}</span></button>`).join('')}
        <div class="pdfv-zoom" role="group" aria-label="Yakınlaştırma">
          <button type="button" data-act="zoom-out" aria-label="Uzaklaştır" disabled>${icon.minus}</button>
          <span class="pdfv-zoom-val">100%</span>
          <button type="button" data-act="zoom-in" aria-label="Yakınlaştır" disabled>${icon.plus}</button>
        </div>
        <button type="button" class="btn btn-secondary btn-sm" data-act="print" disabled>${icon.print}<span>Yazdır</span></button>
        <button type="button" class="btn btn-secondary btn-sm" data-act="open" disabled>${icon.external}<span>Yeni Sekme</span></button>
        <button type="button" class="btn btn-primary btn-sm" data-act="download" disabled>${icon.download}<span>İndir</span></button>
      </div>
    </div>
    <div class="pdfv-stage" aria-live="polite"></div>
  `;
  const stage = root.querySelector('.pdfv-stage');
  const zoomLabel = root.querySelector('.pdfv-zoom-val');
  const buttons = [...root.querySelectorAll('[data-act]')];

  const modal = showModal({
    title,
    body: root,
    size: 'pdf',
    onClose: () => {
      disposed = true;
      renderToken++;
      window.removeEventListener('resize', onResize);
      pdfDoc?.destroy?.();
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    },
  });

  const syncControls = ready => {
    buttons.forEach(btn => { btn.disabled = !ready; });
    if (!ready) return;
    root.querySelector('[data-act=zoom-out]').disabled = zoom <= ZOOM_STEPS[0];
    root.querySelector('[data-act=zoom-in]').disabled = zoom >= ZOOM_STEPS.at(-1);
    zoomLabel.textContent = `${Math.round(zoom * 100)}%`;
  };

  const renderLoading = () => {
    syncControls(false);
    stage.innerHTML = `
      <div class="pdfv-loading">
        <div class="pdfv-sheet" aria-hidden="true">
          <i style="width:42%"></i><i style="width:28%"></i><i class="gap"></i>
          <i></i><i></i><i style="width:86%"></i><i class="gap"></i>
          <i></i><i style="width:64%"></i><i style="width:74%"></i>
        </div>
        <span class="pdfv-hint">PDF hazırlanıyor…</span>
      </div>`;
  };

  const renderError = message => {
    syncControls(false);
    stage.innerHTML = `
      <div class="pdfv-state">
        <span class="pdfv-state-icon">${icon.alert}</span>
        <h3>Önizleme yüklenemedi</h3>
        <p>${escapeHtml(message)}</p>
        <button type="button" class="btn btn-primary btn-sm" data-retry>Tekrar Dene</button>
      </div>`;
    stage.querySelector('[data-retry]')?.addEventListener('click', run);
  };

  async function renderPages() {
    const token = ++renderToken;
    const scroller = stage.querySelector('.pdfv-pages') || Object.assign(document.createElement('div'), { className: 'pdfv-pages' });
    if (!scroller.isConnected) { stage.replaceChildren(scroller); }
    const ratio = scroller.scrollHeight ? scroller.scrollTop / scroller.scrollHeight : 0;
    const available = Math.max(280, scroller.clientWidth - 32);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const frag = document.createDocumentFragment();
    const jobs = [];
    for (let n = 1; n <= pdfDoc.numPages; n++) {
      const page = await pdfDoc.getPage(n);
      if (token !== renderToken) return;
      const base = page.getViewport({ scale: 1 });
      const fit = Math.min(available / base.width, 1.5);
      const viewport = page.getViewport({ scale: fit * zoom });
      const canvas = document.createElement('canvas');
      canvas.className = 'pdfv-page';
      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;
      canvas.setAttribute('aria-label', `Sayfa ${n}`);
      frag.append(canvas);
      jobs.push(page.render({ canvasContext: canvas.getContext('2d'), viewport, transform: dpr === 1 ? null : [dpr, 0, 0, dpr, 0, 0] }).promise);
    }
    scroller.replaceChildren(frag);
    scroller.scrollTop = ratio * scroller.scrollHeight;
    await Promise.allSettled(jobs);
  }

  let resizeTimer = 0;
  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { if (pdfDoc && !disposed) void renderPages(); }, 180);
  }

  function renderHtml(html) {
    const frame = document.createElement('iframe');
    frame.className = 'pdfv-html';
    frame.setAttribute('sandbox', '');
    frame.setAttribute('referrerpolicy', 'no-referrer');
    frame.title = title;
    frame.srcdoc = html;
    stage.replaceChildren(frame);
  }

  async function run() {
    renderLoading();
    try {
      const res = await load();
      if (disposed) return;
      if (res?.success && typeof res.html === 'string') {
        renderHtml(res.html);
        return;
      }
      const bytes = await toPdfBytes(res);
      if (disposed) return;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      blobUrl = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
      const pdfjs = await getPdfjs();
      pdfDoc?.destroy?.();
      pdfDoc = await pdfjs.getDocument({ data: bytes.slice() }).promise;
      if (disposed) return;
      stage.replaceChildren();
      await renderPages();
      syncControls(true);
    } catch (error) {
      if (!disposed) renderError(error?.message || 'PDF açılamadı');
    }
  }

  function printPdf() {
    const frame = Object.assign(document.createElement('iframe'), { src: blobUrl, title: 'Yazdır' });
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
    frame.onload = () => {
      try { frame.contentWindow.focus(); frame.contentWindow.print(); }
      catch { window.open(blobUrl, '_blank', 'noopener'); }
      setTimeout(() => frame.remove(), 60000);
    };
    document.body.append(frame);
  }

  root.querySelector('.pdfv-actions').addEventListener('click', event => {
    const extra = event.target.closest('[data-extra]');
    if (extra) {
      actions[Number(extra.dataset.extra)]?.onClick({ close: () => modal?.close?.() });
      return;
    }
    const btn = event.target.closest('[data-act]');
    if (!btn || btn.disabled || !blobUrl) return;
    const act = btn.dataset.act;
    if (act === 'zoom-in' || act === 'zoom-out') {
      const idx = ZOOM_STEPS.indexOf(zoom) + (act === 'zoom-in' ? 1 : -1);
      zoom = ZOOM_STEPS[Math.max(0, Math.min(ZOOM_STEPS.length - 1, idx))];
      syncControls(true);
      void renderPages();
    } else if (act === 'download') {
      const link = Object.assign(document.createElement('a'), { href: blobUrl, download: fileName });
      document.body.append(link); link.click(); link.remove();
    } else if (act === 'open') {
      window.open(blobUrl, '_blank', 'noopener');
    } else if (act === 'print') {
      printPdf();
    }
  });

  window.addEventListener('resize', onResize);
  void run();
  return modal;
}
