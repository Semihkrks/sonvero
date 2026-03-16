const PUSH_SUB_KEY = 'nilfatura_push_subscription';
const PUSH_VAPID_KEY = 'nilfatura_push_vapid_public_key';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

export function isPushSupported() {
  return (
    typeof window !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window
  );
}

export function getStoredVapidKey() {
  return localStorage.getItem(PUSH_VAPID_KEY) || '';
}

export function setStoredVapidKey(value) {
  const normalized = String(value || '').trim();
  if (!normalized) {
    localStorage.removeItem(PUSH_VAPID_KEY);
    return '';
  }
  localStorage.setItem(PUSH_VAPID_KEY, normalized);
  return normalized;
}

export async function requestNotificationPermission() {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.requestPermission();
}

export async function getPushSubscription() {
  if (!isPushSupported()) return null;
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

export async function subscribePush(preferredVapidKey = '') {
  if (!isPushSupported()) throw new Error('Bu cihaz push desteklemiyor.');

  const permission = Notification.permission === 'granted'
    ? 'granted'
    : await requestNotificationPermission();

  if (permission !== 'granted') {
    throw new Error('Bildirim izni verilmedi.');
  }

  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  if (existing) {
    localStorage.setItem(PUSH_SUB_KEY, JSON.stringify(existing.toJSON()));
    return existing;
  }

  const vapidKey = String(preferredVapidKey || getStoredVapidKey()).trim();
  const options = { userVisibleOnly: true };

  if (vapidKey) {
    options.applicationServerKey = urlBase64ToUint8Array(vapidKey);
  }

  const subscription = await registration.pushManager.subscribe(options);
  localStorage.setItem(PUSH_SUB_KEY, JSON.stringify(subscription.toJSON()));
  return subscription;
}

export async function unsubscribePush() {
  const subscription = await getPushSubscription();
  if (!subscription) {
    localStorage.removeItem(PUSH_SUB_KEY);
    return false;
  }

  const ok = await subscription.unsubscribe();
  localStorage.removeItem(PUSH_SUB_KEY);
  return ok;
}

export async function getPushStatus() {
  if (!isPushSupported()) {
    return {
      supported: false,
      permission: 'unsupported',
      subscribed: false,
      endpoint: '',
    };
  }

  const subscription = await getPushSubscription();
  return {
    supported: true,
    permission: Notification.permission,
    subscribed: Boolean(subscription),
    endpoint: subscription?.endpoint || '',
  };
}

export async function triggerLocalTestNotification() {
  if (!isPushSupported()) throw new Error('Push desteklenmiyor.');
  const registration = await navigator.serviceWorker.ready;

  if (Notification.permission !== 'granted') {
    throw new Error('Test bildirimi icin once bildirim izni vermelisiniz.');
  }

  await registration.showNotification('Sonvera Bildirim Testi', {
    body: 'Push kanali aktif gorunuyor. Sunucu entegrasyonu sonraki adimda baglanabilir.',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'nilfatura-local-test',
    data: { url: '/#/dashboard' },
  });
}
