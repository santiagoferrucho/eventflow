"use client";

import { TablaCargando } from "@/components/ui/cargando";
import { useEffect, useState } from "react";
import { listConsentimientosAction, type ConsentimientoFila } from "@/lib/actions";
import { descargarCSV } from "@/lib/csv";
import { Encabezado } from "@/components/kpi";
import { Paginacion } from "@/components/paginacion";
import { Button } from "@/components/ui";

const ETIQUETA: Record<string, string> = {
  registro: "Registro de cuenta",
  perfil: "Actualización de perfil",
  cambio_correo: "Cambio de correo",
  inscripcion: "Inscripción a evento",
  crear_evento: "Creación de evento",
  admin_crear_organizador: "Alta de organizador (admin)",
  primer_ingreso: "Primer ingreso de organizador",
  notificaciones: "Notificaciones",
};

export default function ConsentimientosPage() {
  const [pagina, setPagina] = useState(0);
  const [formulario, setFormulario] = useState("");
  const [datos, setDatos] = useState<{ filas: ConsentimientoFila[]; total: number; formularios: string[] } | null>(null);

  useEffect(() => {
    let activo = true;
    listConsentimientosAction(pagina, formulario).then((d) => activo && setDatos(d));
    return () => {
      activo = false;
    };
  }, [pagina, formulario]);

  function exportar() {
    if (!datos) return;
    descargarCSV("autorizaciones.csv", [
      ["Fecha", "Persona", "Correo", "Formulario", "Versión de la política", "Referencia", "IP"],
      ...datos.filas.map((f) => [new Date(f.aceptadoEn).toLocaleString("es-CO"), f.persona, f.correo ?? "", ETIQUETA[f.formulario] ?? f.formulario, f.version, f.referencia ?? "", f.ip ?? ""]),
    ]);
  }

  return (
    <div className="px-4 py-8 sm:px-8">
      <Encabezado
        titulo="Autorizaciones de datos"
        descripcion="Prueba de que cada persona aceptó la política (Decreto 1377 de 2013, art. 8): quién, cuándo, qué versión y desde qué formulario."
        acciones={<Button variant="outline" onClick={exportar} disabled={!datos?.filas.length}>Exportar página (CSV)</Button>}
      />
      <div className="mb-4">
        <select
          value={formulario}
          onChange={(e) => { setFormulario(e.target.value); setPagina(0); }}
          aria-label="Filtrar por formulario"
          className="rounded-xl border border-line-strong bg-surface px-3 py-2.5 text-sm text-ink"
        >
          <option value="">Todos los formularios</option>
          {datos?.formularios.map((f) => <option key={f} value={f}>{ETIQUETA[f] ?? f}</option>)}
        </select>
      </div>
      {datos === null && <TablaCargando />}
      {datos && (
        <>
          <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-background text-left text-xs text-ink-soft">
                <tr>
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  <th className="px-4 py-3 font-medium">Persona</th>
                  <th className="px-4 py-3 font-medium">Formulario</th>
                  <th className="px-4 py-3 font-medium">Versión</th>
                  <th className="px-4 py-3 font-medium">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {datos.filas.map((f) => (
                  <tr key={f.id}>
                    <td className="px-4 py-3 text-ink-soft">{new Date(f.aceptadoEn).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })}</td>
                    <td className="px-4 py-3"><p className="font-medium text-ink">{f.persona}</p><p className="text-xs text-ink-faint">{f.correo}</p></td>
                    <td className="px-4 py-3">{ETIQUETA[f.formulario] ?? f.formulario}</td>
                    <td className="px-4 py-3">v{f.version}</td>
                    <td className="px-4 py-3 text-xs text-ink-faint">{f.ip ?? "—"}</td>
                  </tr>
                ))}
                {datos.filas.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-ink-soft">Sin registros.</td></tr>}
              </tbody>
            </table>
          </div>
          <Paginacion pagina={pagina} total={datos.total} porPagina={25} onCambio={setPagina} />
        </>
      )}
    </div>
  );
}
