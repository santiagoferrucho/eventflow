import { postgresRepo } from "@/lib/repo/postgres-repo";
import type { EventRepository } from "@/lib/types";

// Toda la app importa `repo` desde aquí. Si más adelante se cambia la
// forma de guardar datos, se cambia solo esta línea.
export const repo: EventRepository = postgresRepo;
