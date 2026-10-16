import { manejar, ok } from "@/lib/api-movil";
import { hoyBogota } from "@/lib/fechas";
import { repo } from "@/lib/repo";

export const dynamic = "force-dynamic";

// Eventos publicados que aún no han pasado, del más próximo al más lejano.
export async function GET() {
  return manejar(async () => {
    const hoy = hoyBogota();
    const eventos = (await repo.listEvents())
      .filter((e) => e.fecha >= hoy)
      .sort((a, b) => a.fecha.localeCompare(b.fecha));
    return ok(eventos);
  });
}
