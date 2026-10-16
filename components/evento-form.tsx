"use client";

import { useState } from "react";
import { AceptarPolitica, Button, Card, Field, TextInput } from "@/components/ui";
import { MAX_IMAGEN_BYTES, urlBanner } from "@/lib/imagenes";
import { MiniMapa } from "@/components/mini-mapa";
import { GoogleFormBuilder } from "@/components/google-form-builder";
import type { CustomField, EventCategory, Recomendacion, SportEvent, TipoRecomendacion } from "@/lib/types";

export type DatosEventoForm = Pick<
  SportEvent,
  "nombre" | "disciplina" | "fecha" | "lugar" | "latitud" | "longitud" | "descripcion" | "categorias" | "camposAdicionales" | "recomendaciones" | "bannerId"
>;

interface CategoriaForm {
  id: string;
  nombre: string;
  cupos: string;
  tarifa: string;
  inscritos: number; // para no permitir bajar los cupos por debajo
}

const TIPOS: { valor: TipoRecomendacion; etiqueta: string }[] = [
  { valor: "hospedaje", etiqueta: "Hospedaje" },
  { valor: "comida", etiqueta: "Comida" },
  { valor: "transporte", etiqueta: "Transporte" },
  { valor: "otro", etiqueta: "Otro" },
];

