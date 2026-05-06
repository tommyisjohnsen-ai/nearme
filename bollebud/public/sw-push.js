// Custom service worker for Web Push. next-pwa imports this on top of its
// generated workbox SW (see next.config.mjs `importScripts`).

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Bollebud", body: event.data.text() };
  }
  const { title, body, url, tag } = payload;
  event.waitUntil(
    self.registration.showNotification(title || "Bollebud", {
      body: body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-72.png",
      tag: tag || undefined,
      data: { url: url || "/" },
      vibrate: [80, 40, 80],
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    }),
  );
});
