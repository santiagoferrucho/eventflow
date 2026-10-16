import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { manejar, ok } from "@/lib/api-movil";

export const dynamic = "force-dynamic";

// Cierra la sesión del token que se envía (la borra en la base).
export async function POST() {
  return manejar(async () => {
    try {
      await auth.api.signOut({ headers: await headers() });
    } catch {
      /* si ya no había sesión, no hay nada que cerrar */
    }
    return ok({ ok: true });
  });
}
