"use server";

// Todas las funciones de este archivo corren SIEMPRE en el servidor, y cada
// una decide los permisos con la sesión real (cookie validada en la base de
// datos), nunca con ids o roles que mande el navegador.
//
// Regla del proyecto: los componentes de cliente leen y escriben datos solo
// a través de este archivo, nunca importando `repo` directamente.

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { repo } from "@/lib/repo";
import { requireRole, requireUser } from "@/lib/session";
import { codigoOrganizador, codigoUsuario } from "@/lib/codigos";
import { hoyBogota } from "@/lib/fechas";
import { ErrorNegocio } from "@/lib/errores";
import { enviarPush, pushDisponible } from "@/lib/push";
import { idDesdeValorImagen } from "@/lib/imagenes";
import { exigirAceptacion, registrarConsentimiento } from "@/lib/consentimiento";
import {
  normalizarNombre,
  normalizarTelefono,
  validarDocumento,
  validarNombre,
  validarTelefono,
} from "@/lib/validacion";
import type { AppUser, EventStatus, NewEventInput, Registration, SportEvent } from "@/lib/types";

// En producción Next.js oculta el texto de los errores lanzados por una Server
// Action. Por eso las acciones que el usuario dispara desde un formulario
// devuelven un resultado { ok, ... } en vez de lanzar: así el mensaje real
// ("Esta categoría ya no tiene cupos.") sí llega a la pantalla.
export type Resultado<T> = { ok: true; data: T } | { ok: false; error: string };

async function protegido<T>(fn: () => Promise<T>): Promise<Resultado<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    if (e instanceof ErrorNegocio) return { ok: false, error: e.message };
    console.error(e);
    return { ok: false, error: "Algo salió mal de nuestro lado. Intenta de nuevo en unos segundos." };
  }
}

// Un organizador solo gestiona sus eventos; el administrador, todos.
async function assertPuedeGestionarEvento(user: AppUser, eventoId: string): Promise<SportEvent> {
  const evento = await repo.getEvent(eventoId);
  if (!evento) throw new ErrorNegocio("Evento no encontrado.");
  if (user.rol !== "administrador" && evento.organizadorId !== user.id) {
    throw new ErrorNegocio("No tienes permiso sobre este evento.");
  }
  return evento;
}

// --- Públicas ---

export async function getEventAction(id: string) {
  return repo.getEvent(id);
}

// Inscribirse exige tener cuenta e iniciar sesión: así toda inscripción queda
// ligada a la persona por su id interno (y su código de participante), y
// cambiar de correo después no la afecta.
//
// Nombre, correo y documento salen de la cuenta, no del formulario: así los
// datos de la inscripción siempre coinciden con el perfil. El teléfono y el
// documento que la persona escribe aquí se guardan además en su perfil (el
// documento solo si todavía no tenía uno, porque después queda bloqueado).
export async function createRegistrationAction(input: {
  eventoId: string;
  categoriaId: string;
  documento: string;
  telefono: string;
  respuestas: Record<string, string>;
  aceptaPolitica: boolean;
}): Promise<Resultado<Registration>> {
  return protegido(async () => {
    const user = await requireUser();
    exigirAceptacion(input.aceptaPolitica);

    const documento = user.documento ?? input.documento.trim();
    const errDoc = validarDocumento(documento, true);
    if (errDoc) throw new ErrorNegocio(errDoc);
    const telefono = normalizarTelefono(input.telefono);
    const errTel = validarTelefono(telefono, true);
    if (errTel) throw new ErrorNegocio(errTel);

    const evento = await repo.getEvent(input.eventoId);
    if (!evento) throw new ErrorNegocio("Evento no encontrado.");

    // Respuestas del formulario del organizador: se validan aquí, no solo en
    // el navegador. Solo se guardan las preguntas que el evento realmente tiene.
    const respuestas: Record<string, string> = {};
    const imagenesUsadas: string[] = [];
    for (const campo of evento.camposAdicionales) {
      const valor = (input.respuestas[campo.id] ?? "").trim().slice(0, 2000);
      if (!valor) {
        if (campo.requerido) throw new ErrorNegocio(`Falta responder: ${campo.etiqueta}`);
        continue;
      }
      if (campo.tipo === "imagen") {
        const imgId = idDesdeValorImagen(valor);
        const propia = imgId
          ? await getPool().query(`SELECT 1 FROM imagenes WHERE id = $1 AND user_id = $2`, [imgId, user.id])
          : null;
        if (!propia?.rows[0]) throw new ErrorNegocio(`Vuelve a subir la imagen de "${campo.etiqueta}".`);
        imagenesUsadas.push(imgId!);
      }
      if (campo.opciones?.length) {
        const elegidas = campo.tipo === "casillas" ? valor.split(", ") : [valor];
        if (!elegidas.every((o) => campo.opciones!.includes(o))) {
          throw new ErrorNegocio(`La respuesta de "${campo.etiqueta}" no es una de las opciones.`);
        }
      }
      respuestas[campo.id] = valor;
    }

    const registro = await repo.createRegistration({
      eventoId: input.eventoId,
      categoriaId: input.categoriaId,
      userId: user.id,
      participante: { nombre: user.nombre, correo: user.correo, documento, telefono },
      respuestas,
    });

    if (imagenesUsadas.length) {
      // Liga las imágenes al evento: así el organizador dueño puede verlas.
      await getPool().query(`UPDATE imagenes SET evento_id = $2 WHERE id = ANY($1::text[]) AND user_id = $3`, [
        imagenesUsadas,
        input.eventoId,
        user.id,
      ]);
    }
    await registrarConsentimiento({ userId: user.id, formulario: "inscripcion", referencia: registro.id });

    // Se guarda en el perfil lo que faltaba. Si esto falla no se pierde la
    // inscripción, que ya quedó guardada.
    try {
      await getPool().query(
        `UPDATE "user" SET documento = COALESCE(documento, $2), telefono = COALESCE(telefono, $3), "updatedAt" = now() WHERE id = $1`,
        [user.id, documento, telefono]
      );
    } catch (e) {
      console.error("No se pudo completar el perfil tras la inscripción", e);
    }
    return registro;
  });
}

