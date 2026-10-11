import { getSupabase } from '../lib/supabase.js';
import { positiveMoney } from '../lib/money.js';
import { completeIntent, fingerprint, operationIntent, requireOnline, singleFlight, stableJson } from '../lib/operations.js';
const versions = new Map();
export class CollectionCommandError extends Error {
  constructor(message, uncertain = false) { super(message); this.uncertain = uncertain; }
}
async function userId() {
  const { data } = await getSupabase().auth.getSession();
  if (!data?.session?.user?.id) throw new Error('Oturumunuz sona erdi. Yeniden giriş yapın.');
  return data.session.user.id;
}
export async function listCollections({ accountId, startDate = '', endDate = '', searchText = '', includeCancelled = false } = {}) {
  if (!accountId) return [];
  const user = await userId(), rows = [];
  for (let from = 0; ; from += 1000) {
    let query = getSupabase().from('customer_collections').select('*').eq('user_id', user).eq('account_id', accountId)
      .order('date').order('created_at').order('id').range(from, from + 999);
    if (!includeCancelled) query = query.is('cancelled_at', null);
    if (startDate) query = query.gte('date', startDate);
    if (endDate) query = query.lte('date', endDate);
    const { data, error } = await query;
    if (error) throw new Error(databaseMessage(error));
    for (const row of data || []) versions.set(accountId + ':' + row.id, row.version);
    rows.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  const search = searchText.toLocaleLowerCase('tr-TR').trim();
  return search ? rows.filter(row => [row.customer_key, row.customer_name, row.customer_tax_no].some(value => String(value || '').toLocaleLowerCase('tr-TR').includes(search))) : rows;
}
function databaseMessage(error) {
  if (['PGRST202','42703','42883'].includes(error.code)) return 'Güvenli veri katmanı henüz kurulmamış. Veritabanı geçişi uygulanmalı; kayıt gönderilmedi.';
  if (error.code === '23505') return 'Bu banka işlemi veya dekont satırı daha önce kaydedilmiş.';
  return error.message || 'İşlem tamamlanamadı.';
}
function command(accountId, action, payload, suppliedKey) {
  const identity = accountId + ':' + action + ':' + (suppliedKey || stableJson(payload));
  return singleFlight('collection:' + identity, async () => {
    requireOnline();
    const user = await userId();
    const signature = await fingerprint(stableJson(payload));
    const scope = user + ':collection:' + accountId + ':' + action + ':' + (suppliedKey || payload.id || payload.customer_key);
    const key = suppliedKey || operationIntent(scope, signature);
    const { data, error } = await getSupabase().rpc('collection_command', { p_account_id: accountId, p_key: key, p_action: action, p_record: payload });
    if (error) {
      const uncertain = !error.code || ['PGRST000','PGRST001','PGRST002'].includes(error.code);
      if (!uncertain) completeIntent(scope);
      throw new CollectionCommandError(databaseMessage(error), uncertain);
    }
    if (!data?.id) throw new CollectionCommandError('Kayıt sonucu doğrulanamadı. Aynı bilgilerle tekrar kontrol edin.', true);
    completeIntent(scope);
    versions.set(accountId + ':' + data.id, data.version);
    return data;
  });
}
export function addCollection(record) {
  const payload = { customer_key: record.customer_key, customer_name: record.customer_name || '', customer_tax_no: record.customer_tax_no || '',
    type: record.type || 'Tahsilat', description: record.description || '', amount: positiveMoney(record.amount), date: record.date, currency: 'TRY', source_key: record.source_key || null };
  return command(record.account_id, 'create', payload, record.idempotency_key);
}
export function updateCollection(id, accountId, updates = {}) {
  return command(accountId, 'update', { id, version: updates.version ?? versions.get(accountId + ':' + id),
    date: updates.date, type: updates.type || 'Tahsilat', description: updates.description || '', amount: positiveMoney(updates.amount), currency: 'TRY', reason: updates.reason || 'Tahsilat düzeltmesi' }, updates.idempotency_key);
}
/** @param {string} id @param {string} accountId @param {{version?: number, reason?: string, idempotency_key?: string}} [options] */
export function deleteCollection(id, accountId, { version = undefined, reason = 'Kullanıcı tarafından iptal edildi', idempotency_key = undefined } = {}) {
  return command(accountId, 'cancel', { id, version: version ?? versions.get(accountId + ':' + id), reason }, idempotency_key);
}
export async function collectionHistory(id, accountId) {
  const { data, error } = await getSupabase().from('collection_history').select('*').eq('collection_id', id).eq('account_id', accountId).order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}
