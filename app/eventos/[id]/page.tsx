import { notFound } from "next/navigation";
import Link from "next/link";
import { repo } from "@/lib/repo";
import { codigoEvento } from "@/lib/codigos";
import { getSessionUser } from "@/lib/session";
import { urlBanner } from "@/lib/imagenes";
import { ArrowRight, BedDouble, CalendarDays, Car, ExternalLink, Info, MapPin, Navigation, Sparkles, Users, Utensils } from "lucide-react";
import { Badge, Button, Card } from "@/components/ui";

const ETIQUETA_REC = { hospedaje: "Dónde dormir", comida: "Dónde comer", transporte: "Cómo llegar", otro: "Otros datos" } as const;

const ICONO_REC = { hospedaje: BedDouble, comida: Utensils, transporte: Car, otro: Sparkles } as const;

function formatCOP(value: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(
    value
  );
}

export default async function EventoDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const evento = await repo.getEvent(id);
  if (!evento) notFound();
  const user = await getSessionUser();
  const tieneCoords = evento.latitud != null && evento.longitud != null;
  const d = 0.008;
  const bbox = tieneCoords ? [evento.longitud! - d, evento.latitud! - d, evento.longitud! + d, evento.latitud! + d].join("%2C") : "";

  const fecha = new Date(evento.fecha + "T12:00:00");
  const libres = evento.categorias.reduce((t, c) => t + c.cuposDisponibles, 0);
  const mapsHref = tieneCoords
    ? `https://www.google.com/maps/search/?api=1&query=${evento.latitud},${evento.longitud}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(evento.lugar)}`;
  const wazeHref = tieneCoords
    ? `https://waze.com/ul?ll=${evento.latitud},${evento.longitud}&navigate=yes`
    : `https://waze.com/ul?q=${encodeURIComponent(evento.lugar)}&navigate=yes`;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-12">
      {evento.bannerId && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={urlBanner(evento.id, evento.bannerId)} alt="" className="mb-8 h-48 w-full rounded-2xl border border-line object-cover sm:h-72" />
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:items-start">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge tone="gold">{evento.disciplina}</Badge>
            <span className="text-xs text-ink-faint">{codigoEvento(evento.numero)}</span>
          </div>
          <h1 className="font-display text-3xl font-semibold leading-tight text-ink sm:text-4xl">{evento.nombre}</h1>

          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            <li className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3.5">
              <span className="flex size-10 items-center justify-center rounded-lg bg-brand-soft text-brand-dark"><CalendarDays className="size-5" aria-hidden /></span>
              <span className="text-sm"><span className="block text-xs text-ink-soft">Fecha</span><span className="font-medium text-ink">{fecha.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span></span>
            </li>
            <li className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3.5">
              <span className="flex size-10 items-center justify-center rounded-lg bg-brand-soft text-brand-dark"><MapPin className="size-5" aria-hidden /></span>
              <span className="text-sm"><span className="block text-xs text-ink-soft">Lugar</span><span className="font-medium text-ink">{evento.lugar}</span></span>
            </li>
          </ul>

          <h2 className="mt-8 mb-2 font-display text-lg font-semibold text-ink">Sobre el evento</h2>
          <p className="whitespace-pre-line text-ink-soft">{evento.descripcion}</p>

          <h2 className="mt-8 mb-3 font-display text-lg font-semibold text-ink">Cómo llegar</h2>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline"><a href={mapsHref} target="_blank" rel="noopener noreferrer"><MapPin className="size-4" aria-hidden />Google Maps<ExternalLink className="size-3.5 opacity-60" aria-hidden /></a></Button>
            <Button asChild variant="outline"><a href={wazeHref} target="_blank" rel="noopener noreferrer"><Navigation className="size-4" aria-hidden />Waze<ExternalLink className="size-3.5 opacity-60" aria-hidden /></a></Button>
          </div>
          {tieneCoords && (
            <iframe
              title={`Mapa de ${evento.lugar}`}
              loading="lazy"
              className="mt-4 h-64 w-full rounded-2xl border border-line"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${evento.latitud},${evento.longitud}`}
            />
          )}

          {evento.recomendaciones.length > 0 && (
            <>
              <h2 className="mt-8 mb-3 font-display text-lg font-semibold text-ink">Recomendaciones del organizador</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {evento.recomendaciones.map((r) => {
                  const Icono = ICONO_REC[r.tipo];
                  return (
                    <Card key={r.id}>
                      <p className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-brand-dark"><Icono className="size-3.5" aria-hidden />{ETIQUETA_REC[r.tipo]}</p>
                      <p className="font-medium text-ink">{r.nombre}</p>
                      {r.descripcion && <p className="text-sm text-ink-soft">{r.descripcion}</p>}
                      {r.enlace && (
                        <a href={r.enlace} target="_blank" rel="noopener noreferrer" className="text-sm text-brand-dark underline">Ver más</a>
                      )}
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <aside className="lg:sticky lg:top-24">
          <div className="rounded-2xl border border-line bg-surface p-5 shadow-[0_10px_30px_-14px_rgba(11,17,32,0.14)]">
            <h2 className="font-display text-lg font-semibold text-ink">Elige tu categoría</h2>
            <p className="mb-4 flex items-center gap-1.5 text-sm text-ink-soft"><Users className="size-4" aria-hidden />{libres} cupos disponibles en total</p>
            {!user && (
              <p className="mb-4 flex gap-2 rounded-lg bg-brand-soft p-3 text-xs text-brand-dark">
                <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
                Necesitas una cuenta para inscribirte. Te pedimos iniciar sesión o crearla y vuelves aquí.
              </p>
            )}
            <div className="space-y-3">
              {evento.categorias.map((cat) => {
                const agotada = cat.cuposDisponibles === 0;
                return (
                  <div key={cat.id} className="rounded-xl border border-line p-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-ink">{cat.nombre}</p>
                        <p className="text-xs text-ink-soft">{cat.cuposDisponibles} de {cat.cupos} cupos</p>
                      </div>
                      <span className="font-display font-semibold text-brand-dark">{formatCOP(cat.tarifa)}</span>
                    </div>
                    {agotada ? (
                      <Button className="mt-3 w-full" disabled>Agotado</Button>
                    ) : (
                      <Button asChild className="mt-3 w-full"><Link href={`/eventos/${evento.id}/inscripcion?categoria=${cat.id}`}>Inscribirme<ArrowRight className="size-4" aria-hidden /></Link></Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
