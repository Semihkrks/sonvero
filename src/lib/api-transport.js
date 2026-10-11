import { getSupabase } from './supabase.js';
import { completeIntent, fingerprint, operationIntent, requireOnline, singleFlight, stableJson } from './operations.js';
const reads = new Map();
/**
 * @param {{id:string,environment?:string,name?:string}|null|undefined} account
 * @param {string} method
 * @param {string} path
 * @param {unknown} [data]
 * @param {Record<string, unknown>|null} [params]
 * @param {{signal?: AbortSignal, onIntent?: (info:{key:string})=>unknown}} [options]
 */
export async function callNilvera(account, method, path, data = null, params = null, options = {}) {
  if (!account?.id) return { success: false, error: 'Aktif hesap bulunamadı.', status: 400 };
  const write = method !== 'GET' && !/\/(Preview|Export)(\/|$)|\/Download(\/|$)/i.test(path);
  const body = { accountId: account.id, method, path, data, params };
  const identity = stableJson(body);
  const run = async () => {
    let requestKey;
    try {
      requireOnline();
      const { data: auth } = await getSupabase().auth.getSession();
      const session = auth?.session;
      if (!session) return { success: false, error: 'Oturumunuz sona erdi. Tekrar giriş yapın.', status: 401 };
      const signature = await fingerprint(identity);
      const scope = session.user.id + ':nilvera:' + account.id + ':' + signature;
      const key = write ? operationIntent(scope, signature) : undefined;
      requestKey=key;
      if(write&&options.onIntent)await options.onIntent({key});
      const response = await getSupabase().functions.invoke('nilvera', {
        body, headers: { 'X-Sonvera-Client': '2', ...(key ? { 'Idempotency-Key': key } : {}) },
        ...(options.signal && !write ? { signal: options.signal } : {}),
      });
      let result = response.data;
      if (response.error) {
        try { result = await response.error.context?.json(); } catch { /* response unavailable */ }
        if (!result) result = { success: false, error: write ? 'İşlemin sonucu doğrulanamadı. Aynı bilgilerle yeniden kontrol edin.' : 'Sunucuya ulaşılamadı.', status: response.error.context?.status || 0, operationStatus: write ? 'unknown' : undefined };
      }
      if (!result) throw new Error('Sunucu boş yanıt verdi.');
      if(result.status==null&&response.error?.context?.status)result.status=response.error.context.status;
      if(result.status===426&&typeof window!=='undefined')window.dispatchEvent(new CustomEvent('sonvera:update-required'));

      if (write && (result.success || result.operationStatus === 'failed')) completeIntent(scope);
      if (result.data?.encoding === 'base64') result.data = result.data.content;
      return {...result,...(requestKey?{requestKey}:{})};
    } catch (error) {
      return { success: false, requestKey, error: error.message || 'Bağlantı kurulamadı.', status: 0, operationStatus: write ? 'unknown' : undefined };
    }
  };
  if (write) return singleFlight('nilvera:' + identity, run);
  if (options.signal) return run();
  if (!reads.has(identity)) reads.set(identity, run().finally(() => reads.delete(identity)));
  return reads.get(identity);
}
export async function retryRead(fn, { signal } = {}) {
  let result;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (signal?.aborted) return { success: false, error: 'İstek iptal edildi', cancelled: true, status: 0 };
    result = await fn();
    if (result.success || ![0, 429, 500, 502, 503, 504].includes(Number(result.status ?? 0))) return result;
    if (attempt === 2) break;
    const retryAt = Number(result.retryAfter) * 1000 || (Date.parse(result.retryAfter) - Date.now());
    if (retryAt > 30000) return result;
    await new Promise(resolve => {
      const finish = () => { clearTimeout(timer); signal?.removeEventListener('abort', finish); resolve(); };
      const timer = setTimeout(finish, Math.max(500 * (2 ** attempt), retryAt || 0));
      signal?.addEventListener('abort', finish, { once: true });
    });
  }
  return result;
}
