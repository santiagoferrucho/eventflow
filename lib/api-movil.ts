import "server-only";
import { NextResponse } from "next/server";
import { ErrorNegocio } from "@/lib/errores";
import { getSessionUser } from "@/lib/session";
import type { AppUser, UserRole } from "@/lib/types";

// Utilidades de la API REST que consume la app móvil (/api/movil/...).
// La app se autentica con "Authorization: Bearer <token>" (plugin bearer de
// Better Auth). Las rutas reutilizan las mismas Server Actions de la web, así
// que las reglas de negocio y de permisos viven en un solo lugar.

// La app manda JSON; aquí se lee sin romper si llega mal formado.
export async function leerJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const cuerpo = await req.json();
    if (cuerpo && typeof cuerpo === "object" && !Array.isArray(cuerpo)) return cuerpo as Record<string, unknown>;
  } catch {
    /* cae al error de abajo */
  }
  throw new ErrorNegocio("La solicitud no es válida.");
}

export const texto = (v: unknown): string => (typeof v === "string" ? v : "");

export function ok(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export function fallo(error: string, status = 400) {
  return NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

// Error que corta la ruta con un código HTTP concreto.
export class ErrorHttp extends Error {
  constructor(public status: number, mensaje: string) {
    super(mensaje);
  }
}

// Exige sesión (y rol, si se indica) antes de llamar a la acción. Así la app
// distingue "sin sesión" (401, debe volver a iniciar sesión) de un error de
// negocio (400, se muestra el mensaje).
export async function exigirSesion(...roles: UserRole[]): Promise<AppUser> {
  const user = await getSessionUser();
  if (!user) throw new ErrorHttp(401, "Tu sesión terminó. Inicia sesión de nuevo.");
  if (user.debeCambiarPassword) throw new ErrorHttp(403, "Debes cambiar tu contraseña temporal antes de continuar.");
  if (roles.length && !roles.includes(user.rol)) throw new ErrorHttp(403, "No tienes permiso para esta acción.");
  return user;
}

// Envuelve cada ruta: traduce los errores a respuestas JSON con su código.
export async function manejar(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ErrorHttp) return fallo(e.message, e.status);
    if (e instanceof ErrorNegocio) return fallo(e.message, 400);
    console.error("api-movil", e);
    return fallo("Algo salió mal de nuestro lado. Intenta de nuevo en unos segundos.", 500);
  }
}

// Convierte el { ok, data | error } de las Server Actions en una respuesta.
export function desdeResultado<T>(r: { ok: true; data: T } | { ok: false; error: string }, status = 200) {
  return r.ok ? ok(r.data, status) : fallo(r.error, 400);
}

// Datos de la persona que la app guarda tras iniciar sesión.
export function usuarioPublico(u: AppUser) {
  return {
    id: u.id,
    nombre: u.nombre,
    correo: u.correo,
    rol: u.rol,
    telefono: u.telefono ?? null,
    documento: u.documento ?? null,
    numero: u.numero ?? null,
    debeCambiarPassword: Boolean(u.debeCambiarPassword),
  };
}
