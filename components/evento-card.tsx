import Link from "next/link";
import { CalendarDays, MapPin, Navigation, Users } from "lucide-react";
import type { SportEvent } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { urlBanner } from "@/lib/imagenes";

const COP = (v: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(v);

export function EventoCard({ evento, distanciaKm }: { evento: SportEvent; distanciaKm?: number }) {
  const cupos = evento.categorias.reduce((s, c) => s + c.cupos, 0);
  const libres = evento.categorias.reduce((s, c) => s + c.cuposDisponibles, 0);
  const pct = cupos ? Math.round(((cupos - libres) / cupos) * 100) : 0;
  const tarifaDesde = Math.min(...evento.categorias.map((c) => c.tarifa));
  const fecha = new Date(evento.fecha + "T12:00:00");
  const agotado = libres === 0;
  const pocos = !agotado && libres / Math.max(cupos, 1) <= 0.15;

  return (
    <Link
      href={`/eventos/${evento.id}`}
      className="group block h-full rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
    >
      <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_1px_2px_rgba(11,17,32,0.04),0_10px_30px_-14px_rgba(11,17,32,0.10)] transition-all group-hover:-translate-y-0.5 group-hover:shadow-[0_1px_2px_rgba(11,17,32,0.04),0_18px_40px_-14px_rgba(99,85,255,0.28)]">
        {evento.bannerId && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={urlBanner(evento.id, evento.bannerId)} alt="" loading="lazy" className="h-36 w-full object-cover" />
        )}
        <div className="flex flex-1 flex-col p-5">
          <div className="flex items-start gap-4">
            <div className="flex w-14 shrink-0 flex-col items-center rounded-xl bg-brand-soft py-2 text-brand-dark" aria-hidden>
              <span className="font-display text-xl font-semibold leading-none">{fecha.getDate()}</span>
              <span className="mt-0.5 text-[11px] font-medium uppercase tracking-wide">
                {fecha.toLocaleDateString("es-CO", { month: "short" }).replace(".", "")}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex flex-wrap items-center gap-1.5">
                <Badge tone="gold">{evento.disciplina}</Badge>
                {agotado && <Badge tone="danger">Agotado</Badge>}
                {pocos && <Badge tone="danger">Últimos cupos</Badge>}
              </div>
              <h3 className="font-display text-lg font-semibold leading-snug text-ink group-hover:text-brand-dark">{evento.nombre}</h3>
            </div>
          </div>

          <ul className="mt-4 space-y-1.5 text-sm text-ink-soft">
            <li className="flex items-center gap-2">
              <CalendarDays className="size-4 shrink-0 text-ink-faint" aria-hidden />
              {fecha.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </li>
            <li className="flex items-center gap-2">
              <MapPin className="size-4 shrink-0 text-ink-faint" aria-hidden />
              <span className="truncate">{evento.lugar}</span>
            </li>
            {distanciaKm !== undefined && (
              <li className="flex items-center gap-2 font-medium text-brand-dark">
                <Navigation className="size-4 shrink-0" aria-hidden />A {distanciaKm < 1 ? "menos de 1" : Math.round(distanciaKm)} km de ti (en línea recta)
              </li>
            )}
          </ul>

          <p className="mt-3 line-clamp-2 text-sm text-ink-soft">{evento.descripcion}</p>

          <div className="mt-auto pt-4">
            <div className="mb-1.5 flex items-center justify-between text-xs text-ink-soft">
              <span className="flex items-center gap-1.5">
                <Users className="size-3.5" aria-hidden />
                {agotado ? "Sin cupos" : `${libres} cupos disponibles`}
              </span>
              <span>{pct}% ocupado</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-line">
              <div className={cn("h-full rounded-full", pocos || agotado ? "bg-danger" : "bg-gradient-to-r from-brand to-accent")} style={{ width: `${pct}%` }} />
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
              <span className="text-xs text-ink-soft">Desde</span>
              <span className="font-display text-lg font-semibold text-brand-dark">{COP(tarifaDesde)}</span>
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}
