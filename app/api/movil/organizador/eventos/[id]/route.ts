import { getEventoGestionAction } from "@/lib/actions";
import { desdeResultado, exigirSesion, manejar } from "@/lib/api-movil";

export const dynamic = "force-dynamic";

// Evento + inscritos (para el panel y para el escáner).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return manejar(async () => {
    await exigirSesion("organizador", "administrador");
    const { id } = await params;
    return desdeResultado(await getEventoGestionAction(id));
  });
}
