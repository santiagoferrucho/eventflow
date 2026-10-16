import { ErrorHttp, manejar, ok, usuarioPublico } from "@/lib/api-movil";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

// Datos de la sesión actual. La app lo llama al abrir para saber si el token sigue vigente.
export async function GET() {
  return manejar(async () => {
    const user = await getSessionUser();
    if (!user) throw new ErrorHttp(401, "Tu sesión terminó. Inicia sesión de nuevo.");
    return ok(usuarioPublico(user));
  });
}
