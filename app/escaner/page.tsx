"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listEventosGestionablesAction, type EventoResumen } from "@/lib/actions";
import { codigoEvento } from "@/lib/codigos";
import { Badge, Card } from "@/components/ui";

export default function EscanerIndexPage() {
  const [eventos, setEventos] = useState<EventoResumen[] | null>(null);

  useEffect(() => {
    listEventosGestionablesAction().then(setEventos);
  }, []);

  return (
    <div className="px-4 py-8 sm:px-8">
      <h1 className="font-display mb-1 text-2xl font-semibold text-ink">Control de ingreso</h1>
      <p className="mb-8 text-sm text-ink-soft">Elige el evento en el que vas a escanear los tiquetes.</p>

      {eventos === null && <p className="text-ink-soft">Cargando...</p>}
      {eventos?.length === 0 && (
        <Card className="text-center">
          <p className="text-ink-soft">Todavía no hay eventos para controlar.</p>
        </Card>
      )}

      <div className="space-y-3">
        {eventos?.map(({ evento, confirmados, ingresados }) => (
          <Link key={evento.id} href={`/escaner/${evento.id}`} className="block">
            <Card className="flex flex-wrap items-center justify-between gap-3 transition-shadow hover:shadow-md">
              <div>
                <p className="text-xs font-medium text-ink-faint">{codigoEvento(evento.numero)}</p>
                <p className="font-display font-semibold text-ink">{evento.nombre}</p>
                <p className="text-sm text-ink-soft">
                  {new Date(evento.fecha + "T00:00:00").toLocaleDateString("es-CO", { day: "numeric", month: "long" })} ·{" "}
                  {evento.lugar}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={ingresados > 0 ? "success" : "brand"}>
                  {ingresados} de {confirmados} ingresaron
                </Badge>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
