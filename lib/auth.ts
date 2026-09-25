import type { AppUser, UserRole } from "@/lib/types";

// Autenticación local basada en localStorage. Es suficiente para el
// cascarón: no hay contraseñas reales excepto para la cuenta fija de
// administrador. Cuando el proyecto tenga un backend con base de datos
// real, esta es la pieza que se reemplaza por autenticación de verdad
// (por ejemplo, con cookies de sesión firmadas en el servidor).

const STORAGE_KEY = "eventflow_session";

// Única cuenta de administrador. No es auto-registrable desde /registro
// a propósito: en la vida real este rol se asigna a mano en el backend,
// nunca desde un formulario público.
const DEFAULT_ADMIN = {
  id: "admin-default",
  nombre: "Administrador EventFlow",
  correo: "admin@eventflow.com",
  password: "admin123",
  rol: "administrador" as const,
};

function readSession(): AppUser | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return raw ? (JSON.parse(raw) as AppUser) : null;
}

function writeSession(user: AppUser | null) {
  if (typeof window === "undefined") return;
  if (user) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  else window.localStorage.removeItem(STORAGE_KEY);
}

export async function registerUser(nombre: string, correo: string, password: string, rol: UserRole): Promise<AppUser> {
  void password; // sin backend real, no hay contraseña que validar salvo la del admin fijo
  const user: AppUser = { id: `user-${Date.now()}`, nombre, correo, rol };
  writeSession(user);
  return user;
}

export async function loginUser(correo: string, password: string): Promise<AppUser> {
  // Cuenta fija de administrador: sí valida contraseña.
  if (correo === DEFAULT_ADMIN.correo) {
    if (password !== DEFAULT_ADMIN.password) throw new Error("Contraseña incorrecta.");
    const admin: AppUser = {
      id: DEFAULT_ADMIN.id,
      nombre: DEFAULT_ADMIN.nombre,
      correo: DEFAULT_ADMIN.correo,
      rol: DEFAULT_ADMIN.rol,
    };
    writeSession(admin);
    return admin;
  }
  // Resto de cuentas: no hay contraseñas reales que validar todavía. Si
  // ya existe una sesión con ese correo la reutilizamos; si no, avisamos
  // que primero hay que registrarse.
  const existing = readSession();
  if (existing && existing.correo === correo) return existing;
  throw new Error("No encontramos una cuenta con ese correo. Regístrate primero.");
}

export async function logoutUser(): Promise<void> {
  writeSession(null);
}

export function subscribeToAuth(callback: (user: AppUser | null) => void): () => void {
  callback(readSession());
  return () => {};
}
