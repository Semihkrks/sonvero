// ══════════════════════════════════════════
// Toast Notification System
// ══════════════════════════════════════════

const svg = (body) => `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

const ICONS = {
  success: svg('<path d="M20 6 9 17l-5-5"/>'),
  error: svg('<path d="M18 6 6 18M6 6l12 12"/>'),
  warning: svg('<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>'),
  info: svg('<circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/>'),
  invoice: svg('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M9 13h6M9 17h4"/>'),
};
const TITLES = { success: 'Tamamlandı', error: 'Hata', warning: 'Uyarı', info: 'Bilgi' };
const MAX_VISIBLE = 4;

/**
 * @param {string} message
 * @param {'success'|'error'|'warning'|'info'} [type]
 * @param {number|{duration?:number, actionLabel?:string, onAction?:()=>void, title?:string, icon?:'invoice'}} [durationOrOptions]
 */
export function showToast(message, type = 'info', durationOrOptions = 4000) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  let duration = 4000;
  let actionLabel = '';
  let onAction = null;
  let title = '';
  let icon = '';

  if (typeof durationOrOptions === 'number') {
    duration = durationOrOptions;
  } else if (durationOrOptions && typeof durationOrOptions === 'object') {
    duration = Number(durationOrOptions.duration) || 4000;
    actionLabel = durationOrOptions.actionLabel || '';
    onAction = typeof durationOrOptions.onAction === 'function' ? durationOrOptions.onAction : null;
    title = durationOrOptions.title || '';
    icon = durationOrOptions.icon || '';
  }
  if (type === 'error' && duration < 6000) duration = 6000;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', type === 'error' || type === 'warning' ? 'alert' : 'status');
  toast.style.setProperty('--toast-duration', `${duration}ms`);
  toast.innerHTML = `
    <span class="toast-icon">${ICONS[icon] || ICONS[type] || ICONS.info}</span>
    <div class="toast-body">
      <strong class="toast-title"></strong>
      <span class="toast-message"></span>
    </div>
    ${actionLabel ? '<button type="button" class="toast-action"></button>' : ''}
    <button type="button" class="toast-close" aria-label="Kapat">${svg('<path d="M18 6 6 18M6 6l12 12"/>')}</button>
    <span class="toast-progress" aria-hidden="true"></span>
  `;
  toast.querySelector('.toast-title').textContent = title || TITLES[type] || TITLES.info;
  toast.querySelector('.toast-message').textContent = String(message ?? '');
  const actionBtn = toast.querySelector('.toast-action');
  if (actionBtn) actionBtn.textContent = actionLabel;

  container.appendChild(toast);
  while (container.children.length > MAX_VISIBLE) container.firstElementChild?.remove();

  let remaining = duration;
  let startedAt = Date.now();
  let timer = setTimeout(() => removeToast(toast), remaining);
  const pause = () => { clearTimeout(timer); remaining -= Date.now() - startedAt; toast.classList.add('is-paused'); };
  const resume = () => { startedAt = Date.now(); toast.classList.remove('is-paused'); timer = setTimeout(() => removeToast(toast), Math.max(800, remaining)); };
  toast.addEventListener('mouseenter', pause);
  toast.addEventListener('mouseleave', resume);

  actionBtn?.addEventListener('click', () => {
    try {
      onAction?.();
    } finally {
      clearTimeout(timer);
      removeToast(toast);
    }
  });

  toast.querySelector('.toast-close')?.addEventListener('click', () => { clearTimeout(timer); removeToast(toast); });
}

function removeToast(toast) {
  if (!toast.isConnected || toast.classList.contains('is-leaving')) return;
  toast.classList.add('is-leaving');
  setTimeout(() => toast.remove(), 220);
}
