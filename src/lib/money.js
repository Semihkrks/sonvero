import Decimal from 'decimal.js';

Decimal.set({ precision: 32, rounding: Decimal.ROUND_HALF_UP });
export { Decimal };

/** Explicit Turkish entry format. Machine decimals must use money(), not this parser. */
export function parseTurkishAmount(input) {
  const value = String(input ?? '').trim();
  if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(value)) {
    throw new Error('Tutarı 1.234,56 biçiminde, en fazla iki ondalık hane ile girin.');
  }
  return money(value.replaceAll('.', '').replace(',', '.'));
}

export function money(input) {
  const value = new Decimal(String(input ?? '0'));
  if (!value.isFinite() || value.abs().gte('10000000000000000')) throw new Error('Geçersiz tutar.');
  return value.toDecimalPlaces(2).toFixed(2);
}

export function positiveMoney(input) {
  const value = money(input);
  if (new Decimal(value).lte(0)) throw new Error('Tutar sıfırdan büyük olmalıdır.');
  return value;
}

export function calculateLine({ quantity, unitPrice, discountRate = 0, taxRate = 20 }) {
  const q = new Decimal(quantity), p = new Decimal(unitPrice);
  const d = new Decimal(discountRate), t = new Decimal(taxRate);
  if (![q, p, d, t].every(v => v.isFinite()) || q.lte(0) || p.lt(0) || d.lt(0) || d.gt(100) || t.lt(0) || t.gt(100)) {
    throw new Error('Miktar, fiyat, indirim veya vergi oranı geçersiz.');
  }
  const gross = q.mul(p).toDecimalPlaces(2);
  const discount = gross.mul(d).div(100).toDecimalPlaces(2);
  const net = gross.minus(discount);
  const tax = net.mul(t).div(100).toDecimalPlaces(2);
  return { gross: gross.toFixed(2), discount: discount.toFixed(2), net: net.toFixed(2), tax: tax.toFixed(2), total: net.plus(tax).toFixed(2) };
}

export function sumMoney(values) { return values.reduce((s, v) => s.plus(v ?? 0), new Decimal(0)).toFixed(2); }
export function istanbulDate(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}
/** Istanbul takvimine göre içinde bulunulan ayın son günü (YYYY-MM-DD). */
export function istanbulMonthEnd(date = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date).filter((p) => p.type !== 'literal').map((p) => [p.type, p.value]));
  const y = Number(parts.year);
  const m = Number(parts.month);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
}
/** Filtre varsayılanı: yıl başı → ay sonu (bugün değil). */
export function defaultFilterRange(date = new Date()) {
  const end = istanbulMonthEnd(date);
  return { start: `${end.slice(0, 4)}-01-01`, end };
}
