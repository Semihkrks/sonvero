import { EInvoice } from '../api/nilvera.js';
import { getActiveAccount } from './account-manager.js';

const LS_SEEN_KEY = 'nilfatura_seen_incoming_v1';
const CHECK_INTERVAL_MS = 120000;
const LOOKBACK_DAYS = 3;
const MAX_TRACKED_UUIDS = 300;

let monitorTimer = null;
let initializedForAccount = '';
let visibilityHandler = null;

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

async function fetchIncomingSnapshot() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - LOOKBACK_DAYS);

  const res = await EInvoice.listPurchases({
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

  try {
    const perm = await Notification.requestPermission();
    return perm === 'granted';
  } catch {
    return false;
  }
}

async function showIncomingNotification(payload) {
  const hasPerm = await requestNotificationPermissionIfNeeded();
  if (!hasPerm) return;

  const title = payload.title || 'Sonvera';
  const body = payload.body || 'Yeni e-Fatura alindi.';
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

async function runCheck({ silentSeed = false } = {}) {
  const account = await getActiveAccount();
  if (!account?.id) return;

  const snapshot = await fetchIncomingSnapshot();
  const uuids = snapshot.map((x) => getUuid(x)).filter(Boolean);

  const seenMap = loadSeenMap();
  const known = new Set(seenMap[account.id] || []);

  if (silentSeed || initializedForAccount !== account.id) {
    seenMap[account.id] = uuids.slice(0, MAX_TRACKED_UUIDS);
    saveSeenMap(seenMap);
    initializedForAccount = account.id;
    return;
  }

  const fresh = snapshot.filter((x) => !known.has(getUuid(x)));
  if (fresh.length > 0) {
    const newest = fresh[0];
    const sender = getSender(newest);
    const body = fresh.length === 1
      ? `${sender} gondericisinden yeni e-Fatura geldi.`
      : `${fresh.length} yeni e-Fatura geldi. Son gelen: ${sender}`;

    await showIncomingNotification({
      title: 'Yeni Gelen e-Fatura',
      body
    });
  }

  seenMap[account.id] = uuids.slice(0, MAX_TRACKED_UUIDS);
  saveSeenMap(seenMap);
}

export async function startInvoiceNotificationMonitor() {
  await runCheck({ silentSeed: true });

  if (monitorTimer) {
    clearInterval(monitorTimer);
  }

  monitorTimer = setInterval(() => {
    if (document.visibilityState === 'hidden') return;
    runCheck().catch(() => {});
  }, CHECK_INTERVAL_MS);

  const nextVisibilityHandler = () => {
    if (document.visibilityState === 'visible') {
      runCheck().catch(() => {});
    }
  };

  if (visibilityHandler) {
    document.removeEventListener('visibilitychange', visibilityHandler);
  }
  visibilityHandler = nextVisibilityHandler;
  document.addEventListener('visibilitychange', visibilityHandler);
}
