import { getSupabase, isSupabaseConfigured } from '../lib/supabase.js';

async function requireSupabaseUserId() {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase yapilandirmasi bulunamadi.');
  }
  const sb = getSupabase();
  if (!sb) {
    throw new Error('Supabase istemcisi baslatilamadi.');
  }

  const { data: authData } = await sb.auth.getUser();
  const userId = authData?.user?.id;
  if (!userId) {
    throw new Error('Supabase oturumu yok. Authentication > Anonymous sign-ins acik olmali.');
  }
  return userId;
}

async function ensureAccountOwnership(accountId, userId) {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('accounts')
    .select('id')
    .eq('id', accountId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!data?.id) {
    throw new Error('Aktif hesap Supabase tarafinda bulunamadi. Hesabi once Supabasee kaydedin.');
  }
}

export async function listCollections({ accountId, startDate = '', endDate = '' } = {}) {
  if (!accountId) return [];

  const userId = await requireSupabaseUserId();
  await ensureAccountOwnership(accountId, userId);
  const sb = getSupabase();

  let query = sb
    .from('customer_collections')
    .select('*')
    .eq('user_id', userId)
    .eq('account_id', accountId)
    .order('date', { ascending: true })
    .order('created_at', { ascending: true });

  if (startDate) query = query.gte('date', startDate);
  if (endDate) query = query.lte('date', endDate);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function addCollection(record) {
  const payload = {
    id: crypto.randomUUID(),
    account_id: record.account_id,
    customer_key: record.customer_key,
    customer_name: record.customer_name || '',
    customer_tax_no: record.customer_tax_no || '',
    type: record.type || 'Tahsilat',
    description: record.description || '',
    amount: Number(record.amount) || 0,
    date: record.date,
    created_at: new Date().toISOString()
  };

  if (!payload.account_id || !payload.customer_key || !payload.date || payload.amount <= 0) {
    throw new Error('Tahsilat kaydı için zorunlu alanlar eksik.');
  }

  const userId = await requireSupabaseUserId();
  await ensureAccountOwnership(payload.account_id, userId);

  const sb = getSupabase();
  const insertPayload = {
    ...payload,
    user_id: userId
  };
  const { data, error } = await sb
    .from('customer_collections')
    .insert(insertPayload)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function updateCollection(id, accountId, updates = {}) {
  if (!id) throw new Error('Tahsilat kayit id eksik.');
  if (!accountId) throw new Error('Hesap bilgisi eksik.');

  const userId = await requireSupabaseUserId();
  await ensureAccountOwnership(accountId, userId);

  const payload = {
    date: updates.date,
    type: (updates.type || 'Tahsilat').trim(),
    description: (updates.description || '').trim(),
    amount: Number(updates.amount) || 0
  };

  if (!payload.date || payload.amount <= 0) {
    throw new Error('Gecerli tarih ve tutar zorunludur.');
  }

  const sb = getSupabase();
  const { data, error } = await sb
    .from('customer_collections')
    .update(payload)
    .eq('id', id)
    .eq('account_id', accountId)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function deleteCollection(id, accountId) {
  if (!id) throw new Error('Tahsilat kayit id eksik.');
  if (!accountId) throw new Error('Hesap bilgisi eksik.');

  const userId = await requireSupabaseUserId();
  await ensureAccountOwnership(accountId, userId);

  const sb = getSupabase();
  const { error } = await sb
    .from('customer_collections')
    .delete()
    .eq('id', id)
    .eq('account_id', accountId)
    .eq('user_id', userId);

  if (error) throw error;
}
