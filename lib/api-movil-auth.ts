import "server-only";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { ErrorHttp } from "@/lib/api-movil";
import { getSessionUserFrom } from "@/lib/session";
import type { AppUser } from "@/lib/types";

// Llama a un endpoint de Better Auth pasando por su manejador HTTP real, no por
// la API interna: así aplican los mismos filtros que en la web (límite de
// intentos, verificación de la política al registrarse, cuentas desactivadas).
export async function llamarAuth(ruta: string, cuerpo: unknown): Promise<{ token: string; usuario: AppUser }> {
  const base = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  const entrantes = await headers();
  const h = new Headers({ "content-type": "application/json", origin: base });
  const ip = entrantes.get("x-forwarded-for") ?? entrantes.get("x-real-ip");
  if (ip) h.set("x-forwarded-for", ip);
  const ua = entrantes.get("user-agent");
  if (ua) h.set("user-agent", ua);

  const res = await auth.handler(
    new Request(new URL(`/api/auth${ruta}`, base), { method: "POST", headers: h, body: JSON.stringify(cuerpo) })
  );
  const datos = (await res.json().catch(() => ({}))) as { token?: string; message?: string; code?: string };
  if (!res.ok) {
    const m = `${datos.code ?? ""} ${datos.message ?? ""}`.toLowerCase();
    if (res.status === 429) throw new ErrorHttp(429, "Demasiados intentos. Espera un momento e inténtalo de nuevo.");
    if (m.includes("banned")) throw new ErrorHttp(403, "Tu cuenta está desactivada. Contacta al administrador.");
    if (m.includes("already exists") || m.includes("user_already")) throw new ErrorHttp(409, "Ya existe una cuenta con ese correo.");
    if (m.includes("invalid email or password") || m.includes("invalid_email_or_password")) {
      throw new ErrorHttp(401, "Correo o contraseña incorrectos.");
    }
    if (m.includes("política")) throw new ErrorHttp(400, "Debes aceptar la política de tratamiento de datos personales.");
    if (m.includes("password") && m.includes("short")) throw new ErrorHttp(400, "La contraseña debe tener al menos 8 caracteres.");
    if (m.includes("email")) throw new ErrorHttp(400, "El correo no es válido.");
    throw new ErrorHttp(res.status >= 500 ? 500 : 400, "No pudimos completar la solicitud. Intenta de nuevo.");
  }

  const token = res.headers.get("set-auth-token") ?? datos.token;
  if (!token) throw new ErrorHttp(500, "No pudimos iniciar la sesión.");
  const usuario = await getSessionUserFrom(new Headers({ authorization: `Bearer ${token}` }));
  if (!usuario) throw new ErrorHttp(500, "No pudimos iniciar la sesión.");
  return { token, usuario };
}
