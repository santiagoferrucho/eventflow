"use client";

import { TablaCargando } from "@/components/ui/cargando";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { cambiarEstadoEventoAction, listAllEventsAction, listAllRegistrationsAction } from "@/lib/actions";
import type { EventStatus, Registration, SportEvent } from "@/lib/types";
import { codigoEvento, codigoOrganizador } from "@/lib/codigos";
import { Encabezado } from "@/components/kpi";
import { Paginacion } from "@/components/paginacion";
import { Badge, Button, TextInput } from "@/components/ui";

const ESTADOS: EventStatus[] = ["publicado", "pausado", "cerrado", "suspendido"];
const TONO: Record<string, "success" | "gold" | "danger" | "brand"> = {
  publicado: "success",
  pausado: "gold",
  cerrado: "brand",
  borrador: "brand",
  suspendido: "danger",
};
const POR_PAGINA = 10;

export default function EventosAdminPage() {
  const [eventos, setEventos] = useState<SportEvent[] | null>(null);
  const [inscripciones, setInscripciones] = useState<Registration[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [estado, setEstado] = useState<"todos" | EventStatus>("todos");
  const [pagina, setPagina] = useState(0);
  const [aviso, setAviso] = useState<string | null>(null);
  const [cambiando, setCambiando] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;
    Promise.all([listAllEventsAction(), listAllRegistrationsAction()]).then(([e, i]) => {
      if (!activo) return;
      setEventos(e);
      setInscripciones(i);
    });
    return () => {
      activo = false;
    };
  }, []);

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return (eventos ?? []).filter(
      (e) =>
        (estado === "todos" || e.estado === estado) &&
        (!q || [e.nombre, e.lugar, e.disciplina, codigoEvento(e.numero)].join(" ").toLowerCase().includes(q))
    );
  }, [eventos, busqueda, estado]);
  const pagActual = Math.min(pagina, Math.max(0, Math.ceil(visibles.length / POR_PAGINA) - 1));
  const pagina_ = visibles.slice(pagActual * POR_PAGINA, (pagActual + 1) * POR_PAGINA);

  async function cambiarEstado(eventoId: string, nuevo: EventStatus) {
    setCambiando(eventoId);
    setAviso(null);
    try {
      const res = await cambiarEstadoEventoAction(eventoId, nuevo);
      if (!res.ok) return setAviso(res.error);
      setEventos((prev) => prev?.map((e) => (e.id === eventoId ? res.data : e)) ?? null);
    } catch {
      setAviso("No pudimos conectar con el servidor. Intenta de nuevo.");
    } finally {
      setCambiando(null);
    }
  }

  return (
    <div className="px-4 py-8 sm:px-8">
      <Encabezado titulo="Eventos" descripcion="Todos los eventos de la plataforma, de cualquier organizador." />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="w-full sm:w-72">
          <TextInput value={busqueda} onChange={(e) => { setBusqueda(e.target.value); setPagina(0); }} placeholder="Buscar por nombre, lugar o código" aria-label="Buscar evento" />
        </div>
        <div className="flex gap-1 rounded-xl bg-line/60 p-1">
          {(["todos", ...ESTADOS] as const).map((s) => (
            <button
              key={s}
              onClick={() => { setEstado(s); setPagina(0); }}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize ${estado === s ? "bg-surface text-ink shadow-sm" : "text-ink-soft hover:text-ink"}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      {aviso && <p className="mb-3 text-sm text-danger">{aviso}</p>}
      {eventos === null && <TablaCargando />}

      {eventos && (
        <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-background text-left text-xs text-ink-soft">
              <tr>
                <th className="px-4 py-3 font-medium">Evento</th>
                <th className="px-4 py-3 font-medium">Organizador</th>
                <th className="px-4 py-3 font-medium">Inscritos</th>
                <th className="px-4 py-3 font-medium">Pagados</th>
                <th className="px-4 py-3 font-medium">Ingresaron</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {pagina_.map((e) => {
                const regs = inscripciones.filter((r) => r.eventoId === e.id);
                const pagados = regs.filter((r) => r.estadoPago === "confirmado");
                return (
                  <tr key={e.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-ink">{e.nombre}</p>
                      <p className="text-xs text-ink-faint">{codigoEvento(e.numero)} · {e.lugar}</p>
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{e.organizadorNumero != null ? codigoOrganizador(e.organizadorNumero) : "sin cuenta"}</td>
                    <td className="px-4 py-3">{regs.length}</td>
                    <td className="px-4 py-3">{pagados.length}</td>
                    <td className="px-4 py-3">{pagados.filter((r) => r.checkInRealizado).length}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Badge tone={TONO[e.estado] ?? "brand"}>{e.estado}</Badge>
                        <select
                          aria-label={`Estado de ${e.nombre}`}
                          value={e.estado}
                          disabled={cambiando === e.id}
                          onChange={(ev) => cambiarEstado(e.id, ev.target.value as EventStatus)}
                          className="rounded-lg border border-line-strong bg-surface px-2 py-1 text-xs text-ink"
                        >
                          {!ESTADOS.includes(e.estado) && <option value={e.estado}>{e.estado}</option>}
                          {ESTADOS.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/escaner/${e.id}`}><Button variant="outline" className="px-3 py-1.5 text-xs">Escáner</Button></Link>
                        <Link href={`/organizador/eventos/${e.id}`}><Button className="px-3 py-1.5 text-xs">Gestionar</Button></Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {visibles.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-ink-soft">No hay eventos que coincidan.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      <Paginacion pagina={pagActual} total={visibles.length} porPagina={POR_PAGINA} onCambio={setPagina} />
    </div>
  );
}
