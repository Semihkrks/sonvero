import { authenticated, cors, json, providerFetch, upstreamBase } from '../_shared/runtime.ts';
import { isAllowedOperation } from '../_shared/policy.ts';
import { validateInvoice, validateDespatch } from '../_shared/invoice-validation.ts';


Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors(request) });
  if (request.method !== 'POST') return json(request, { success: false, error: 'Yöntem desteklenmiyor' }, 405);
  let context;
  try { context = await authenticated(request); } catch { return json(request, { success: false, error: 'Oturum veya yetki geçersiz' }, 401); }
  const clientVersion=Number(request.headers.get('x-sonvera-client'));
  if(!Number.isInteger(clientVersion)||clientVersion<2)return json(request,{success:false,status:426,code:'CLIENT_UPDATE_REQUIRED',error:'Sonvera sürümünüz güncel değil. Formunuzu koruyarak uygulamayı güncelleyin.'},426);
  const { admin, user } = context;
  const budget = await admin.rpc('take_api_budget', { p_user_id: user.id });
  if (budget.error || !budget.data) return json(request, { success: false, error: 'İstek sınırına ulaşıldı. Bir dakika sonra deneyin.', status: 429, retryAfter: 60 }, 429);
  let operationId: string | undefined;
  try {
    const raw = await request.text();
    if (raw.length > 1_000_000) return json(request, { success: false, error: 'İstek çok büyük' }, 413);
    const { accountId, method, path, data, params } = JSON.parse(raw);
    if (!isAllowedOperation(method, path)) return json(request, { success: false, error: 'Bu API işlemi desteklenmiyor' }, 400);
    const { data: account } = await admin.from('accounts').select('id,environment').eq('id', accountId).eq('user_id', user.id).is('disabled_at', null).maybeSingle();
    if (!account) return json(request, { success: false, error: 'Hesaba erişim yok' }, 403);
    const { data: key, error: keyError } = await admin.rpc('get_account_secret', { p_id: accountId, p_user_id: user.id });
    if (keyError || !key) return json(request, { success: false, error: 'Hesap anahtarı tanımlı değil' }, 422);
    const write = method !== 'GET' && !/\/(Preview|Export)(\/|$)|\/Download(\/|$)/i.test(path);
    if (write && /\/(Send\/Model|Draft\/Create|Draft\/EditAndSend)$/.test(path)) {
      try { if(path.startsWith('/edespatch/'))validateDespatch(data);else validateInvoice(data); } catch (error) { return json(request,{success:false,status:422,error:error instanceof Error?error.message:'Fatura doğrulanamadı'},422); }
    }
    if (write) {
      const idempotencyKey = request.headers.get('idempotency-key');
      if (!idempotencyKey || idempotencyKey.length > 200) return json(request, { success: false, error: 'İşlem anahtarı gerekli' }, 400);
      const { data: receipt, error } = await admin.rpc('begin_nilvera_operation', { p_user_id: user.id, p_account_id: accountId, p_key: idempotencyKey, p_request: { method, path, data, params, environment: account.environment } });
      if (error) return json(request, { success: false, error: 'İşlem başlatılamadı veya aynı anahtar farklı içerikle kullanıldı' }, 409);
      operationId = receipt.id;
      if (!receipt.claimed) {
        if (['succeeded', 'failed'].includes(receipt.status)) return json(request, { ...receipt.result, operationId });
        return json(request, { success: false, error: 'İşlemin sonucu doğrulanıyor. Yeniden gönderilmedi.', operationId, operationStatus: receipt.status, status: 202 });
      }
    }
    const url = new URL(upstreamBase(account.environment) + path);
    for (const [name, value] of Object.entries(params || {})) {
      if (value !== null && value !== undefined) url.searchParams.set(name, String(value));
    }
    const response = await providerFetch(url.href, key, { method, ...(data !== undefined && data !== null ? { body: JSON.stringify(data) } : {}) });
    const type = response.headers.get('content-type') || '';
    let body: unknown;
    if (/json/i.test(type)) body = await response.json();
    else if (/pdf|octet-stream|zip|spreadsheet/i.test(type)) {
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.length > 10_000_000) throw new Error('Belge boyutu sınırı aşıldı');
      let binary = ''; for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
      body = { content: btoa(binary), encoding: 'base64', contentType: type };
    } else body = await response.text();
    const providerError = typeof body === 'object' && body ? body as Record<string, unknown> : {};
    const result = { success: response.ok, data: response.ok ? body : undefined, status: response.status, operationId,
      error: response.ok ? undefined : String(providerError.Message || 'Nilvera işlemi tamamlayamadı. Belge durumunu kontrol edin.'),
      retryAfter: response.headers.get('retry-after') };
    if (operationId) {
      const state = response.ok ? 'succeeded' : [400, 401, 403, 422].includes(response.status) ? 'failed' : 'unknown';
      const finished = await admin.rpc('finish_nilvera_operation', { p_id: operationId, p_status: state, p_result: { ...result, operationStatus: state } });
      if (finished.error) throw new Error('İşlem sonucu kaydedilemedi');
      return json(request, { ...result, operationStatus: state });
    }
    return json(request, result);
  } catch {
    if (operationId) await admin.rpc('finish_nilvera_operation', { p_id: operationId, p_status: 'unknown', p_result: { success: false, operationId, operationStatus: 'unknown', error: 'Sonuç doğrulanıyor' } });
    return json(request, { success: false, operationId, operationStatus: operationId ? 'unknown' : undefined, error: operationId ? 'Bağlantı kesildi; işlem tekrar gönderilmeyecek. Sonuç doğrulanıyor.' : 'İstek doğrulanamadı veya bağlantı kurulamadı.', status: operationId ? 202 : 503 });
  }
});
