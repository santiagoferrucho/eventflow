import "server-only";
import { neon } from "@neondatabase/serverless";
import type { EventRepository, SportEvent, Registration } from "@/lib/types";

// Implementación real sobre Postgres (pensada para Neon, que es con lo
// que Vercel integra de forma nativa, pero cualquier Postgres sirve).
// Cumple el mismo contrato (EventRepository) que mock-repo.ts, así que
// las pantallas nunca se enteran de cuál está activa — eso lo decide
// lib/repo/index.ts según exista o no la variable DATABASE_URL.
//
// Las columnas categorias, campos_adicionales, participante y respuestas
// se guardan como JSONB: son estructuras anidadas (listas de categorías,
// listas de preguntas del formulario) que no ganan nada con normalizarse
// en más tablas para el tamaño de este proyecto, y el driver de Postgres
// las entrega ya parseadas como objetos de JS.

function requireSql() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL no está configurada. Define esa variable de entorno.");
  }
  return neon(url);
}

function filaAEvento(fila: Record<string, unknown>): SportEvent {
  return {
    id: fila.id as string,
    organizadorId: fila.organizador_id as string,
    nombre: fila.nombre as string,
    disciplina: fila.disciplina as string,
    fecha: fila.fecha as string,
    lugar: fila.lugar as string,
    descripcion: fila.descripcion as string,
    categorias: fila.categorias as SportEvent["categorias"],
    camposAdicionales: fila.campos_adicionales as SportEvent["camposAdicionales"],
    creadoEn: fila.creado_en as string,
  };
}

function filaARegistro(fila: Record<string, unknown>): Registration {
  return {
    id: fila.id as string,
    eventoId: fila.evento_id as string,
    categoriaId: fila.categoria_id as string,
    participante: fila.participante as Registration["participante"],
    respuestas: fila.respuestas as Registration["respuestas"],
    estadoPago: fila.estado_pago as Registration["estadoPago"],
    boletaCodigoQR: (fila.boleta_codigo_qr as string | null) ?? null,
    checkInRealizado: fila.check_in_realizado as boolean,
    creadoEn: fila.creado_en as string,
  };
}

function genId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export const postgresRepo: EventRepository = {
  async listEvents() {
    const sql = requireSql();
    const filas = await sql`SELECT * FROM events ORDER BY creado_en DESC`;
    return filas.map(filaAEvento);
  },

  async getEvent(id) {
    const sql = requireSql();
    const filas = await sql`SELECT * FROM events WHERE id = ${id} LIMIT 1`;
    return filas[0] ? filaAEvento(filas[0]) : null;
  },

  async listEventsByOrganizer(organizadorId) {
    const sql = requireSql();
    const filas = await sql`SELECT * FROM events WHERE organizador_id = ${organizadorId} ORDER BY creado_en DESC`;
    return filas.map(filaAEvento);
  },

  async createEvent(input) {
    const sql = requireSql();
    const id = genId("evt");
    const creadoEn = new Date().toISOString();
    await sql`
      INSERT INTO events (id, organizador_id, nombre, disciplina, fecha, lugar, descripcion, categorias, campos_adicionales, creado_en)
      VALUES (${id}, ${input.organizadorId}, ${input.nombre}, ${input.disciplina}, ${input.fecha}, ${input.lugar}, ${input.descripcion}, ${JSON.stringify(input.categorias)}::jsonb, ${JSON.stringify(input.camposAdicionales)}::jsonb, ${creadoEn})
    `;
    return { ...input, id, creadoEn };
  },

  async createRegistration(input) {
    const sql = requireSql();
    const id = genId("reg");
    const creadoEn = new Date().toISOString();
    await sql`
      INSERT INTO registrations (id, evento_id, categoria_id, participante, respuestas, estado_pago, boleta_codigo_qr, check_in_realizado, creado_en)
      VALUES (${id}, ${input.eventoId}, ${input.categoriaId}, ${JSON.stringify(input.participante)}::jsonb, ${JSON.stringify(input.respuestas)}::jsonb, 'pendiente', NULL, false, ${creadoEn})
    `;
    return {
      ...input,
      id,
      estadoPago: "pendiente",
      boletaCodigoQR: null,
      checkInRealizado: false,
      creadoEn,
    };
  },

  async getRegistration(id) {
    const sql = requireSql();
    const filas = await sql`SELECT * FROM registrations WHERE id = ${id} LIMIT 1`;
    return filas[0] ? filaARegistro(filas[0]) : null;
  },

  // Igual que en el modo demo: en producción esta función solo debería
  // llamarse desde el servidor cuando una pasarela real confirma el
  // pago, nunca directamente desde el cliente.
  async confirmPayment(registrationId) {
    const sql = requireSql();
    const boletaCodigoQR = `EVENTFLOW:${registrationId}`;
    const filas = await sql`
      UPDATE registrations
      SET estado_pago = 'confirmado', boleta_codigo_qr = ${boletaCodigoQR}
      WHERE id = ${registrationId}
      RETURNING *
    `;
    if (!filas[0]) throw new Error("Inscripción no encontrada");
    return filaARegistro(filas[0]);
  },

  async listRegistrationsByEvent(eventoId) {
    const sql = requireSql();
    const filas = await sql`SELECT * FROM registrations WHERE evento_id = ${eventoId} ORDER BY creado_en DESC`;
    return filas.map(filaARegistro);
  },

  async listAllRegistrations() {
    const sql = requireSql();
    const filas = await sql`SELECT * FROM registrations ORDER BY creado_en DESC`;
    return filas.map(filaARegistro);
  },

  async listRegistrationsByParticipantEmail(correo) {
    const sql = requireSql();
    const filas = await sql`
      SELECT * FROM registrations
      WHERE lower(participante->>'correo') = lower(${correo})
      ORDER BY creado_en DESC
    `;
    return filas.map(filaARegistro);
  },

  async checkIn(registrationId) {
    const sql = requireSql();
    const existentes = await sql`SELECT estado_pago FROM registrations WHERE id = ${registrationId} LIMIT 1`;
    if (!existentes[0]) throw new Error("Inscripción no encontrada");
    if (existentes[0].estado_pago !== "confirmado") {
      throw new Error("No se puede hacer check-in sin pago confirmado");
    }
    const filas = await sql`
      UPDATE registrations SET check_in_realizado = true WHERE id = ${registrationId} RETURNING *
    `;
    return filaARegistro(filas[0]);
  },
};
