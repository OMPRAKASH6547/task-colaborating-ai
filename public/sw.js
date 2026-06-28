const CACHE_NAME = "collabdocs-v1";
const OFFLINE_URL = "/dashboard";

self.addEventListener("install", (event: ExtendableEvent) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(["/", "/dashboard", "/login"]),
    ),
  );
  (self as unknown as ServiceWorkerGlobalScope).skipWaiting();
});

self.addEventListener("activate", (event: ExtendableEvent) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)),
      ),
    ),
  );
  (self as unknown as ServiceWorkerGlobalScope).clients.claim();
});

self.addEventListener("fetch", (event: FetchEvent) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() =>
        caches.match(event.request).then(
          (cached) => cached ?? caches.match(OFFLINE_URL),
        ),
      ) as Promise<Response>,
  );
});

self.addEventListener("push", (event: PushEvent) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    (self as unknown as ServiceWorkerGlobalScope).registration.showNotification(
      data.title ?? "CollabDocs",
      {
        body: data.message ?? "You have a new notification",
        icon: "/favicon.ico",
        badge: "/favicon.ico",
      },
    ),
  );
});

export {};
