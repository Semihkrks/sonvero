// ══════════════════════════════════════════
// Fatura Arşivi — Supabase destekli akıllı veri katmanı
//
// Kural: Fatura kesildikten sonra iptal/silme en fazla ~1 ay içinde
// yapılabilir. Bu yüzden "ay sonu + 35 gün" geçmiş aylar KESİNLEŞMİŞ
// sayılır → bir kez API'den çekilip arşive yazıldıysa artık hep
// arşivden okunur (hızlı + Nilvera 6 ay limitinden bağımsız).
// Son ~35 günü kapsayan aylar HER ZAMAN API'den taze çekilir ve
// arşivdeki kopyaları güncellenir (silinen fatura arşivden de düşer).
//
// Supabase erişilemezse sessizce salt-API (chunked) moduna düşer.
// ══════════════════════════════════════════
import { getSupabase } from '../lib/supabase.js';
import { fetchAllPagesChunked, getInvoiceUuid, fmtDateParam } from './nilvera-fetcher.js';

// Kesinleşme penceresi: ay sonundan sonra bu kadar gün geçtiyse ay artık değişmez
const FINAL_AFTER_DAYS = 35;
const INSERT_BATCH = 400;
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
  const raw = inv?.IssueDate || inv?.issueDate || inv?.CreateDate || inv?.CreatedDate || '';
  const d = parseDateOnly(raw);
  return d ? fmtDateParam(d) : null;
}

// Ay kesinleşmiş mi? (ay sonu + 35 gün bugünden önce mi)
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
      .order('issue_date', { ascending: true })
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
async function writeArchive(userId, accountId, docType, startStr, endStr, invoices) {
  const sb = getSupabase();

  const { error: delErr } = await sb
    .from('invoice_archive')
    .delete()
    .eq('user_id', userId)
    .eq('account_id', accountId)
    .eq('doc_type', docType)
    .gte('issue_date', startStr)
    .lte('issue_date', endStr);
  if (delErr) throw delErr;

  // Aynı UUID bir dilimde iki kez gelirse tekilleştir (unique constraint koruması)
  const rows = [];
  const seen = new Set();
  for (const inv of invoices) {
    const uuid = getInvoiceUuid(inv);
    const issueDate = getIssueDateStr(inv);
    if (!uuid || !issueDate) continue;             // yerleştirilemeyen kayıt arşivlenmez
    if (issueDate < startStr || issueDate > endStr) continue; // sadece silinen aralığa yaz
    if (seen.has(uuid)) continue;
    seen.add(uuid);
    rows.push({
      user_id: userId,
      account_id: accountId,
      doc_type: docType,
      invoice_uuid: uuid,
      issue_date: issueDate,
      payload: inv,
      updated_at: new Date().toISOString()
    });
  }

  for (let i = 0; i < rows.length; i += INSERT_BATCH) {
    const batch = rows.slice(i, i + INSERT_BATCH);
    const { error } = await sb
      .from('invoice_archive')
      .upsert(batch, { onConflict: 'account_id,doc_type,invoice_uuid' });
    if (error) throw error;
  }
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

async function markMonthsSynced(userId, accountId, docType, months) {
  if (months.length === 0) return;
  const sb = getSupabase();
  const rows = months.map(m => ({
    user_id: userId,
    account_id: accountId,
    doc_type: docType,
    month: fmtDateParam(m),
    synced_at: new Date().toISOString()
  }));
  const { error } = await sb
    .from('invoice_archive_sync')
    .upsert(rows, { onConflict: 'account_id,doc_type,month' });
  if (error) throw error;
}

// Bir ay arşivden okunabilir mi?
// 1) Ay kesinleşmiş olmalı, 2) senkron kaydı olmalı,
// 3) senkron, ayın kesinleşme anından SONRA yapılmış olmalı
//    (kesinleşmeden önce senkronlanan ayda sonradan iptal olmuş olabilir).
function isMonthArchived(mStart, syncedAtStr) {
  if (!isMonthFinal(mStart)) return false;
  if (!syncedAtStr) return false;
  const syncedAt = new Date(syncedAtStr);
  if (isNaN(syncedAt.getTime())) return false;
  return syncedAt >= addDays(monthEndOf(mStart), FINAL_AFTER_DAYS);
}

/**
 * ANA FONKSİYON — Arşiv destekli akıllı fatura getirme.
 * Kesinleşmiş + arşivlenmiş aylar Supabase'den, gerisi Nilvera'dan
 * (6 ay limiti chunking ile aşılır) gelir. API'den gelen tam aylar
 * arşive yazılır; böylece arşiv kendi kendine dolar.
 *
 * @param {Function} apiFn    (account, params, options) imzalı liste ucu
 * @param {Object}   account  Nilvera hesabı (id = Supabase accounts.id)
 * @param {string}   docType  'efatura_sale' | 'efatura_purchase' | 'earsiv'
 * @param {Object}   params   { StartDate, EndDate, ...API filtreleri }
 * @param {Object}   options  { signal, onProgress }
 */
export async function fetchInvoicesSmart(apiFn, account, docType, params = {}, options = {}) {
  const { StartDate, EndDate, ...rest } = params;
  const plainFetch = () => fetchAllPagesChunked(apiFn, account, params, options);

  // Tarih aralığı yoksa veya API-tarafı arama filtresi varsa arşiv devre dışı
  const start = parseDateOnly(StartDate);
  const end = parseDateOnly(EndDate);
  if (!start || !end || start > end || rest.Search) return plainFetch();

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
      if (options.signal?.aborted) break;
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

        // Görüntü: sadece istenen pencere içindekiler
        items.forEach(inv => {
          const ds = getIssueDateStr(inv);
          if (ds && (ds < startStr || ds > endStr)) return;
          pushUnique(inv);
        });

        // Arşivleme: fetch başarılıysa yaz + tam kapsanan ayları senkronla
        if (!stats.failed) {
          try {
            await writeArchive(userId, account.id, docType, fetchStart, fetchEnd, items);
            const fullyCovered = seg.months.filter(m => fmtDateParam(monthEndOf(m)) <= fetchEnd);
            await markMonthsSynced(userId, account.id, docType, fullyCovered);
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
