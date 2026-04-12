const CACHE_NAME = "notes-cache-v4";
const DYNAMIC_CACHE_NAME = "dynamic-content-v2";

const ASSETS = [
  "/",
  "/index.html",
  "/style.css",
  "/app.js",
  "/manifest.json",
  "/icons/favicon-32x32.png",
  "/icons/android-chrome-192x192.png",
  "/icons/android-chrome-512x512.png",
];

self.addEventListener("install", (event) => {
  console.log("[SW] Install v4");
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  console.log("[SW] Activate v4");
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME && key !== DYNAMIC_CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Не кэшируем запросы к другим доменам и API
  if (url.origin !== location.origin) return;
  if (url.pathname.startsWith("/subscribe")) return;
  if (url.pathname.startsWith("/unsubscribe")) return;
  if (url.pathname.startsWith("/test-push")) return;
  if (url.pathname.startsWith("/snooze")) return;
  if (url.pathname.startsWith("/socket.io")) return;

  // Динамический контент — сначала сеть
  if (url.pathname.startsWith("/content/")) {
    event.respondWith(
      fetch(event.request)
        .then((networkRes) => {
          const resClone = networkRes.clone();
          caches.open(DYNAMIC_CACHE_NAME).then((cache) => {
            cache.put(event.request, resClone);
          });
          return networkRes;
        })
        .catch(() =>
          caches
            .match(event.request)
            .then((cached) => cached || caches.match("/content/home.html")),
        ),
    );
    return;
  }

  // Статика — кэш, потом сеть
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request);
    }),
  );
});

// ==================== PUSH ====================
self.addEventListener("push", (event) => {
  console.log("[SW] Push получен!");

  let data = { title: "Уведомление", body: "Без текста" };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  console.log("[SW] Push data:", JSON.stringify(data));

  const options = {
    body: data.body,
    icon: "/icons/android-chrome-192x192.png",
    badge: "/icons/favicon-32x32.png",
    vibrate: [200, 100, 200],
    tag: "note-" + Date.now(),
    renotify: true,
    requireInteraction: true,
    data: {
      url: "/",
      reminderId: data.reminderId || null,
      text: data.body || "",
    },
  };

  // Кнопка «Отложить» только для напоминаний
  if (data.reminderId) {
    options.actions = [
      { action: "snooze", title: "⏰ Отложить на 5 мин" },
      { action: "dismiss", title: "✕ Закрыть" },
    ];
  }

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// ==================== КЛИК ПО УВЕДОМЛЕНИЮ ====================
self.addEventListener("notificationclick", (event) => {
  console.log("[SW] Notification click, action:", event.action);
  event.notification.close();

  if (event.action === "snooze") {
    const reminderId = event.notification.data.reminderId;
    const text = event.notification.data.text || "Отложенное напоминание";

    // Строим абсолютный URL через scope
    const baseUrl = self.registration.scope.replace(/\/$/, "");
    const snoozeUrl = `${baseUrl}/snooze?reminderId=${reminderId}`;

    event.waitUntil(
      fetch(snoozeUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text }),
      })
        .then(() => console.log("[SW] Snooze отправлен"))
        .catch((err) => console.error("[SW] Snooze ошибка:", err)),
    );
    return;
  }

  if (event.action === "dismiss") return;

  // Клик по самому уведомлению — открыть приложение
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((windowClients) => {
      for (const client of windowClients) {
        if ("focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow("/");
      }
    }),
  );
});