// Pago SIMULADO. Solo la persona dueña de la inscripción puede confirmarla.
// Con una pasarela real esta acción desaparece y la confirmación llega por un
// webhook firmado de la pasarela.
export async function confirmPaymentAction(registrationId: string): Promise<Resultado<Registration>> {
  return protegido(async () => {
    const user = await requireUser();
    const registro = await repo.getRegistration(registrationId);
    if (!registro || registro.userId !== user.id) throw new ErrorNegocio("Inscripción no encontrada.");
    if (registro.estadoPago === "confirmado") return registro;
    return repo.confirmPayment(registrationId);
  });
}

// --- Participante ---

export async function listMyRegistrationsAction() {
  const user = await requireUser();
  return repo.listRegistrationsForUser(user.id, user.correoVerificado ? user.correo : null);
}

// --- Organizador (y administrador) ---

type DatosEvento = Omit<NewEventInput, "organizadorId">;

// Valida y limpia lo que llega del formulario de evento (crear o editar).
function normalizarEvento(input: DatosEvento): DatosEvento {
  const nombre = input.nombre.trim();
  if (!nombre || nombre.length > 120) throw new ErrorNegocio("El nombre del evento es obligatorio (máximo 120 caracteres).");
  if (!input.disciplina.trim() || !input.lugar.trim() || !input.descripcion.trim()) {
    throw new ErrorNegocio("Disciplina, lugar y descripción son obligatorios.");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.fecha)) throw new ErrorNegocio("La fecha no es válida.");
  if (!input.categorias.length) throw new ErrorNegocio("Agrega al menos una categoría.");
  for (const c of input.categorias) {
    if (!c.nombre.trim() || !Number.isInteger(c.cupos) || c.cupos < 1 || !Number.isInteger(c.tarifa) || c.tarifa < 0) {
      throw new ErrorNegocio("Cada categoría necesita nombre, cupos (entero mayor a 0) y tarifa (entero, 0 o más).");
    }
  }
  let { latitud, longitud } = input;
  if ((latitud == null) !== (longitud == null)) throw new ErrorNegocio("La ubicación necesita latitud y longitud.");
  if (latitud != null && longitud != null) {
    if (!Number.isFinite(latitud) || !Number.isFinite(longitud) || Math.abs(latitud) > 90 || Math.abs(longitud) > 180) {
      throw new ErrorNegocio("La ubicación en el mapa no es válida.");
    }
  } else {
    latitud = null;
    longitud = null;
  }
  const recomendaciones = (input.recomendaciones ?? [])
    .filter((r) => r.nombre.trim())
    .slice(0, 30)
    .map((r) => {
      const enlace = r.enlace?.trim();
      if (enlace && !/^https?:\/\//i.test(enlace)) {
        throw new ErrorNegocio(`El enlace de «${r.nombre}» debe empezar por http:// o https://`);
      }
      if (!["hospedaje", "comida", "transporte", "otro"].includes(r.tipo)) throw new ErrorNegocio("Tipo de recomendación no válido.");
      return {
        id: r.id,
        tipo: r.tipo,
        nombre: r.nombre.trim().slice(0, 120),
        descripcion: r.descripcion?.trim().slice(0, 400) || undefined,
        enlace: enlace || undefined,
      };
    });
  if (input.bannerId != null && !/^img-[a-f0-9]{24}$/.test(input.bannerId)) throw new ErrorNegocio("El banner no es válido.");
  return { ...input, nombre, latitud, longitud, recomendaciones, bannerId: input.bannerId ?? null };
}

// El banner debe ser una imagen que subió la propia persona (o el que el evento ya tenía).
async function validarBanner(user: AppUser, bannerId: string | null, actual: string | null) {
  if (!bannerId || bannerId === actual || user.rol === "administrador") return;
  const { rows } = await getPool().query(`SELECT 1 FROM imagenes WHERE id = $1 AND user_id = $2`, [bannerId, user.id]);
  if (!rows[0]) throw new ErrorNegocio("Vuelve a subir el banner del evento.");
}

export async function createEventAction(
  input: DatosEvento & { aceptaPolitica: boolean }
): Promise<Resultado<SportEvent>> {
  return protegido(async () => {
    const user = await requireRole("organizador", "administrador");
    // El organizador recibe datos personales de los inscritos: al publicar se
    // compromete a tratarlos solo para este evento, según la política.
    exigirAceptacion(input.aceptaPolitica);
    const { aceptaPolitica: _aceptada, ...datos } = input;
    void _aceptada;
    // El dueño sale de la sesión, no de lo que mande el navegador.
    const normal = normalizarEvento(datos);
    await validarBanner(user, normal.bannerId, null);
    const evento = await repo.createEvent({ ...normal, organizadorId: user.id });
    await registrarConsentimiento({ userId: user.id, formulario: "crear_evento", referencia: evento.id });
    return evento;
  });
}

