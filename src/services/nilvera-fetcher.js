// ══════════════════════════════════════════
// Nilvera Fetcher — 6 Ay Limiti Aşan Merkezi Veri Çekici
// Nilvera API tek istekte en fazla ~6 aylık tarih aralığı kabul eder.
// Bu servis aralığı güvenli dilimlere böler, her dilimi sayfa sayfa çeker,
// UUID bazında tekilleştirip birleştirir. Tüm sayfalar bunu kullanır.
// ══════════════════════════════════════════

// 6 ayın güvenli altı: dilim başına maksimum gün
export const CHUNK_DAYS = 170;

// ── Yardımcılar ──
function toDateOnly(value) {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function fmtDateParam(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function extractItems(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.Content)) return data.Content;
  if (Array.isArray(data.Items)) return data.Items;
  if (Array.isArray(data.items)) return data.items;
  if (typeof data === 'object') {
    for (const key of Object.keys(data)) {
      if (Array.isArray(data[key]) && key !== 'Errors') return data[key];
    }
  }
  return [];
}

export function getInvoiceUuid(inv) {
  return inv?.UUID || inv?.uuid || inv?.InvoiceUUID || inv?.invoiceUUID || inv?.Uuid
    // e-İrsaliye liste yanıtlarında UUID nested gelebilir
    || inv?.DespatchInfo?.UUID || inv?.DespatchInfo?.Uuid || '';
}

function dedupeKey(inv) {
  const uuid = getInvoiceUuid(inv);
  if (uuid) return `u:${uuid}`;
  const no = inv?.InvoiceNumber || inv?.invoiceNumber || '';
  const dt = inv?.IssueDate || inv?.issueDate || '';
  if (no) return `n:${no}|${dt}`;
  return ''; // tekilleştirilemez — olduğu gibi al
}

/**
 * [start, end] aralığını en fazla chunkDays günlük dilimlere böler.
 * Dönen dilimler ardışıktır ve tüm aralığı kapsar (YYYY-MM-DD string).
 */
export function splitDateRange(startStr, endStr, chunkDays = CHUNK_DAYS) {
  const start = toDateOnly(startStr);
  const end = toDateOnly(endStr);
  if (!start || !end || start > end) return [{ start: startStr, end: endStr }];

  const chunks = [];
  let cursor = start;
  while (cursor <= end) {
    const chunkEnd = addDays(cursor, chunkDays - 1);
    chunks.push({
      start: fmtDateParam(cursor),
      end: fmtDateParam(chunkEnd > end ? end : chunkEnd)
    });
    cursor = addDays(chunkEnd, 1);
  }
  return chunks;
}

/**
 * Tek bir tarih dilimini sayfa sayfa çeker.
 * apiFn imzası: (account, params, options) → { success, data }
 */
async function fetchPagesForChunk(apiFn, account, params, options = {}) {
  const { signal, pageSize = 100, maxPages = 30, stats } = options;
  const items = [];
  let pg = 1, totalPages = 1;
  do {
    if (signal?.aborted) { if (stats) stats.failed = true; break; }
    const res = await apiFn(account, { ...params, Page: pg, PageSize: pageSize }, { signal });
    if (!res?.success) { if (stats) stats.failed = true; break; }
    items.push(...extractItems(res.data));
    totalPages = res.data?.TotalPages || 1;
    pg++;
  } while (pg <= totalPages && pg <= maxPages);
  return items;
}

/**
 * ANA FONKSİYON — Tarih aralığı 6 ayı aşsa bile tüm veriyi getirir.
 *
 * @param {Function} apiFn     (account, params, options) imzalı liste ucu
 *                             (örn. EInvoiceWithAccount.listSales)
 * @param {Object}   account   Nilvera hesabı
 * @param {Object}   baseParams { StartDate, EndDate, ...diğer filtreler }
 * @param {Object}   options   { signal, onProgress(done,total), pageSize, maxPages,
 *                               stats: { failed } — herhangi bir dilim/sayfa hata verirse true }
 * @returns {Promise<Array>}   UUID bazında tekilleştirilmiş fatura listesi
 */
export async function fetchAllPagesChunked(apiFn, account, baseParams = {}, options = {}) {
  const { StartDate, EndDate, ...rest } = baseParams;
  const { signal, onProgress, stats } = options;

  // Tarih yoksa tek istek grubu olarak davran
  let chunks = (StartDate && EndDate)
    ? splitDateRange(StartDate, EndDate)
    : [{ start: StartDate, end: EndDate }];

  // Tek dilime sığıyorsa orijinal parametre formatına dokunma
  // (bazı sayfalar 'YYYY-MM-DDT00:00:00' gibi saatli format yollar)
  if (chunks.length === 1) chunks = [{ start: StartDate, end: EndDate }];

  const seen = new Set();
  const merged = [];

  for (let i = 0; i < chunks.length; i++) {
    if (signal?.aborted) { if (stats) stats.failed = true; break; }
    const c = chunks[i];
    const params = { ...rest };
    if (c.start) params.StartDate = c.start;
    if (c.end) params.EndDate = c.end;

    const items = await fetchPagesForChunk(apiFn, account, params, options);
    for (const inv of items) {
      const key = dedupeKey(inv);
      if (key) {
        if (seen.has(key)) continue;
        seen.add(key);
      }
      merged.push(inv);
    }
    if (typeof onProgress === 'function') {
      try { onProgress(i + 1, chunks.length); } catch { /* no-op */ }
    }
  }

  return merged;
}
