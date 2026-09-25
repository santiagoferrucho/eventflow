"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { createEventAction } from "@/lib/actions";
import { Button, Card, Field, TextInput } from "@/components/ui";
import { GoogleFormBuilder } from "@/components/google-form-builder";
import type { CustomField } from "@/lib/types";

interface CategoriaForm {
  nombre: string;
  cupos: string;
  tarifa: string;
}

export default function NuevoEventoPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [disciplina, setDisciplina] = useState("");
  const [fecha, setFecha] = useState("");
  const [lugar, setLugar] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [categorias, setCategorias] = useState<CategoriaForm[]>([{ nombre: "", cupos: "", tarifa: "" }]);
  const [campos, setCampos] = useState<CustomField[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  function actualizarCategoria(i: number, campo: keyof CategoriaForm, valor: string) {
    setCategorias((prev) => prev.map((c, idx) => (idx === i ? { ...c, [campo]: valor } : c)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setError(null);

    const categoriasValidas = categorias.filter((c) => c.nombre && c.cupos && c.tarifa);
    if (categoriasValidas.length === 0) {
      setError("Agrega al menos una categoría con cupos y tarifa.");
      return;
    }
    const camposValidos = campos.filter((c) => c.etiqueta.trim());

    setCargando(true);
    try {
      const evento = await createEventAction({
        organizadorId: user.id,
        nombre,
        disciplina,
        fecha,
        lugar,
        descripcion,
        categorias: categoriasValidas.map((c, i) => ({
          id: `cat-${i}-${Date.now()}`,
          nombre: c.nombre,
          cupos: Number(c.cupos),
          cuposDisponibles: Number(c.cupos),
          tarifa: Number(c.tarifa),
        })),
        camposAdicionales: camposValidos,
      });
      router.push(`/eventos/${evento.id}`);
    } catch {
      setError("No pudimos publicar el evento. Intenta de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-12">
      <h1 className="font-display mb-6 text-2xl font-semibold text-ink">Crear evento</h1>
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
          <Field label="Lugar">
            <TextInput required value={lugar} onChange={(e) => setLugar(e.target.value)} placeholder="Parque de los Niños, Bucaramanga" />
          </Field>
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
                onClick={() => setCategorias((prev) => [...prev, { nombre: "", cupos: "", tarifa: "" }])}
                className="text-sm font-medium text-brand-dark"
              >
                + Agregar categoría
              </button>
            </div>
            <div className="space-y-2">
              {categorias.map((cat, i) => (
                <div key={i} className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <TextInput
                    placeholder="Categoría (5K)"
                    value={cat.nombre}
                    onChange={(e) => actualizarCategoria(i, "nombre", e.target.value)}
                  />
                  <TextInput
                    placeholder="Cupos"
                    type="number"
                    min={1}
                    value={cat.cupos}
                    onChange={(e) => actualizarCategoria(i, "cupos", e.target.value)}
                  />
                  <TextInput
                    placeholder="Tarifa (COP)"
                    type="number"
                    min={0}
                    value={cat.tarifa}
                    onChange={(e) => actualizarCategoria(i, "tarifa", e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" className="w-full" disabled={cargando}>
            {cargando ? "Publicando..." : "Publicar evento"}
          </Button>
        </form>
      </Card>

      <div className="mt-8 border-t border-line pt-8">
        <h2 className="font-display mb-1 text-lg font-semibold text-ink">Formulario de inscripción</h2>
        <p className="mb-4 text-sm text-ink-soft">
          Además de nombre, correo, documento y teléfono, agrega cualquier pregunta extra que
          necesites — igual que en Google Forms.
        </p>
        <GoogleFormBuilder campos={campos} onChange={setCampos} />
      </div>
    </div>
  );
}
