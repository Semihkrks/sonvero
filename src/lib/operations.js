const active = new Map();
const intents = new Map();
const PREFIX = 'sonvera:intent:';

export function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).filter(k => value[k] !== undefined).sort().map(k => `${JSON.stringify(k)}:${stableJson(value[k])}`).join(',')}}`;
  return JSON.stringify(value);
}

export async function fingerprint(value) {
  const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : value;
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), n => n.toString(16).padStart(2, '0')).join('');
}

/** Only opaque IDs and hashes persist; no financial payloads or secrets. */
export function operationIntent(scope, payload) {
  const key = PREFIX + scope;
  let previous = intents.get(key);
  try { previous ||= JSON.parse(localStorage.getItem(key) || 'null'); } catch { /* memory fallback */ }
  if (!previous) {
    previous = { id: crypto.randomUUID(), signature: payload };
    intents.set(key, previous);
    try { localStorage.setItem(key, JSON.stringify(previous)); } catch { /* memory fallback */ }
  }
  if (previous.signature !== payload) throw new Error('Önceki işlemin sonucu henüz doğrulanmadı. Önce aynı bilgilerle tekrar kontrol edin.');
  return previous.id;
}

export function completeIntent(scope) {
  intents.delete(PREFIX + scope);
  try { localStorage.removeItem(PREFIX + scope); } catch { /* memory fallback */ }
}

export function singleFlight(key, fn) {
  if (active.has(key)) return active.get(key);
  const promise = Promise.resolve().then(fn).finally(() => { active.delete(key); announce(); });
  active.set(key, promise);
  announce();
  return promise;
}

function announce() {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('mutationStateChanged', { detail: { busy: active.size > 0 } }));
}
export function hasPendingMutation() { return active.size > 0; }
export function requireOnline() {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new Error('Bağlantı yok. Bilgiler korunuyor; bağlantı geldiğinde tekrar deneyin.');
}
export function clearPrivateStorage() {
  intents.clear();
  for (const storage of [localStorage, sessionStorage]) {
    for (const key of Object.keys(storage)) {
      if (/^(sonvera:(intent|draft):|nilfatura_(invoice_edit_context|accounts|active_account|seen|push)|sb_)/.test(key)) storage.removeItem(key);
    }
  }
}