export async function updateEventAction(
  eventoId: string,
  input: DatosEvento
): Promise<Resultado<SportEvent>> {
  return protegido(async () => {
    const user = await requireRole("organizador", "administrador");
    const actual = await assertPuedeGestionarEvento(user, eventoId);
    const normal = normalizarEvento(input);
    await validarBanner(user, normal.bannerId, actual.bannerId);
    return repo.updateEvent(eventoId, normal);
  });
}

export async function listRegistrationsByEventAction(eventoId: string): Promise<Registration[]> {
  const user = await requireRole("organizador", "administrador");
  await assertPuedeGestionarEvento(user, eventoId);
  return repo.listRegistrationsByEvent(eventoId);
}

// Evento + inscritos de un evento que la persona puede gestionar (el
// organizador dueño o cualquier administrador). Lo usan el detalle del evento
// y el escáner.
export async function getEventoGestionAction(
  eventoId: string
): Promise<Resultado<{ evento: SportEvent; registros: Registration[] }>> {
  return protegido(async () => {
    const user = await requireRole("organizador", "administrador");
    const evento = await assertPuedeGestionarEvento(user, eventoId);
    return { evento, registros: await repo.listRegistrationsByEvent(eventoId) };
  });
}

export interface EventoResumen {
  evento: SportEvent;
  inscritos: number;
  confirmados: number;
  ingresados: number;
  recaudo: number;
}

// Eventos que la persona puede gestionar, con sus cifras. El organizador ve
// los suyos; el administrador, todos.
export async function listEventosGestionablesAction(): Promise<EventoResumen[]> {
  const user = await requireRole("organizador", "administrador");
  const eventos =
    user.rol === "administrador"
      ? await repo.listEvents({ incluirNoPublicados: true })
      : await repo.listEventsByOrganizer(user.id);
  const registros = await Promise.all(eventos.map((e) => repo.listRegistrationsByEvent(e.id)));
  return eventos.map((evento, i) => {
    const pagados = registros[i].filter((r) => r.estadoPago === "confirmado");
    return {
      evento,
      inscritos: registros[i].length,
      confirmados: pagados.length,
      ingresados: pagados.filter((r) => r.checkInRealizado).length,
      recaudo: pagados.reduce((suma, r) => suma + r.precioPagado, 0),
    };
  });
}

const ESTADOS_ORGANIZADOR: EventStatus[] = ["publicado", "pausado", "cerrado"];

// El organizador puede publicar, pausar o cerrar sus eventos. Suspender (o
// reactivar un evento suspendido) es decisión del administrador.
export async function cambiarEstadoEventoAction(eventoId: string, estado: EventStatus): Promise<Resultado<SportEvent>> {
  return protegido(async () => {
    const user = await requireRole("organizador", "administrador");
    const evento = await assertPuedeGestionarEvento(user, eventoId);
    if (user.rol !== "administrador") {
      if (evento.estado === "suspendido") {
        throw new ErrorNegocio("Este evento fue suspendido por la administración. Contáctala para reactivarlo.");
      }
      if (!ESTADOS_ORGANIZADOR.includes(estado)) throw new ErrorNegocio("Estado no permitido.");
    }
    return repo.updateEventStatus(eventoId, estado);
  });
}

// Registra el ingreso a mano (botón en la lista de inscritos).
export async function checkInAction(registrationId: string): Promise<Resultado<{ registro: Registration; yaIngreso: boolean }>> {
  return protegido(async () => {
    const user = await requireRole("organizador", "administrador");
    const registro = await repo.getRegistration(registrationId);
    if (!registro) throw new ErrorNegocio("Inscripción no encontrada.");
    await assertPuedeGestionarEvento(user, registro.eventoId);
    if (registro.estadoPago !== "confirmado") throw new ErrorNegocio("Esta inscripción no tiene el pago confirmado.");
    const { registro: actualizado, resultado } = await repo.checkIn(registrationId, user.id);
    return {
      registro: actualizado,
      yaIngreso: resultado === "ya_ingreso",
    };
  });
}

// --- Escáner de QR ---

export interface InfoEscaneo {
  registro: Registration;
  categoria: string;
  respuestas: { etiqueta: string; valor: string }[];
}

export type EscaneoResultado =
  | { estado: "listo"; info: InfoEscaneo }
  | { estado: "ya_ingreso"; info: InfoEscaneo }
  | { estado: "pago_pendiente"; info: InfoEscaneo }
  | { estado: "otro_evento"; eventoNombre: string }
  | { estado: "no_valido" };

// Lo que dice el QR del tiquete: "EVENTFLOW:<id de la inscripción>".
function idDesdeQR(texto: string): string | null {
  const t = texto.trim();
  if (!t || t.length > 100) return null;
  const id = t.startsWith("EVENTFLOW:") ? t.slice("EVENTFLOW:".length) : t;
  return /^reg-[A-Za-z0-9]+$/.test(id) ? id : null;
}

// Primer paso: leer el código y mostrar quién es y si puede entrar. NO
// registra el ingreso; eso lo hace checkInAction cuando la persona confirma.
export async function escanearAction(eventoId: string, texto: string): Promise<Resultado<EscaneoResultado>> {
  return protegido(async () => {
    const user = await requireRole("organizador", "administrador");
    const evento = await assertPuedeGestionarEvento(user, eventoId);
    const id = idDesdeQR(texto);
    if (!id) return { estado: "no_valido" as const };
    const registro = await repo.getRegistration(id);
    if (!registro) return { estado: "no_valido" as const };
    if (registro.eventoId !== evento.id) {
      const otro = await repo.getEvent(registro.eventoId);
      return { estado: "otro_evento" as const, eventoNombre: otro?.nombre ?? "otro evento" };
    }
    const info: InfoEscaneo = {
      registro,
      categoria: evento.categorias.find((c) => c.id === registro.categoriaId)?.nombre ?? "—",
      respuestas: evento.camposAdicionales
        .filter((c) => registro.respuestas[c.id])
        .map((c) => ({ etiqueta: c.etiqueta, valor: registro.respuestas[c.id] })),
    };
    if (registro.estadoPago !== "confirmado") return { estado: "pago_pendiente" as const, info };
    if (registro.checkInRealizado) return { estado: "ya_ingreso" as const, info };
    return { estado: "listo" as const, info };
  });
}

