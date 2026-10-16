"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getAdminStatsAction,
  getResumenPanelAction,
  listEventosGestionablesAction,
  type EstadisticasPlataforma,
  type ResumenPanel,
} from "@/lib/actions";
import { BarraSegmentada, BarrasHorizontales, BarrasPorDia } from "@/components/charts";
import { BadgeCheck, CalendarDays, ClipboardList, ScanLine, ShieldCheck, UserCog, Users, Wallet } from "lucide-react";
import { Encabezado, Kpi } from "@/components/kpi";
import { Button, Card } from "@/components/ui";

const COP = (v: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(v);
const dia = (iso: string) => new Date(iso + "T12:00:00").toLocaleDateString("es-CO", { day: "numeric", month: "short" });

const COLOR_ESTADO: Record<string, { texto: string; color: string }> = {
  confirmado: { texto: "Confirmados", color: "var(--success)" },
  pendiente: { texto: "Pendientes", color: "var(--gold)" },
  expirado: { texto: "Vencidos", color: "var(--ink-faint)" },
  rechazado: { texto: "Rechazados", color: "var(--danger)" },
  procesando: { texto: "Procesando", color: "var(--accent)" },
};

interface Cifras {
  inscripciones: number;
  pagadas: number;
  ingresados: number;
  recaudo: number;
  eventos: number;
}

export function ResumenPanelView({ admin }: { admin: boolean }) {
  const [resumen, setResumen] = useState<ResumenPanel | null>(null);
  const [stats, setStats] = useState<EstadisticasPlataforma | null>(null);
  const [cifras, setCifras] = useState<Cifras | null>(null);

  useEffect(() => {
    let activo = true;
    getResumenPanelAction().then((r) => activo && setResumen(r));
    if (admin) getAdminStatsAction().then((s) => activo && (setStats(s), setCifras({ inscripciones: s.inscripciones, pagadas: s.pagadas, ingresados: s.ingresados, recaudo: s.recaudo, eventos: s.eventos })));
    else
      listEventosGestionablesAction().then((f) => {
        if (!activo) return;
        setCifras({
          inscripciones: f.reduce((s, x) => s + x.inscritos, 0),
          pagadas: f.reduce((s, x) => s + x.confirmados, 0),
          ingresados: f.reduce((s, x) => s + x.ingresados, 0),
          recaudo: f.reduce((s, x) => s + x.recaudo, 0),
          eventos: f.length,
        });
      });
    return () => {
      activo = false;
    };
  }, [admin]);

  if (!resumen || !cifras) return <div className="px-4 py-10 text-ink-soft sm:px-8">Cargando...</div>;

  const tasa = cifras.pagadas ? Math.round((cifras.ingresados / cifras.pagadas) * 100) : 0;
  const total7 = resumen.serie.slice(-7).reduce((s, d) => s + d.inscripciones, 0);

  return (
    <div className="px-4 py-8 sm:px-8">
      <Encabezado
        titulo="Resumen"
        descripcion={admin ? "Estado de toda la plataforma." : "Cómo van tus eventos."}
        acciones={
          admin ? (
            <Link href="/admin/organizadores"><Button variant="outline">Organizadores</Button></Link>
          ) : (
            <Link href="/organizador/eventos/nuevo"><Button>Crear evento</Button></Link>
          )
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi icono={Wallet} etiqueta="Recaudo confirmado" valor={COP(cifras.recaudo)} tono="brand" />
        <Kpi icono={ClipboardList} etiqueta="Inscripciones" valor={cifras.inscripciones} nota={`${total7} en los últimos 7 días`} />
        <Kpi icono={BadgeCheck} etiqueta="Pagos confirmados" valor={cifras.pagadas} tono="success" nota={`${cifras.inscripciones - cifras.pagadas} sin confirmar`} />
        <Kpi icono={ScanLine} etiqueta="Ingresaron" valor={cifras.ingresados} tono="brand" nota={`${tasa}% de los pagados`} />
      </div>
      {admin && stats && (
        <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Kpi icono={CalendarDays} etiqueta="Eventos publicados" valor={`${stats.eventosPublicados} / ${stats.eventos}`} />
          <Kpi icono={ShieldCheck} etiqueta="Organizadores" valor={stats.organizadores} />
          <Kpi icono={Users} etiqueta="Participantes" valor={stats.participantes} />
          <Kpi icono={UserCog} etiqueta="Administradores" valor={stats.administradores} />
        </div>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="font-display mb-1 text-base font-semibold text-ink">Inscripciones por día</h2>
          <p className="mb-2 text-xs text-ink-soft">Últimos 14 días</p>
          <BarrasPorDia datos={resumen.serie.map((d) => ({ etiqueta: dia(d.fecha), valor: d.inscripciones }))} />
        </Card>
        <Card>
          <h2 className="font-display mb-1 text-base font-semibold text-ink">Recaudo por día</h2>
          <p className="mb-2 text-xs text-ink-soft">Pagos confirmados, según el día de la inscripción</p>
          <BarrasPorDia datos={resumen.serie.map((d) => ({ etiqueta: dia(d.fecha), valor: d.recaudo }))} color="var(--accent)" formato={COP} />
        </Card>
      </div>

      <Card className="mt-4">
        <h2 className="font-display mb-3 text-base font-semibold text-ink">Estado de los pagos</h2>
        {resumen.porEstado.length === 0 ? (
          <p className="text-sm text-ink-soft">Aún no hay inscripciones.</p>
        ) : (
          <BarraSegmentada
            datos={resumen.porEstado.map((e) => ({
              etiqueta: COLOR_ESTADO[e.estado]?.texto ?? e.estado,
              valor: e.n,
              color: COLOR_ESTADO[e.estado]?.color ?? "var(--brand)",
            }))}
          />
        )}
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="font-display mb-3 text-base font-semibold text-ink">Eventos con más recaudo</h2>
          {resumen.topEventos.length === 0 ? (
            <p className="text-sm text-ink-soft">Todavía no hay eventos.</p>
          ) : (
            <BarrasHorizontales
              datos={resumen.topEventos.map((e) => ({ etiqueta: e.nombre, valor: e.recaudo, detalle: `${COP(e.recaudo)} · ${e.inscritos}/${e.cupos} cupos` }))}
            />
          )}
        </Card>
        <Card>
          <h2 className="font-display mb-3 text-base font-semibold text-ink">Próximos eventos</h2>
          {resumen.proximos.length === 0 ? (
            <p className="text-sm text-ink-soft">No hay eventos publicados con fecha próxima.</p>
          ) : (
            <ul className="divide-y divide-line">
              {resumen.proximos.map((e) => {
                const pct = e.cupos ? Math.round((e.ocupados / e.cupos) * 100) : 0;
                return (
                  <li key={e.id} className="py-3">
                    <Link href={`/organizador/eventos/${e.id}`} className="flex items-baseline justify-between gap-3">
                      <span className="truncate font-medium text-ink">{e.nombre}</span>
                      <span className="shrink-0 text-xs text-ink-soft">{new Date(e.fecha + "T12:00:00").toLocaleDateString("es-CO", { day: "numeric", month: "short" })}</span>
                    </Link>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line">
                      <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="mt-1 text-xs text-ink-soft">{e.ocupados} de {e.cupos} cupos ({pct}%) · {e.lugar}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      {admin && (
        <Card className="mt-4">
          <h2 className="font-display mb-3 text-base font-semibold text-ink">Organizadores con más recaudo</h2>
          {resumen.topOrganizadores.length === 0 ? (
            <p className="text-sm text-ink-soft">Aún no hay organizadores con eventos.</p>
          ) : (
            <BarrasHorizontales
              datos={resumen.topOrganizadores.map((o) => ({
                etiqueta: `${o.nombre}${o.codigo ? ` (${o.codigo})` : ""}`,
                valor: o.recaudo,
                detalle: `${COP(o.recaudo)} · ${o.eventos} eventos · ${o.inscritos} inscritos`,
              }))}
            />
          )}
        </Card>
      )}
    </div>
  );
}
