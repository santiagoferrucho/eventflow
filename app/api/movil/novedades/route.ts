import { listMisNovedadesAction } from "@/lib/actions";
import { exigirSesion, manejar, ok } from "@/lib/api-movil";

export const dynamic = "force-dynamic";

// Novedades de los eventos en los que la persona tiene cupo.
export async function GET() {
  return manejar(async () => {
    await exigirSesion();
    return ok(await listMisNovedadesAction());
  });
}