// --- Administrador ---

export async function listAllEventsAction() {
  await requireRole("administrador");
  return repo.listEvents({ incluirNoPublicados: true });
}

export async function listAllRegistrationsAction() {
  await requireRole("administrador");
  return repo.listAllRegistrations();
}

export interface UsuarioFila {
  id: string;
  // Código oficial (participantes: solo números, organizadores: O…). Los administradores no llevan.
  codigo: string | null;
  nombre: string;
  correo: string;
  telefono: string | null;
  documento: string | null;
  rol: string;
  baneado: boolean;
  inscripciones: number;
  creadoEn: string;
}

export async function listUsersAction(): Promise<UsuarioFila[]> {
  await requireRole("administrador");
  const { rows } = await getPool().query(
    `SELECT u.id, u.name, u.email, u.role, u.numero, u.telefono, u.documento, u.banned, u."createdAt",
            (SELECT count(*) FROM registrations r WHERE r.user_id = u.id) AS inscripciones
     FROM "user" u ORDER BY u."createdAt" DESC LIMIT 1000`
  );
  return rows.map((u) => {
    const rol = (u.role as string | null) ?? "participante";
    return {
      id: u.id,
      codigo: codigoUsuario(rol, u.numero == null ? null : Number(u.numero)),
      nombre: u.name,
      correo: u.email,
      telefono: u.telefono ?? null,
      documento: u.documento ?? null,
      rol,
      baneado: Boolean(u.banned),
      inscripciones: Number(u.inscripciones),
      creadoEn: new Date(u.createdAt).toISOString(),
    };
  });
}

export interface EstadisticasPlataforma {
  participantes: number;
  organizadores: number;
  administradores: number;
  eventos: number;
  eventosPublicados: number;
  inscripciones: number;
  pagadas: number;
  pendientes: number;
  ingresados: number;
  recaudo: number;
}

// Cifras generales de toda la plataforma, calculadas en la base.
export async function getAdminStatsAction(): Promise<EstadisticasPlataforma> {
  await requireRole("administrador");
  const pool = getPool();
  const [u, e, r] = await Promise.all([
    pool.query(`SELECT role, count(*)::int AS n FROM "user" GROUP BY role`),
    pool.query(`SELECT count(*)::int AS total, count(*) FILTER (WHERE estado = 'publicado')::int AS publicados FROM events`),
    pool.query(
      `SELECT count(*)::int AS total,
              count(*) FILTER (WHERE estado_pago = 'confirmado')::int AS pagadas,
              count(*) FILTER (WHERE estado_pago <> 'confirmado')::int AS pendientes,
              count(*) FILTER (WHERE check_in_realizado)::int AS ingresados,
              COALESCE(sum(precio_pagado) FILTER (WHERE estado_pago = 'confirmado'), 0)::bigint AS recaudo
       FROM registrations`
    ),
  ]);
  const porRol = new Map<string, number>(u.rows.map((x) => [x.role ?? "participante", x.n]));
  return {
    participantes: porRol.get("participante") ?? 0,
    organizadores: porRol.get("organizador") ?? 0,
    administradores: porRol.get("administrador") ?? 0,
    eventos: e.rows[0].total,
    eventosPublicados: e.rows[0].publicados,
    inscripciones: r.rows[0].total,
    pagadas: r.rows[0].pagadas,
    pendientes: r.rows[0].pendientes,
    ingresados: r.rows[0].ingresados,
    recaudo: Number(r.rows[0].recaudo),
  };
}

// Desactivar una cuenta le impide iniciar sesión y cierra sus sesiones; sus
// inscripciones y eventos se conservan. Nadie puede desactivarse a sí mismo.
export async function setUserBannedAction(userId: string, baneado: boolean): Promise<Resultado<null>> {
  return protegido(async () => {
    const admin = await requireRole("administrador");
    if (userId === admin.id) throw new ErrorNegocio("No puedes desactivar tu propia cuenta.");
    if (baneado) {
      await auth.api.banUser({ body: { userId, banReason: "Desactivada por la administración" }, headers: await headers() });
    } else {
      await auth.api.unbanUser({ body: { userId }, headers: await headers() });
    }
    return null;
  });
}

