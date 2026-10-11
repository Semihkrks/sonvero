import { getSupabase } from '../lib/supabase.js';
import { hasPendingMutation, requireOnline, singleFlight } from '../lib/operations.js';
const FIELDS = 'id,user_id,name,environment,color,is_active,company_name,vkn,invoice_series,despatch_series,created_at,updated_at,disabled_at,has_api_key';
export const ACCOUNT_COLORS = ['#2563eb','#0284c7','#0891b2','#0d9488','#16a34a','#d97706','#ea580c','#dc2626','#64748b'];
let accounts = [], activeId = localStorage.getItem('nilfatura_active_account');
let generation = 0, syncing = null;
localStorage.removeItem('nilfatura_accounts');
const emit = () => window.dispatchEvent(new CustomEvent('accountsChanged', { detail: { accounts: accounts.slice() } }));
export function getAllAccounts() { return accounts.slice(); }
export function getAccountById(id) { return accounts.find(a => a.id === id) || null; }
export function getActiveAccountId() { return activeId; }
export function getActiveAccount() { return getAccountById(activeId); }
export function getActiveEnvironment() { return getActiveAccount()?.environment || 'test'; }
export function clearAccounts() { generation++; accounts = []; activeId = null; localStorage.removeItem('nilfatura_active_account'); }
export async function syncAccounts() {
  if (syncing) return syncing;
  const seq = generation;
  syncing = (async () => {
    const { data: auth } = await getSupabase().auth.getSession();
    if (!auth.session) { clearAccounts(); return []; }
    const { data, error } = await getSupabase().from('accounts').select(FIELDS).eq('user_id', auth.session.user.id).is('disabled_at', null).order('created_at');
    if (error) throw new Error('Hesaplar yüklenemedi. Güvenli veritabanı geçişinin kurulduğunu kontrol edin.');
    if (seq !== generation) return accounts.slice();
    accounts = data || [];
    if (!accounts.some(a => a.id === activeId)) activeId = accounts[0]?.id || null;
    if (activeId) localStorage.setItem('nilfatura_active_account', activeId);
    else localStorage.removeItem('nilfatura_active_account');
    emit();
    return accounts.slice();
  })().finally(() => { syncing = null; });
  return syncing;
}
export async function listAccounts() { return accounts.length ? accounts.slice() : syncAccounts(); }
async function save(id, values, key) {
  requireOnline();
  return singleFlight('account:' + id, async () => {
    const { data, error } = await getSupabase().rpc('save_account', { p_id: id, p_values: values, p_api_key: key || null });
    if (error) throw error;
    generation++;
    const index = accounts.findIndex(a => a.id === id);
    if (index < 0) accounts.push(data); else accounts[index] = data;
    emit();
    return data;
  });
}
export function addAccount({ id = crypto.randomUUID(), name, apiKey, environment = 'test', color = '#2563eb', companyName = '', vkn = '', invoiceSeries = '', despatchSeries = '' }) {
  return save(id, { name, environment, color, company_name: companyName, vkn, invoice_series: invoiceSeries, despatch_series: despatchSeries }, apiKey);
}
export function updateAccount(id, updates) {
  const { api_key, ...values } = updates;
  return save(id, { ...getAccountById(id), ...values }, api_key);
}
export async function deleteAccount(id) {
  requireOnline();
  if (hasPendingMutation()) throw new Error('Devam eden işlemi bekleyin.');
  const { error } = await getSupabase().rpc('disable_account', { p_id: id });
  if (error) throw error;
  generation++;
  accounts = accounts.filter(a => a.id !== id);
  if (activeId === id) activeId = accounts[0]?.id || null;
  if (activeId) localStorage.setItem('nilfatura_active_account', activeId); else localStorage.removeItem('nilfatura_active_account');
  emit();
}
export async function setActiveAccount(id) {
  if (hasPendingMutation()) throw new Error('Kaydetme sürüyor. Hesap değiştirmeden önce işlemin bitmesini bekleyin.');
  if (!getAccountById(id)) throw new Error('Hesap bulunamadı.');
  if (activeId === id) return;
  generation++;
  activeId = id;
  localStorage.setItem('nilfatura_active_account', id);
  window.dispatchEvent(new CustomEvent('accountChanged', { detail: { accountId: id } }));
}
