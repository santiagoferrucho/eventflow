import { Pool } from "pg";

// Un solo pool de conexiones para toda la app (autenticación y datos).
// Se guarda en globalThis para que el modo desarrollo, que recarga módulos,
// no abra un pool nuevo en cada cambio.
const g = globalThis as unknown as { __eventflowPool?: Pool };

export function getPool(): Pool {
  if (!g.__eventflowPool) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error("DATABASE_URL no está configurada. Defínela en .env.local (ver .env.example).");
    }
    // Quitamos sslmode y channel_binding del texto de conexión (Neon los
    // incluye) y configuramos SSL explícitamente: activo salvo en localhost.
    const u = new URL(url);
    u.searchParams.delete("sslmode");
    u.searchParams.delete("channel_binding");
    const local = u.hostname === "localhost" || u.hostname === "127.0.0.1";
    g.__eventflowPool = new Pool({
      connectionString: u.toString(),
      ssl: local ? false : true,
      max: 5,
      idleTimeoutMillis: 10_000,
    });
  }
  return g.__eventflowPool;
}
