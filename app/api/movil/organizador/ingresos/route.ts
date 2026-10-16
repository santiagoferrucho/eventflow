import { checkInAction } from "@/lib/actions";
import { desdeResultado, exigirSesion, leerJson, manejar, texto } from "@/lib/api-movil";

export const dynamic = "force-dynamic";

// POST { registroId }: registra el ingreso (atómico: no hay doble ingreso).
export async function POST(req: Request) {
  return manejar(async () => {
    await exigirSesion("organizador", "administrador");
    const b = await leerJson(req);
    return desdeResultado(await checkInAction(texto(b.registroId)));
  });
}
