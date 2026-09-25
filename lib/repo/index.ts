import { mockRepo } from "@/lib/repo/mock-repo";
import { postgresRepo } from "@/lib/repo/postgres-repo";
import type { EventRepository } from "@/lib/types";

// Toda la app importa `repo` desde aquí, nunca directamente mock-repo o
// postgres-repo. Mientras no exista DATABASE_URL (por ejemplo, corriendo
// en tu PC sin configurarla), la app usa el archivo local; en cuanto la
// variable esté definida (como en Vercel, una vez conectada la base de
// datos), pasa a usar Postgres sin tocar ninguna pantalla.
export const repo: EventRepository = process.env.DATABASE_URL ? postgresRepo : mockRepo;