// El documento se bloquea cuando la persona lo registra. Si se equivocó, solo
// el administrador puede corregirlo (también actualiza las inscripciones de
// esa persona, para que el tiquete y la lista de ingreso coincidan).
export async function corregirDocumentoAction(userId: string, documento: string): Promise<Resultado<null>> {
  return protegido(async () => {
    await requireRole("administrador");
    const nuevo = documento.trim();
    const err = validarDocumento(nuevo, true);
    if (err) throw new ErrorNegocio(err);
    const client = await getPool().connect();
    try {
      await client.query("BEGIN");
      const res = await client.query(`UPDATE "user" SET documento = $2, "updatedAt" = now() WHERE id = $1`, [userId, nuevo]);
      if (!res.rowCount) throw new ErrorNegocio("Usuario no encontrado.");
      await client.query(
        `UPDATE registrations SET participante = jsonb_set(participante, '{documento}', to_jsonb($2::text)) WHERE user_id = $1`,
        [userId, nuevo]
      );
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
    return null;
  });
}

export type CrearOrganizadorResultado = { ok: true; correo: string; codigo: string } | { ok: false; error: string };

// Las cuentas de organizador solo las crea el administrador. La contraseña
// es temporal: la persona debe cambiarla en su primer ingreso.
export async function createOrganizerAction(datos: {
  nombre: string;
  correo: string;
  password: string;
  // El administrador declara que la persona autorizó el registro de sus datos.
  aceptaPolitica: boolean;
}): Promise<CrearOrganizadorResultado> {
  const admin = await requireRole("administrador");
  if (datos.aceptaPolitica !== true) {
    return { ok: false, error: "Debes confirmar la autorización de la persona y la política de datos para continuar." };
  }
  const nombre = datos.nombre.trim();
  const correo = datos.correo.trim().toLowerCase();
  if (!nombre) return { ok: false, error: "Escribe el nombre." };
  if (!/^\S+@\S+\.\S+$/.test(correo)) return { ok: false, error: "El correo no es válido." };
  if (datos.password.length < 8) return { ok: false, error: "La contraseña temporal debe tener al menos 8 caracteres." };

  try {
    const res = await auth.api.createUser({
      body: { email: correo, password: datos.password, name: nombre, role: "organizador" },
      headers: await headers(),
    });
    const fila = await getPool().query(
      `UPDATE "user" SET "debeCambiarPassword" = true WHERE id = $1 RETURNING numero`,
      [res.user.id]
    );
    await registrarConsentimiento({ userId: admin.id, formulario: "admin_crear_organizador", referencia: res.user.id });
    return { ok: true, correo, codigo: codigoOrganizador(Number(fila.rows[0].numero)) };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (/exist/i.test(msg)) return { ok: false, error: "Ya existe una cuenta con ese correo." };
    return { ok: false, error: "No se pudo crear la cuenta. Intenta de nuevo." };
  }
}

// --- Cambio de contraseña temporal ---

// Primer ingreso de un organizador creado por el administrador: antes de
// elegir su contraseña acepta la política de datos con su propia cuenta. Esa
// aceptación (y no la del administrador) es la prueba de su autorización.
export async function aceptarPoliticaPrimerIngresoAction(aceptaPolitica: boolean): Promise<Resultado<null>> {
  return protegido(async () => {
    const user = await requireUser({ permitirCambioPendiente: true });
    exigirAceptacion(aceptaPolitica);
    await registrarConsentimiento({ userId: user.id, formulario: "primer_ingreso" });
    return null;
  });
}

// Se llama después de que el cliente cambió la contraseña con Better Auth.
export async function completarCambioPasswordAction() {
  const user = await requireUser({ permitirCambioPendiente: true });
  await getPool().query(`UPDATE "user" SET "debeCambiarPassword" = false WHERE id = $1`, [user.id]);
}

// --- Perfil ---

export type ActualizarPerfilResultado = { ok: true } | { ok: false; error: string };

// Cualquier persona con sesión edita su propio perfil. El id sale de la
// sesión, nunca del navegador. El documento se puede registrar UNA vez y
// después queda bloqueado (la base lo garantiza con COALESCE, aunque lleguen
// dos peticiones a la vez).
export async function actualizarPerfilAction(datos: {
  nombre: string;
  telefono: string;
  documento: string;
  aceptaPolitica: boolean;
  // "registro" cuando se llama justo después de crear la cuenta.
  formulario?: "registro" | "perfil";
}): Promise<ActualizarPerfilResultado> {
  const user = await requireUser();
  if (datos.aceptaPolitica !== true) {
    return { ok: false, error: "Debes aceptar la política de tratamiento de datos personales para continuar." };
  }

  const nombre = normalizarNombre(datos.nombre);
  const errNombre = validarNombre(nombre);
  if (errNombre) return { ok: false, error: errNombre };

  const telefonoLimpio = normalizarTelefono(datos.telefono);
  const errTel = validarTelefono(telefonoLimpio);
  if (errTel) return { ok: false, error: errTel };

  const documento = datos.documento.trim();
  if (user.documento) {
    if (documento && documento !== user.documento) {
      return { ok: false, error: "El documento no se puede cambiar. Si necesitas corregirlo, contacta al administrador." };
    }
  } else {
    const errDoc = validarDocumento(documento);
    if (errDoc) return { ok: false, error: errDoc };
  }

  await getPool().query(
    `UPDATE "user" SET name = $2, telefono = $3, documento = COALESCE(documento, $4), "updatedAt" = now() WHERE id = $1`,
    [user.id, nombre, telefonoLimpio || null, documento || null]
  );
  await registrarConsentimiento({ userId: user.id, formulario: datos.formulario ?? "perfil" });
  return { ok: true };
}

// Cambio de correo. Pide la contraseña actual (si alguien deja una sesión
// abierta, no basta con eso para quedarse con la cuenta). Como todavía no se
// verifican correos, el nuevo queda marcado como "sin verificar".
export async function cambiarCorreoAction(datos: {
  nuevoCorreo: string;
  password: string;
  aceptaPolitica: boolean;
}): Promise<ActualizarPerfilResultado> {
  const user = await requireUser();
  if (datos.aceptaPolitica !== true) {
    return { ok: false, error: "Debes aceptar la política de tratamiento de datos personales para continuar." };
  }

  const correo = datos.nuevoCorreo.trim().toLowerCase();
  if (correo.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
    return { ok: false, error: "El correo no es válido." };
  }
  if (correo === user.correo.toLowerCase()) return { ok: false, error: "Ese ya es tu correo." };
  if (!datos.password) return { ok: false, error: "Escribe tu contraseña actual." };

  try {
    await auth.api.verifyPassword({ body: { password: datos.password }, headers: await headers() });
  } catch {
    return { ok: false, error: "La contraseña no es correcta." };
  }

  try {
    await getPool().query(
      `UPDATE "user" SET email = $2, "emailVerified" = false, "updatedAt" = now() WHERE id = $1`,
      [user.id, correo]
    );
  } catch (e) {
    if ((e as { code?: string }).code === "23505") return { ok: false, error: "Ya existe una cuenta con ese correo." };
    throw e;
  }
  await registrarConsentimiento({ userId: user.id, formulario: "cambio_correo" });
  return { ok: true };
}

// --- Eventos cercanos ---

export interface EventoCercano {
  evento: SportEvent;
  distanciaKm: number;
}

// La ubicación llega solo como parámetro de esta consulta: no se guarda ni se
// registra en ninguna tabla.
export async function listEventosCercanosAction(lat: number, lng: number): Promise<EventoCercano[]> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return [];
  const lista = await repo.listNearbyEvents(lat, lng, 6);
  return lista.map(({ distanciaKm, ...evento }) => ({ evento, distanciaKm }));
}

