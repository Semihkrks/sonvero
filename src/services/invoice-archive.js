// Arşiv güncellemeleri atomiktir; eksik API listesi mevcut belgeleri silmez.
// Eski aylar süreli önbellekten okunur ve yeniden taranabilir.
import { getSupabase } from '../lib/supabase.js';
import { fetchAllPagesChunked, getInvoiceUuid, fmtDateParam } from './nilvera-fetcher.js';

// Daha seyrek yenilenecek geçmiş dönemlerin yaş eşiği.
const FINAL_AFTER_DAYS = 20;
const READ_BATCH = 1000;

// ── Tarih yardımcıları ──
function today0() {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}
function monthStartOf(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function monthEndOf(d) { return new Date(d.getFullYear(), d.getMonth() + 1, 0); }
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function parseDateOnly(s) {
  if (!s) return null;
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function getIssueDateStr(inv) {
  const raw = inv?.IssueDate || inv?.issueDate
    // e-İrsaliye alanları (düz veya DespatchInfo altında nested)
    || inv?.DespatchDate || inv?.DespatchInfo?.IssueDate || inv?.DespatchInfo?.DespatchDate
    || inv?.CreateDate || inv?.CreatedDate || '';
  const d = parseDateOnly(raw);
  return d ? fmtDateParam(d) : null;
}

// Ay, geçmiş dönem yenileme sıklığına uygun mu?
function isMonthFinal(mStart) {
  return addDays(monthEndOf(mStart), FINAL_AFTER_DAYS) < today0();
}

async function getUserId() {
  try {
    const sb = getSupabase();
    const { data } = await sb.auth.getUser();
    return data?.user?.id || null;
  } catch {
    return null;
  }
}

// ── Arşiv okuma: issue_date aralığındaki payload'ları getir ──
async function readArchive(userId, accountId, docType, startStr, endStr) {
  const sb = getSupabase();
  const out = [];
  let from = 0;
  // Supabase tek istekte 1000 satır döner; sayfalayarak hepsini al
  for (;;) {
    const { data, error } = await sb
      .from('invoice_archive')
      .select('payload')
      .eq('user_id', userId)
      .eq('account_id', accountId)
      .eq('doc_type', docType)
      .gte('issue_date', startStr)
      .lte('issue_date', endStr)
      .order('issue_date', { ascending: true }).order('id', { ascending: true })
      .range(from, from + READ_BATCH - 1);
    if (error) throw error;
    (data || []).forEach(r => { if (r?.payload) out.push(r.payload); });
    if (!data || data.length < READ_BATCH) break;
    from += READ_BATCH;
  }
  return out;
}

// ── Arşiv yazma: aralıktaki eski kayıtları sil, yenileri yaz ──
// Sil+yaz stratejisi Nilvera'da silinen/iptal edilen faturaların
// arşivden de düşmesini garanti eder.
async function writeArchive(userId, accountId, docType, startStr, endStr, invoices, months = []) {
  const rows = invoices.map(inv => ({ invoice_uuid: getInvoiceUuid(inv), issue_date: getIssueDateStr(inv), payload: inv }));
  if (rows.some(row => !row.invoice_uuid || !row.issue_date)) throw new Error('Eksik belge kimliği veya tarihi: arşiv değiştirilmedi.');
  const inRange = rows.filter(row => row.issue_date >= startStr && row.issue_date <= endStr);
  const { error } = await getSupabase().rpc('replace_invoice_archive', { p_account_id: accountId, p_doc_type: docType, p_start: startStr, p_end: endStr, p_invoices: inRange, p_months: months.map(fmtDateParam) });
  if (error) throw error;
}

// ── Senkron kayıtları ──
async function readSyncMonths(userId, accountId, docType, months) {
  const sb = getSupabase();
  const monthStrs = months.map(m => fmtDateParam(m));
  const { data, error } = await sb
    .from('invoice_archive_sync')
    .select('month, synced_at')
    .eq('user_id', userId)
    .eq('account_id', accountId)
    .eq('doc_type', docType)
    .in('month', monthStrs);
  if (error) throw error;
  const map = {};
  (data || []).forEach(r => { map[String(r.month).slice(0, 10)] = r.synced_at; });
  return map;
}



// Bir ay arşivden okunabilir mi?
// 1) Ay kesinleşmiş olmalı (ay sonu + 20 gün geçmiş), 2) senkron kaydı olmalı,
// 3) senkron, ayın kesinleşme anından SONRA yapılmış olmalı
//    (kesinleşmeden önce senkronlanan ayda sonradan iptal olmuş olabilir).
function isMonthArchived(mStart, syncedAtStr) {
  if (!isMonthFinal(mStart)) return false;
  if (!syncedAtStr) return false;
  const syncedAt = new Date(syncedAtStr);
  if (isNaN(syncedAt.getTime())) return false;
  return syncedAt >= addDays(monthEndOf(mStart), FINAL_AFTER_DAYS) && Date.now() - syncedAt.getTime() < 7 * 86400000;
}

/**
 * ANA FONKSİYON — Arşiv destekli akıllı fatura getirme.
 * Kesinleşmiş + arşivlenmiş aylar Supabase'den, gerisi Nilvera'dan
 * (6 ay limiti chunking ile aşılır) gelir. API'den gelen tam aylar
 * arşive yazılır; böylece arşiv kendi kendine dolar.
 *
 * @param {Function} apiFn    (account, params, options) imzalı liste ucu
 * @param {Object}   account  Nilvera hesabı (id = Supabase accounts.id)
 * @param {string}   docType  'efatura_sale' | 'efatura_purchase' | 'earsiv' | 'earsiv_gib'
 *                            | 'eirsaliye_sale' | 'eirsaliye_purchase'
 * @param {Object}   params   { StartDate, EndDate, ...API filtreleri }
 * @param {Object}   options  { signal, onProgress, stats: { failed } }
 */
export async function fetchInvoicesSmart(apiFn, account, docType, params = {}, options = {}) {
  const { StartDate, EndDate, ...rest } = params;
  const plainFetch = () => fetchAllPagesChunked(apiFn, account, params, options);

  // Tarih aralığı yoksa veya tarih dışı API filtresi varsa (Search, IsArchived vb.)
  // arşiv devre dışı: filtreli sonuçlar arşive/arşivden yazılamaz/okunamaz.
  // DateFilterType=IssueDate zararsızdır (arşiv de issue_date bazlıdır).
  const start = parseDateOnly(StartDate);
  const end = parseDateOnly(EndDate);
  const extraFilters = Object.keys(rest).filter(k => k !== 'DateFilterType');
  if (!start || !end || start > end || extraFilters.length > 0) return plainFetch();

  const userId = await getUserId();
  if (!userId || !account?.id) return plainFetch();

  try {
    // Aralıktaki ayları çıkar
    const months = [];
    for (let m = monthStartOf(start); m <= end; m = new Date(m.getFullYear(), m.getMonth() + 1, 1)) {
      months.push(m);
    }

    const syncMap = await readSyncMonths(userId, account.id, docType, months);
    const archived = months.map(m => isMonthArchived(m, syncMap[fmtDateParam(m)]));

    // Ardışık ayları segmentlere grupla: { fromArchive, months: [...] }
    const segments = [];
    months.forEach((m, i) => {
      const last = segments[segments.length - 1];
      if (last && last.fromArchive === archived[i]) last.months.push(m);
      else segments.push({ fromArchive: archived[i], months: [m] });
    });

    const endStr = fmtDateParam(end);
    const startStr = fmtDateParam(start);
    const todayStr = fmtDateParam(today0());
    const merged = [];
    const seen = new Set();
    const pushUnique = (inv) => {
      const uuid = getInvoiceUuid(inv);
      if (uuid) {
        if (seen.has(uuid)) return;
        seen.add(uuid);
      }
      merged.push(inv);
    };

    for (const seg of segments) {
      if (options.signal?.aborted) { if (options.stats) options.stats.failed = true; break; }
      const segMonthStart = seg.months[0];
      const segMonthEnd = monthEndOf(seg.months[seg.months.length - 1]);
      // İstenen pencereye kırp (görüntüleme için)
      const clipStart = fmtDateParam(segMonthStart < start ? start : segMonthStart);
      const clipEnd = fmtDateParam(segMonthEnd > end ? end : segMonthEnd);

      if (seg.fromArchive) {
        const rows = await readArchive(userId, account.id, docType, clipStart, clipEnd);
        rows.forEach(pushUnique);
      } else {
        // API'den TAM AY hizalı çek (gelecek tarih istenmez → bugünle kırp)
        const fetchStart = fmtDateParam(segMonthStart);
        const fetchEnd = fmtDateParam(segMonthEnd) > todayStr ? todayStr : fmtDateParam(segMonthEnd);
        const stats = { failed: false };
        const items = await fetchAllPagesChunked(
          apiFn, account,
          { ...rest, StartDate: fetchStart, EndDate: fetchEnd },
          { ...options, stats }
        );
        // Çağıranın stats nesnesine de hatayı yansıt (sayfalar hata UI'ı için kullanır)
        if (stats.failed && options.stats) options.stats.failed = true;

        // Görüntü: sadece istenen pencere içindekiler
        items.forEach(inv => {
          const ds = getIssueDateStr(inv);
          if (ds && (ds < startStr || ds > endStr)) return;
          pushUnique(inv);
        });

        // Arşivleme: fetch başarılıysa yaz + tam kapsanan ayları senkronla
        if (!stats.failed) {
          try {
            const fullyCovered = seg.months.filter(m => fmtDateParam(monthEndOf(m)) <= fetchEnd);
            await writeArchive(userId, account.id, docType, fetchStart, fetchEnd, items, fullyCovered);
          } catch (e) {
            console.warn('[invoice-archive] Arşive yazılamadı (görüntü etkilenmez):', e?.message || e);
          }
        }
      }
    }

    return merged;
  } catch (e) {
    // Arşiv katmanında herhangi bir sorun → salt API moduna düş
    console.warn('[invoice-archive] Arşiv devre dışı, API moduna düşüldü:', e?.message || e);
    return plainFetch();
  }
}
