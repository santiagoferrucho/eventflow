import { escanearAction } from "@/lib/actions";
import { desdeResultado, exigirSesion, leerJson, manejar, texto } from "@/lib/api-movil";

export const dynamic = "force-dynamic";

// POST { texto } con lo que leyó la cámara. No registra el ingreso: solo dice
// quién es y si puede entrar. El ingreso se confirma en /organizador/ingresos.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return manejar(async () => {
    await exigirSesion("organizador", "administrador");
    const { id } = await params;
    const b = await leerJson(req);
    return desdeResultado(await escanearAction(id, texto(b.texto)));
  });
}
