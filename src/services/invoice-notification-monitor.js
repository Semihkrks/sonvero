import { EInvoiceWithAccount } from '../api/nilvera.js';
import { getActiveAccount } from './account-manager.js';
import { showToast } from '../components/toast.js';

const LS_SEEN_KEY = 'nilfatura_seen_incoming_v1';
const CHECK_INTERVAL_MS = 60000;
const MIN_GAP_MS = 15000;
const LOOKBACK_DAYS = 3;
const MAX_TRACKED_UUIDS = 300;

let monitorTimer = null;
let visibilityHandler = null;
let onlineHandler = null;
let generation = 0;
let lastCheckAt = 0;
let checking = null;

function loadSeenMap() {
  try {
    const parsed = JSON.parse(localStorage.getItem(LS_SEEN_KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveSeenMap(map) {
  localStorage.setItem(LS_SEEN_KEY, JSON.stringify(map || {}));
}

function getIssueDate(inv) {
  return inv?.IssueDate || inv?.issueDate || inv?.CreateDate || inv?.CreatedDate || '';
}

function getUuid(inv) {
  return inv?.UUID || inv?.Uuid || inv?.uuid || inv?.Id || '';
}

function getSender(inv) {
  return inv?.SenderName || inv?.senderName || inv?.CompanyName || inv?.CustomerName || 'Yeni fatura';
}

function extractItems(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.Content)) return data.Content;
  if (Array.isArray(data.Items)) return data.Items;
  if (Array.isArray(data.items)) return data.items;
  if (typeof data === 'object') {
    for (const key of Object.keys(data)) {
      if (Array.isArray(data[key]) && key !== 'Errors') return data[key];
    }
  }
  return [];
}

async function fetchIncomingSnapshot(account) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - LOOKBACK_DAYS);

  // Yakalanan hesabı açıkça geçir: bildirimler her zaman doğru hesaba ait olsun.
  const res = await EInvoiceWithAccount.listPurchases(account, {
    StartDate: start.toISOString(),
    EndDate: end.toISOString(),
    Page: 1,
    PageSize: 50
  });

  if (!res.success) return [];

  const items = extractItems(res.data)
    .filter((x) => getUuid(x))
    .sort((a, b) => new Date(getIssueDate(b) || 0) - new Date(getIssueDate(a) || 0));

  return items;
}

async function requestNotificationPermissionIfNeeded() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;

  return false;
}

async function showIncomingNotification(payload) {
  const hasPerm = await requestNotificationPermissionIfNeeded();
  if (!hasPerm || document.visibilityState === 'visible') {
    showToast(payload.body || 'Yeni e-Fatura alındı.', 'info', {
      title: payload.title,
      icon: 'invoice',
      duration: 9000,
      actionLabel: 'Görüntüle',
      onAction: () => { window.location.hash = '#/incoming'; },
    });
    return;
  }

  const title = payload.title || 'Sonvera';
  const body = payload.body || 'Yeni e-Fatura alındı.';
  const data = { url: '/index.html#/incoming' };

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        await reg.showNotification(title, {
          body,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          data,
          tag: 'incoming-invoice'
        });
        return;
      }
    }

    const n = new Notification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'incoming-invoice'
    });
    n.onclick = () => {
      window.focus();
      window.location.hash = '#/incoming';
      n.close();
    };
  } catch {
    // Browser silently blocked notification.
  }
}

async function runCheck({ force = false } = {}) {
  if (checking) return checking;
  if (!force && Date.now() - lastCheckAt < MIN_GAP_MS) return;
  checking = (async () => {
    const account = getActiveAccount();
    if (!account?.id) return;
    lastCheckAt = Date.now();

    const snapshot = await fetchIncomingSnapshot(account);
    if (getActiveAccount()?.id !== account.id || !snapshot.length) return;
    const uuids = snapshot.map((x) => getUuid(x)).filter(Boolean);

    const seenMap = loadSeenMap();
    const previous = seenMap[account.id];
    const known = new Set(previous || []);
    // Only the very first run for an account seeds silently; later app starts report what arrived while closed.
    const fresh = previous ? snapshot.filter((x) => !known.has(getUuid(x))) : [];

    // Merge so invoices that dropped out of the lookback window are not reported again.
    seenMap[account.id] = [...new Set([...uuids, ...(previous || [])])].slice(0, MAX_TRACKED_UUIDS);
    saveSeenMap(seenMap);

    if (fresh.length > 0) {
      const sender = getSender(fresh[0]);
      await showIncomingNotification({
        title: fresh.length === 1 ? 'Yeni gelen e-Fatura' : `${fresh.length} yeni e-Fatura`,
        body: fresh.length === 1 ? `${sender} gönderdi.` : `Son gelen: ${sender}`,
      });
    }
  })().finally(() => { checking = null; });
  return checking;
}

export async function startInvoiceNotificationMonitor({ delayMs = 0 } = {}) {
  const seq = ++generation;
  stopListeners();

  monitorTimer = setInterval(() => {
    if (document.visibilityState === 'hidden') return;
    runCheck().catch(() => {});
  }, CHECK_INTERVAL_MS);

  visibilityHandler = () => {
    if (document.visibilityState === 'visible') runCheck().catch(() => {});
  };
  onlineHandler = () => runCheck({ force: true }).catch(() => {});
  document.addEventListener('visibilitychange', visibilityHandler);
  window.addEventListener('online', onlineHandler);

  // Let the first page's own requests go out before the background check competes with them.
  if (delayMs) await new Promise((resolve) => setTimeout(resolve, delayMs));
  if (seq !== generation) return;
  await runCheck({ force: true });
}

function stopListeners() {
  clearInterval(monitorTimer); monitorTimer = null;
  if (visibilityHandler) document.removeEventListener('visibilitychange', visibilityHandler);
  if (onlineHandler) window.removeEventListener('online', onlineHandler);
  visibilityHandler = null; onlineHandler = null;
}

export function stopInvoiceNotificationMonitor() {
  generation++;
  stopListeners();
  lastCheckAt = 0;
}
