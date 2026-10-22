// Pruebas de autenticación con Better Auth real (lib/auth-options.ts) y su
// manejador HTTP, contra Postgres. Aquí no se simula nada: son las mismas
// rutas /api/auth/* que usa la aplicación.
import { afterAll, describe, expect, it } from "vitest";
import { betterAuth } from "better-auth";
import { authOptions } from "@/lib/auth-options";
import { getPool } from "@/lib/db";
import { hayBase } from "./apoyo";

const ORIGEN = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
const DOMINIO = "@auth.prueba.test";
const correo = (n: string) => `${n}-${Date.now()}${DOMINIO}`;

describe.skipIf(!hayBase)("autenticación con Better Auth", () => {
  const auth = betterAuth(authOptions);

  async function llamar(ruta: string, cuerpo: unknown, cookie?: string) {
    const res = await auth.handler(
      new Request(`${ORIGEN}/api/auth${ruta}`, {
        method: "POST",
        headers: { "content-type": "application/json", origin: ORIGEN, ...(cookie ? { cookie } : {}) },
        body: JSON.stringify(cuerpo),
      })
    );
    const cookieNueva = res.headers.get("set-cookie")?.split(";")[0];
    return { status: res.status, json: await res.json().catch(() => null), cookie: cookieNueva };
  }

  const registrar = (email: string, extra: Record<string, unknown> = {}) =>
    llamar("/sign-up/email", { name: "Persona Prueba", email, password: "clave-segura-1", aceptaPolitica: true, ...extra });

  afterAll(async () => {
    await getPool().query(`DELETE FROM "user" WHERE email LIKE $1`, [`%${DOMINIO}`]);
    await getPool().end();
  });

  it("no se puede crear una cuenta sin aceptar la política, ni llamando la API directamente", async () => {
    const email = correo("sinpolitica");
    const r = await llamar("/sign-up/email", { name: "X", email, password: "clave-segura-1" });
    expect(r.status).toBe(400);
    expect(r.json?.message).toMatch(/política de tratamiento/);
    const n = await getPool().query(`SELECT 1 FROM "user" WHERE email = $1`, [email]);
    expect(n.rowCount).toBe(0);
  });

  it("toda cuenta nueva es participante, y pedir el rol de administrador al registrarse se rechaza", async () => {
    const intento = correo("rol");
    const r = await registrar(intento, { role: "administrador" });
    expect(r.status).toBe(400);
    const n = await getPool().query(`SELECT 1 FROM "user" WHERE email = $1`, [intento]);
    expect(n.rowCount).toBe(0);
    const email = correo("normal");
    expect((await registrar(email)).status).toBe(200);
    const fila = await getPool().query(`SELECT role FROM "user" WHERE email = $1`, [email]);
    expect(fila.rows[0].role).toBe("participante");
  });

  it("exige contraseñas de al menos 8 caracteres y las guarda cifradas", async () => {
    expect((await llamar("/sign-up/email", { name: "X", email: correo("corta"), password: "1234567", aceptaPolitica: true })).status).toBe(400);
    const email = correo("hash");
    await registrar(email);
    const fila = await getPool().query(
      `SELECT a.password FROM account a JOIN "user" u ON u.id = a."userId" WHERE u.email = $1`,
      [email]
    );
    expect(fila.rows[0].password).not.toContain("clave-segura-1");
    expect(fila.rows[0].password.length).toBeGreaterThan(40);
  });

  it("con contraseña incorrecta no hay sesión; con la correcta se entrega una cookie válida", async () => {
    const email = correo("login");
    await registrar(email);
    const mala = await llamar("/sign-in/email", { email, password: "otra-clave-99" });
    expect(mala.status).toBe(401);
    expect(mala.cookie).toBeUndefined();
    const buena = await llamar("/sign-in/email", { email, password: "clave-segura-1" });
    expect(buena.status).toBe(200);
    const sesion = await auth.api.getSession({ headers: new Headers({ cookie: buena.cookie! }) });
    expect(sesion?.user.email).toBe(email);
  });

  it("al cerrar sesión la cookie deja de servir", async () => {
    const email = correo("logout");
    await registrar(email);
    const { cookie } = await llamar("/sign-in/email", { email, password: "clave-segura-1" });
    await llamar("/sign-out", {}, cookie);
    const sesion = await auth.api.getSession({ headers: new Headers({ cookie: cookie! }) });
    expect(sesion).toBeNull();
  });

  it("un participante no puede darse el rol de administrador", async () => {
    const email = correo("escalar");
    const { cookie, json } = await registrar(email);
    const r = await llamar("/admin/set-role", { userId: json.user.id, role: "administrador" }, cookie);
    expect([401, 403]).toContain(r.status);
    const fila = await getPool().query(`SELECT role FROM "user" WHERE email = $1`, [email]);
    expect(fila.rows[0].role).toBe("participante");
  });

  it("una cuenta desactivada por el administrador no puede iniciar sesión", async () => {
    const email = correo("baneada");
    await registrar(email);
    await getPool().query(`UPDATE "user" SET banned = true WHERE email = $1`, [email]);
    const r = await llamar("/sign-in/email", { email, password: "clave-segura-1" });
    expect(r.status).toBe(403);
    expect(r.cookie).toBeUndefined();
  });
});
