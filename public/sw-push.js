// Custom push notification handler for geofence alerts
// This runs in the service worker context, independent of the main app

self.addEventListener("push", (event) => {
  if (!event.data) return;

  try {
    const payload = event.data.json();
    const { title, body, icon, tag, data } = payload;

    event.waitUntil(
      self.registration.showNotification(title || "eWard Nest", {
        body: body || "You have a new notification",
        icon: icon || "/pwa-192.png",
        badge: "/pwa-192.png",
        tag: tag || "eward-notification",
        vibrate: [100, 50, 100],
        data: data || {},
        actions: [
          { action: "open", title: "Open App" },
          { action: "dismiss", title: "Dismiss" },
        ],
      })
    );
  } catch {
    // Fallback for plain text push
    event.waitUntil(
      self.registration.showNotification("eWard Nest", {
        body: event.data.text(),
        icon: "/pwa-192.png",
      })
    );
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") return;

  const urlToOpen = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Focus existing window if available
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.navigate(urlToOpen);
            return client.focus();
          }
        }
        // Otherwise open new window
        return self.clients.openWindow(urlToOpen);
      })
  );
});
