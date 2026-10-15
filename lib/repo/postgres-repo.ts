import "server-only";
import { getPool } from "@/lib/db";
import { randomBytes } from "node:crypto";
import { ErrorNegocio } from "@/lib/errores";
import { hoyBogota } from "@/lib/fechas";
import { RESERVA_MINUTOS } from "@/lib/reservas";
import type {
  EventCategory,
  EventStatus,
  EventRepository,
  Registration,
  SportEvent,
} from "@/lib/types";

function filaAEvento(f: Record<string, unknown>): SportEvent {
  return {
    id: f.id as string,
    numero: Number(f.numero),
    organizadorId: f.organizador_id as string,
    organizadorNumero: f.organizador_numero == null ? null : Number(f.organizador_numero),
    nombre: f.nombre as string,
    disciplina: f.disciplina as string,
    fecha: f.fecha as string,
    lugar: f.lugar as string,
    latitud: f.latitud == null ? null : Number(f.latitud),
    longitud: f.longitud == null ? null : Number(f.longitud),
    descripcion: f.descripcion as string,
    estado: f.estado as SportEvent["estado"],
    categorias: f.categorias as SportEvent["categorias"],
    camposAdicionales: f.campos_adicionales as SportEvent["camposAdicionales"],
    recomendaciones: (f.recomendaciones as SportEvent["recomendaciones"]) ?? [],
    bannerId: (f.banner_id as string | null) ?? null,
    creadoEn: f.creado_en as string,
  };
}

function filaARegistro(f: Record<string, unknown>): Registration {
  return {
    id: f.id as string,
    eventoId: f.evento_id as string,
    categoriaId: f.categoria_id as string,
    userId: (f.user_id as string | null) ?? null,
    participanteNumero: f.participante_numero == null ? null : Number(f.participante_numero),
    participante: f.participante as Registration["participante"],
    respuestas: f.respuestas as Registration["respuestas"],
    precioPagado: Number(f.precio_pagado),
    estadoPago: f.estado_pago as Registration["estadoPago"],
    boletaCodigoQR: (f.boleta_codigo_qr as string | null) ?? null,
    checkInRealizado: f.check_in_realizado as boolean,
    checkInEn: (f.check_in_en as string | null) ?? null,
    checkInPor: (f.check_in_por_nombre as string | null) ?? null,
    creadoEn: f.creado_en as string,
  };
}

// Los códigos (E…, O… y el del participante) viven en tablas distintas:
// se traen con un join para que cada evento e inscripción los lleve.
const EVENTO_SELECT = `SELECT e.*, o.numero AS organizador_numero
  FROM events e LEFT JOIN "user" o ON o.id = e.organizador_id`;
const REGISTRO_SELECT = `SELECT r.*, u.numero AS participante_numero, s.name AS check_in_por_nombre
  FROM registrations r
  LEFT JOIN "user" u ON u.id = r.user_id
  LEFT JOIN "user" s ON s.id = r.check_in_por`;

function genId(prefix: string) {
  // Aleatorio criptográfico: el id de la inscripción va dentro del QR, así que
  // no debe poder adivinarse.
  return `${prefix}-${randomBytes(9).toString("hex")}`;
}

type Cliente = { query: (texto: string, valores?: unknown[]) => Promise<{ rows: Record<string, unknown>[]; rowCount: number | null }> };

// Marca como "expirado" las reservas sin pagar de un evento que superaron el
// plazo y devuelve su cupo a la categoría. Debe llamarse dentro de una
// transacción; toma el bloqueo del evento (FOR UPDATE) y devuelve las
// categorías ya actualizadas.
async function liberarEnEvento(client: Cliente, eventoId: string): Promise<{ categorias: EventCategory[]; liberadas: number }> {
  const ev = await client.query(`SELECT categorias FROM events WHERE id = $1 FOR UPDATE`, [eventoId]);
  if (!ev.rows[0]) throw new ErrorNegocio("Evento no encontrado.");
  const categorias = ev.rows[0].categorias as EventCategory[];
  const limite = new Date(Date.now() - RESERVA_MINUTOS * 60_000).toISOString();
  const vencidas = await client.query(
    `UPDATE registrations SET estado_pago = 'expirado'
     WHERE evento_id = $1 AND estado_pago = 'pendiente' AND creado_en < $2
     RETURNING categoria_id`,
    [eventoId, limite]
  );
  if (!vencidas.rows.length) return { categorias, liberadas: 0 };
  for (const fila of vencidas.rows) {
    const cat = categorias.find((c) => c.id === fila.categoria_id);
    if (cat) cat.cuposDisponibles = Math.min(cat.cupos, cat.cuposDisponibles + 1);
  }
  await client.query(`UPDATE events SET categorias = $2::jsonb WHERE id = $1`, [eventoId, JSON.stringify(categorias)]);
  return { categorias, liberadas: vencidas.rows.length };
}

