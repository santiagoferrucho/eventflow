import { notFound } from "next/navigation";
import Link from "next/link";
import { repo } from "@/lib/repo";
import { Badge, Button, Card } from "@/components/ui";

function formatCOP(value: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(
    value
  );
}

export default async function EventoDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const evento = await repo.getEvent(id);
  if (!evento) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <div className="mb-2 flex items-center gap-2">
        <Badge tone="gold">{evento.disciplina}</Badge>
        <span className="text-sm text-ink-soft">
          {new Date(evento.fecha + "T00:00:00").toLocaleDateString("es-CO", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </span>
      </div>
      <h1 className="font-display text-3xl font-semibold text-ink">{evento.nombre}</h1>
      <p className="mt-1 text-ink-soft">{evento.lugar}</p>
      <p className="mt-5 max-w-xl text-ink-soft">{evento.descripcion}</p>

      <h2 className="mt-10 mb-3 font-display text-lg font-semibold text-ink">Elige tu categoría</h2>
      <div className="space-y-3">
        {evento.categorias.map((cat) => (
          <Card key={cat.id} className="flex items-center justify-between">
            <div>
              <p className="font-medium text-ink">{cat.nombre}</p>
              <p className="text-sm text-ink-soft">{cat.cuposDisponibles} de {cat.cupos} cupos disponibles</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-display font-semibold text-brand-dark">{formatCOP(cat.tarifa)}</span>
              <Link href={`/eventos/${evento.id}/inscripcion?categoria=${cat.id}`}>
                <Button disabled={cat.cuposDisponibles === 0}>
                  {cat.cuposDisponibles === 0 ? "Agotado" : "Inscribirme"}
                </Button>
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
