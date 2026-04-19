import { api } from './api';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js');
    console.log('[SW] Registered:', reg.scope);
    return reg;
  } catch (err) {
    console.error('[SW] Registration failed:', err);
    return null;
  }
}

export async function subscribeToPush() {
  if (!('PushManager' in window)) {
    console.log('[Push] Not supported');
    return;
  }

  try {
    const { key } = await api.getVapidKey();
    if (!key) {
      console.log('[Push] No VAPID key configured on server');
      return;
    }

    const reg = await navigator.serviceWorker.ready;
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;

    const existing = await reg.pushManager.getSubscription();
    if (existing) {
      await api.savePushSubscription(existing.toJSON());
      return;
    }

    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key),
    });

    await api.savePushSubscription(subscription.toJSON());
    console.log('[Push] Subscribed successfully');
  } catch (err) {
    console.error('[Push] Subscribe error:', err);
  }
}