// La limpieza general (para las listas) se hace como mucho una vez por minuto.
let ultimaLimpieza = 0;

export const postgresRepo: EventRepository = {
  async listEvents(opts) {
    if (Date.now() - ultimaLimpieza > 60_000) {
      ultimaLimpieza = Date.now();
      await postgresRepo.liberarVencidas().catch((e) => console.error("liberarVencidas", e));
    }
    const { rows } = await getPool().query(
      `${EVENTO_SELECT} WHERE ($1::boolean OR e.estado = 'publicado') ORDER BY e.creado_en DESC`,
      [Boolean(opts?.incluirNoPublicados)]
    );
    return rows.map(filaAEvento);
  },

  async getEvent(id) {
    await postgresRepo.liberarVencidas(id).catch((e) => console.error("liberarVencidas", e));
    const { rows } = await getPool().query(`${EVENTO_SELECT} WHERE e.id = $1 LIMIT 1`, [id]);
    return rows[0] ? filaAEvento(rows[0]) : null;
  },

  async listEventsByOrganizer(organizadorId) {
    const { rows } = await getPool().query(
      `${EVENTO_SELECT} WHERE e.organizador_id = $1 ORDER BY e.creado_en DESC`,
      [organizadorId]
    );
    return rows.map(filaAEvento);
  },

  async createEvent(input) {
    const id = genId("evt");
    const creadoEn = new Date().toISOString();
    await getPool().query(
      `INSERT INTO events (id, organizador_id, nombre, disciplina, fecha, lugar, latitud, longitud, descripcion, estado, categorias, campos_adicionales, recomendaciones, banner_id, creado_en)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'publicado',$10::jsonb,$11::jsonb,$12::jsonb,$13,$14)`,
      [
        id,
        input.organizadorId,
        input.nombre,
        input.disciplina,
        input.fecha,
        input.lugar,
        input.latitud,
        input.longitud,
        input.descripcion,
        JSON.stringify(input.categorias),
        JSON.stringify(input.camposAdicionales),
        JSON.stringify(input.recomendaciones),
        input.bannerId,
        creadoEn,
      ]
    );
    // Se vuelve a leer para traer el código asignado por la base.
    return (await postgresRepo.getEvent(id))!;
  },

  // Descuenta el cupo y crea la inscripción en una sola transacción, con el
  // evento bloqueado (FOR UPDATE): dos personas inscribiéndose a la vez al
  // último cupo no pueden pasar las dos.
  async createRegistration(input) {
    const client = await getPool().connect();
    try {
      await client.query("BEGIN");
      const ev = await client.query(`SELECT estado FROM events WHERE id = $1`, [input.eventoId]);
      if (!ev.rows[0]) throw new ErrorNegocio("Evento no encontrado.");
      if (ev.rows[0].estado !== "publicado") throw new ErrorNegocio("Este evento no está recibiendo inscripciones.");

      // Bloquea el evento y devuelve primero el cupo de las reservas vencidas.
      const { categorias } = await liberarEnEvento(client, input.eventoId);
      const categoria = categorias.find((c) => c.id === input.categoriaId);
      if (!categoria) throw new ErrorNegocio("Categoría no encontrada.");
      if (input.userId) {
        const ya = await client.query(
          `SELECT 1 FROM registrations WHERE evento_id = $1 AND user_id = $2 AND estado_pago IN ('pendiente','confirmado') LIMIT 1`,
          [input.eventoId, input.userId]
        );
        if (ya.rows[0]) {
          throw new ErrorNegocio("Ya tienes una inscripción en este evento. Revísala en «Mis inscripciones».");
        }
      }
      if (categoria.cuposDisponibles <= 0) throw new ErrorNegocio("Esta categoría ya no tiene cupos.");
      categoria.cuposDisponibles -= 1;

      await client.query(`UPDATE events SET categorias = $2::jsonb WHERE id = $1`, [
        input.eventoId,
        JSON.stringify(categorias),
      ]);

      const id = genId("reg");
      const creadoEn = new Date().toISOString();
      await client.query(
        `INSERT INTO registrations (id, evento_id, categoria_id, user_id, participante, respuestas, precio_pagado, estado_pago, boleta_codigo_qr, check_in_realizado, creado_en)
         VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7,'pendiente',NULL,false,$8)`,
        [
          id,
          input.eventoId,
          input.categoriaId,
          input.userId ?? null,
          JSON.stringify(input.participante),
          JSON.stringify(input.respuestas),
          categoria.tarifa,
          creadoEn,
        ]
      );
      await client.query("COMMIT");
      return (await postgresRepo.getRegistration(id))!;
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  },

  async getRegistration(id) {
    const { rows } = await getPool().query(`${REGISTRO_SELECT} WHERE r.id = $1 LIMIT 1`, [id]);
    return rows[0] ? filaARegistro(rows[0]) : null;
  },

  // Pago simulado. Con una pasarela real, esto solo debe invocarse desde el
  // servidor cuando el webhook firmado de la pasarela confirme el pago.
  async confirmPayment(registrationId) {
    const client = await getPool().connect();
    try {
      await client.query("BEGIN");
      // Orden de bloqueo: primero el evento, luego la inscripción (igual que al inscribirse).
      const previa = await client.query(`SELECT evento_id FROM registrations WHERE id = $1`, [registrationId]);
      if (!previa.rows[0]) throw new ErrorNegocio("Inscripción no encontrada.");
      const eventoId = previa.rows[0].evento_id as string;
      await client.query(`SELECT 1 FROM events WHERE id = $1 FOR UPDATE`, [eventoId]);
      const r = await client.query(
        `SELECT categoria_id, estado_pago FROM registrations WHERE id = $1 FOR UPDATE`,
        [registrationId]
      );
      const estado = r.rows[0].estado_pago as string;
      if (estado === "expirado") {
        // La reserva venció y su cupo se devolvió: solo se puede pagar si todavía hay uno libre.
        const ev = await client.query(`SELECT categorias FROM events WHERE id = $1`, [eventoId]);
        const categorias = ev.rows[0].categorias as EventCategory[];
        const cat = categorias.find((c) => c.id === r.rows[0].categoria_id);
        if (!cat || cat.cuposDisponibles <= 0) {
          throw new ErrorNegocio("Tu reserva venció y la categoría ya no tiene cupos.");
        }
        cat.cuposDisponibles -= 1;
        await client.query(`UPDATE events SET categorias = $2::jsonb WHERE id = $1`, [eventoId, JSON.stringify(categorias)]);
      }
      await client.query(
        `UPDATE registrations SET estado_pago = 'confirmado', boleta_codigo_qr = $2 WHERE id = $1`,
        [registrationId, `EVENTFLOW:${registrationId}`]
      );
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
    return (await postgresRepo.getRegistration(registrationId))!;
  },

  async listRegistrationsByEvent(eventoId) {
    const { rows } = await getPool().query(
      `${REGISTRO_SELECT} WHERE r.evento_id = $1 ORDER BY r.creado_en DESC`,
      [eventoId]
    );
    return rows.map(filaARegistro);
  },

  async listAllRegistrations() {
    const { rows } = await getPool().query(`${REGISTRO_SELECT} ORDER BY r.creado_en DESC`);
    return rows.map(filaARegistro);
  },

  // Por cuenta (user_id). El correo solo cuenta si la cuenta lo tiene
  // verificado: si no, cualquiera podría crear una cuenta con el correo de
  // otra persona y ver sus inscripciones.
  async listRegistrationsForUser(userId, correoVerificado) {
    const { rows } = await getPool().query(
      `${REGISTRO_SELECT}
       WHERE r.user_id = $1 OR ($2::text IS NOT NULL AND lower(r.participante->>'correo') = lower($2))
       ORDER BY r.creado_en DESC`,
      [userId, correoVerificado]
    );
    return rows.map(filaARegistro);
  },

  async checkIn(registrationId, porUserId) {
    // Un solo UPDATE condicionado: solo pasa si hay pago confirmado y no ha
    // ingresado antes. Es atómico, así que no hay doble ingreso por carrera.
    const { rowCount } = await getPool().query(
      `UPDATE registrations
       SET check_in_realizado = true, check_in_en = $2, check_in_por = $3
       WHERE id = $1 AND estado_pago = 'confirmado' AND check_in_realizado = false`,
      [registrationId, new Date().toISOString(), porUserId]
    );
    const registro = await postgresRepo.getRegistration(registrationId);
    if (!registro) throw new ErrorNegocio("Inscripción no encontrada.");
    if (rowCount) return { registro, resultado: "ok" as const };
    if (registro.checkInRealizado) return { registro, resultado: "ya_ingreso" as const };
    throw new ErrorNegocio("No se puede registrar el ingreso sin pago confirmado.");
  },

  async updateEventStatus(eventoId: string, estado: EventStatus) {
    const { rowCount } = await getPool().query(`UPDATE events SET estado = $2 WHERE id = $1`, [eventoId, estado]);
    if (!rowCount) throw new ErrorNegocio("Evento no encontrado.");
    return (await postgresRepo.getEvent(eventoId))!;
  },

  async updateEvent(eventoId, input) {
    const client = await getPool().connect();
    try {
      await client.query("BEGIN");
      await liberarEnEvento(client, eventoId); // bloquea el evento y deja los cupos al día
      const usados = await client.query(
        `SELECT categoria_id, count(*)::int AS n FROM registrations
         WHERE evento_id = $1 AND estado_pago IN ('pendiente','confirmado') GROUP BY categoria_id`,
        [eventoId]
      );
      const ocupados = new Map<string, number>(usados.rows.map((f) => [f.categoria_id as string, f.n as number]));

      const ids = new Set<string>();
      const categorias: EventCategory[] = input.categorias.map((c) => {
        if (ids.has(c.id)) throw new ErrorNegocio("Hay categorías repetidas.");
        ids.add(c.id);
        const ocup = ocupados.get(c.id) ?? 0;
        if (c.cupos < ocup) {
          throw new ErrorNegocio(`«${c.nombre}» ya tiene ${ocup} inscritos: los cupos no pueden ser menos que eso.`);
        }
        return { id: c.id, nombre: c.nombre, cupos: c.cupos, tarifa: c.tarifa, cuposDisponibles: c.cupos - ocup };
      });
      for (const [catId, n] of ocupados) {
        if (!ids.has(catId)) {
          throw new ErrorNegocio(`No puedes quitar una categoría que ya tiene ${n} inscrito${n === 1 ? "" : "s"}.`);
        }
      }

      await client.query(
        `UPDATE events SET nombre=$2, disciplina=$3, fecha=$4, lugar=$5, latitud=$6, longitud=$7, descripcion=$8,
                categorias=$9::jsonb, campos_adicionales=$10::jsonb, recomendaciones=$11::jsonb, banner_id=$12
         WHERE id = $1`,
        [
          eventoId,
          input.nombre,
          input.disciplina,
          input.fecha,
          input.lugar,
          input.latitud,
          input.longitud,
          input.descripcion,
          JSON.stringify(categorias),
          JSON.stringify(input.camposAdicionales),
          JSON.stringify(input.recomendaciones),
          input.bannerId,
        ]
      );
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
    return (await postgresRepo.getEvent(eventoId))!;
  },

  async liberarVencidas(eventoId) {
    const limite = new Date(Date.now() - RESERVA_MINUTOS * 60_000).toISOString();
    const pendientes = await getPool().query(
      `SELECT DISTINCT evento_id FROM registrations
       WHERE estado_pago = 'pendiente' AND creado_en < $1 AND ($2::text IS NULL OR evento_id = $2)`,
      [limite, eventoId ?? null]
    );
    let total = 0;
    for (const { evento_id } of pendientes.rows) {
      const client = await getPool().connect();
      try {
        await client.query("BEGIN");
        total += (await liberarEnEvento(client, evento_id as string)).liberadas;
        await client.query("COMMIT");
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
    }
    return total;
  },

  async listPopularEvents(limite) {
    const { rows } = await getPool().query(
      `SELECT e.*, o.numero AS organizador_numero, COALESCE(c.n, 0) AS inscritos
       FROM events e
       LEFT JOIN "user" o ON o.id = e.organizador_id
       LEFT JOIN (
         SELECT evento_id, count(*) AS n FROM registrations
         WHERE estado_pago IN ('pendiente','confirmado') GROUP BY evento_id
       ) c ON c.evento_id = e.id
       WHERE e.estado = 'publicado' AND e.fecha >= $1
       ORDER BY inscritos DESC, e.fecha ASC
       LIMIT $2`,
      [hoyBogota(), limite]
    );
    return rows.map(filaAEvento);
  },

  // Distancia en línea recta (fórmula de Haversine) calculada en la base. La
  // ubicación de la persona solo se usa en esta consulta: no se guarda.
  async listNearbyEvents(lat, lng, limite) {
    const { rows } = await getPool().query(
      `SELECT e.*, o.numero AS organizador_numero,
              2 * 6371 * asin(sqrt(least(1,
                power(sin(radians(e.latitud - $1::float8) / 2), 2) +
                cos(radians($1::float8)) * cos(radians(e.latitud)) *
                power(sin(radians(e.longitud - $2::float8) / 2), 2)
              ))) AS distancia_km
       FROM events e LEFT JOIN "user" o ON o.id = e.organizador_id
       WHERE e.estado = 'publicado' AND e.latitud IS NOT NULL AND e.longitud IS NOT NULL AND e.fecha >= $3
       ORDER BY distancia_km ASC
       LIMIT $4`,
      [lat, lng, hoyBogota(), limite]
    );
    return rows.map((f) => ({ ...filaAEvento(f), distanciaKm: Number(f.distancia_km) }));
  },
};
