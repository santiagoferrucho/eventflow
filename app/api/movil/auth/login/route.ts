import { leerJson, manejar, ok, texto, usuarioPublico } from "@/lib/api-movil";
import { llamarAuth } from "@/lib/api-movil-auth";
import { ErrorNegocio } from "@/lib/errores";

export const dynamic = "force-dynamic";

// POST { correo, password } -> { token, usuario }
export async function POST(req: Request) {
  return manejar(async () => {
    const b = await leerJson(req);
    const correo = texto(b.correo).trim().toLowerCase();
    const password = texto(b.password);
    if (!correo || !password) throw new ErrorNegocio("Escribe tu correo y tu contraseña.");
    const { token, usuario } = await llamarAuth("/sign-in/email", { email: correo, password });
    return ok({ token, usuario: usuarioPublico(usuario) });
  });
}
