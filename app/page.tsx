import Link from "next/link";
import { repo } from "@/lib/repo";
import { Badge, Card } from "@/components/ui";

function formatCOP(value: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(
    value
  );
}

function formatFecha(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function HomePage() {
  const events = await repo.listEvents();

  return (
    <div>
      <section className="relative overflow-hidden border-b border-line">
        <div className="bg-grid pointer-events-none absolute inset-0" />
        <div className="relative mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="max-w-2xl">
            <span className="mb-4 inline-flex items-center rounded-full border border-line-strong bg-surface px-3 py-1 text-xs font-medium text-ink-soft">
              Formulario, pago y boleta digital en un solo flujo
            </span>
            <h1 className="font-display text-4xl font-semibold leading-[1.1] text-ink sm:text-5xl md:text-6xl">
              Inscríbete a tu próxima carrera en <span className="text-gradient">tres pasos.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base text-ink-soft sm:text-lg">
              Sin formularios genéricos ni conciliación manual por WhatsApp: confirmación
              inmediata y boleta con código QR, todo desde el celular.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <h2 className="mb-5 text-sm font-medium uppercase tracking-wide text-ink-soft">
          Próximos eventos
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {events.map((evento) => {
            const cuposTotal = evento.categorias.reduce((sum, c) => sum + c.cuposDisponibles, 0);
            const tarifaDesde = Math.min(...evento.categorias.map((c) => c.tarifa));
            return (
              <Link key={evento.id} href={`/eventos/${evento.id}`}>
                <Card className="h-full transition-all hover:-translate-y-0.5 hover:shadow-[0_1px_2px_rgba(11,17,32,0.04),0_16px_36px_-14px_rgba(99,85,255,0.25)]">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <h3 className="font-display text-xl font-semibold text-ink">{evento.nombre}</h3>
                    <Badge tone="gold">{evento.disciplina}</Badge>
                  </div>
                  <p className="text-sm text-ink-soft">{formatFecha(evento.fecha)} · {evento.lugar}</p>
                  <p className="mt-3 text-sm text-ink-soft">{evento.descripcion}</p>
                  <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-sm">
                    <span className="text-ink-soft">{cuposTotal} cupos disponibles</span>
                    <span className="font-display font-semibold text-brand-dark">Desde {formatCOP(tarifaDesde)}</span>
                  </div>
                </Card>
              </Link>
            );
          })}
          {events.length === 0 && (
            <p className="text-ink-soft">Todavía no hay eventos publicados.</p>
          )}
        </div>
      </section>
    </div>
  );
}
