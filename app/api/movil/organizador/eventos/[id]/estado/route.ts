import { cambiarEstadoEventoAction } from "@/lib/actions";
import { desdeResultado, exigirSesion, leerJson, manejar, texto } from "@/lib/api-movil";
import { ErrorNegocio } from "@/lib/errores";
import type { EventStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const ESTADOS: EventStatus[] = ["publicado", "pausado", "cerrado", "suspendido"];

// POST { estado }. Las reglas (qué puede el organizador y qué solo el admin) están en la acción.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return manejar(async () => {
    await exigirSesion("organizador", "administrador");
    const { id } = await params;
    const estado = texto((await leerJson(req)).estado) as EventStatus;
    if (!ESTADOS.includes(estado)) throw new ErrorNegocio("Estado no permitido.");
    return desdeResultado(await cambiarEstadoEventoAction(id, estado));
  });
}
