import { mockRepo } from "@/lib/repo/mock-repo";
import type { EventRepository } from "@/lib/types";

// Toda la app importa `repo` desde aquí, nunca directamente mock-repo.
// Si más adelante se conecta una base de datos real (Postgres en Render,
// por ejemplo), se agrega una nueva implementación de EventRepository y
// se cambia solo esta línea — ninguna pantalla se toca.
export const repo: EventRepository = mockRepo;
