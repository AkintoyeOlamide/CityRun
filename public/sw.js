/* City Run — phone push notifications (works when app is in background) */
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = {
    title: "City Run",
    body: "You have a new update.",
    url: "/cityrun/home",
    tag: "cityrun",
  };

  try {
    if (event.data) {
      payload = { ...payload, ...event.data.json() };
    }
  } catch {
    /* use defaults */
  }

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(payload.title, {
        body: payload.body,
        icon: "/icon-192.png",
        badge: "/favicon-32.png",
        tag: payload.tag || "cityrun",
        renotify: true,
        data: { url: payload.url || "/cityrun/rider" },
        requireInteraction: true,
        silent: false,
        vibrate: [400, 120, 400, 120, 400, 120, 600, 120, 600],
      }),
      self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: "cityrun:rider-new-ride-push",
            title: payload.title,
            body: payload.body,
            url: payload.url || "/cityrun/rider",
            tag: payload.tag,
          });
        });
      }),
    ]),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = new URL(
    event.notification.data?.url || "/cityrun/home",
    self.location.origin,
  ).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.startsWith(self.location.origin) && "focus" in client) {
          if ("navigate" in client && typeof client.navigate === "function") {
            return client.navigate(targetUrl).then(() => client.focus());
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    }),
  );
});
