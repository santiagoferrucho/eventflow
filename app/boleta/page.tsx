"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { leerBoletas, quitarBoleta, type BoletaLocal } from "@/lib/boletas-locales";
import { descargarBoletaPNG } from "@/lib/boleta-imagen";
import { Button, Card } from "@/components/ui";

// Boletas guardadas en este dispositivo. Se abre sin conexión (el service
// worker guarda esta página) y no pide sesión: todo sale del almacenamiento local.
export default function BoletaOfflinePage() {
  const [boletas, setBoletas] = useState<BoletaLocal[] | null>(null);
  const [enLinea, setEnLinea] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setBoletas(leerBoletas());
      setEnLinea(navigator.onLine);
    }, 0);
    const on = () => setEnLinea(true);
    const off = () => setEnLinea(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      clearTimeout(t);
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  async function descargar(b: BoletaLocal) {
    setError(null);
    try {
      await descargarBoletaPNG(b);
    } catch {
      setError("No pudimos generar la imagen. Intenta de nuevo.");
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <h1 className="font-display mb-1 text-2xl font-semibold text-ink">Mis boletas en este dispositivo</h1>
      <p className="mb-6 text-sm text-ink-soft">
        {enLinea ? "Estas boletas también funcionan sin internet." : "Sin conexión: tus boletas guardadas siguen disponibles."}
      </p>
      {error && <p className="mb-3 text-sm text-danger">{error}</p>}
      {boletas === null && <p className="text-ink-soft">Cargando…</p>}
      {boletas?.length === 0 && (
        <Card className="text-center">
          <p className="mb-3 text-ink-soft">No has guardado boletas en este dispositivo.</p>
          <Link href="/mis-inscripciones" className="text-sm font-medium text-brand-dark">
            Ir a mis inscripciones y pulsar «Guardar sin conexión»
          </Link>
        </Card>
      )}
      <div className="space-y-4">
        {boletas?.map((b) => (
          <Card key={b.registroId} className="text-center">
            <p className="text-xs text-ink-faint">{b.eventoCodigo}</p>
            <p className="font-display text-lg font-semibold text-ink">{b.eventoNombre}</p>
            <p className="text-sm text-ink-soft">
              {new Date(b.fecha + "T00:00:00").toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" })} · {b.lugar}
            </p>
            <div className="mx-auto my-4 w-fit rounded-lg border border-line bg-white p-4">
              <QRCodeSVG value={b.qr} size={200} />
            </div>
            <p className="text-sm font-medium text-ink">{b.participante}</p>
            <p className="text-xs text-ink-soft">{b.categoria}</p>
            <div className="mt-4 flex justify-center gap-3">
              <Button variant="outline" onClick={() => descargar(b)}>
                Descargar imagen
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  quitarBoleta(b.registroId);
                  setBoletas(leerBoletas());
                }}
              >
                Quitar del dispositivo
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
