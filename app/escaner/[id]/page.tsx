"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { CircleCheck, CircleX, Clock, ScanLine, Ban } from "lucide-react";
import { TablaCargando } from "@/components/ui/cargando";
import {
  checkInAction,
  escanearAction,
  getEventoGestionAction,
  type EscaneoResultado,
  type InfoEscaneo,
} from "@/lib/actions";
import type { Registration, SportEvent } from "@/lib/types";
import { codigoEvento, codigoParticipante } from "@/lib/codigos";
import { descargarCSV, nombreSeguro } from "@/lib/csv";
import { Badge, Button, Card, TextInput } from "@/components/ui";
import { QrScanner } from "@/components/qr-scanner";

type Vista =
  | { tipo: "resultado"; r: EscaneoResultado }
  | { tipo: "exito"; registro: Registration; categoria: string; yaIngreso: boolean }
  | null;

function hora(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div>
      <dt className="text-xs text-ink-faint">{etiqueta}</dt>
      <dd className="break-words text-sm font-medium text-ink">{valor || "—"}</dd>
    </div>
  );
}

function FichaInscrito({ info }: { info: InfoEscaneo }) {
  const { registro: r } = info;
  return (
    <div>
      <p className="font-display text-xl font-semibold text-ink">{r.participante.nombre}</p>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
        <Dato etiqueta="Documento" valor={r.participante.documento} />
        <Dato etiqueta="Código de participante" valor={r.participanteNumero != null ? codigoParticipante(r.participanteNumero) : ""} />
        <Dato etiqueta="Categoría" valor={info.categoria} />
        <Dato etiqueta="Teléfono" valor={r.participante.telefono} />
        <div className="col-span-2">
          <Dato etiqueta="Correo" valor={r.participante.correo} />
        </div>
        {info.respuestas.map((x) => (
          <div key={x.etiqueta} className="col-span-2">
            <Dato etiqueta={x.etiqueta} valor={x.valor} />
          </div>
        ))}
      </dl>
    </div>
  );
}

