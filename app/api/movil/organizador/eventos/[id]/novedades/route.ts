import { enviarNovedadAction, listNovedadesEventoAction } from "@/lib/actions";
import { desdeResultado, exigirSesion, leerJson, manejar, texto } from "@/lib/api-movil";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return manejar(async () => {
    await exigirSesion("organizador", "administrador");
    const { id } = await params;
    return desdeResultado(await listNovedadesEventoAction(id));
  });
}

// POST { titulo, mensaje }: llega a quienes tienen cupo en el evento.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return manejar(async () => {
    await exigirSesion("organizador", "administrador");
    const { id } = await params;
    const b = await leerJson(req);
    return desdeResultado(await enviarNovedadAction(id, { titulo: texto(b.titulo), mensaje: texto(b.mensaje) }), 201);
  });
}
