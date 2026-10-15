"use client";

import { useEffect, useState } from "react";
import { guardarSuscripcionPushAction, pushHabilitadoAction, quitarSuscripcionPushAction } from "@/lib/actions";
import { AceptarPolitica, Button, Card } from "@/components/ui";

const CLAVE_PUBLICA = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function aBytes(base64: string): Uint8Array<ArrayBuffer> {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const b = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(b.length));
  for (let i = 0; i < b.length; i++) out[i] = b.charCodeAt(i);
  return out;
}

type Estado = "cargando" | "no_disponible" | "inactivo" | "activo" | "bloqueado";

// Activa o desactiva los avisos del navegador sobre novedades de los eventos.
export function PushToggle() {
  const [estado, setEstado] = useState<Estado>("cargando");
  const [acepta, setAcepta] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    let activo = true;
    (async () => {
      const soportado = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
      if (!soportado || !CLAVE_PUBLICA || !(await pushHabilitadoAction())) {
        if (activo) setEstado("no_disponible");
        return;
      }
      if (Notification.permission === "denied") {
        if (activo) setEstado("bloqueado");
        return;
      }
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (activo) setEstado(sub ? "activo" : "inactivo");
    })().catch(() => activo && setEstado("no_disponible"));
    return () => {
      activo = false;
    };
  }, []);

  async function activar() {
    setError(null);
    setOcupado(true);
    try {
      const permiso = await Notification.requestPermission();
      if (permiso !== "granted") {
        setEstado(permiso === "denied" ? "bloqueado" : "inactivo");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: aBytes(CLAVE_PUBLICA) });
      const j = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
      const r = await guardarSuscripcionPushAction(j, acepta);
      if (!r.ok) {
        await sub.unsubscribe();
        setError(r.error);
        return;
      }
      setEstado("activo");
    } catch {
      setError("No pudimos activar las notificaciones en este navegador.");
    } finally {
      setOcupado(false);
    }
  }

  async function desactivar() {
    setOcupado(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await quitarSuscripcionPushAction(sub.endpoint);
        await sub.unsubscribe();
      }
      setEstado("inactivo");
    } finally {
      setOcupado(false);
    }
  }

  if (estado === "cargando" || estado === "no_disponible") return null;

  return (
    <Card className="mb-6">
      <p className="font-medium text-ink">Avisos de tus eventos</p>
      {estado === "activo" ? (
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-ink-soft">Recibirás en este dispositivo las novedades que publique el organizador.</p>
          <Button variant="outline" onClick={desactivar} disabled={ocupado}>
            Desactivar
          </Button>
        </div>
      ) : estado === "bloqueado" ? (
        <p className="mt-1 text-sm text-ink-soft">Bloqueaste las notificaciones en el navegador. Puedes habilitarlas desde los permisos del sitio.</p>
      ) : (
        <div className="mt-2 space-y-3">
          <p className="text-sm text-ink-soft">Entérate de cambios de hora, lugar o instrucciones del evento sin abrir la app.</p>
          <AceptarPolitica
            checked={acepta}
            onChange={setAcepta}
            texto="guardar la suscripción de este dispositivo para enviarme las novedades de mis eventos"
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button onClick={activar} disabled={ocupado || !acepta}>
            Activar notificaciones
          </Button>
        </div>
      )}
    </Card>
  );
}
