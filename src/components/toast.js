// ══════════════════════════════════════════
// Toast Notification System
// ══════════════════════════════════════════

const ICONS = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };

export function showToast(message, type = 'info', durationOrOptions = 4000) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  let duration = 4000;
  let actionLabel = '';
  let onAction = null;

  if (typeof durationOrOptions === 'number') {
    duration = durationOrOptions;
  } else if (durationOrOptions && typeof durationOrOptions === 'object') {
    duration = Number(durationOrOptions.duration) || 4000;
    actionLabel = durationOrOptions.actionLabel || '';
    onAction = typeof durationOrOptions.onAction === 'function' ? durationOrOptions.onAction : null;
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span>${ICONS[type] || ''}</span>
    <span class="toast-message">${message}</span>
    ${actionLabel ? `<button class="toast-action">${actionLabel}</button>` : ''}
    <button class="toast-close">✕</button>
  `;

  container.appendChild(toast);

  const actionBtn = toast.querySelector('.toast-action');
  actionBtn?.addEventListener('click', () => {
    try {
      onAction?.();
    } finally {
      removeToast(toast);
    }
  });

  const close = toast.querySelector('.toast-close');
  close?.addEventListener('click', () => removeToast(toast));

  setTimeout(() => removeToast(toast), duration);
}

function removeToast(toast) {
  toast.style.opacity = '0';
  toast.style.transform = 'translateY(-10px)';
  setTimeout(() => toast.remove(), 250);
}
