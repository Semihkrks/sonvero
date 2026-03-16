// ══════════════════════════════════════════
// Account Manager — Multi-Account Nilvera API Key Management
// ══════════════════════════════════════════
import { getSupabase, dbSelect, dbInsert, dbUpdate, dbDelete, isSupabaseConfigured } from '../lib/supabase.js';

const LS_KEY = 'nilfatura_accounts';
const LS_ACTIVE = 'nilfatura_active_account';

function getLocalAccounts() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveLocalAccounts(accounts) {
  localStorage.setItem(LS_KEY, JSON.stringify(accounts || []));
}

function upsertLocalAccount(account) {
  const items = getLocalAccounts();
  const idx = items.findIndex((x) => x.id === account.id);
  if (idx >= 0) {
    items[idx] = { ...items[idx], ...account };
  } else {
    items.push(account);
  }
  saveLocalAccounts(items);
}

function removeLocalAccount(id) {
  const items = getLocalAccounts().filter((x) => x.id !== id);
  saveLocalAccounts(items);
}

function mergeAccounts(localItems = [], remoteItems = []) {
  const map = new Map();
  [...localItems, ...remoteItems].forEach((x) => {
    if (x?.id) map.set(x.id, x);
  });
  return Array.from(map.values());
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
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#06b6d4', '#3b82f6'
];

// ── List Accounts ──
export async function listAccounts() {
  const localAccounts = getLocalAccounts();
  const userId = await getAuthenticatedUserId();

  if (!userId) {
    return localAccounts;
  }

  // Local varsa hızlı geri dön, arka planda Supabase ile tazele.
  if (localAccounts.length > 0) {
    dbSelect('accounts', { user_id: userId })
      .then((remote) => {
        const merged = mergeAccounts(getLocalAccounts(), remote || []);
        saveLocalAccounts(merged);
      })
      .catch((e) => console.warn('Supabase refresh failed, keeping local cache:', e));
    return localAccounts;
  }

  const remote = await dbSelect('accounts', { user_id: userId });
  const merged = mergeAccounts(localAccounts, remote || []);
  saveLocalAccounts(merged);
  return merged;
}

// ── Add Account ──
export async function addAccount({ name, apiKey, environment = 'test', color = '#6366f1', companyName = '', vkn = '', invoiceSeries = '' }) {
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
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // Hız için önce local yaz.
  upsertLocalAccount(account);

  const userId = await getAuthenticatedUserId();
  if (!userId) return account;

  try {
    const remote = await dbInsert('accounts', { ...account, user_id: userId });
    upsertLocalAccount(remote);
    return remote;
  } catch (e) {
    console.warn('Supabase insert failed, local copy kept:', e);
    return account;
  }
}

// ── Update Account ──
export async function updateAccount(id, updates) {
  updates.updated_at = new Date().toISOString();

  const localCurrent = getLocalAccounts().find((x) => x.id === id);
  if (localCurrent) {
    upsertLocalAccount({ ...localCurrent, ...updates, id });
  }

  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return getLocalAccounts().find((x) => x.id === id) || null;
  }

  try {
    const remote = await dbUpdate('accounts', id, updates);
    if (remote) upsertLocalAccount(remote);
    return remote;
  } catch (e) {
    console.warn('Supabase update failed, local copy kept:', e);
    return getLocalAccounts().find((x) => x.id === id) || null;
  }
}

// ── Delete Account ──
export async function deleteAccount(id) {
  removeLocalAccount(id);

  const userId = await getAuthenticatedUserId();
  if (userId) {
    try {
      await dbDelete('accounts', id);
    } catch (e) {
      console.warn('Supabase delete failed, removed only from local:', e);
    }
  }

  // If deleted account was active, clear it
  if (getActiveAccountId() === id) {
    localStorage.removeItem(LS_ACTIVE);
  }
}

// ── Active Account ──
export function getActiveAccountId() {
  return localStorage.getItem(LS_ACTIVE);
}

export async function setActiveAccount(id) {
  localStorage.setItem(LS_ACTIVE, id);

  // Local aktif bilgisi
  const local = getLocalAccounts();
  const localPatched = local.map((acc) => ({
    ...acc,
    is_active: acc.id === id
  }));
  saveLocalAccounts(localPatched);

  // Supabase senkronunu arka planda yap: UI hesap degisimini beklemeden aninda guncellensin.
  (async () => {
    const userId = await getAuthenticatedUserId();
    if (!userId) return;

    try {
      const accounts = await dbSelect('accounts', { user_id: userId });
      for (const acc of accounts) {
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

export async function getActiveAccount() {
  const id = getActiveAccountId();
  if (!id) return null;

  const userId = await getAuthenticatedUserId();
  if (userId) {
    try {
      const remote = await dbSelect('accounts', { user_id: userId, id });
      const fresh = Array.isArray(remote) ? remote[0] : null;
      if (fresh) {
        upsertLocalAccount(fresh);
        return fresh;
      }
    } catch (e) {
      console.warn('Supabase active account fetch failed, using local cache:', e);
    }
  }

  const accounts = await listAccounts();
  return accounts.find(a => a.id === id) || null;
}

// ── Get API Key for active account ──
export async function getActiveApiKey() {
  const account = await getActiveAccount();
  return account ? account.api_key : null;
}

// ── Get active environment ──
export async function getActiveEnvironment() {
  const account = await getActiveAccount();
  return account ? account.environment : 'test';
}

// ── Account Preferences (local) ──
// Obsolete: Using direct columns in accounts object now
