"use client";

import type { CustomField, CustomFieldType } from "@/lib/types";

const TIPOS: { value: CustomFieldType; label: string }[] = [
  { value: "corta", label: "Respuesta corta" },
  { value: "parrafo", label: "Párrafo" },
  { value: "opcion_multiple", label: "Opción múltiple" },
  { value: "casillas", label: "Casillas de verificación" },
  { value: "desplegable", label: "Menú desplegable" },
  { value: "fecha", label: "Fecha" },
  { value: "hora", label: "Hora" },
  { value: "numero", label: "Número" },
  { value: "imagen", label: "Subida de archivo (imagen)" },
];

const CON_OPCIONES: CustomFieldType[] = ["opcion_multiple", "casillas", "desplegable"];

function genId() {
  return `campo-${Math.random().toString(36).slice(2, 10)}`;
}

function DuplicateIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 7h16M9 7V4h6v3M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" strokeLinecap="round" />
    </svg>
  );
}
function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  );
}

export function GoogleFormBuilder({
  campos,
  onChange,
}: {
  campos: CustomField[];
  onChange: (campos: CustomField[]) => void;
}) {
  function actualizar(id: string, cambios: Partial<CustomField>) {
    onChange(campos.map((c) => (c.id === id ? { ...c, ...cambios } : c)));
  }

  function agregarPregunta() {
    onChange([
      ...campos,
      { id: genId(), etiqueta: "", tipo: "corta", requerido: false },
    ]);
  }

  function duplicar(id: string) {
    const original = campos.find((c) => c.id === id);
    if (!original) return;
    const copia: CustomField = { ...original, id: genId() };
    const i = campos.findIndex((c) => c.id === id);
    const nuevos = [...campos];
    nuevos.splice(i + 1, 0, copia);
    onChange(nuevos);
  }

  function eliminar(id: string) {
    onChange(campos.filter((c) => c.id !== id));
  }

  function cambiarTipo(id: string, tipo: CustomFieldType) {
    const necesitaOpciones = CON_OPCIONES.includes(tipo);
    const campo = campos.find((c) => c.id === id);
    const opciones = necesitaOpciones ? campo?.opciones ?? ["Opción 1"] : undefined;
    actualizar(id, { tipo, opciones });
  }

  function actualizarOpcion(id: string, i: number, valor: string) {
    const campo = campos.find((c) => c.id === id);
    if (!campo?.opciones) return;
    const opciones = campo.opciones.map((o, idx) => (idx === i ? valor : o));
    actualizar(id, { opciones });
  }

  function agregarOpcion(id: string) {
    const campo = campos.find((c) => c.id === id);
    if (!campo) return;
    const opciones = [...(campo.opciones ?? []), `Opción ${(campo.opciones?.length ?? 0) + 1}`];
    actualizar(id, { opciones });
  }

  function quitarOpcion(id: string, i: number) {
    const campo = campos.find((c) => c.id === id);
    if (!campo?.opciones) return;
    actualizar(id, { opciones: campo.opciones.filter((_, idx) => idx !== i) });
  }

  return (
    <div className="space-y-4">
      {campos.map((campo) => {
        const conOpciones = CON_OPCIONES.includes(campo.tipo);
        return (
          <div
            key={campo.id}
            className="overflow-hidden rounded-xl border border-line bg-surface shadow-[0_1px_2px_rgba(11,17,32,0.04)]"
          >
            <div className="border-l-4 border-brand p-4">
              {/* Encabezado: etiqueta de la pregunta + tipo */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                <input
                  value={campo.etiqueta}
                  onChange={(e) => actualizar(campo.id, { etiqueta: e.target.value })}
                  placeholder="Pregunta sin título"
                  className="flex-1 border-b border-line-strong bg-transparent px-1 py-2 text-[15px] text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none"
                />
                <select
                  value={campo.tipo}
                  onChange={(e) => cambiarTipo(campo.id, e.target.value as CustomFieldType)}
                  className="rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none sm:w-56"
                >
                  {TIPOS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Cuerpo: según el tipo */}
              <div className="mt-4">
                {(campo.tipo === "corta" || campo.tipo === "numero") && (
                  <input
                    disabled
                    placeholder={campo.tipo === "numero" ? "Respuesta numérica" : "Texto de respuesta corta"}
                    className="w-full max-w-sm border-b border-dashed border-line-strong bg-transparent py-1.5 text-sm text-ink-faint"
                  />
                )}
                {campo.tipo === "parrafo" && (
                  <input
                    disabled
                    placeholder="Texto de respuesta larga"
                    className="w-full border-b border-dashed border-line-strong bg-transparent py-1.5 text-sm text-ink-faint"
                  />
                )}
                {(campo.tipo === "fecha" || campo.tipo === "hora") && (
                  <input
                    disabled
                    type={campo.tipo}
                    className="w-48 rounded-lg border border-line-strong bg-background px-3 py-1.5 text-sm text-ink-faint"
                  />
                )}
                {campo.tipo === "imagen" && (
                  <div className="inline-flex items-center gap-2 rounded-lg border border-dashed border-line-strong px-4 py-2 text-sm text-ink-faint">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M12 16V4M12 4l-4 4M12 4l4 4" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" strokeLinecap="round" />
                    </svg>
                    Agregar archivo
                  </div>
                )}
                {conOpciones && (
                  <div className="space-y-2">
                    {campo.opciones?.map((opcion, i) => (
                      <div key={i} className="flex items-center gap-2.5">
                        <span
                          className={`h-4 w-4 shrink-0 border border-ink-faint ${
                            campo.tipo === "opcion_multiple" ? "rounded-full" : "rounded-[3px]"
                          }`}
                        />
                        {campo.tipo === "desplegable" && (
                          <span className="w-4 shrink-0 text-xs text-ink-faint">{i + 1}.</span>
                        )}
                        <input
                          value={opcion}
                          onChange={(e) => actualizarOpcion(campo.id, i, e.target.value)}
                          className="flex-1 border-b border-transparent bg-transparent py-1 text-sm text-ink hover:border-line-strong focus:border-brand focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => quitarOpcion(campo.id, i)}
                          className="text-ink-faint hover:text-danger"
                          aria-label="Quitar opción"
                        >
                          <CloseIcon />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => agregarOpcion(campo.id)}
                      className="ml-6 flex items-center gap-2 text-sm text-ink-soft hover:text-brand-dark"
                    >
                      <span
                        className={`h-4 w-4 border border-ink-faint ${
                          campo.tipo === "opcion_multiple" ? "rounded-full" : "rounded-[3px]"
                        }`}
                      />
                      Añadir opción
                    </button>
                  </div>
                )}
              </div>

              {/* Pie: duplicar, eliminar, obligatorio */}
              <div className="mt-4 flex items-center justify-end gap-3 border-t border-line pt-3">
                <button
                  type="button"
                  onClick={() => duplicar(campo.id)}
                  className="text-ink-soft hover:text-brand-dark"
                  aria-label="Duplicar pregunta"
                  title="Duplicar"
                >
                  <DuplicateIcon />
                </button>
                <button
                  type="button"
                  onClick={() => eliminar(campo.id)}
                  className="text-ink-soft hover:text-danger"
                  aria-label="Eliminar pregunta"
                  title="Eliminar"
                >
                  <TrashIcon />
                </button>
                <span className="h-5 w-px bg-line" />
                <label className="flex items-center gap-2 text-sm text-ink-soft">
                  Obligatorio
                  <button
                    type="button"
                    role="switch"
                    aria-checked={campo.requerido}
                    onClick={() => actualizar(campo.id, { requerido: !campo.requerido })}
                    className={`relative h-5 w-9 rounded-full transition-colors ${
                      campo.requerido ? "bg-brand" : "bg-line-strong"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                        campo.requerido ? "translate-x-[18px]" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </label>
              </div>
            </div>
          </div>
        );
      })}

      <button
        type="button"
        onClick={agregarPregunta}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line-strong py-3 text-sm font-medium text-ink-soft hover:border-brand hover:text-brand-dark"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 5v14M5 12h14" strokeLinecap="round" />
        </svg>
        Añadir pregunta
      </button>
    </div>
  );
}
