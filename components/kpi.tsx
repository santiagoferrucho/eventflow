import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export function Kpi({ etiqueta, valor, nota, tono = "ink", icono: Icono }: { etiqueta: string; valor: ReactNode; nota?: string; icono?: LucideIcon; tono?: "ink" | "brand" | "gold" | "success" }) {
  const color = { ink: "text-ink", brand: "text-brand-dark", gold: "text-gold", success: "text-success" }[tono];
  return (
    <div className="rounded-2xl border border-line bg-surface p-5 shadow-[0_1px_2px_rgba(11,17,32,0.04)]">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">{etiqueta}</p>
        {Icono && <span className="flex size-8 items-center justify-center rounded-lg bg-brand-soft text-brand-dark"><Icono className="size-4" aria-hidden /></span>}
      </div>
      <p className={`font-display mt-1.5 text-2xl font-semibold sm:text-3xl ${color}`}>{valor}</p>
      {nota && <p className="mt-0.5 text-xs text-ink-soft">{nota}</p>}
    </div>
  );
}

export function Encabezado({ titulo, descripcion, acciones }: { titulo: string; descripcion?: string; acciones?: ReactNode }) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">{titulo}</h1>
        {descripcion && <p className="mt-0.5 text-sm text-ink-soft">{descripcion}</p>}
      </div>
      {acciones && <div className="flex flex-wrap gap-2">{acciones}</div>}
    </div>
  );
}
