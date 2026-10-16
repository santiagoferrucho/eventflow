"use client";

import { useMemo, useState } from "react";
import { Search, SearchX } from "lucide-react";
import type { SportEvent } from "@/lib/types";
import { EventoCard } from "@/components/evento-card";
import { cn } from "@/lib/utils";

// Lista de próximos eventos con buscador y filtro por disciplina.
export function EventosExplorador({ eventos }: { eventos: SportEvent[] }) {
  const [q, setQ] = useState("");
  const [disciplina, setDisciplina] = useState("");
  const [soloCupos, setSoloCupos] = useState(false);

  const disciplinas = useMemo(() => [...new Set(eventos.map((e) => e.disciplina))].sort((a, b) => a.localeCompare(b, "es")), [eventos]);
  const visibles = useMemo(() => {
    const t = q.trim().toLowerCase();
    return eventos.filter(
      (e) =>
        (!disciplina || e.disciplina === disciplina) &&
        (!soloCupos || e.categorias.some((c) => c.cuposDisponibles > 0)) &&
        (!t || [e.nombre, e.lugar, e.disciplina, e.descripcion].join(" ").toLowerCase().includes(t))
    );
  }, [eventos, q, disciplina, soloCupos]);

  const chip = (activo: boolean) =>
    cn(
      "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
      activo ? "border-brand bg-brand text-white" : "border-line-strong bg-surface text-ink-soft hover:border-brand hover:text-brand-dark"
    );

  return (
    <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6" aria-labelledby="proximos">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <h2 id="proximos" className="font-display text-xl font-semibold text-ink">
          Próximos eventos
        </h2>
        <p className="text-sm text-ink-soft" aria-live="polite">
          {visibles.length} {visibles.length === 1 ? "evento" : "eventos"}
        </p>
      </div>

      <div className="mb-6 space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-faint" aria-hidden />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Busca por nombre, lugar o disciplina"
            aria-label="Buscar eventos"
            className="w-full rounded-xl border border-line-strong bg-surface py-3 pl-10 pr-3.5 text-[15px] text-ink placeholder:text-ink-faint outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/30"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button className={chip(disciplina === "")} onClick={() => setDisciplina("")}>
            Todas
          </button>
          {disciplinas.map((d) => (
            <button key={d} className={chip(disciplina === d)} onClick={() => setDisciplina(disciplina === d ? "" : d)}>
              {d}
            </button>
          ))}
          <button className={cn(chip(soloCupos), "ml-auto")} onClick={() => setSoloCupos((v) => !v)} aria-pressed={soloCupos}>
            Solo con cupos
          </button>
        </div>
      </div>

      {visibles.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-line-strong bg-surface px-6 py-14 text-center">
          <SearchX className="mb-3 size-8 text-ink-faint" aria-hidden />
          <p className="font-medium text-ink">No encontramos eventos con esos filtros</p>
          <p className="mt-1 text-sm text-ink-soft">Prueba con otra palabra o quita los filtros.</p>
          <button
            className="mt-4 text-sm font-medium text-brand-dark hover:underline"
            onClick={() => {
              setQ("");
              setDisciplina("");
              setSoloCupos(false);
            }}
          >
            Limpiar filtros
          </button>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          {visibles.map((e) => (
            <EventoCard key={e.id} evento={e} />
          ))}
        </div>
      )}
    </section>
  );
}