// --- Novedades y notificaciones push ---

export interface Novedad {
  id: number;
  eventoId: string;
  eventoNombre: string;
  titulo: string;
  mensaje: string;
  enviadoEn: string;
}

export async function guardarSuscripcionPushAction(
  sub: { endpoint: string; keys: { p256dh: string; auth: string } },
  aceptaPolitica: boolean
): Promise<Resultado<null>> {
  return protegido(async () => {
    const user = await requireUser();
    exigirAceptacion(aceptaPolitica);
    if (!pushDisponible()) throw new ErrorNegocio("Las notificaciones no están habilitadas en este momento.");
    if (!/^https:\/\//.test(sub.endpoint) || sub.endpoint.length > 1000 || !sub.keys?.p256dh || !sub.keys?.auth) {
      throw new ErrorNegocio("La suscripción no es válida.");
    }
    await getPool().query(
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, creado_en) VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (endpoint) DO UPDATE SET user_id = EXCLUDED.user_id, p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth`,
      [user.id, sub.endpoint, sub.keys.p256dh, sub.keys.auth, new Date().toISOString()]
    );
    await registrarConsentimiento({ userId: user.id, formulario: "notificaciones" });
    return null;
  });
}

export async function quitarSuscripcionPushAction(endpoint: string): Promise<Resultado<null>> {
  return protegido(async () => {
    const user = await requireUser();
    await getPool().query(`DELETE FROM push_subscriptions WHERE endpoint = $1 AND user_id = $2`, [endpoint, user.id]);
    return null;
  });
}

// Novedad del organizador para quienes tienen cupo (pendiente o confirmado)
// en su evento. Siempre queda en la app; además llega como push a quienes
// activaron las notificaciones.
export async function enviarNovedadAction(
  eventoId: string,
  datos: { titulo: string; mensaje: string }
): Promise<Resultado<{ destinatarios: number; pushEnviados: number }>> {
  return protegido(async () => {
    const user = await requireRole("organizador", "administrador");
    const evento = await assertPuedeGestionarEvento(user, eventoId);
    const titulo = datos.titulo.trim();
    const mensaje = datos.mensaje.trim();
    if (!titulo || titulo.length > 80) throw new ErrorNegocio("El título es obligatorio (máximo 80 caracteres).");
    if (!mensaje || mensaje.length > 300) throw new ErrorNegocio("El mensaje es obligatorio (máximo 300 caracteres).");

    const reciente = await getPool().query(
      `SELECT count(*)::int AS n FROM novedades WHERE evento_id = $1 AND enviado_en > $2`,
      [eventoId, new Date(Date.now() - 3600_000).toISOString()]
    );
    if (reciente.rows[0].n >= 5) throw new ErrorNegocio("Ya enviaste 5 novedades en la última hora. Espera un poco.");

    const dest = await getPool().query(
      `SELECT DISTINCT user_id FROM registrations
       WHERE evento_id = $1 AND user_id IS NOT NULL AND estado_pago IN ('pendiente','confirmado')`,
      [eventoId]
    );
    const ids = dest.rows.map((r) => r.user_id as string);
    let pushEnviados = 0;
    if (ids.length && pushDisponible()) {
      const subs = await getPool().query(
        `SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ANY($1::text[])`,
        [ids]
      );
      const resultados = await Promise.all(
        subs.rows.map(async (s) => ({
          endpoint: s.endpoint as string,
          r: await enviarPush(
            { endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth },
            { titulo: `${evento.nombre}: ${titulo}`, mensaje, url: "/mis-inscripciones" }
          ),
        }))
      );
      pushEnviados = resultados.filter((x) => x.r === "ok").length;
      const muertas = resultados.filter((x) => x.r === "expirada").map((x) => x.endpoint);
      if (muertas.length) await getPool().query(`DELETE FROM push_subscriptions WHERE endpoint = ANY($1::text[])`, [muertas]);
    }
    await getPool().query(
      `INSERT INTO novedades (evento_id, titulo, mensaje, enviado_por, enviado_en, destinatarios, push_enviados)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [eventoId, titulo, mensaje, user.id, new Date().toISOString(), ids.length, pushEnviados]
    );
    return { destinatarios: ids.length, pushEnviados };
  });
}

