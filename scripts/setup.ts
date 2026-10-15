import { readFileSync } from "node:fs";
import path from "node:path";
import { betterAuth } from "better-auth";
import { getMigrations } from "better-auth/db/migration";
import { authOptions } from "../lib/auth-options";
import { getPool } from "../lib/db";

// Prepara la base de datos: crea las tablas de autenticación y de eventos,
// y siembra el administrador inicial. Es seguro correrlo varias veces.
//   npm run db:setup
async function main() {
  const pool = getPool();

  console.log("1/3 Tablas de autenticación...");
  const { runMigrations } = await getMigrations(authOptions);
  await runMigrations();

  console.log("2/3 Tablas de eventos...");
  await pool.query(readFileSync(path.join(process.cwd(), "schema.sql"), "utf-8"));

  console.log("3/3 Administrador inicial...");
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  // Solo se siembra si NO hay ya un administrador. Así, si el administrador
  // cambia su correo en /perfil, volver a correr este script no crea otro.
  const hayAdmin = await pool.query(`SELECT email FROM "user" WHERE role = 'administrador' LIMIT 1`);
  if (hayAdmin.rows[0]) {
    console.log(`   Ya hay un administrador (${hayAdmin.rows[0].email}): no se crea otro.`);
  } else if (!email || !password) {
    console.log("   ADMIN_EMAIL / ADMIN_PASSWORD no están definidos: se omite este paso.");
  } else if (password.length < 8) {
    throw new Error("ADMIN_PASSWORD debe tener al menos 8 caracteres.");
  } else {
    console.log(`   Contraseña recibida: ${password.length} caracteres.`);
    console.log("   (Si es más corta de lo que escribiste, tu valor tiene un # sin comillas en .env.local.)");
    // Instancia sin el plugin de cookies de Next.js: este script corre fuera de Next.
    const auth = betterAuth(authOptions);
    const existe = await pool.query(`SELECT id FROM "user" WHERE email = $1`, [email]);
    if (!existe.rows[0]) {
      await auth.api.signUpEmail({ body: { email, password, name: "Administrador" } });
      console.log(`   Usuario ${email} creado.`);
    }
    await pool.query(`UPDATE "user" SET role = 'administrador', "emailVerified" = true WHERE email = $1`, [email]);
    // Al crearse, la cuenta fue un instante "participante" y gastó un número de
    // esa serie. Si todavía no hay ningún participante real, se devuelve el
    // contador para que el primero sea el 1.
    const reales = await pool.query(`SELECT 1 FROM "user" WHERE role = 'participante' AND numero IS NOT NULL LIMIT 1`);
    if (!reales.rows[0]) await pool.query(`SELECT setval('seq_participantes', 1, false)`);
    console.log(`   ${email} es administrador.`);
  }

  await pool.end();
  console.log("Listo.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
