"use client";

import { useState } from "react";
import { listEventosCercanosAction, type EventoCercano } from "@/lib/actions";
import type { SportEvent } from "@/lib/types";
import { Button, Card } from "@/components/ui";
import { EventoCard } from "@/components/evento-card";

type Estado = "inicio" | "buscando" | "cerca" | "rechazado" | "error";

// Sección "cerca de ti". Pide la ubicación solo cuando la persona lo decide.
// Si la rechaza (o no hay eventos con ubicación), muestra el top global.
export function EventosCercanos({ populares }: { populares: SportEvent[] }) {
  const [estado, setEstado] = useState<Estado>("inicio");
  const [cercanos, setCercanos] = useState<EventoCercano[]>([]);

  function pedirUbicacion() {
    if (!("geolocation" in navigator)) {
      setEstado("rechazado");
      return;
    }
    setEstado("buscando");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lista = await listEventosCercanosAction(pos.coords.latitude, pos.coords.longitude);
          setCercanos(lista);
          setEstado("cerca");
        } catch {
          setEstado("error");
        }
      },
      () => setEstado("rechazado"),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60_000 }
    );
  }

  if (populares.length === 0 && estado !== "cerca") return null;

  return (
    <section className="mx-auto max-w-5xl px-4 pt-12 sm:px-6">
      {estado === "cerca" && cercanos.length > 0 ? (
        <>
          <h2 className="mb-5 text-sm font-medium uppercase tracking-wide text-ink-soft">Cerca de ti</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {cercanos.map(({ evento, distanciaKm }) => (
              <EventoCard key={evento.id} evento={evento} distanciaKm={distanciaKm} />
            ))}
          </div>
          <p className="mt-3 text-xs text-ink-faint">Tu ubicación se usó solo para esta búsqueda; no la guardamos.</p>
        </>
      ) : (
        <>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-medium uppercase tracking-wide text-ink-soft">Los más populares</h2>
            {(estado === "inicio" || estado === "error") && (
              <Button variant="outline" onClick={pedirUbicacion}>
                Ver eventos cerca de mí
              </Button>
            )}
            {estado === "buscando" && <span className="text-sm text-ink-soft">Buscando…</span>}
          </div>
          {estado === "inicio" && (
            <p className="mb-4 text-xs text-ink-faint">
              Si aceptas, tu navegador te pedirá permiso para usar tu ubicación. La usamos solo para ordenar los eventos por
              cercanía en este momento; no la guardamos. Si prefieres no compartirla, verás los eventos más populares.
            </p>
          )}
          {estado === "rechazado" && (
            <Card className="mb-4 text-sm text-ink-soft">
              No usamos tu ubicación. Te mostramos los eventos más populares del momento.
            </Card>
          )}
          {estado === "cerca" && (
            <Card className="mb-4 text-sm text-ink-soft">
              Todavía no hay eventos con ubicación cerca de ti. Te mostramos los más populares.
            </Card>
          )}
          {estado === "error" && <p className="mb-4 text-sm text-danger">No pudimos buscar eventos cercanos. Intenta de nuevo.</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            {populares.map((e) => (
              <EventoCard key={e.id} evento={e} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