// Novedades de los eventos en los que la persona tiene cupo.
export async function listMisNovedadesAction(): Promise<Novedad[]> {
  const user = await requireUser();
  const { rows } = await getPool().query(
    `SELECT n.id, n.evento_id, e.nombre, n.titulo, n.mensaje, n.enviado_en
     FROM novedades n JOIN events e ON e.id = n.evento_id
     WHERE n.evento_id IN (
       SELECT evento_id FROM registrations WHERE user_id = $1 AND estado_pago IN ('pendiente','confirmado')
     )
     ORDER BY n.enviado_en DESC LIMIT 20`,
    [user.id]
  );
  return rows.map((r) => ({
    id: Number(r.id),
    eventoId: r.evento_id,
    eventoNombre: r.nombre,
    titulo: r.titulo,
    mensaje: r.mensaje,
    enviadoEn: r.enviado_en,
  }));
}

export async function listNovedadesEventoAction(eventoId: string): Promise<Resultado<(Novedad & { destinatarios: number; pushEnviados: number })[]>> {
  return protegido(async () => {
    const user = await requireRole("organizador", "administrador");
    await assertPuedeGestionarEvento(user, eventoId);
    const { rows } = await getPool().query(
      `SELECT id, titulo, mensaje, enviado_en, destinatarios, push_enviados FROM novedades WHERE evento_id = $1 ORDER BY enviado_en DESC LIMIT 20`,
      [eventoId]
    );
    return rows.map((r) => ({
      id: Number(r.id),
      eventoId,
      eventoNombre: "",
      titulo: r.titulo,
      mensaje: r.mensaje,
      enviadoEn: r.enviado_en,
      destinatarios: Number(r.destinatarios),
      pushEnviados: Number(r.push_enviados),
    }));
  });
}

// Para que la interfaz sepa si ofrece el botón de notificaciones.
export async function pushHabilitadoAction(): Promise<boolean> {
  return pushDisponible();
}

// --- Resumen con gráficas (organizador: sus eventos; administrador: todos) ---

export interface ResumenPanel {
  serie: { fecha: string; inscripciones: number; recaudo: number }[];
  porEstado: { estado: string; n: number }[];
  topEventos: { id: string; nombre: string; inscritos: number; cupos: number; recaudo: number }[];
  proximos: { id: string; nombre: string; fecha: string; lugar: string; cupos: number; ocupados: number }[];
  topOrganizadores: { codigo: string | null; nombre: string; eventos: number; inscritos: number; recaudo: number }[];
}

export async function getResumenPanelAction(): Promise<ResumenPanel> {
  const user = await requireRole("organizador", "administrador");
  const pool = getPool();
  // Administrador: todos los eventos. Organizador: solo los suyos.
  const dueno = user.rol === "administrador" ? null : user.id;
  const desde = new Date(Date.now() - 13 * 86400_000 - 5 * 3600_000).toISOString().slice(0, 10);

  const [serie, estados, top, prox, orgs] = await Promise.all([
    pool.query(
      `SELECT d::date AS fecha,
              COALESCE(count(r.id), 0)::int AS inscripciones,
              COALESCE(sum(r.precio_pagado) FILTER (WHERE r.estado_pago = 'confirmado'), 0)::bigint AS recaudo
       FROM generate_series($1::date, $1::date + 13, interval '1 day') d
       LEFT JOIN (
         SELECT r.id, r.estado_pago, r.precio_pagado, (r.creado_en::timestamptz AT TIME ZONE 'America/Bogota')::date AS dia
         FROM registrations r JOIN events e ON e.id = r.evento_id
         WHERE $2::text IS NULL OR e.organizador_id = $2
       ) r ON r.dia = d::date
       GROUP BY d ORDER BY d`,
      [desde, dueno]
    ),
    pool.query(
      `SELECT r.estado_pago AS estado, count(*)::int AS n
       FROM registrations r JOIN events e ON e.id = r.evento_id
       WHERE $1::text IS NULL OR e.organizador_id = $1 GROUP BY r.estado_pago ORDER BY n DESC`,
      [dueno]
    ),
    pool.query(
      `SELECT e.id, e.nombre,
              count(r.id) FILTER (WHERE r.estado_pago IN ('pendiente','confirmado'))::int AS inscritos,
              COALESCE((SELECT sum((c->>'cupos')::int) FROM jsonb_array_elements(e.categorias) c), 0)::int AS cupos,
              COALESCE(sum(r.precio_pagado) FILTER (WHERE r.estado_pago = 'confirmado'), 0)::bigint AS recaudo
       FROM events e LEFT JOIN registrations r ON r.evento_id = e.id
       WHERE $1::text IS NULL OR e.organizador_id = $1
       GROUP BY e.id ORDER BY recaudo DESC, inscritos DESC LIMIT 5`,
      [dueno]
    ),
    pool.query(
      `SELECT e.id, e.nombre, e.fecha, e.lugar,
              COALESCE((SELECT sum((c->>'cupos')::int) FROM jsonb_array_elements(e.categorias) c), 0)::int AS cupos,
              COALESCE((SELECT sum((c->>'cupos')::int - (c->>'cuposDisponibles')::int) FROM jsonb_array_elements(e.categorias) c), 0)::int AS ocupados
       FROM events e
       WHERE e.fecha >= $2 AND e.estado = 'publicado' AND ($1::text IS NULL OR e.organizador_id = $1)
       ORDER BY e.fecha ASC LIMIT 5`,
      [dueno, hoyBogota()]
    ),
    user.rol === "administrador"
      ? pool.query(
          `SELECT u.numero, u.name, count(DISTINCT e.id)::int AS eventos,
                  count(r.id) FILTER (WHERE r.estado_pago IN ('pendiente','confirmado'))::int AS inscritos,
                  COALESCE(sum(r.precio_pagado) FILTER (WHERE r.estado_pago = 'confirmado'), 0)::bigint AS recaudo
           FROM "user" u JOIN events e ON e.organizador_id = u.id LEFT JOIN registrations r ON r.evento_id = e.id
           GROUP BY u.id ORDER BY recaudo DESC LIMIT 5`
        )
      : Promise.resolve({ rows: [] as Record<string, unknown>[] }),
  ]);

  return {
    serie: serie.rows.map((f) => ({
      fecha: new Date(f.fecha).toISOString().slice(0, 10),
      inscripciones: f.inscripciones,
      recaudo: Number(f.recaudo),
    })),
    porEstado: estados.rows.map((f) => ({ estado: f.estado, n: f.n })),
    topEventos: top.rows.map((f) => ({ id: f.id, nombre: f.nombre, inscritos: f.inscritos, cupos: f.cupos, recaudo: Number(f.recaudo) })),
    proximos: prox.rows.map((f) => ({ id: f.id, nombre: f.nombre, fecha: f.fecha, lugar: f.lugar, cupos: f.cupos, ocupados: f.ocupados })),
    topOrganizadores: orgs.rows.map((f) => ({
      codigo: codigoUsuario("organizador", f.numero == null ? null : Number(f.numero)),
      nombre: f.name as string,
      eventos: f.eventos as number,
      inscritos: f.inscritos as number,
      recaudo: Number(f.recaudo),
    })),
  };
}

