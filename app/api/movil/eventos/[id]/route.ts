import { fallo, manejar, ok } from "@/lib/api-movil";
import { repo } from "@/lib/repo";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

// Ficha pública de un evento. Borradores y eventos suspendidos solo los ven
// su organizador y el administrador.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return manejar(async () => {
    const { id } = await params;
    const evento = await repo.getEvent(id);
    if (!evento) return fallo("Evento no encontrado.", 404);
    if (evento.estado === "borrador" || evento.estado === "suspendido") {
      const user = await getSessionUser();
      const puede = user && (user.rol === "administrador" || user.id === evento.organizadorId);
      if (!puede) return fallo("Evento no encontrado.", 404);
    }
    return ok(evento);
  });
}