export function EventoForm({
  inicial,
  inscritosPorCategoria = {},
  etiquetaEnviar,
  pedirPolitica,
  onSubmit,
}: {
  inicial?: SportEvent;
  inscritosPorCategoria?: Record<string, number>;
  etiquetaEnviar: string;
  pedirPolitica: boolean;
  onSubmit: (datos: DatosEventoForm, aceptaPolitica: boolean) => Promise<string | null>;
}) {
  const [nombre, setNombre] = useState(inicial?.nombre ?? "");
  const [disciplina, setDisciplina] = useState(inicial?.disciplina ?? "");
  const [fecha, setFecha] = useState(inicial?.fecha ?? "");
  const [lugar, setLugar] = useState(inicial?.lugar ?? "");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    inicial?.latitud != null && inicial?.longitud != null ? { lat: inicial.latitud, lng: inicial.longitud } : null
  );
  const [buscando, setBuscando] = useState(false);
  const [avisoMapa, setAvisoMapa] = useState<string | null>(null);
  const [descripcion, setDescripcion] = useState(inicial?.descripcion ?? "");
  const [categorias, setCategorias] = useState<CategoriaForm[]>(() =>
    inicial
      ? inicial.categorias.map((c: EventCategory) => ({
          id: c.id,
          nombre: c.nombre,
          cupos: String(c.cupos),
          tarifa: String(c.tarifa),
          inscritos: inscritosPorCategoria[c.id] ?? 0,
        }))
      : [{ id: `cat-0-${Date.now()}`, nombre: "", cupos: "", tarifa: "", inscritos: 0 }]
  );
  const [campos, setCampos] = useState<CustomField[]>(inicial?.camposAdicionales ?? []);
  const [recs, setRecs] = useState<Recomendacion[]>(inicial?.recomendaciones ?? []);
  const [bannerId, setBannerId] = useState<string | null>(inicial?.bannerId ?? null);
  const [subiendoBanner, setSubiendoBanner] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [acepta, setAcepta] = useState(!pedirPolitica);

  function actualizarCategoria(i: number, campo: "nombre" | "cupos" | "tarifa", valor: string) {
    setCategorias((prev) => prev.map((c, idx) => (idx === i ? { ...c, [campo]: valor } : c)));
  }

  async function subirBanner(file: File | undefined) {
    if (!file) return;
    setErrorBanner(null);
    if (file.size > MAX_IMAGEN_BYTES) return setErrorBanner("La imagen pesa más de 3 MB.");
    setSubiendoBanner(true);
    try {
      const fd = new FormData();
      fd.append("archivo", file);
      const r = await fetch("/api/imagenes", { method: "POST", body: fd });
      const d = (await r.json()) as { id?: string; error?: string };
      if (!r.ok || !d.id) return setErrorBanner(d.error ?? "No pudimos subir la imagen.");
      setBannerId(d.id);
    } catch {
      setErrorBanner("No pudimos subir la imagen. Revisa la conexión.");
    } finally {
      setSubiendoBanner(false);
    }
  }

  async function ubicarEnMapa() {
    setAvisoMapa(null);
    if (!lugar.trim()) {
      setAvisoMapa("Escribe primero el lugar.");
      return;
    }
    setBuscando(true);
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(lugar)}`,
        { headers: { Accept: "application/json" } }
      );
      const datos = (await r.json()) as { lat: string; lon: string; display_name: string }[];
      if (!datos[0]) {
        setCoords(null);
        setAvisoMapa("No encontramos ese lugar. Prueba con más detalle (ciudad, barrio) o escribe las coordenadas.");
      } else {
        setCoords({ lat: Number(datos[0].lat), lng: Number(datos[0].lon) });
        setAvisoMapa(`Ubicado: ${datos[0].display_name}`);
      }
    } catch {
      setAvisoMapa("No pudimos consultar el mapa. Puedes escribir las coordenadas a mano.");
    } finally {
      setBuscando(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const validas = categorias.filter((c) => c.nombre && c.cupos && c.tarifa !== "");
    if (validas.length === 0) {
      setError("Agrega al menos una categoría con cupos y tarifa.");
      return;
    }
    for (const c of validas) {
      if (Number(c.cupos) < c.inscritos) {
        setError(`«${c.nombre}» ya tiene ${c.inscritos} inscritos: los cupos no pueden ser menos.`);
        return;
      }
    }
    setCargando(true);
    try {
      const msg = await onSubmit(
        {
          nombre,
          disciplina,
          fecha,
          lugar,
          latitud: coords?.lat ?? null,
          longitud: coords?.lng ?? null,
          descripcion,
          categorias: validas.map((c) => ({
            id: c.id,
            nombre: c.nombre,
            cupos: Number(c.cupos),
            cuposDisponibles: Number(c.cupos) - c.inscritos,
            tarifa: Number(c.tarifa),
          })),
          camposAdicionales: campos.filter((c) => c.etiqueta.trim()),
          recomendaciones: recs.filter((r) => r.nombre.trim()),
          bannerId,
        },
        acepta
      );
      if (msg) setError(msg);
    } catch {
      setError("No pudimos guardar el evento. Intenta de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <>
      <Card>
        <form onSubmit={handleSubmit} className="space-y-5">
          <Field label="Nombre del evento">
            <TextInput required value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Carrera Atardecer UPB" />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Disciplina">
              <TextInput required value={disciplina} onChange={(e) => setDisciplina(e.target.value)} placeholder="Running" />
            </Field>
            <Field label="Fecha">
              <TextInput required type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </Field>
          </div>
          <div>
            <Field label="Lugar">
              <TextInput
                required
                value={lugar}
                onChange={(e) => {
                  setLugar(e.target.value);
                  setCoords(null);
                  setAvisoMapa(null);
                }}
                placeholder="Parque de los Niños, Bucaramanga"
              />
            </Field>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <Button type="button" variant="outline" onClick={ubicarEnMapa} disabled={buscando}>
                {buscando ? "Buscando..." : "Ubicar en el mapa"}
              </Button>
              {coords && (
                <span className="text-xs text-ink-soft">
                  {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                </span>
              )}
            </div>
            {avisoMapa && <p className="mt-1 text-xs text-ink-soft">{avisoMapa}</p>}
            {coords && Math.abs(coords.lat) <= 90 && Math.abs(coords.lng) <= 180 && (coords.lat !== 0 || coords.lng !== 0) && (
              <MiniMapa latitud={coords.lat} longitud={coords.lng} alto={150} etiqueta={lugar} className="mt-3" />
            )}
            {!coords && (
              <p className="mt-1 text-xs text-ink-faint">
                Con la ubicación, los participantes verán el mapa, podrán abrir Google Maps o Waze y el evento aparecerá en
                «cerca de ti».
              </p>
            )}
            <details className="mt-2 text-xs text-ink-soft">
              <summary className="cursor-pointer">Escribir coordenadas a mano</summary>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <TextInput
                  placeholder="Latitud (7.1193)"
                  inputMode="decimal"
                  value={coords?.lat ?? ""}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    setCoords(e.target.value === "" || !Number.isFinite(n) ? null : { lat: n, lng: coords?.lng ?? 0 });
                  }}
                />
                <TextInput
                  placeholder="Longitud (-73.1227)"
                  inputMode="decimal"
                  value={coords?.lng ?? ""}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    setCoords(e.target.value === "" || !Number.isFinite(n) ? null : { lat: coords?.lat ?? 0, lng: n });
                  }}
                />
              </div>
            </details>
          </div>
          <div>
            <span className="mb-1.5 block text-sm font-medium text-ink-soft">Banner del evento (opcional)</span>
            {bannerId && (
              <div className="mb-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={bannerId === inicial?.bannerId && inicial ? urlBanner(inicial.id, bannerId) : `/api/imagenes/${bannerId}`}
                  alt="Banner del evento"
                  className="h-36 w-full rounded-xl border border-line object-cover"
                />
                <button type="button" onClick={() => setBannerId(null)} className="mt-1 text-sm text-danger">
                  Quitar banner
                </button>
              </div>
            )}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => subirBanner(e.target.files?.[0])}
              className="w-full rounded-lg border border-dashed border-line-strong bg-background px-3.5 py-2.5 text-sm text-ink-soft file:mr-3 file:rounded-md file:border-0 file:bg-brand-soft file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-brand-dark"
            />
            {subiendoBanner && <p className="mt-1 text-xs text-ink-soft">Subiendo…</p>}
            {errorBanner && <p className="mt-1 text-xs text-danger">{errorBanner}</p>}
            <p className="mt-1 text-xs text-ink-faint">
              Aparece en la tarjeta y en la ficha del evento. Mejor horizontal (por ejemplo 1200×400). JPG, PNG o WebP, máximo 3 MB. Sin banner, la tarjeta se ve como siempre.
            </p>
          </div>
          <Field label="Descripción">
            <textarea
              required
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-line-strong bg-surface px-3.5 py-2.5 text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
              placeholder="Cuéntale a los participantes qué encontrarán en el evento."
            />
          </Field>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-ink-soft">Categorías, cupos y tarifas</span>
              <button
                type="button"
                onClick={() =>
                  setCategorias((prev) => [...prev, { id: `cat-${prev.length}-${Date.now()}`, nombre: "", cupos: "", tarifa: "", inscritos: 0 }])
                }
                className="text-sm font-medium text-brand-dark"
              >
                + Agregar categoría
              </button>
            </div>
            <div className="space-y-2">
              {categorias.map((cat, i) => (
                <div key={cat.id} className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <TextInput placeholder="Categoría (5K)" value={cat.nombre} onChange={(e) => actualizarCategoria(i, "nombre", e.target.value)} />
                  <TextInput placeholder="Cupos" type="number" min={Math.max(1, cat.inscritos)} value={cat.cupos} onChange={(e) => actualizarCategoria(i, "cupos", e.target.value)} />
                  <TextInput placeholder="Tarifa (COP)" type="number" min={0} value={cat.tarifa} onChange={(e) => actualizarCategoria(i, "tarifa", e.target.value)} />
                  {cat.inscritos > 0 && <p className="text-xs text-ink-faint sm:col-span-3">{cat.inscritos} inscritos en esta categoría.</p>}
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-ink-soft">Recomendaciones para los asistentes (opcional)</span>
              <button
                type="button"
                onClick={() => setRecs((prev) => [...prev, { id: `rec-${Date.now()}-${prev.length}`, tipo: "hospedaje", nombre: "" }])}
                className="text-sm font-medium text-brand-dark"
              >
                + Agregar
              </button>
            </div>
            <div className="space-y-3">
              {recs.map((r, i) => (
                <div key={r.id} className="space-y-2 rounded-xl border border-line p-3">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-[9rem_1fr]">
                    <select
                      value={r.tipo}
                      onChange={(e) => setRecs((p) => p.map((x, k) => (k === i ? { ...x, tipo: e.target.value as TipoRecomendacion } : x)))}
                      className="rounded-xl border border-line-strong bg-surface px-3 py-2.5 text-[15px] text-ink"
                    >
                      {TIPOS.map((t) => (
                        <option key={t.valor} value={t.valor}>
                          {t.etiqueta}
                        </option>
                      ))}
                    </select>
                    <TextInput placeholder="Nombre (Hotel Centro)" value={r.nombre} onChange={(e) => setRecs((p) => p.map((x, k) => (k === i ? { ...x, nombre: e.target.value } : x)))} />
                  </div>
                  <TextInput placeholder="Detalle (a 5 min del lugar)" value={r.descripcion ?? ""} onChange={(e) => setRecs((p) => p.map((x, k) => (k === i ? { ...x, descripcion: e.target.value } : x)))} />
                  <div className="flex gap-2">
                    <TextInput placeholder="Enlace https://…" value={r.enlace ?? ""} onChange={(e) => setRecs((p) => p.map((x, k) => (k === i ? { ...x, enlace: e.target.value } : x)))} />
                    <button type="button" onClick={() => setRecs((p) => p.filter((_, k) => k !== i))} className="text-sm text-danger">
                      Quitar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {pedirPolitica && (
            <AceptarPolitica
              checked={acepta}
              onChange={setAcepta}
              texto="crear este evento, y me comprometo a tratar los datos de los inscritos solo para gestionarlo, conforme a esa política"
            />
          )}
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" className="w-full" disabled={cargando}>
            {cargando ? "Guardando..." : etiquetaEnviar}
          </Button>
        </form>
      </Card>

      <div className="mt-8 border-t border-line pt-8">
        <h2 className="font-display mb-1 text-lg font-semibold text-ink">Formulario de inscripción</h2>
        <p className="mb-4 text-sm text-ink-soft">
          Además de nombre, correo, documento y teléfono, agrega cualquier pregunta extra que necesites — igual que en Google Forms.
        </p>
        <GoogleFormBuilder campos={campos} onChange={setCampos} />
      </div>
    </>
  );
}
