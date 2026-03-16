// ══════════════════════════════════════════
// Modal Component
// ══════════════════════════════════════════

export function showModal({ title, body, footer, size = '', onClose }) {
  const container = document.getElementById('modal-container');
  if (!container) return null;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal ${size ? 'modal-' + size : ''}">
      <div class="modal-header">
        <h2>${title}</h2>
        <button class="modal-close">✕</button>
      </div>
      <div class="modal-body"></div>
      ${footer ? '<div class="modal-footer"></div>' : ''}
    </div>
  `;

  const modalBody = overlay.querySelector('.modal-body');
  if (typeof body === 'string') {
    modalBody.innerHTML = body;
  } else if (body instanceof HTMLElement) {
    modalBody.appendChild(body);
  }

  if (footer) {
    const modalFooter = overlay.querySelector('.modal-footer');
    if (typeof footer === 'string') {
      modalFooter.innerHTML = footer;
    } else if (footer instanceof HTMLElement) {
      modalFooter.appendChild(footer);
    }
  }

  const close = () => {
    overlay.style.opacity = '0';
    setTimeout(() => {
      overlay.remove();
      onClose?.();
    }, 200);
  };

  overlay.querySelector('.modal-close')?.addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  container.appendChild(overlay);
  return { overlay, close };
}

export function closeAllModals() {
  const container = document.getElementById('modal-container');
  if (container) container.innerHTML = '';
}
