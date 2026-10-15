"use client";

import { TablaCargando } from "@/components/ui/cargando";
import { useEffect, useState } from "react";
import Link from "next/link";
import { listEventosGestionablesAction, type EventoResumen } from "@/lib/actions";
import { Encabezado } from "@/components/kpi";
import { NovedadesPanel } from "@/components/novedades-panel";
import { Card } from "@/components/ui";

export default function NovedadesPage() {
  const [eventos, setEventos] = useState<EventoResumen[] | null>(null);
  const [elegido, setElegido] = useState("");

  useEffect(() => {
    let activo = true;
    listEventosGestionablesAction().then((f) => {
      if (!activo) return;
      setEventos(f);
      if (f[0]) setElegido(f[0].evento.id);
    });
    return () => {
      activo = false;
    };
  }, []);

  return (
    <div className="max-w-3xl px-4 py-8 sm:px-8">
      <Encabezado titulo="Novedades" descripcion="Avisa a los inscritos de un evento: cambios de hora, lugar o instrucciones." />
      {eventos === null && <TablaCargando />}
      {eventos?.length === 0 && (
        <Card className="text-center">
          <p className="mb-2 text-ink-soft">Primero crea un evento para poder enviar novedades.</p>
          <Link href="/organizador/eventos/nuevo" className="text-sm font-medium text-brand-dark">Crear evento</Link>
        </Card>
      )}
      {eventos && eventos.length > 0 && (
        <>
          <label className="mb-4 block">
            <span className="mb-1.5 block text-sm font-medium text-ink-soft">Evento</span>
            <select value={elegido} onChange={(e) => setElegido(e.target.value)} className="w-full rounded-xl border border-line-strong bg-surface px-3.5 py-2.5 text-[15px] text-ink">
              {eventos.map(({ evento, inscritos }) => (
                <option key={evento.id} value={evento.id}>{evento.nombre} ({inscritos} inscritos)</option>
              ))}
            </select>
          </label>
          {elegido && <NovedadesPanel key={elegido} eventoId={elegido} />}
        </>
      )}
    </div>
  );
}
