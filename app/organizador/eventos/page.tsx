"use client";

import { TablaCargando } from "@/components/ui/cargando";
import { useEffect, useState } from "react";
import Link from "next/link";
import { listEventosGestionablesAction, type EventoResumen } from "@/lib/actions";
import { codigoEvento } from "@/lib/codigos";
import { Badge, Button, Card } from "@/components/ui";

function formatCOP(value: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(
    value
  );
}

const TONO: Record<string, "success" | "gold" | "danger" | "brand"> = {
  publicado: "success",
  pausado: "gold",
  cerrado: "brand",
  borrador: "brand",
  suspendido: "danger",
};

export default function MisEventosPage() {
  const [filas, setFilas] = useState<EventoResumen[] | null>(null);

  useEffect(() => {
    listEventosGestionablesAction().then(setFilas);
  }, []);

  const inscritos = filas?.reduce((s, f) => s + f.inscritos, 0) ?? 0;
  const confirmados = filas?.reduce((s, f) => s + f.confirmados, 0) ?? 0;
  const ingresados = filas?.reduce((s, f) => s + f.ingresados, 0) ?? 0;
  const recaudo = filas?.reduce((s, f) => s + f.recaudo, 0) ?? 0;

  return (
    <div className="px-4 py-8 sm:px-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Mis eventos</h1>
          <p className="text-sm text-ink-soft">Inscritos, pagos e ingresos de cada uno de tus eventos.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/escaner">
            <Button variant="outline">Escanear ingresos</Button>
          </Link>
          <Link href="/organizador/eventos/nuevo">
            <Button>Crear evento</Button>
          </Link>
        </div>
      </div>

      {filas === null && <TablaCargando />}

      {filas && (
        <>
          <div className="mb-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Card className="text-center">
              <p className="font-display text-3xl font-semibold text-ink">{inscritos}</p>
              <p className="text-sm text-ink-soft">Inscripciones</p>
            </Card>
            <Card className="text-center">
              <p className="font-display text-3xl font-semibold text-brand-dark">{confirmados}</p>
              <p className="text-sm text-ink-soft">Pagos confirmados</p>
            </Card>
            <Card className="text-center">
              <p className="font-display text-3xl font-semibold text-brand-dark">{ingresados}</p>
              <p className="text-sm text-ink-soft">Personas que ingresaron</p>
            </Card>
            <Card className="text-center">
              <p className="font-display text-2xl font-semibold text-brand-dark sm:text-3xl">{formatCOP(recaudo)}</p>
              <p className="text-sm text-ink-soft">Recaudo confirmado</p>
            </Card>
          </div>

          {filas.length === 0 && (
            <Card className="text-center">
              <p className="mb-3 text-ink-soft">Todavía no has creado ningún evento.</p>
              <Link href="/organizador/eventos/nuevo" className="text-sm font-medium text-brand-dark">
                Crear mi primer evento
              </Link>
            </Card>
          )}

          <div className="space-y-3">
            {filas.map(({ evento, inscritos: n, confirmados: c, ingresados: i, recaudo: rec }) => {
              const cupos = evento.categorias.reduce((s, x) => s + x.cupos, 0);
              const libres = evento.categorias.reduce((s, x) => s + x.cuposDisponibles, 0);
              const pct = cupos ? Math.round(((cupos - libres) / cupos) * 100) : 0;
              return (
                <Card key={evento.id} className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium text-ink-faint">{codigoEvento(evento.numero)}</p>
                      <p className="font-display font-semibold text-ink">{evento.nombre}</p>
                      <p className="text-sm text-ink-soft">
                        {new Date(evento.fecha + "T00:00:00").toLocaleDateString("es-CO")} · {evento.lugar}
                      </p>
                    </div>
                    <Badge tone={TONO[evento.estado] ?? "brand"}>{evento.estado}</Badge>
                  </div>

                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-line">
                    <div className="h-full rounded-full bg-gradient-to-r from-brand to-accent" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-ink-soft">
                    {cupos - libres} de {cupos} cupos ocupados ({pct}%)
                  </p>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-ink-soft">
                      <span className="font-medium text-ink">{n}</span> inscritos ·{" "}
                      <span className="font-medium text-ink">{c}</span> pagados ·{" "}
                      <span className="font-medium text-ink">{i}</span> ingresaron ·{" "}
                      <span className="font-medium text-ink">{formatCOP(rec)}</span>
                    </p>
                    <div className="flex gap-2">
                      <Link href={`/escaner/${evento.id}`}>
                        <Button variant="outline" className="px-4 py-2">Escáner</Button>
                      </Link>
                      <Link href={`/organizador/eventos/${evento.id}`}>
                        <Button className="px-4 py-2">Gestionar</Button>
                      </Link>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
