// ══════════════════════════════════════════
// Account Manager — Multi-Account Nilvera API Key Management
// ──────────────────────────────────────────
// Tasarım ilkeleri:
//  • Tek doğru kaynak: kimlik doğrulanmışsa Supabase otoritedir. localStorage
//    yalnızca ilk açılış hızlandırması + offline yedeğidir.
//  • Bellek-içi state senkron okunur: getActiveAccount() ASLA await istemez.
//    Böylece bir API isteği aktif hesabı istek anında yeniden çözmez, hesaplar
//    arası veri karışması olmaz.
//  • Birleştirme (union) YOK. syncAccounts() remote'u state'e/cache'e doğrudan
//    yazar; mutationSeq sayesinde geç dönen bir sync, araya giren bir
//    ekleme/silme işlemini geri alamaz.
// ══════════════════════════════════════════
import { getSupabase, dbSelect, dbInsert, dbUpdate, dbDelete, isSupabaseConfigured } from '../lib/supabase.js';

const LS_KEY = 'nilfatura_accounts';
const LS_ACTIVE = 'nilfatura_active_account';

// ── Bellek-içi state (senkron okunan tek kaynak) ──
let accounts = hydrateLocal();
let activeId = (() => {
  try { return localStorage.getItem(LS_ACTIVE); } catch { return null; }
})();

// Her yerel mutasyon (add/delete/update/setActive) bunu artırır. Arka planda
// dönen syncAccounts, başlangıçtaki seq ile karşılaştırarak araya giren bir
// mutasyonu ezmeyi reddeder.
let mutationSeq = 0;

function hydrateLocal() {
  try {
    const raw = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function persistLocal() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(accounts || []));
  } catch {
    // no-op (storage dolu / erişilemez)
  }
}

function emitAccountsChanged() {
  try {
    window.dispatchEvent(new CustomEvent('accountsChanged', { detail: { accounts: accounts.slice() } }));
  } catch {
    // SSR / test ortamı
  }
}

function upsertState(account) {
  if (!account?.id) return;
  const idx = accounts.findIndex((x) => x.id === account.id);
  if (idx >= 0) {
    accounts[idx] = { ...accounts[idx], ...account };
  } else {
    accounts.push(account);
  }
  persistLocal();
}

function removeState(id) {
  accounts = accounts.filter((x) => x.id !== id);
  persistLocal();
}

async function getAuthenticatedUserId() {
  if (!isSupabaseConfigured()) return null;
  try {
    const sb = getSupabase();
    if (!sb) return null;
    const { data: { user } } = await sb.auth.getUser();
    return user?.id || null;
  } catch {
    return null;
  }
}

// ── Account Colors ──
export const ACCOUNT_COLORS = [
  '#3b82f6', '#2563eb', '#0ea5e9', '#06b6d4',
  '#14b8a6', '#22c55e', '#f59e0b', '#f97316',
  '#ef4444', '#64748b'
];

// ── Senkron erişim ──
export function getAllAccounts() {
  return accounts.slice();
}

export function getAccountById(id) {
  return accounts.find((a) => a.id === id) || null;
}

// ── Remote-authoritative senkronizasyon ──
// Kimlik doğrulanmışsa Supabase'i çekip state'i DOĞRUDAN değiştirir (union yok).
// Offline / hata durumunda mevcut yerel state korunur.
export async function syncAccounts() {
  const userId = await getAuthenticatedUserId();
  if (!userId) return accounts.slice();

  const seqAtStart = mutationSeq;
  try {
    const remote = await dbSelect('accounts', { user_id: userId });
    // Araya bir ekleme/silme girdiyse remote sonucu bayatladı: yazma.
    if (seqAtStart !== mutationSeq) return accounts.slice();

    const remoteList = Array.isArray(remote) ? remote : [];
    const remoteIds = new Set(remoteList.map((a) => a.id));

    // Henüz Supabase'e yazılamamış (senkron bekleyen) yerel hesapları koru.
    // Böylece remote-authoritative değişim onları SİLMEZ. Remote'da zaten var olan
    // (başka cihazda silinmiş) hesaplar pending değildir, dolayısıyla doğru şekilde düşer.
    const pendingLocal = accounts.filter((a) => a._pendingSync && !remoteIds.has(a.id));
    accounts = [...remoteList, ...pendingLocal];
    persistLocal();

    // Aktif hesap artık mevcut değilse aktif seçimi düzelt.
    if (activeId && !accounts.some((a) => a.id === activeId)) {
      activeId = accounts[0]?.id || null;
      if (activeId) localStorage.setItem(LS_ACTIVE, activeId);
      else localStorage.removeItem(LS_ACTIVE);
    }
    emitAccountsChanged();

    // Bekleyen hesapları arka planda tekrar göndermeyi dene (sütun/şema düzelince başarılı olur).
    if (pendingLocal.length > 0) {
      for (const p of pendingLocal) {
        try {
          const { _pendingSync, ...clean } = p;
          const inserted = await dbInsert('accounts', { ...clean, user_id: userId });
          upsertState({ ...inserted, _pendingSync: false }); // bayrağı temizle
        } catch (e) {
          // Hâlâ başarısız: pending kalsın, sessiz geç.
        }
      }
      emitAccountsChanged();
    }
  } catch (e) {
    console.warn('Supabase sync failed, keeping local cache:', e);
  }
  return accounts.slice();
}

