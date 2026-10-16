import { repo } from "@/lib/repo";
import { EventosExplorador } from "@/components/eventos-explorador";
import { EventosCercanos } from "@/components/eventos-cercanos";

// La lista de eventos sale de la base de datos y cambia todo el tiempo: la
// página se genera en cada visita. Sin esto, Next.js la generaría una sola
// vez al desplegar y los eventos nuevos no aparecerían.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [events, populares] = await Promise.all([repo.listEvents(), repo.listPopularEvents(4)]);

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

      <EventosCercanos populares={populares} />

      <EventosExplorador eventos={events} />
    </div>
  );
}
