// Ortak sunum biçimlendiricileri (tr-TR). Hesaplama için değil, yalnız görüntü içindir;
// para hesapları src/lib/money.js üzerinden yapılır.

/** ₺1.234,56 — boş/null değerde "—". Geçersiz para biriminde "tutar KOD" döner. */
export function fmtCur(amount, currency = 'TRY') {
  if (!amount && amount !== 0) return '—';
  try {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: currency || 'TRY' }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

/** 31.12.2026 — boş değerde "—". */
export function fmtDate(value) {
  if (!value) return '—';
  try { return new Date(value).toLocaleDateString('tr-TR'); } catch { return String(value); }
}

/** 14:05 — boş değerde "". */
export function fmtTime(value) {
  if (!value) return '';
  try { return new Date(value).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }); } catch { return ''; }
}

/** 31.12.2026 14:05 — boş değerde "—". */
export function fmtDateTime(value) {
  if (!value) return '—';
  try {
    const dt = new Date(value);
    return `${dt.toLocaleDateString('tr-TR')} ${dt.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`;
  } catch { return String(value); }
}

/**
 * Liste tablolarındaki tarih hücresi: tarih tek satırda, saat <small>, isteğe bağlı ikincil satır
 * (ör. zarf tarihi). Değerler escape edilmiş metin olarak döner.
 */
export function dateCellHtml(value, { secondary = '' } = {}) {
  if (!value) return '<span style="color:var(--text-muted)">—</span>';
  const time = fmtTime(value);
  const second = secondary
    ? `<div style="font-size:11px;color:var(--text-muted);white-space:nowrap">${secondary}</div>`
    : '';
  return `<div style="white-space:nowrap">${fmtDate(value)}${time ? ` <small style="color:var(--text-muted)">${time}</small>` : ''}</div>${second}`;
}

const SR_ONLY = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0';

/** Ekran okuyucuya özel metin (görsel olarak gizli). */
export function srOnly(text) {
  return `<span style="${SR_ONLY}">${text}</span>`;
}

/**
 * Liste yüklenirken tablo gövdesi: 6 iskelet satırı (.sv-skeleton). İlk satır ekran okuyucuya
 * yükleme metnini duyurur; iskeletler aria-hidden.
 */
export function skeletonRowsHtml(colspan, { rows = 6, label = 'Yükleniyor…' } = {}) {
  const widths = [92, 78, 86, 70, 88, 74];
  return Array.from({ length: rows }, (_, i) => `<tr class="sv-skeleton-row"${i ? ' aria-hidden="true"' : ''}><td colspan="${colspan}" style="padding:14px 16px">${i ? '' : `<span role="status">${srOnly(label)}</span>`}<div aria-hidden="true" style="width:100%"><div class="sv-skeleton" style="height:16px;width:${widths[i % widths.length]}%"></div><div class="sv-skeleton" style="height:10px;width:${widths[(i + 3) % widths.length] / 2}%;margin-top:8px;opacity:.6"></div></div></td></tr>`).join('');
}

/** Satır seçim kutusu: <label> ile sarılı (44px hedef CSS'te), erişilebilir adlı. */
export function rowCheckboxHtml(attrs, name) {
  return `<label class="sv-row-check" style="display:inline-flex;align-items:center;justify-content:center;min-width:24px;min-height:24px;cursor:pointer"><input type="checkbox" ${attrs} aria-label="${name}" /></label>`;
}
