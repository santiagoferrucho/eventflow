"use client";

import { useEffect } from "react";

// Registra el service worker (boleta sin conexión y notificaciones). Solo en producción.
export function RegistrarSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);
  return null;
}
