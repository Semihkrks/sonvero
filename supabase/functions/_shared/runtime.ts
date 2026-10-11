import { createClient } from 'npm:@supabase/supabase-js@2';

export function adminClient() {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });
}
export function cors(request: Request): HeadersInit {
  const origin = request.headers.get('origin') || '';
  const allowed = (Deno.env.get('ALLOWED_ORIGINS') || '').split(',').map(x => x.trim());
  return { 'Access-Control-Allow-Origin': allowed.includes(origin) ? origin : 'null', 'Vary': 'Origin',
    'Access-Control-Allow-Headers': 'authorization,apikey,content-type,x-client-info,idempotency-key,x-sonvera-client',
    'Access-Control-Allow-Methods': 'POST,OPTIONS', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
}
export function json(request: Request, data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...cors(request), 'Content-Type': 'application/json' } });
}
export async function authenticated(request: Request) {
  const token = request.headers.get('authorization')?.replace(/^Bearer /i, '');
  if (!token) throw new Error('Oturum gerekli');
  const admin = adminClient();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) throw new Error('Oturum geçersiz');
  const owner = Deno.env.get('OWNER_USER_ID');
  if (!owner || data.user.id !== owner) throw new Error('Bu kullanıcı yetkili değil');
  return { admin, user: data.user };
}
export function upstreamBase(environment: string) {
  return environment === 'live' ? 'https://api.nilvera.com' : 'https://apitest.nilvera.com';
}
export async function providerFetch(url: string, key: string, init: RequestInit = {}) {
  return fetch(url, { ...init, redirect: 'error', signal: AbortSignal.timeout(25000), headers: {
    Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...(init.headers || {}),
  } });
}
