// Fatura/irsaliye durum kodu → kullanıcı metni + ton. Tek kaynak: giden, gelen ve e-Arşiv listeleri.
// Görsel: .sv-status (varsayılan mavi = bilgi), .succeeded (yeşil), .failed (kırmızı),
// .processing (turuncu = gerçekten bekleyen işlem), .neutral (bilinmeyen; CSS yoksa bilgi mavisi).
import { escapeHtml } from './html.js';

const STATUS_MAP = {
  // Alıcı red
  rejected: ['Reddedildi', 'danger'],
  red: ['Reddedildi', 'danger'],
  reddedildi: ['Reddedildi', 'danger'],
  rejectall: ['Reddedildi', 'danger'],
  '2005': ['Reddedildi', 'danger'],
  // Alıcı kabul
  documentansweredautomatically: ['Fatura Otomatik Onaylandı', 'success'],
  accepted: ['Kabul Edildi', 'success'],
  approved: ['Fatura Onaylandı', 'success'],
  kabul: ['Kabul Edildi', 'success'],
  kabul_edildi: ['Kabul Edildi', 'success'],
  acceptall: ['Kabul Edildi', 'success'],
  '2004': ['Kabul Edildi', 'success'],
  // GİB/zarf durumu
  succeed: ['Alıcıya İletildi', 'info'],
  success: ['Başarılı', 'success'],
  basarili: ['Başarılı', 'success'],
  // Bekliyor / iletimde
  waiting: ['İşlem Bekliyor', 'warning'],
  bekleyen: ['Bekliyor', 'warning'],
  // Diğer
  cancelled: ['İptal Edildi', 'danger'],
  sent: ['Gönderildi', 'info'],
};

const TONE_CLASS = {
  success: 'succeeded',
  danger: 'failed',
  warning: 'processing',
  info: 'info',
  default: 'neutral',
};

/** { text, tone } — tone: success | danger | warning | info | default */
export function resolveStatus(code, { detail = '' } = {}) {
  const hit = STATUS_MAP[String(code ?? '').toLowerCase()];
  if (hit) return { text: hit[0], tone: hit[1] };
  return { text: detail || code || '—', tone: 'default' };
}

/** Tek satırlık durum rozeti. detail: haritada olmayan kodlar için gösterilecek açıklama. */
export function statusBadge(code, options = {}) {
  const { text, tone } = resolveStatus(code, options);
  const safe = escapeHtml(text);
  return `<span class="sv-status ${TONE_CLASS[tone] || 'neutral'}" title="${safe}" style="max-width:160px"><span style="min-width:0;overflow:hidden;text-overflow:ellipsis">${safe}</span></span>`;
}

/** Durum noktası rengi için CSS değişkeni (var(--success|--danger|--warning|--info|--text-muted)). */
export function toneColorVar(tone) {
  return { success: 'var(--success)', danger: 'var(--danger)', warning: 'var(--warning)', info: 'var(--info)' }[tone] || 'var(--text-muted)';
}
