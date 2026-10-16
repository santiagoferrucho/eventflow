/* EventFlow — service worker.
 * - Guarda la página /boleta y los archivos estáticos para abrir la boleta sin conexión.
 * - NO guarda páginas privadas, respuestas de la API ni acciones del servidor.
 * - Recibe y muestra las notificaciones push. */
const VERSION = "v1";
const CACHE = `eventflow-${VERSION}`;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(["/boleta", "/icon-192.png", "/manifest.webmanifest"]).catch(() => undefined))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("eventflow-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  // Al cerrar sesión se borra lo guardado.
  if (event.data === "limpiar") event.waitUntil(caches.delete(CACHE));
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  // Archivos estáticos: primero la copia guardada.
  if (url.pathname.startsWith("/_next/static/") || /\.(png|svg|webmanifest|ico)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copia = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copia));
            }
            return res;
          })
      )
    );
    return;
  }

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (url.pathname === "/boleta" && res.ok) {
            const copia = res.clone();
            caches.open(CACHE).then((c) => c.put("/boleta", copia));
          }
          return res;
        })
        .catch(() => caches.match("/boleta").then((hit) => hit || Response.error()))
    );
  }
});

self.addEventListener("push", (event) => {
  let datos = {};
  try {
    datos = event.data ? event.data.json() : {};
  } catch {
    datos = {};
  }
  const titulo = datos.titulo || "EventFlow";
  event.waitUntil(
    self.registration.showNotification(titulo, {
      body: datos.mensaje || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: datos.url || "/mis-inscripciones" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const destino = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((ventanas) => {
      for (const v of ventanas) {
        if ("focus" in v) {
          v.navigate(destino);
          return v.focus();
        }
      }
      return self.clients.openWindow(destino);
    })
  );
});
