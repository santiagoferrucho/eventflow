// Pruebas de las guardas de sesión y roles (lib/session.ts).
// Son la primera barrera de seguridad: toda Server Action y todo panel pasa
// por ellas. Se simula la respuesta de Better Auth para probar cada caso.
import { beforeEach, describe, expect, it, vi } from "vitest";

const getSession = vi.fn();
vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: (...a: unknown[]) => getSession(...a) } } }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
// redirect() de Next.js corta la ejecución lanzando un error; aquí se imita.
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));

import { getSessionUser, requirePageRole, requireRole, requireUser } from "@/lib/session";

const sesion = (user: Record<string, unknown>) => ({
  session: { id: "s1" },
  user: { id: "u1", name: "Ana", email: "ana@x.co", emailVerified: true, ...user },
});

beforeEach(() => getSession.mockReset());

describe("sesión y roles", () => {
  it("sin cookie de sesión no hay usuario y las acciones exigen iniciar sesión", async () => {
    getSession.mockResolvedValue(null);
    expect(await getSessionUser()).toBeNull();
    await expect(requireUser()).rejects.toThrow("Debes iniciar sesión.");
  });

  it("un rol desconocido o manipulado se trata como participante, nunca como administrador", async () => {
    getSession.mockResolvedValue(sesion({ role: "superadmin" }));
    expect((await getSessionUser())?.rol).toBe("participante");
    await expect(requireRole("administrador")).rejects.toThrow("No tienes permiso");
  });

  it("requireRole deja pasar solo los roles indicados", async () => {
    getSession.mockResolvedValue(sesion({ role: "participante" }));
    await expect(requireRole("organizador", "administrador")).rejects.toThrow("No tienes permiso");
    getSession.mockResolvedValue(sesion({ role: "organizador" }));
    await expect(requireRole("organizador", "administrador")).resolves.toMatchObject({ rol: "organizador" });
  });

  it("con contraseña temporal se bloquea todo, salvo el flujo de cambiarla", async () => {
    getSession.mockResolvedValue(sesion({ role: "organizador", debeCambiarPassword: true }));
    await expect(requireUser()).rejects.toThrow("contraseña temporal");
    await expect(requireUser({ permitirCambioPendiente: true })).resolves.toMatchObject({ id: "u1" });
  });

  it("los paneles redirigen según el caso: sin sesión, contraseña temporal o rol no permitido", async () => {
    getSession.mockResolvedValue(null);
    await expect(requirePageRole(["organizador"])).rejects.toThrow("REDIRECT:/login");
    getSession.mockResolvedValue(sesion({ role: "organizador", debeCambiarPassword: true }));
    await expect(requirePageRole(["organizador"])).rejects.toThrow("REDIRECT:/cambiar-password");
    getSession.mockResolvedValue(sesion({ role: "participante" }));
    await expect(requirePageRole(["administrador"])).rejects.toThrow("REDIRECT:/");
    getSession.mockResolvedValue(sesion({ role: "administrador" }));
    await expect(requirePageRole(["administrador"])).resolves.toMatchObject({ rol: "administrador" });
  });
});
