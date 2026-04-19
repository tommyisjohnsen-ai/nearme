// Service Worker for NearMe — handles Web Push notifications

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(clients.claim());
});

self.addEventListener('push', (e) => {
  if (!e.data) return;

  let data = {};
  try {
    data = e.data.json();
  } catch {
    data = { title: 'NearMe', body: e.data.text() };
  }

  const options = {
    body: data.body || '',
    icon: data.icon || '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    data: data.data || {},
    actions: [
      { action: 'open', title: 'Åpne NearMe' },
      { action: 'close', title: 'Lukk' },
    ],
  };

  e.waitUntil(self.registration.showNotification(data.title || 'NearMe', options));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();

  if (e.action === 'close') return;

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow('/');
    })
  );
});
