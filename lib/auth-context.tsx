"use client";

import { useMemo, type ReactNode } from "react";
import { limpiarDatosLocales } from "@/lib/boletas-locales";
import { authClient } from "@/lib/auth-client";
import type { AppUser, UserRole } from "@/lib/types";

// Better Auth maneja la sesión por sí mismo (cookie + hook), así que este
// proveedor ya no guarda estado. Se conserva para no tocar el layout y para
// que las pantallas sigan usando useAuth() con la misma forma de siempre.
export function AuthProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

const ROLES: UserRole[] = ["administrador", "organizador", "participante"];

type UsuarioCrudo = {
  id: string;
  name: string;
  email: string;
  emailVerified?: boolean;
  role?: string | null;
  debeCambiarPassword?: boolean;
  telefono?: string | null;
  documento?: string | null;
  numero?: number | null;
};

function aAppUser(u: UsuarioCrudo): AppUser {
  return {
    id: u.id,
    nombre: u.name,
    correo: u.email,
    rol: ROLES.includes(u.role as UserRole) ? (u.role as UserRole) : "participante",
    correoVerificado: u.emailVerified,
    debeCambiarPassword: Boolean(u.debeCambiarPassword),
    telefono: u.telefono ?? null,
    documento: u.documento ?? null,
    numero: u.numero ?? null,
  };
}

function traducirError(mensaje: string | undefined, porDefecto: string) {
  const m = (mensaje ?? "").toLowerCase();
  if (m.includes("invalid email or password") || m.includes("invalid password")) return "Correo o contraseña incorrectos.";
  if (m.includes("already exists") || m.includes("user already")) return "Ya existe una cuenta con ese correo.";
  if (m.includes("banned")) return "Tu cuenta está desactivada. Contacta al administrador.";
  if (m.includes("too short")) return "La contraseña debe tener al menos 8 caracteres.";
  if (m.includes("too many")) return "Demasiados intentos. Espera un momento e inténtalo de nuevo.";
  return porDefecto;
}

export function useAuth() {
  const { data, isPending, refetch } = authClient.useSession();

  // Memoizado: si `user` fuera un objeto nuevo en cada render, cualquier
  // efecto que dependa de él (por ejemplo [user]) se repetiría sin parar.
  const rawUser = data?.user;
  const user = useMemo<AppUser | null>(
    () => (rawUser ? aAppUser(rawUser as unknown as UsuarioCrudo) : null),
    [rawUser]
  );

  return {
    user,
    loading: isPending,
    // Vuelve a pedir la sesión (por ejemplo, después de editar el perfil).
    refrescar: () => refetch(),
    // Devuelve el usuario ya autenticado para poder redirigir según su rol.
    async login(correo: string, password: string): Promise<AppUser> {
      const { error } = await authClient.signIn.email({ email: correo, password });
      if (error) throw new Error(traducirError(error.message, "No pudimos iniciar sesión."));
      const sesion = await authClient.getSession();
      if (!sesion.data?.user) throw new Error("No pudimos iniciar sesión.");
      return aAppUser(sesion.data.user as unknown as UsuarioCrudo);
    },
    async register(nombre: string, correo: string, password: string, aceptaPolitica: boolean) {
      // `aceptaPolitica` no es un campo de Better Auth: lo lee el filtro de
      // lib/auth-options.ts, que rechaza crear la cuenta sin él.
      const { error } = await authClient.signUp.email({ name: nombre, email: correo, password, aceptaPolitica } as Parameters<
        typeof authClient.signUp.email
      >[0]);
      if (error) throw new Error(traducirError(error.message, "No pudimos crear la cuenta."));
    },
    async logout() {
      limpiarDatosLocales(); // boletas guardadas y copias en el dispositivo
      await authClient.signOut();
    },
  };
}
