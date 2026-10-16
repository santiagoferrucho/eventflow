import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { aceptarPoliticaPrimerIngresoAction, completarCambioPasswordAction } from "@/lib/actions";
import { ErrorHttp, leerJson, manejar, ok, texto } from "@/lib/api-movil";
import { ErrorNegocio } from "@/lib/errores";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

// Cambio de contraseña (también el obligatorio del primer ingreso de un
// organizador). POST { actual, nueva, aceptaPolitica }
export async function POST(req: Request) {
  return manejar(async () => {
    const user = await getSessionUser();
    if (!user) throw new ErrorHttp(401, "Tu sesión terminó. Inicia sesión de nuevo.");
    const b = await leerJson(req);
    const actual = texto(b.actual);
    const nueva = texto(b.nueva);
    if (nueva.length < 8) throw new ErrorNegocio("La contraseña nueva debe tener al menos 8 caracteres.");
    if (nueva === actual) throw new ErrorNegocio("La contraseña nueva debe ser distinta a la actual.");
    if (user.debeCambiarPassword) {
      const aceptada = await aceptarPoliticaPrimerIngresoAction(b.aceptaPolitica === true);
      if (!aceptada.ok) throw new ErrorNegocio(aceptada.error);
    }
    try {
      await auth.api.changePassword({
        body: { currentPassword: actual, newPassword: nueva, revokeOtherSessions: false },
        headers: await headers(),
      });
    } catch {
      throw new ErrorNegocio("La contraseña actual no es correcta.");
    }
    if (user.debeCambiarPassword) await completarCambioPasswordAction();
    return ok({ ok: true });
  });
}
