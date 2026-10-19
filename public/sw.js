/* A Universe of Two: service worker. Push notifications only; nothing is cached,
   so you never see a stale version of your memories. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

// Network only: no caching. (A listener must exist for older Chrome versions to offer "Install".)
self.addEventListener("fetch", () => {});

self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) {}
  const show = self.registration.showNotification(data.title || "A Universe of Two", {
    body: data.body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/badge-72.png",
    tag: data.tag || "universe",
    data: { url: data.url || "/" },
  });
  const badge = self.navigator && self.navigator.setAppBadge ? self.navigator.setAppBadge().catch(() => {}) : Promise.resolve();
  event.waitUntil(Promise.all([show, badge]));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    (async () => {
      const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const c of wins) {
        if ("focus" in c) {
          await c.focus();
          if ("navigate" in c) { try { await c.navigate(url); } catch (e) {} }
          return;
        }
      }
      await self.clients.openWindow(url);
    })()
  );
});
