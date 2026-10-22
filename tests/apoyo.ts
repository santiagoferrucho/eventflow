// Utilidades compartidas por las pruebas de integración.
import { randomBytes } from "node:crypto";
import { getPool } from "@/lib/db";
import type { UserRole } from "@/lib/types";

export const hayBase = Boolean(process.env.DATABASE_URL);

export interface UsuarioPrueba {
  id: string;
  nombre: string;
  correo: string;
  rol: UserRole;
  documento: string | null;
  debeCambiarPassword: boolean;
}

const sufijo = () => randomBytes(5).toString("hex");

// Crea una fila real en la tabla "user" (la misma que usa Better Auth).
export async function crearUsuario(
  rol: UserRole,
  extra: Partial<Pick<UsuarioPrueba, "documento" | "debeCambiarPassword">> = {}
): Promise<UsuarioPrueba> {
  const id = `test-${rol}-${sufijo()}`;
  const u: UsuarioPrueba = {
    id,
    nombre: `Prueba ${rol}`,
    correo: `${id}@prueba.test`,
    rol,
    documento: extra.documento ?? null,
    debeCambiarPassword: extra.debeCambiarPassword ?? false,
  };
  await getPool().query(
    `INSERT INTO "user" (id, name, email, "emailVerified", role, "debeCambiarPassword", documento)
     VALUES ($1,$2,$3,true,$4,$5,$6)`,
    [u.id, u.nombre, u.correo, u.rol, u.debeCambiarPassword, u.documento]
  );
  return u;
}

// Lo que devolvería auth.api.getSession para ese usuario.
export function sesionDe(u: UsuarioPrueba | null) {
  if (!u) return null;
  return {
    session: { id: "s-" + u.id, userId: u.id },
    user: {
      id: u.id,
      name: u.nombre,
      email: u.correo,
      emailVerified: true,
      role: u.rol,
      debeCambiarPassword: u.debeCambiarPassword,
      documento: u.documento,
      telefono: null,
      numero: null,
    },
  };
}

// Borra todo lo que crearon las pruebas (usuarios y eventos con prefijo test-).
export async function limpiar() {
  const pool = getPool();
  const ev = await pool.query(`SELECT id FROM events WHERE organizador_id LIKE 'test-%'`);
  const ids = ev.rows.map((r) => r.id as string);
  if (ids.length) {
    await pool.query(`DELETE FROM novedades WHERE evento_id = ANY($1::text[])`, [ids]);
    await pool.query(`DELETE FROM registrations WHERE evento_id = ANY($1::text[])`, [ids]);
    await pool.query(`DELETE FROM events WHERE id = ANY($1::text[])`, [ids]);
  }
  await pool.query(`DELETE FROM imagenes WHERE user_id LIKE 'test-%'`);
  await pool.query(`DELETE FROM consentimientos WHERE user_id LIKE 'test-%'`);
  await pool.query(`DELETE FROM "user" WHERE id LIKE 'test-%'`);
}
