"use client";

import { TablaCargando } from "@/components/ui/cargando";
import { Fragment, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { cambiarEstadoEventoAction, checkInAction, getEventoGestionAction } from "@/lib/actions";
import type { EventStatus, Registration, SportEvent } from "@/lib/types";
import { codigoEvento, codigoParticipante } from "@/lib/codigos";
import { descargarCSV, nombreSeguro } from "@/lib/csv";
import { Badge, Button, Card, TextInput } from "@/components/ui";
import { urlImagen } from "@/lib/imagenes";

function formatCOP(value: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(
    value
  );
}

const ETIQUETA_ESTADO: Record<EventStatus, string> = {
  borrador: "Borrador",
  publicado: "Publicado",
  pausado: "Pausado",
  cerrado: "Cerrado",
  suspendido: "Suspendido",
};
const TONO_ESTADO: Record<EventStatus, "success" | "gold" | "danger" | "brand"> = {
  borrador: "brand",
  publicado: "success",
  pausado: "gold",
  cerrado: "brand",
  suspendido: "danger",
};

type Filtro = "todos" | "pagados" | "pendientes" | "ingresados";

function fechaHora(iso: string | null) {
  return iso ? new Date(iso).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" }) : "—";
}

export default function DetalleEventoOrganizadorPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const esAdmin = user?.rol === "administrador";
  const [datos, setDatos] = useState<{ evento: SportEvent; registros: Registration[] } | null>(null);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [busqueda, setBusqueda] = useState("");
  const [abierta, setAbierta] = useState<string | null>(null);
  const [marcando, setMarcando] = useState<string | null>(null);
  const [guardandoEstado, setGuardandoEstado] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;
    getEventoGestionAction(id).then((res) => {
      if (!activo) return;
      if (res.ok) setDatos(res.data);
      else setErrorCarga(res.error);
    });
    return () => {
      activo = false;
    };
  }, [id]);

  const registros = useMemo(() => datos?.registros ?? [], [datos]);
  const confirmados = useMemo(() => registros.filter((r) => r.estadoPago === "confirmado"), [registros]);
  const lista = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return registros.filter((r) => {
      if (filtro === "pagados" && r.estadoPago !== "confirmado") return false;
      if (filtro === "pendientes" && r.estadoPago === "confirmado") return false;
      if (filtro === "ingresados" && !r.checkInRealizado) return false;
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
  }, [registros, filtro, busqueda]);

  async function marcarIngreso(registrationId: string) {
    setMarcando(registrationId);
    setAviso(null);
    try {
      const res = await checkInAction(registrationId);
      if (!res.ok) {
        setAviso(res.error);
        return;
      }
      const nuevo = res.data.registro;
      setDatos((d) => (d ? { ...d, registros: d.registros.map((r) => (r.id === nuevo.id ? nuevo : r)) } : d));
    } catch {
      setAviso("No pudimos conectar con el servidor. Intenta de nuevo.");
    } finally {
      setMarcando(null);
    }
  }

  async function cambiarEstado(estado: EventStatus) {
    setGuardandoEstado(true);
    setAviso(null);
    try {
      const res = await cambiarEstadoEventoAction(id, estado);
      if (!res.ok) {
        setAviso(res.error);
        return;
      }
      setDatos((d) => (d ? { ...d, evento: res.data } : d));
    } catch {
      setAviso("No pudimos conectar con el servidor. Intenta de nuevo.");
    } finally {
      setGuardandoEstado(false);
    }
  }

  if (errorCarga) {
    return (
      <div className="mx-auto max-w-lg px-6 py-16 text-center">
        <p className="text-ink-soft">{errorCarga}</p>
      </div>
    );
  }
  if (!datos) return <div className="mx-auto max-w-4xl px-6 py-16"><TablaCargando /></div>;

  const { evento } = datos;
  const recaudo = confirmados.reduce((sum, r) => sum + r.precioPagado, 0);
  const ingresados = confirmados.filter((r) => r.checkInRealizado).length;
  const nombreCategoria = (r: Registration) => evento.categorias.find((c) => c.id === r.categoriaId)?.nombre ?? "—";
  const bloqueado = evento.estado === "suspendido" && !esAdmin;
  const estadosPermitidos: EventStatus[] = esAdmin
    ? ["publicado", "pausado", "cerrado", "suspendido"]
    : ["publicado", "pausado", "cerrado"];

  function exportar() {
    descargarCSV(`inscritos-${nombreSeguro(evento.nombre)}.csv`, [
      [
        "Código",
        "Nombre",
        "Documento",
        "Correo",
        "Teléfono",
        "Categoría",
        "Valor pagado",
        "Estado de pago",
        "Inscrito el",
        "Ingresó",
        "Hora de ingreso",
        "Registrado por",
        ...evento.camposAdicionales.map((c) => c.etiqueta),
      ],
      ...registros.map((r) => [
        r.participanteNumero != null ? codigoParticipante(r.participanteNumero) : "",
        r.participante.nombre,
        r.participante.documento,
        r.participante.correo,
        r.participante.telefono,
        nombreCategoria(r),
        String(r.precioPagado),
        r.estadoPago,
        fechaHora(r.creadoEn),
        r.checkInRealizado ? "Sí" : "No",
        fechaHora(r.checkInEn),
        r.checkInPor ?? "",
        ...evento.camposAdicionales.map((c) => {
          const v = r.respuestas[c.id] ?? "";
          return c.tipo === "imagen" && v.startsWith("img:") ? `${window.location.origin}${urlImagen(v.slice(4))}` : v;
        }),
      ]),
    ]);
  }

  return (
    <div className="px-4 py-8 sm:px-8">
      <Link href={esAdmin ? "/admin/eventos" : "/organizador/eventos"} className="mb-4 inline-block text-sm text-ink-soft hover:text-ink">
        ← Eventos
      </Link>

      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-ink-faint">{codigoEvento(evento.numero)}</p>
          <h1 className="font-display mb-1 text-2xl font-semibold text-ink">{evento.nombre}</h1>
          <p className="text-sm text-ink-soft">
            {evento.lugar} ·{" "}
            {new Date(evento.fecha + "T00:00:00").toLocaleDateString("es-CO", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/escaner/${evento.id}`}>
            <Button>Escanear ingresos</Button>
          </Link>
          <Link href={`/organizador/eventos/${evento.id}/editar`}>
            <Button variant="outline">Editar evento</Button>
          </Link>
          <Button variant="outline" onClick={exportar} disabled={registros.length === 0}>
            Exportar CSV
          </Button>
        </div>
      </div>

      <Card className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-sm text-ink-soft">Estado del evento</span>
          <Badge tone={TONO_ESTADO[evento.estado]}>{ETIQUETA_ESTADO[evento.estado]}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <select
            aria-label="Cambiar estado del evento"
            value={evento.estado}
            disabled={guardandoEstado || bloqueado}
            onChange={(e) => cambiarEstado(e.target.value as EventStatus)}
            className="rounded-xl border border-line-strong bg-surface px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:opacity-50"
          >
            {!estadosPermitidos.includes(evento.estado) && (
              <option value={evento.estado}>{ETIQUETA_ESTADO[evento.estado]}</option>
            )}
            {estadosPermitidos.map((e) => (
              <option key={e} value={e}>
                {ETIQUETA_ESTADO[e]}
              </option>
            ))}
          </select>
        </div>
        <p className="w-full text-xs text-ink-soft">
          {bloqueado
            ? "La administración suspendió este evento. Contáctala para reactivarlo."
            : "Solo un evento publicado recibe inscripciones. Pausar o cerrar no borra a quienes ya se inscribieron."}
        </p>
      </Card>

      {aviso && <p className="mb-4 text-sm text-danger">{aviso}</p>}

      <div className="mb-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="text-center">
          <p className="font-display text-3xl font-semibold text-ink">{registros.length}</p>
          <p className="text-sm text-ink-soft">Inscritos</p>
        </Card>
        <Card className="text-center">
          <p className="font-display text-3xl font-semibold text-brand-dark">{confirmados.length}</p>
          <p className="text-sm text-ink-soft">
            Pagados{registros.length > confirmados.length && ` (${registros.length - confirmados.length} pendientes)`}
          </p>
        </Card>
        <Card className="text-center">
          <p className="font-display text-3xl font-semibold text-brand-dark">
            {ingresados}
            <span className="text-lg text-ink-faint"> / {confirmados.length}</span>
          </p>
          <p className="text-sm text-ink-soft">Ya ingresaron</p>
        </Card>
        <Card className="text-center">
          <p className="font-display text-2xl font-semibold text-brand-dark sm:text-3xl">{formatCOP(recaudo)}</p>
          <p className="text-sm text-ink-soft">Recaudo confirmado</p>
        </Card>
      </div>

      <h2 className="mb-3 font-display text-lg font-semibold text-ink">Ocupación por categoría</h2>
      <div className="mb-10 grid gap-3 sm:grid-cols-2">
        {evento.categorias.map((cat) => {
          const ocupados = cat.cupos - cat.cuposDisponibles;
          const pct = cat.cupos ? Math.round((ocupados / cat.cupos) * 100) : 0;
          return (
            <Card key={cat.id} className="p-4">
              <div className="mb-2 flex items-baseline justify-between">
                <p className="font-medium text-ink">{cat.nombre}</p>
                <p className="text-sm text-ink-soft">
                  {ocupados} / {cat.cupos} · {formatCOP(cat.tarifa)}
                </p>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-line">
                <div className="h-full rounded-full bg-gradient-to-r from-brand to-accent" style={{ width: `${pct}%` }} />
              </div>
            </Card>
          );
        })}
      </div>

      <h2 className="mb-3 font-display text-lg font-semibold text-ink">Inscritos</h2>
      <div className="mb-3 flex flex-wrap gap-2">
        <div className="min-w-0 flex-1 sm:max-w-xs">
          <TextInput
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, documento, correo o código"
            aria-label="Buscar inscritos"
          />
        </div>
        <div className="flex gap-1 rounded-xl bg-line/60 p-1">
          {(["todos", "pagados", "pendientes", "ingresados"] as const).map((f) => (
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

      <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-background text-left text-ink-soft">
            <tr>
              <th className="px-4 py-2 font-medium">Código</th>
              <th className="px-4 py-2 font-medium">Participante</th>
              <th className="px-4 py-2 font-medium">Categoría</th>
              <th className="px-4 py-2 font-medium">Pago</th>
              <th className="px-4 py-2 font-medium">Ingreso</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((reg) => (
              <Fragment key={reg.id}>
                <tr className="border-t border-line">
                  <td className="px-4 py-2 font-mono text-xs text-ink-soft">
                    {reg.participanteNumero != null ? codigoParticipante(reg.participanteNumero) : "—"}
                  </td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => setAbierta(abierta === reg.id ? null : reg.id)}
                      className="text-left"
                      aria-expanded={abierta === reg.id}
                    >
                      <span className="block text-ink">{reg.participante.nombre}</span>
                      <span className="block text-xs text-ink-soft">{reg.participante.documento}</span>
                    </button>
                  </td>
                  <td className="px-4 py-2 text-ink-soft">{nombreCategoria(reg)}</td>
                  <td className="px-4 py-2">
                    <Badge tone={reg.estadoPago === "confirmado" ? "success" : "danger"}>{reg.estadoPago}</Badge>
                  </td>
                  <td className="px-4 py-2">
                    {reg.checkInRealizado ? (
                      <Badge tone="gold">Ingresó {fechaHora(reg.checkInEn)}</Badge>
                    ) : reg.estadoPago === "confirmado" ? (
                      <Button
                        variant="ghost"
                        className="px-3 py-1 text-xs"
                        disabled={marcando === reg.id}
                        onClick={() => marcarIngreso(reg.id)}
                      >
                        {marcando === reg.id ? "Marcando..." : "Marcar ingreso"}
                      </Button>
                    ) : (
                      <span className="text-xs text-ink-soft">Pago pendiente</span>
                    )}
                  </td>
                </tr>
                {abierta === reg.id && (
                  <tr className="bg-background/60">
                    <td colSpan={5} className="px-4 py-3">
                      <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
                        <div>
                          <dt className="text-xs text-ink-faint">Correo</dt>
                          <dd className="break-all text-ink">{reg.participante.correo}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-ink-faint">Teléfono</dt>
                          <dd className="text-ink">{reg.participante.telefono || "—"}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-ink-faint">Inscrito el</dt>
                          <dd className="text-ink">{fechaHora(reg.creadoEn)}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-ink-faint">Valor</dt>
                          <dd className="text-ink">{formatCOP(reg.precioPagado)}</dd>
                        </div>
                        {reg.checkInRealizado && (
                          <div>
                            <dt className="text-xs text-ink-faint">Ingreso registrado por</dt>
                            <dd className="text-ink">{reg.checkInPor ?? "—"}</dd>
                          </div>
                        )}
                        {evento.camposAdicionales
                          .filter((c) => reg.respuestas[c.id])
                          .map((c) => (
                            <div key={c.id}>
                              <dt className="text-xs text-ink-faint">{c.etiqueta}</dt>
                              <dd className="break-words text-ink">
                                {c.tipo === "imagen" && reg.respuestas[c.id].startsWith("img:") ? (
                                  <a href={urlImagen(reg.respuestas[c.id].slice(4))} target="_blank" rel="noopener noreferrer" className="text-brand-dark underline">
                                    Ver imagen
                                  </a>
                                ) : (
                                  reg.respuestas[c.id]
                                )}
                              </dd>
                            </div>
                          ))}
                      </dl>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {lista.length === 0 && (
              <tr>
                <td className="px-4 py-3 text-ink-soft" colSpan={5}>
                  {registros.length === 0 ? "Todavía no hay inscritos en este evento." : "Ningún inscrito coincide con el filtro."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
