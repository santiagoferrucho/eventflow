"use client";

import { useState } from "react";
import type { CustomField } from "@/lib/types";
import { MAX_IMAGEN_BYTES, urlImagen } from "@/lib/imagenes";

function CampoImagen({ requerido, valor, onChange }: { requerido: boolean; valor: string; onChange: (v: string) => void }) {
  const [estado, setEstado] = useState<"idle" | "subiendo">("idle");
  const [error, setError] = useState<string | null>(null);
  const [nombre, setNombre] = useState<string>("");

  async function subir(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (file.size > MAX_IMAGEN_BYTES) {
      setError("La imagen pesa más de 3 MB.");
      return;
    }
    setEstado("subiendo");
    try {
      const fd = new FormData();
      fd.append("archivo", file);
      const r = await fetch("/api/imagenes", { method: "POST", body: fd });
      const d = (await r.json()) as { valor?: string; nombre?: string; error?: string };
      if (!r.ok || !d.valor) {
        setError(d.error ?? "No pudimos subir la imagen.");
        onChange("");
        return;
      }
      setNombre(d.nombre ?? file.name);
      onChange(d.valor);
    } catch {
      setError("No pudimos subir la imagen. Revisa la conexión.");
    } finally {
      setEstado("idle");
    }
  }

  const id = valor.startsWith("img:") ? valor.slice(4) : null;
  return (
    <div>
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        required={requerido && !valor}
        onChange={(e) => subir(e.target.files?.[0])}
        className="w-full rounded-lg border border-dashed border-line-strong bg-background px-3.5 py-2.5 text-sm text-ink-soft file:mr-3 file:rounded-md file:border-0 file:bg-brand-soft file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-brand-dark"
      />
      {estado === "subiendo" && <p className="mt-1 text-xs text-ink-soft">Subiendo…</p>}
      {id && estado === "idle" && (
        <div className="mt-2 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={urlImagen(id)} alt="Imagen subida" className="h-16 w-16 rounded-lg border border-line object-cover" />
          <span className="text-xs text-success">Subida: {nombre || "imagen"}</span>
        </div>
      )}
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      <p className="mt-1 text-xs text-ink-faint">JPG, PNG o WebP, máximo 3 MB.</p>
    </div>
  );
}

export function GoogleFormFiller({
  campos,
  respuestas,
  onChange,
}: {
  campos: CustomField[];
  respuestas: Record<string, string>;
  onChange: (id: string, valor: string) => void;
}) {
  if (campos.length === 0) return null;

  return (
    <div className="space-y-4">
      {campos.map((campo) => {
        const valor = respuestas[campo.id] ?? "";
        return (
          <div
            key={campo.id}
            className="overflow-hidden rounded-xl border border-line bg-surface shadow-[0_1px_2px_rgba(11,17,32,0.04)]"
          >
            <div className="border-l-4 border-brand p-4">
              <p className="mb-3 text-[15px] font-medium text-ink">
                {campo.etiqueta}
                {campo.requerido && <span className="ml-1 text-danger">*</span>}
              </p>
              {campo.descripcion && <p className="mb-3 -mt-2 text-sm text-ink-soft">{campo.descripcion}</p>}

              {(campo.tipo === "corta" || campo.tipo === "numero") && (
                <input
                  type={campo.tipo === "numero" ? "number" : "text"}
                  required={campo.requerido}
                  value={valor}
                  onChange={(e) => onChange(campo.id, e.target.value)}
                  className="w-full max-w-sm border-b border-line-strong bg-transparent py-1.5 text-sm text-ink focus:border-brand focus:outline-none"
                  placeholder="Tu respuesta"
                />
              )}

              {campo.tipo === "parrafo" && (
                <textarea
                  required={campo.requerido}
                  value={valor}
                  onChange={(e) => onChange(campo.id, e.target.value)}
                  rows={3}
                  className="w-full border-b border-line-strong bg-transparent py-1.5 text-sm text-ink focus:border-brand focus:outline-none"
                  placeholder="Tu respuesta"
                />
              )}

              {(campo.tipo === "fecha" || campo.tipo === "hora") && (
                <input
                  type={campo.tipo}
                  required={campo.requerido}
                  value={valor}
                  onChange={(e) => onChange(campo.id, e.target.value)}
                  className="w-48 rounded-lg border border-line-strong bg-surface px-3 py-1.5 text-sm text-ink focus:border-brand focus:outline-none"
                />
              )}

              {campo.tipo === "imagen" && (
                <CampoImagen requerido={campo.requerido} valor={valor} onChange={(v) => onChange(campo.id, v)} />
              )}

              {campo.tipo === "opcion_multiple" && (
                <div className="space-y-2.5" role="radiogroup" aria-required={campo.requerido}>
                  {campo.opciones?.map((opcion) => (
                    <label key={opcion} className="flex cursor-pointer items-center gap-2.5 text-sm text-ink">
                      <input
                        type="radio"
                        name={campo.id}
                        required={campo.requerido}
                        checked={valor === opcion}
                        onChange={() => onChange(campo.id, opcion)}
                        className="h-4 w-4 accent-brand"
                      />
                      {opcion}
                    </label>
                  ))}
                </div>
              )}

              {campo.tipo === "casillas" && (
                <div className="space-y-2.5">
                  {campo.opciones?.map((opcion) => {
                    const seleccionadas = valor ? valor.split(", ").filter(Boolean) : [];
                    const marcada = seleccionadas.includes(opcion);
                    return (
                      <label key={opcion} className="flex cursor-pointer items-center gap-2.5 text-sm text-ink">
                        <input
                          type="checkbox"
                          checked={marcada}
                          onChange={() => {
                            const nuevas = marcada
                              ? seleccionadas.filter((o) => o !== opcion)
                              : [...seleccionadas, opcion];
                            onChange(campo.id, nuevas.join(", "));
                          }}
                          className="h-4 w-4 rounded accent-brand"
                        />
                        {opcion}
                      </label>
                    );
                  })}
                </div>
              )}

              {campo.tipo === "desplegable" && (
                <select
                  required={campo.requerido}
                  value={valor}
                  onChange={(e) => onChange(campo.id, e.target.value)}
                  className="w-full max-w-sm rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none"
                >
                  <option value="" disabled>
                    Elige una opción
                  </option>
                  {campo.opciones?.map((opcion) => (
                    <option key={opcion} value={opcion}>
                      {opcion}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
