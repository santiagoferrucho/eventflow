"use client";

import { TablaCargando } from "@/components/ui/cargando";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { listMisInscritosAction } from "@/lib/actions";
import type { Registration } from "@/lib/types";
import { codigoEvento, codigoParticipante } from "@/lib/codigos";
import { descargarCSV } from "@/lib/csv";
import { Encabezado } from "@/components/kpi";
import { Paginacion } from "@/components/paginacion";
import { Badge, Button, TextInput } from "@/components/ui";

type Fila = { registro: Registration; eventoNombre: string; eventoCodigo: number };
type Filtro = "todos" | "pagados" | "pendientes" | "ingresados";
const POR_PAGINA = 15;
const fechaHora = (iso: string | null) => (iso ? new Date(iso).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" }) : "—");

export default function InscritosPage() {
  const [filas, setFilas] = useState<Fila[] | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [evento, setEvento] = useState("");
  const [pagina, setPagina] = useState(0);

  useEffect(() => {
    let activo = true;
    listMisInscritosAction().then((f) => activo && setFilas(f));
    return () => {
      activo = false;
    };
  }, []);

  const eventos = useMemo(() => {
    const m = new Map<string, string>();
    (filas ?? []).forEach((f) => m.set(f.registro.eventoId, f.eventoNombre));
    return [...m.entries()];
  }, [filas]);

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return (filas ?? [])
      .filter(({ registro: r }) => {
        if (evento && r.eventoId !== evento) return false;
        if (filtro === "pagados" && r.estadoPago !== "confirmado") return false;
        if (filtro === "pendientes" && r.estadoPago === "confirmado") return false;
        if (filtro === "ingresados" && !r.checkInRealizado) return false;
        if (!q) return true;
        return [r.participante.nombre, r.participante.documento, r.participante.correo, r.participante.telefono, r.participanteNumero != null ? codigoParticipante(r.participanteNumero) : ""]
          .join(" ")
          .toLowerCase()
          .includes(q);
      })
      .sort((a, b) => b.registro.creadoEn.localeCompare(a.registro.creadoEn));
  }, [filas, busqueda, filtro, evento]);

  const pagActual = Math.min(pagina, Math.max(0, Math.ceil(visibles.length / POR_PAGINA) - 1));
  const fragmento = visibles.slice(pagActual * POR_PAGINA, (pagActual + 1) * POR_PAGINA);

  function exportar() {
    descargarCSV("inscritos.csv", [
      ["Código", "Nombre", "Documento", "Correo", "Teléfono", "Evento", "Valor", "Estado de pago", "Inscrito el", "Ingresó", "Hora de ingreso"],
      ...visibles.map(({ registro: r, eventoNombre }) => [
        r.participanteNumero != null ? codigoParticipante(r.participanteNumero) : "",
        r.participante.nombre,
        r.participante.documento,
        r.participante.correo,
        r.participante.telefono,
        eventoNombre,
        String(r.precioPagado),
        r.estadoPago,
        fechaHora(r.creadoEn),
        r.checkInRealizado ? "Sí" : "No",
        fechaHora(r.checkInEn),
      ]),
    ]);
  }

  return (
    <div className="px-4 py-8 sm:px-8">
      <Encabezado
        titulo="Inscritos"
        descripcion="Todas las personas inscritas a tus eventos."
        acciones={<Button variant="outline" onClick={exportar} disabled={visibles.length === 0}>Exportar CSV</Button>}
      />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="w-full sm:w-72">
          <TextInput value={busqueda} onChange={(e) => { setBusqueda(e.target.value); setPagina(0); }} placeholder="Buscar por nombre, documento, correo o código" aria-label="Buscar inscrito" />
        </div>
        <select value={evento} onChange={(e) => { setEvento(e.target.value); setPagina(0); }} aria-label="Evento" className="rounded-xl border border-line-strong bg-surface px-3 py-2.5 text-sm text-ink">
          <option value="">Todos los eventos</option>
          {eventos.map(([id, nombre]) => <option key={id} value={id}>{nombre}</option>)}
        </select>
        <div className="flex gap-1 rounded-xl bg-line/60 p-1">
          {(["todos", "pagados", "pendientes", "ingresados"] as const).map((f) => (
            <button key={f} onClick={() => { setFiltro(f); setPagina(0); }} className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize ${filtro === f ? "bg-surface text-ink shadow-sm" : "text-ink-soft hover:text-ink"}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {filas === null && <TablaCargando />}
      {filas && (
        <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-background text-left text-xs text-ink-soft">
              <tr>
                <th className="px-4 py-3 font-medium">Participante</th>
                <th className="px-4 py-3 font-medium">Evento</th>
                <th className="px-4 py-3 font-medium">Pago</th>
                <th className="px-4 py-3 font-medium">Inscrito</th>
                <th className="px-4 py-3 font-medium">Ingreso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {fragmento.map(({ registro: r, eventoNombre, eventoCodigo }) => (
                <tr key={r.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink">{r.participante.nombre}</p>
                    <p className="text-xs text-ink-faint">{r.participante.documento} · {r.participante.correo}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/organizador/eventos/${r.eventoId}`} className="text-brand-dark hover:underline">{eventoNombre}</Link>
                    <p className="text-xs text-ink-faint">{codigoEvento(eventoCodigo)}</p>
                  </td>
                  <td className="px-4 py-3"><Badge tone={r.estadoPago === "confirmado" ? "success" : r.estadoPago === "pendiente" ? "gold" : "danger"}>{r.estadoPago}</Badge></td>
                  <td className="px-4 py-3 text-ink-soft">{fechaHora(r.creadoEn)}</td>
                  <td className="px-4 py-3">{r.checkInRealizado ? <Badge tone="success">{fechaHora(r.checkInEn)}</Badge> : <span className="text-ink-faint">—</span>}</td>
                </tr>
              ))}
              {visibles.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-ink-soft">No hay inscritos que coincidan.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      <Paginacion pagina={pagActual} total={visibles.length} porPagina={POR_PAGINA} onCambio={setPagina} />
    </div>
  );
}
