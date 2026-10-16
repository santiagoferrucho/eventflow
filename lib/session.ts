import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ErrorNegocio } from "@/lib/errores";
import type { AppUser, UserRole } from "@/lib/types";

const ROLES: UserRole[] = ["administrador", "organizador", "participante"];

function normalizarRol(rol: unknown): UserRole {
  return ROLES.includes(rol as UserRole) ? (rol as UserRole) : "participante";
}

// Lee la sesión desde la cookie, validándola contra la base de datos.
// Es la única fuente de verdad sobre quién es la persona y qué rol tiene:
// nada de lo que mande el navegador (ids, roles) se usa para decidir permisos.
export async function getSessionUser(): Promise<AppUser | null> {
  return getSessionUserFrom(await headers());
}

// Igual que getSessionUser, pero con encabezados dados. La API móvil lo usa
// justo después de iniciar sesión, con el token recién emitido.
export async function getSessionUserFrom(h: Headers): Promise<AppUser | null> {
  const session = await auth.api.getSession({ headers: h });
  if (!session) return null;
  const u = session.user as typeof session.user & {
    role?: string | null;
    debeCambiarPassword?: boolean;
    telefono?: string | null;
    documento?: string | null;
    numero?: number | null;
  };
  return {
    id: u.id,
    nombre: u.name,
    correo: u.email,
    rol: normalizarRol(u.role),
    correoVerificado: u.emailVerified,
    debeCambiarPassword: Boolean(u.debeCambiarPassword),
    telefono: u.telefono ?? null,
    documento: u.documento ?? null,
    numero: u.numero ?? null,
  };
}

// Guardas para Server Actions: lanzan error si no se cumple.
export async function requireUser(opts?: { permitirCambioPendiente?: boolean }): Promise<AppUser> {
  const user = await getSessionUser();
  if (!user) throw new ErrorNegocio("Debes iniciar sesión.");
  if (user.debeCambiarPassword && !opts?.permitirCambioPendiente) {
    throw new ErrorNegocio("Debes cambiar tu contraseña temporal antes de continuar.");
  }
  return user;
}

export async function requireRole(...roles: UserRole[]): Promise<AppUser> {
  const user = await requireUser();
  if (!roles.includes(user.rol)) throw new ErrorNegocio("No tienes permiso para esta acción.");
  return user;
}

// Guarda para páginas (layouts): redirige en vez de lanzar error.
export async function requirePageRole(roles: UserRole[]): Promise<AppUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.debeCambiarPassword) redirect("/cambiar-password");
  if (!roles.includes(user.rol)) redirect("/");
  return user;
}
