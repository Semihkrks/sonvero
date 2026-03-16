// ══════════════════════════════════════════
// Supabase Client & Auth
// ══════════════════════════════════════════
import { createClient } from '@supabase/supabase-js';

// Sabit Supabase config (her oturumda otomatik kullanılır)
export const EMBEDDED_SUPABASE_URL = 'https://ciaffmgszfvyrdoweirw.supabase.co';
export const EMBEDDED_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpYWZmbWdzemZ2eXJkb3dlaXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1OTc0MjcsImV4cCI6MjA4OTE3MzQyN30.Hhn3szJONOxK4Zpa-pfGTV5xiRNUQdlBl2NnyGlCCfE';

let supabaseUrl = EMBEDDED_SUPABASE_URL;
let supabaseKey = EMBEDDED_SUPABASE_ANON_KEY;
let supabase = null;

function createSupabaseClient(url, key) {
  return createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}

function bootstrapEmbeddedSupabase() {
  if (!supabase) {
    supabase = createSupabaseClient(EMBEDDED_SUPABASE_URL, EMBEDDED_SUPABASE_ANON_KEY);
  }

  // Her oturumda aynı bağlantıyı kullansın diye localStorage'a da sabit yazarız.
  try {
    localStorage.setItem('sb_url', EMBEDDED_SUPABASE_URL);
    localStorage.setItem('sb_anon_key', EMBEDDED_SUPABASE_ANON_KEY);
  } catch {
    // no-op
  }
}

bootstrapEmbeddedSupabase();

export function initSupabase(url, key) {
  // URL/Key sabit: parametreler görmezden gelinir.
  supabaseUrl = EMBEDDED_SUPABASE_URL;
  supabaseKey = EMBEDDED_SUPABASE_ANON_KEY;
  localStorage.setItem('sb_url', EMBEDDED_SUPABASE_URL);
  localStorage.setItem('sb_anon_key', EMBEDDED_SUPABASE_ANON_KEY);
  supabase = createSupabaseClient(EMBEDDED_SUPABASE_URL, EMBEDDED_SUPABASE_ANON_KEY);
  return supabase;
}

export function getSupabase() {
  if (!supabase) {
    supabase = createSupabaseClient(EMBEDDED_SUPABASE_URL, EMBEDDED_SUPABASE_ANON_KEY);
  }
  return supabase;
}

export function isSupabaseConfigured() {
  return true;
}

// ── Auth Functions ──
export async function signUp(email, password) {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase yapılandırılmamış');
  const { data, error } = await sb.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

export async function signIn(email, password) {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase yapılandırılmamış');
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.auth.signOut();
  if (error) throw error;
}

export async function getUser() {
  const sb = getSupabase();
  if (!sb) return null;
  const { data: { user } } = await sb.auth.getUser();
  return user;
}

export async function getSession() {
  const sb = getSupabase();
  if (!sb) return null;
  const { data: { session } } = await sb.auth.getSession();
  return session;
}

// ── Database Helpers ──
export async function dbSelect(table, filters = {}) {
  const sb = getSupabase();
  if (!sb) return [];
  let query = sb.from(table).select('*');
  Object.entries(filters).forEach(([key, value]) => {
    query = query.eq(key, value);
  });
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function dbInsert(table, record) {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase yapılandırılmamış');
  const { data, error } = await sb.from(table).insert(record).select().single();
  if (error) throw error;
  return data;
}

export async function dbUpdate(table, id, updates) {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase yapılandırılmamış');
  const { data, error } = await sb.from(table).update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function dbDelete(table, id) {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase yapılandırılmamış');
  const { error } = await sb.from(table).delete().eq('id', id);
  if (error) throw error;
}
