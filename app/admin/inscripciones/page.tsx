"use client";

import { TablaCargando } from "@/components/ui/cargando";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { listAllEventsAction, listAllRegistrationsAction } from "@/lib/actions";
import type { Registration, SportEvent } from "@/lib/types";
import { codigoEvento, codigoParticipante } from "@/lib/codigos";
import { descargarCSV } from "@/lib/csv";
import { Badge, Button, TextInput } from "@/components/ui";

type Filtro = "todas" | "pagadas" | "pendientes" | "ingresadas";

function fechaHora(iso: string | null) {
  return iso ? new Date(iso).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" }) : "—";
}

export default function InscripcionesAdminPage() {
  const [eventos, setEventos] = useState<SportEvent[] | null>(null);
  const [registros, setRegistros] = useState<Registration[] | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [eventoId, setEventoId] = useState("");

  useEffect(() => {
    listAllEventsAction().then(setEventos);
    listAllRegistrationsAction().then(setRegistros);
  }, []);

  const nombreEvento = useMemo(() => new Map((eventos ?? []).map((e) => [e.id, e])), [eventos]);

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return (registros ?? []).filter((r) => {
      if (eventoId && r.eventoId !== eventoId) return false;
      if (filtro === "pagadas" && r.estadoPago !== "confirmado") return false;
      if (filtro === "pendientes" && r.estadoPago === "confirmado") return false;
      if (filtro === "ingresadas" && !r.checkInRealizado) return false;
      if (!q) return true;
      return [
        r.participante.nombre,
        r.participante.documento,
        r.participante.correo,
        r.participante.telefono,
        r.participanteNumero != null ? codigoParticipante(r.participanteNumero) : "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [registros, busqueda, filtro, eventoId]);

  function exportar() {
    descargarCSV("inscripciones.csv", [
      ["Código", "Nombre", "Documento", "Correo", "Teléfono", "Evento", "Valor", "Estado de pago", "Inscrito el", "Ingresó", "Hora de ingreso", "Registrado por"],
      ...visibles.map((r) => [
        r.participanteNumero != null ? codigoParticipante(r.participanteNumero) : "",
        r.participante.nombre,
        r.participante.documento,
        r.participante.correo,
        r.participante.telefono,
        nombreEvento.get(r.eventoId)?.nombre ?? r.eventoId,
        String(r.precioPagado),
        r.estadoPago,
        fechaHora(r.creadoEn),
        r.checkInRealizado ? "Sí" : "No",
        fechaHora(r.checkInEn),
        r.checkInPor ?? "",
      ]),
    ]);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-12">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold text-ink">Todas las inscripciones</h1>
        <Button variant="outline" onClick={exportar} disabled={visibles.length === 0}>
          Exportar CSV ({visibles.length})
        </Button>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <div className="min-w-0 flex-1 sm:max-w-xs">
          <TextInput
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, documento, correo o código"
            aria-label="Buscar inscripciones"
          />
        </div>
        <select
          value={eventoId}
          onChange={(e) => setEventoId(e.target.value)}
          aria-label="Filtrar por evento"
          className="rounded-xl border border-line-strong bg-surface px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
        >
          <option value="">Todos los eventos</option>
          {(eventos ?? []).map((e) => (
            <option key={e.id} value={e.id}>
              {codigoEvento(e.numero)} · {e.nombre}
            </option>
          ))}
        </select>
        <div className="flex gap-1 rounded-xl bg-line/60 p-1">
          {(["todas", "pagadas", "pendientes", "ingresadas"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                filtro === f ? "bg-surface text-ink shadow-sm" : "text-ink-soft hover:text-ink"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {registros === null || eventos === null ? (
        <TablaCargando />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-background text-left text-ink-soft">
              <tr>
                <th className="px-4 py-2 font-medium">Código</th>
                <th className="px-4 py-2 font-medium">Participante</th>
                <th className="px-4 py-2 font-medium">Evento</th>
                <th className="px-4 py-2 font-medium">Pago</th>
                <th className="px-4 py-2 font-medium">Ingreso</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((r) => (
                <tr key={r.id} className="border-t border-line">
                  <td className="px-4 py-2 font-mono text-xs text-ink-soft">
                    {r.participanteNumero != null ? codigoParticipante(r.participanteNumero) : "—"}
                  </td>
                  <td className="px-4 py-2">
                    <p className="text-ink">{r.participante.nombre}</p>
                    <p className="text-xs text-ink-soft">
                      {r.participante.documento} · {r.participante.correo}
                    </p>
                  </td>
                  <td className="px-4 py-2">
                    <Link href={`/organizador/eventos/${r.eventoId}`} className="text-brand-dark hover:underline">
                      {nombreEvento.get(r.eventoId)?.nombre ?? r.eventoId}
                    </Link>
                  </td>
                  <td className="px-4 py-2">
                    <Badge tone={r.estadoPago === "confirmado" ? "success" : "danger"}>{r.estadoPago}</Badge>
                  </td>
                  <td className="px-4 py-2 text-ink-soft">{r.checkInRealizado ? fechaHora(r.checkInEn) : "—"}</td>
                </tr>
              ))}
              {visibles.length === 0 && (
                <tr>
                  <td className="px-4 py-3 text-ink-soft" colSpan={5}>
                    No hay inscripciones que coincidan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
