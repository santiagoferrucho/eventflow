import "server-only";
import { promises as fs } from "fs";
import path from "path";
import type { EventRepository, SportEvent, Registration } from "@/lib/types";

// Almacén del modo demo, persistido en un archivo JSON en disco en vez de
// en un simple arreglo en memoria.
//
// Por qué: un arreglo a nivel de módulo puede NO compartirse de forma
// confiable entre distintas rutas/acciones en el servidor de desarrollo
// de Next.js (cada Server Action o Route Handler puede terminar en una
// instancia de módulo distinta según cómo Turbopack organice la
// recompilación). Leer y escribir siempre el mismo archivo en disco
// elimina esa duda: sin importar cuántas copias del módulo existan,
// todas leen y escriben el mismo archivo.
//
// IMPORTANTE: este módulo (por el import "server-only" de arriba) solo
// puede ejecutarse en el servidor. Si algún componente "use client" lo
// importa por error, la build falla con un mensaje claro en vez de
// romperse en silencio. Todo acceso desde el cliente debe pasar por
// lib/actions.ts.
//
// Si más adelante se conecta una base de datos real, este archivo se reemplaza
// por una nueva implementación de EventRepository sin tocar ninguna pantalla (ver lib/repo/index.ts).

interface DB {
  events: SportEvent[];
  registrations: Registration[];
}

const DB_PATH = path.join(process.cwd(), ".eventflow-data", "mock-db.json");

const SEED: DB = {
  events: [
    {
      id: "evt-demo-1",
      organizadorId: "org-demo",
      nombre: "Carrera Atardecer UPB",
      disciplina: "Running",
      fecha: "2026-10-18",
      lugar: "Parque de los Niños, Bucaramanga",
      descripcion:
        "Carrera nocturna abierta a la comunidad, con recorridos de 5K y 10K y punto de hidratación cada 2 km.",
      categorias: [
        { id: "cat-5k", nombre: "5K", cupos: 200, cuposDisponibles: 137, tarifa: 45000 },
        { id: "cat-10k", nombre: "10K", cupos: 150, cuposDisponibles: 62, tarifa: 60000 },
      ],
      camposAdicionales: [
        {
          id: "camp-talla",
          etiqueta: "Talla de camiseta",
          tipo: "opcion_multiple",
          requerido: true,
          opciones: ["XS", "S", "M", "L", "XL"],
        },
        {
          id: "camp-grupo",
          etiqueta: "¿Con quién corres?",
          descripcion: "Marca todo lo que aplique",
          tipo: "casillas",
          requerido: false,
          opciones: ["Voy solo/a", "Con mi club", "Con familia o amigos"],
        },
        { id: "camp-foto", etiqueta: "Foto para el carné del evento", tipo: "imagen", requerido: false },
      ],
      creadoEn: new Date().toISOString(),
    },
  ],
  registrations: [],
};

async function readDB(): Promise<DB> {
  try {
    const raw = await fs.readFile(DB_PATH, "utf-8");
    return JSON.parse(raw) as DB;
  } catch {
    // Primera vez que se usa: crea el archivo con los datos de ejemplo.
    await writeDB(SEED);
    return SEED;
  }
}

async function writeDB(db: DB): Promise<void> {
  await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
}

function genId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export const mockRepo: EventRepository = {
  async listEvents() {
    const db = await readDB();
    return db.events;
  },

  async getEvent(id) {
    const db = await readDB();
    return db.events.find((e) => e.id === id) ?? null;
  },

  async listEventsByOrganizer(organizadorId) {
    const db = await readDB();
    return db.events.filter((e) => e.organizadorId === organizadorId);
  },

  async createEvent(input) {
    const db = await readDB();
    const nuevo: SportEvent = { ...input, id: genId("evt"), creadoEn: new Date().toISOString() };
    db.events.unshift(nuevo);
    await writeDB(db);
    return nuevo;
  },

  async createRegistration(input) {
    const db = await readDB();
    const nueva: Registration = {
      ...input,
      id: genId("reg"),
      estadoPago: "pendiente",
      boletaCodigoQR: null,
      checkInRealizado: false,
      creadoEn: new Date().toISOString(),
    };
    db.registrations.unshift(nueva);
    await writeDB(db);
    return nueva;
  },

  async getRegistration(id) {
    const db = await readDB();
    return db.registrations.find((r) => r.id === id) ?? null;
  },

  // Punto de extensión clave: en producción esta función NO se llama desde
  // el cliente. La llama el endpoint de webhook (app/api/payments/.../route.ts)
  // cuando la pasarela real confirma el pago, tal como se definió en el plan
  // de riesgos del proyecto (R6: nunca confirmar el pago desde la app).
  async confirmPayment(registrationId) {
    const db = await readDB();
    const reg = db.registrations.find((r) => r.id === registrationId);
    if (!reg) throw new Error("Inscripción no encontrada");
    reg.estadoPago = "confirmado";
    reg.boletaCodigoQR = `EVENTFLOW:${reg.id}`;
    await writeDB(db);
    return reg;
  },

  async listRegistrationsByEvent(eventoId) {
    const db = await readDB();
    return db.registrations.filter((r) => r.eventoId === eventoId);
  },

  async listAllRegistrations() {
    const db = await readDB();
    return db.registrations;
  },

  async listRegistrationsByParticipantEmail(correo) {
    const db = await readDB();
    const objetivo = correo.trim().toLowerCase();
    return db.registrations.filter((r) => r.participante.correo.trim().toLowerCase() === objetivo);
  },

  async checkIn(registrationId) {
    const db = await readDB();
    const reg = db.registrations.find((r) => r.id === registrationId);
    if (!reg) throw new Error("Inscripción no encontrada");
    if (reg.estadoPago !== "confirmado") {
      throw new Error("No se puede hacer check-in sin pago confirmado");
    }
    reg.checkInRealizado = true;
    await writeDB(db);
    return reg;
  },
};