export default function EscanerEventoPage() {
  const { id } = useParams<{ id: string }>();
  const [datos, setDatos] = useState<{ evento: SportEvent; registros: Registration[] } | null>(null);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [vista, setVista] = useState<Vista>(null);
  const [ocupado, setOcupado] = useState(false);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);
  const [manual, setManual] = useState("");
  const [tab, setTab] = useState<"ingresaron" | "pendientes">("ingresaron");
  const [busqueda, setBusqueda] = useState("");
  const cierre = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Carga inicial y actualización cada 15 s, para ver los ingresos que
  // registran otros compañeros en otras puertas.
  useEffect(() => {
    let activo = true;
    const cargar = () =>
      getEventoGestionAction(id).then((res) => {
        if (!activo) return;
        if (res.ok) {
          setDatos(res.data);
          setErrorCarga(null);
        } else {
          setErrorCarga(res.error);
        }
      });
    cargar();
    const t = setInterval(cargar, 15000);
    return () => {
      activo = false;
      clearInterval(t);
    };
  }, [id]);

  useEffect(() => () => {
    if (cierre.current) clearTimeout(cierre.current);
  }, []);

  const evento = datos?.evento;
  const confirmados = useMemo(() => datos?.registros.filter((r) => r.estadoPago === "confirmado") ?? [], [datos]);
  const ingresados = useMemo(
    () => confirmados.filter((r) => r.checkInRealizado).sort((a, b) => (b.checkInEn ?? "").localeCompare(a.checkInEn ?? "")),
    [confirmados]
  );
  const porIngresar = useMemo(() => confirmados.filter((r) => !r.checkInRealizado), [confirmados]);
  const sinPago = (datos?.registros.length ?? 0) - confirmados.length;

  const filtrar = (lista: Registration[]) => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return lista;
    return lista.filter((r) =>
      [
        r.participante.nombre,
        r.participante.documento,
        r.participante.correo,
        r.participanteNumero != null ? codigoParticipante(r.participanteNumero) : "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  };

  const nombreCategoria = (r: Registration) => evento?.categorias.find((c) => c.id === r.categoriaId)?.nombre ?? "—";

  async function procesarCodigo(texto: string) {
    if (!evento || ocupado) return;
    setOcupado(true);
    setErrorAccion(null);
    if (cierre.current) clearTimeout(cierre.current);
    try {
      const res = await escanearAction(evento.id, texto);
      if (!res.ok) {
        setErrorAccion(res.error);
        return;
      }
      navigator.vibrate?.(res.data.estado === "listo" ? 80 : [120, 60, 120]);
      setVista({ tipo: "resultado", r: res.data });
    } catch {
      setErrorAccion("No pudimos conectar con el servidor. Revisa la conexión e intenta de nuevo.");
    } finally {
      setOcupado(false);
    }
  }

  async function confirmar(registro: Registration, categoria: string) {
    setOcupado(true);
    setErrorAccion(null);
    try {
      const res = await checkInAction(registro.id);
      if (!res.ok) {
        setErrorAccion(res.error);
        return;
      }
      const { registro: nuevo, yaIngreso } = res.data;
      setDatos((d) => (d ? { ...d, registros: d.registros.map((x) => (x.id === nuevo.id ? nuevo : x)) } : d));
      setVista({ tipo: "exito", registro: nuevo, categoria, yaIngreso });
      // Regresa solo a la cámara para atender a la siguiente persona.
      cierre.current = setTimeout(() => setVista(null), 3500);
    } catch {
      setErrorAccion("No pudimos conectar con el servidor. Revisa la conexión e intenta de nuevo.");
    } finally {
      setOcupado(false);
    }
  }

  function siguiente() {
    if (cierre.current) clearTimeout(cierre.current);
    setErrorAccion(null);
    setVista(null);
  }

  function exportar() {
    if (!evento) return;
    descargarCSV(`ingresos-${nombreSeguro(evento.nombre)}.csv`, [
      ["Hora de ingreso", "Código", "Nombre", "Documento", "Categoría", "Registrado por"],
      ...ingresados.map((r) => [
        r.checkInEn ? new Date(r.checkInEn).toLocaleString("es-CO") : "",
        r.participanteNumero != null ? codigoParticipante(r.participanteNumero) : "",
        r.participante.nombre,
        r.participante.documento,
        nombreCategoria(r),
        r.checkInPor ?? "",
      ]),
    ]);
  }

  if (errorCarga) {
    return (
      <div className="mx-auto max-w-lg px-6 py-16 text-center">
        <p className="mb-3 text-ink-soft">{errorCarga}</p>
        <Link href="/escaner" className="text-sm font-medium text-brand-dark">
          Volver a mis eventos
        </Link>
      </div>
    );
  }
  if (!datos || !evento) return <div className="mx-auto max-w-4xl px-6 py-16"><TablaCargando /></div>;

  const porcentaje = confirmados.length ? Math.round((ingresados.length / confirmados.length) * 100) : 0;
  const escaneando = vista === null && !ocupado;

  return (
    <div className="px-4 py-8 sm:px-8">
      <Link href="/escaner" className="mb-3 inline-block text-sm text-ink-soft hover:text-ink">
        ← Eventos
      </Link>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-ink-faint">{codigoEvento(evento.numero)}</p>
          <h1 className="font-display text-2xl font-semibold text-ink">{evento.nombre}</h1>
        </div>
        <div className="w-full sm:w-64">
          <div className="mb-1 flex items-baseline justify-between">
            <span className="font-display text-2xl font-semibold text-brand-dark">{ingresados.length}</span>
            <span className="text-sm text-ink-soft">de {confirmados.length} con pago confirmado</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-line">
            <div className="h-full rounded-full bg-gradient-to-r from-brand to-accent transition-all" style={{ width: `${porcentaje}%` }} />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Cámara y resultado */}
        <div className="space-y-4">
          {vista === null && (
            <>
              <QrScanner onScan={procesarCodigo} pausado={!escaneando} />
              <p className="text-center text-sm text-ink-soft">
                {ocupado ? "Buscando inscripción..." : "Apunta la cámara al código QR del tiquete."}
              </p>
              {errorAccion && <p className="text-center text-sm text-danger">{errorAccion}</p>}
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (manual.trim()) {
                    procesarCodigo(manual);
                    setManual("");
                  }
                }}
              >
                <TextInput
                  value={manual}
                  onChange={(e) => setManual(e.target.value)}
                  placeholder="¿No lee? Pega o escribe el código del tiquete"
                  aria-label="Código del tiquete"
                />
                <Button type="submit" variant="outline" disabled={ocupado || !manual.trim()}>
                  Buscar
                </Button>
              </form>
            </>
          )}

          {vista?.tipo === "resultado" && <ResultadoCard r={vista.r} ocupado={ocupado} error={errorAccion} onConfirmar={confirmar} onCerrar={siguiente} />}

          {vista?.tipo === "exito" && (
            <Card className="border-success/40 bg-success-soft text-center">
              <CircleCheck className="mx-auto mb-2 size-14 text-success" aria-hidden />
              <p className="font-display text-xl font-semibold text-success">
                {vista.yaIngreso ? "Ya estaba registrado" : "Ingreso registrado"}
              </p>
              <p className="mt-1 text-lg font-medium text-ink">{vista.registro.participante.nombre}</p>
              <p className="text-sm text-ink-soft">
                {vista.categoria} · {hora(vista.registro.checkInEn)}
              </p>
              <Button className="mt-4" onClick={siguiente}>
                <ScanLine className="size-4" aria-hidden />Escanear siguiente
              </Button>
            </Card>
          )}
        </div>

        {/* Listas */}
        <div>
          <div className="mb-3 flex gap-1 rounded-xl bg-line/60 p-1">
            {(
              [
                ["ingresaron", `Ya ingresaron (${ingresados.length})`],
                ["pendientes", `Por ingresar (${porIngresar.length})`],
              ] as const
            ).map(([clave, texto]) => (
              <button
                key={clave}
                onClick={() => setTab(clave)}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  tab === clave ? "bg-surface text-ink shadow-sm" : "text-ink-soft hover:text-ink"
                }`}
              >
                {texto}
              </button>
            ))}
          </div>

          <div className="mb-3 flex gap-2">
            <TextInput
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre, documento o código"
              aria-label="Buscar en la lista"
            />
            {tab === "ingresaron" && (
              <Button variant="outline" onClick={exportar} disabled={ingresados.length === 0} className="shrink-0">
                CSV
              </Button>
            )}
          </div>

          <div className="max-h-[32rem] overflow-y-auto rounded-2xl border border-line bg-surface">
            {tab === "ingresaron" &&
              (filtrar(ingresados).length === 0 ? (
                <p className="p-4 text-sm text-ink-soft">
                  {ingresados.length === 0 ? "Todavía no ha ingresado nadie." : "Sin resultados para esa búsqueda."}
                </p>
              ) : (
                <ul className="divide-y divide-line">
                  {filtrar(ingresados).map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink">{r.participante.nombre}</p>
                        <p className="truncate text-xs text-ink-soft">
                          {r.participante.documento} · {nombreCategoria(r)}
                          {r.checkInPor && ` · por ${r.checkInPor}`}
                        </p>
                      </div>
                      <Badge tone="success">{hora(r.checkInEn)}</Badge>
                    </li>
                  ))}
                </ul>
              ))}

            {tab === "pendientes" &&
              (filtrar(porIngresar).length === 0 ? (
                <p className="p-4 text-sm text-ink-soft">
                  {porIngresar.length === 0 ? "Todos los inscritos con pago ya ingresaron." : "Sin resultados para esa búsqueda."}
                </p>
              ) : (
                <ul className="divide-y divide-line">
                  {filtrar(porIngresar).map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink">{r.participante.nombre}</p>
                        <p className="truncate text-xs text-ink-soft">
                          {r.participante.documento} · {nombreCategoria(r)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        className="shrink-0 px-3 py-1.5 text-xs"
                        disabled={ocupado}
                        onClick={() => confirmar(r, nombreCategoria(r))}
                      >
                        Marcar ingreso
                      </Button>
                    </li>
                  ))}
                </ul>
              ))}
          </div>
          {sinPago > 0 && (
            <p className="mt-2 text-xs text-ink-soft">
              {sinPago} inscrito{sinPago === 1 ? "" : "s"} con el pago pendiente no aparece{sinPago === 1 ? "" : "n"} aquí: no pueden ingresar hasta pagar.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function ResultadoCard({
  r,
  ocupado,
  error,
  onConfirmar,
  onCerrar,
}: {
  r: EscaneoResultado;
  ocupado: boolean;
  error: string | null;
  onConfirmar: (registro: Registration, categoria: string) => void;
  onCerrar: () => void;
}) {
  if (r.estado === "no_valido") {
    return (
      <Card className="border-danger/40 bg-danger-soft text-center">
        <CircleX className="mx-auto mb-2 size-12 text-danger" aria-hidden />
        <p className="font-display text-lg font-semibold text-danger">Código no válido</p>
        <p className="mt-1 text-sm text-ink-soft">Este código no corresponde a un tiquete de EventFlow.</p>
        <Button className="mt-4" onClick={onCerrar}>
          Intentar de nuevo
        </Button>
      </Card>
    );
  }
  if (r.estado === "otro_evento") {
    return (
      <Card className="border-danger/40 bg-danger-soft text-center">
        <Ban className="mx-auto mb-2 size-12 text-danger" aria-hidden />
        <p className="font-display text-lg font-semibold text-danger">Tiquete de otro evento</p>
        <p className="mt-1 text-sm text-ink-soft">Este tiquete es de &ldquo;{r.eventoNombre}&rdquo;, no de este evento.</p>
        <Button className="mt-4" onClick={onCerrar}>
          Intentar de nuevo
        </Button>
      </Card>
    );
  }

  const tono = {
    listo: { caja: "border-success/40", titulo: "text-success", texto: "Tiquete válido", Icono: CircleCheck },
    ya_ingreso: { caja: "border-gold/50 bg-gold-soft", titulo: "text-gold", texto: "Esta persona ya ingresó", Icono: Clock },
    pago_pendiente: { caja: "border-danger/40 bg-danger-soft", titulo: "text-danger", texto: "Pago pendiente: no puede ingresar", Icono: CircleX },
  }[r.estado];

  return (
    <Card className={tono.caja}>
      <p className={`mb-3 flex items-center gap-2 font-display text-base font-semibold ${tono.titulo}`}>
        <tono.Icono className="size-6" aria-hidden />
        {tono.texto}
      </p>
      <FichaInscrito info={r.info} />
      {r.estado === "ya_ingreso" && (
        <p className="mt-3 text-sm text-ink-soft">
          Ingresó a las {hora(r.info.registro.checkInEn)}
          {r.info.registro.checkInPor && `, registrado por ${r.info.registro.checkInPor}`}.
        </p>
      )}
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      <div className="mt-5 flex gap-2">
        {r.estado === "listo" && (
          <Button className="flex-1" disabled={ocupado} onClick={() => onConfirmar(r.info.registro, r.info.categoria)}>
            {ocupado ? "Registrando..." : "Confirmar ingreso"}
          </Button>
        )}
        <Button variant="outline" className={r.estado === "listo" ? "" : "flex-1"} onClick={onCerrar}>
          {r.estado === "listo" ? "Cancelar" : "Escanear otro"}
        </Button>
      </div>
    </Card>
  );
}