// ── List Accounts ──
// Bellek-içi state'i anında döndürür; arka planda Supabase ile tazeler.
export async function listAccounts() {
  syncAccounts();
  return accounts.slice();
}

// ── Add Account ──
export async function addAccount({ name, apiKey, environment = 'test', color = '#3b82f6', companyName = '', vkn = '', invoiceSeries = '', despatchSeries = '' }) {
  const account = {
    id: crypto.randomUUID(),
    name,
    api_key: apiKey,
    environment,
    color,
    is_active: false,
    company_name: companyName,
    vkn,
    invoice_series: invoiceSeries,
    despatch_series: despatchSeries,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  mutationSeq++;

  const userId = await getAuthenticatedUserId();
  if (!userId) {
    // Offline: yalnızca yerel ekle, senkron bekliyor olarak işaretle.
    upsertState({ ...account, _pendingSync: true });
    emitAccountsChanged();
    return account;
  }

  try {
    const remote = await dbInsert('accounts', { ...account, user_id: userId });
    upsertState(remote);
    emitAccountsChanged();
    return remote;
  } catch (e) {
    // Insert başarısız (ör. şema/ağ). Hesabı KAYBETME: yerelde "senkron bekliyor"
    // olarak tut ki remote-authoritative sync onu silmesin; sütun/şema düzelince
    // syncAccounts otomatik tekrar göndermeyi dener.
    console.warn('Supabase insert failed, keeping local pending copy:', e);
    upsertState({ ...account, _pendingSync: true });
    emitAccountsChanged();
    return account;
  }
}

// ── Update Account ──
export async function updateAccount(id, updates) {
  updates.updated_at = new Date().toISOString();
  mutationSeq++;

  const current = getAccountById(id);
  if (current) upsertState({ ...current, ...updates, id });

  const userId = await getAuthenticatedUserId();
  if (!userId) {
    emitAccountsChanged();
    return getAccountById(id);
  }

  try {
    const remote = await dbUpdate('accounts', id, updates);
    if (remote) upsertState(remote);
    emitAccountsChanged();
    return remote;
  } catch (e) {
    console.warn('Supabase update failed, local copy kept:', e);
    emitAccountsChanged();
    return getAccountById(id);
  }
}

// ── Delete Account ──
export async function deleteAccount(id) {
  mutationSeq++;

  const userId = await getAuthenticatedUserId();
  if (userId) {
    // Online: önce Supabase'den kesin sil. Hata olursa state'e DOKUNMA ve
    // hatayı fırlat — silinmiş gibi gösterip geri gelmesin.
    await dbDelete('accounts', id);
  }

  removeState(id);

  // Silinen hesap aktifse aktif seçimi temizle / başka hesaba geçir.
  if (activeId === id) {
    activeId = accounts[0]?.id || null;
    if (activeId) localStorage.setItem(LS_ACTIVE, activeId);
    else localStorage.removeItem(LS_ACTIVE);
  }

  emitAccountsChanged();
}

// ── Active Account ──
export function getActiveAccountId() {
  return activeId;
}

export async function setActiveAccount(id) {
  mutationSeq++;
  activeId = id;
  localStorage.setItem(LS_ACTIVE, id);

  // Yerel is_active bayrakları
  accounts = accounts.map((acc) => ({ ...acc, is_active: acc.id === id }));
  persistLocal();

  // Supabase senkronunu arka planda yap (UI beklemeden güncellensin).
  (async () => {
    const userId = await getAuthenticatedUserId();
    if (!userId) return;
    try {
      const remote = await dbSelect('accounts', { user_id: userId });
      for (const acc of remote) {
        if (acc.is_active && acc.id !== id) {
          await dbUpdate('accounts', acc.id, { is_active: false });
        }
      }
      await dbUpdate('accounts', id, { is_active: true });
    } catch (e) {
      console.warn('Supabase active account sync failed, local state kept:', e);
    }
  })();
}

// Senkron: bellek-içi state'ten aktif hesabı döndürür.
export function getActiveAccount() {
  if (!activeId) return null;
  return accounts.find((a) => a.id === activeId) || null;
}

// ── Get API Key for active account ──
export function getActiveApiKey() {
  const account = getActiveAccount();
  return account ? account.api_key : null;
}

// ── Get active environment ──
export function getActiveEnvironment() {
  const account = getActiveAccount();
  return account ? account.environment : 'test';
}