// --- Organizadores (administrador) ---

export interface OrganizadorFila {
  id: string;
  codigo: string | null;
  nombre: string;
  correo: string;
  baneado: boolean;
  creadoEn: string;
  eventos: number;
  inscritos: number;
  recaudo: number;
}

export async function listOrganizadoresAction(): Promise<OrganizadorFila[]> {
  await requireRole("administrador");
  const { rows } = await getPool().query(
    `SELECT u.id, u.numero, u.name, u.email, COALESCE(u.banned, false) AS banned, u."createdAt",
            count(DISTINCT e.id)::int AS eventos,
            count(r.id) FILTER (WHERE r.estado_pago IN ('pendiente','confirmado'))::int AS inscritos,
            COALESCE(sum(r.precio_pagado) FILTER (WHERE r.estado_pago = 'confirmado'), 0)::bigint AS recaudo
     FROM "user" u
     LEFT JOIN events e ON e.organizador_id = u.id
     LEFT JOIN registrations r ON r.evento_id = e.id
     WHERE u.role = 'organizador'
     GROUP BY u.id ORDER BY u."createdAt" DESC`
  );
  return rows.map((u) => ({
    id: u.id,
    codigo: codigoUsuario("organizador", u.numero == null ? null : Number(u.numero)),
    nombre: u.name,
    correo: u.email,
    baneado: Boolean(u.banned),
    creadoEn: new Date(u.createdAt).toISOString(),
    eventos: u.eventos,
    inscritos: u.inscritos,
    recaudo: Number(u.recaudo),
  }));
}

// --- Evidencia de autorizaciones (administrador) ---

export interface ConsentimientoFila {
  id: number;
  persona: string;
  correo: string | null;
  formulario: string;
  version: string;
  referencia: string | null;
  aceptadoEn: string;
  ip: string | null;
}

export async function listConsentimientosAction(
  pagina: number,
  formulario: string
): Promise<{ filas: ConsentimientoFila[]; total: number; formularios: string[] }> {
  await requireRole("administrador");
  const porPagina = 25;
  const offset = Math.max(0, Math.floor(pagina)) * porPagina;
  const filtro = formulario || null;
  const [lista, total, forms] = await Promise.all([
    getPool().query(
      `SELECT c.id, c.formulario, c.politica_version, c.referencia, c.aceptado_en, c.ip, u.name, u.email
       FROM consentimientos c LEFT JOIN "user" u ON u.id = c.user_id
       WHERE $1::text IS NULL OR c.formulario = $1
       ORDER BY c.aceptado_en DESC LIMIT $2 OFFSET $3`,
      [filtro, porPagina, offset]
    ),
    getPool().query(`SELECT count(*)::int AS n FROM consentimientos WHERE $1::text IS NULL OR formulario = $1`, [filtro]),
    getPool().query(`SELECT DISTINCT formulario FROM consentimientos ORDER BY formulario`),
  ]);
  return {
    filas: lista.rows.map((c) => ({
      id: Number(c.id),
      persona: c.name ?? "(cuenta eliminada)",
      correo: c.email ?? null,
      formulario: c.formulario,
      version: c.politica_version,
      referencia: c.referencia,
      aceptadoEn: c.aceptado_en,
      ip: c.ip,
    })),
    total: total.rows[0].n,
    formularios: forms.rows.map((f) => f.formulario),
  };
}

// --- Inscritos de todos los eventos del organizador ---

export async function listMisInscritosAction(): Promise<{ registro: Registration; eventoNombre: string; eventoCodigo: number }[]> {
  const user = await requireRole("organizador", "administrador");
  const eventos =
    user.rol === "administrador"
      ? await repo.listEvents({ incluirNoPublicados: true })
      : await repo.listEventsByOrganizer(user.id);
  const listas = await Promise.all(eventos.map((e) => repo.listRegistrationsByEvent(e.id)));
  return eventos.flatMap((e, i) => listas[i].map((registro) => ({ registro, eventoNombre: e.nombre, eventoCodigo: e.numero })));
}
