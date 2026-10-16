import { listEventosGestionablesAction } from "@/lib/actions";
import { exigirSesion, manejar, ok } from "@/lib/api-movil";

export const dynamic = "force-dynamic";

// Eventos que la persona gestiona, con inscritos, pagos, ingresos y recaudo.
export async function GET() {
  return manejar(async () => {
    await exigirSesion("organizador", "administrador");
    return ok(await listEventosGestionablesAction());
  });
}
