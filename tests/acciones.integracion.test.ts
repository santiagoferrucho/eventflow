// Pruebas de integración de las Server Actions (lib/actions.ts) contra una
// Postgres real. Se simula solo la sesión que entrega Better Auth: todo lo
// demás (validaciones, permisos, transacciones y SQL) corre como en producción.
// Necesitan DATABASE_URL y el esquema creado (`npm run db:setup`).
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { crearUsuario, hayBase, limpiar, sesionDe, type UsuarioPrueba } from "./apoyo";

let actual: UsuarioPrueba | null = null;
vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: async () => sesionDe(actual) } },
}));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": "190.0.0.7", "user-agent": "vitest" }),
}));

import * as A from "@/lib/actions";
import { getPool } from "@/lib/db";
import type { CustomField, SportEvent } from "@/lib/types";

const como = (u: UsuarioPrueba | null) => {
  actual = u;
};

let org: UsuarioPrueba, org2: UsuarioPrueba, admin: UsuarioPrueba, ana: UsuarioPrueba, beto: UsuarioPrueba;

async function crearEvento(
  dueno: UsuarioPrueba,
  extra: { cupos?: number; tarifa?: number; campos?: CustomField[] } = {}
): Promise<SportEvent> {
  como(dueno);
  const r = await A.createEventAction({
    nombre: "Carrera de prueba",
    disciplina: "Running",
    fecha: "2099-05-01",
    lugar: "Bucaramanga",
    latitud: 7.11,
    longitud: -73.12,
    descripcion: "Evento creado por las pruebas",
    categorias: [{ id: "c1", nombre: "10K", cupos: extra.cupos ?? 5, cuposDisponibles: extra.cupos ?? 5, tarifa: extra.tarifa ?? 50000 }],
    camposAdicionales: extra.campos ?? [],
    recomendaciones: [],
    bannerId: null,
    aceptaPolitica: true,
  });
  if (!r.ok) throw new Error(r.error);
  return r.data;
}

const inscripcion = (eventoId: string, extra: Partial<Parameters<typeof A.createRegistrationAction>[0]> = {}) => ({
  eventoId,
  categoriaId: "c1",
  documento: "1098765432",
  telefono: "3001234567",
  respuestas: {},
  aceptaPolitica: true,
  ...extra,
});

async function inscribir(u: UsuarioPrueba, eventoId: string) {
  como(u);
  const r = await A.createRegistrationAction(inscripcion(eventoId));
  if (!r.ok) throw new Error(r.error);
  return r.data;
}

describe.skipIf(!hayBase)("Server Actions con base de datos real", () => {
  beforeAll(async () => {
    await limpiar();
    org = await crearUsuario("organizador");
    org2 = await crearUsuario("organizador");
    admin = await crearUsuario("administrador");
    ana = await crearUsuario("participante");
    beto = await crearUsuario("participante");
  });
  beforeEach(() => como(null));
  afterAll(async () => {
    await limpiar();
    await getPool().end();
  });

  describe("inscripción", () => {
    it("sin aceptar la política de datos no se crea la inscripción", async () => {
      const e = await crearEvento(org);
      como(ana);
      const r = await A.createRegistrationAction(inscripcion(e.id, { aceptaPolitica: false }));
      expect(r).toMatchObject({ ok: false, error: expect.stringMatching(/política de tratamiento/) });
      const n = await getPool().query(`SELECT count(*)::int AS n FROM registrations WHERE evento_id = $1`, [e.id]);
      expect(n.rows[0].n).toBe(0);
    });

    it("nombre y correo salen de la cuenta, y queda la prueba del consentimiento con IP y navegador", async () => {
      const e = await crearEvento(org);
      const reg = await inscribir(ana, e.id);
      expect(reg.participante).toMatchObject({ nombre: ana.nombre, correo: ana.correo });
      expect(reg.estadoPago).toBe("pendiente");
      const c = await getPool().query(
        `SELECT formulario, ip, user_agent FROM consentimientos WHERE user_id = $1 AND referencia = $2`,
        [ana.id, reg.id]
      );
      expect(c.rows[0]).toMatchObject({ formulario: "inscripcion", ip: "190.0.0.7", user_agent: "vitest" });
    });

    it("las respuestas del formulario se validan en el servidor, no solo en el navegador", async () => {
      const campos: CustomField[] = [
        { id: "talla", etiqueta: "Talla", tipo: "desplegable", requerido: true, opciones: ["S", "M", "L"] },
      ];
      const e = await crearEvento(org, { campos });
      como(ana);
      const falta = await A.createRegistrationAction(inscripcion(e.id));
      expect(falta).toMatchObject({ ok: false, error: "Falta responder: Talla" });
      const inventada = await A.createRegistrationAction(inscripcion(e.id, { respuestas: { talla: "XXL" } }));
      expect(inventada).toMatchObject({ ok: false, error: expect.stringMatching(/no es una de las opciones/) });
      const extra = await A.createRegistrationAction(inscripcion(e.id, { respuestas: { talla: "M", hack: "x" } }));
      expect(extra.ok && extra.data.respuestas).toEqual({ talla: "M" });
    });

    it("no se puede adjuntar como respuesta una imagen subida por otra persona", async () => {
      const campos: CustomField[] = [{ id: "foto", etiqueta: "Foto", tipo: "imagen", requerido: true }];
      const e = await crearEvento(org, { campos });
      await getPool().query(
        `INSERT INTO imagenes (id, user_id, nombre, tipo, tamano, datos, creado_en) VALUES ($1,$2,'f.png','image/png',1,'\\x00',now()::text)`,
        ["img-0123456789abcdef01234567", beto.id]
      );
      como(ana);
      const r = await A.createRegistrationAction(inscripcion(e.id, { respuestas: { foto: "img:img-0123456789abcdef01234567" } }));
      expect(r).toMatchObject({ ok: false, error: expect.stringMatching(/Vuelve a subir la imagen/) });
    });

    it("con muchas inscripciones simultáneas nunca se venden más cupos de los que hay", async () => {
      const e = await crearEvento(org, { cupos: 3 });
      const personas = await Promise.all(Array.from({ length: 8 }, () => crearUsuario("participante")));
      // Se llama directo al repositorio en paralelo: la sesión simulada es una sola variable.
      const { repo } = await import("@/lib/repo");
      const resultados = await Promise.allSettled(
        personas.map((p) =>
          repo.createRegistration({
            eventoId: e.id,
            categoriaId: "c1",
            userId: p.id,
            participante: { nombre: p.nombre, correo: p.correo, documento: "1", telefono: "3001234567" },
            respuestas: {},
          })
        )
      );
      expect(resultados.filter((r) => r.status === "fulfilled")).toHaveLength(3);
      expect(resultados.filter((r) => r.status === "rejected")).toHaveLength(5);
      const ev = await repo.getEvent(e.id);
      expect(ev?.categorias[0].cuposDisponibles).toBe(0);
    });

    it("un evento pausado no recibe inscripciones", async () => {
      const e = await crearEvento(org);
      como(org);
      await A.cambiarEstadoEventoAction(e.id, "pausado");
      como(ana);
      const r = await A.createRegistrationAction(inscripcion(e.id));
      expect(r).toMatchObject({ ok: false, error: "Este evento no está recibiendo inscripciones." });
    });
  });

  describe("pago y boleta", () => {
    it("nadie puede confirmar el pago de una inscripción ajena", async () => {
      const e = await crearEvento(org);
      const reg = await inscribir(ana, e.id);
      como(beto);
      expect(await A.confirmPaymentAction(reg.id)).toMatchObject({ ok: false, error: "Inscripción no encontrada." });
    });

    it("al pagar queda confirmado con un QR no adivinable, y repetir el pago no cambia nada", async () => {
      const e = await crearEvento(org);
      const reg = await inscribir(ana, e.id);
      expect(reg.id).toMatch(/^reg-[0-9a-f]{18}$/);
      como(ana);
      const r1 = await A.confirmPaymentAction(reg.id);
      expect(r1).toMatchObject({ ok: true, data: { estadoPago: "confirmado", boletaCodigoQR: `EVENTFLOW:${reg.id}` } });
      const r2 = await A.confirmPaymentAction(reg.id);
      expect(r2.ok && r2.data.boletaCodigoQR).toBe(`EVENTFLOW:${reg.id}`);
      const ev = await A.getEventAction(e.id);
      expect(ev?.categorias[0].cuposDisponibles).toBe(4);
    });
  });

  describe("gestión de eventos", () => {
    it("un participante no puede crear eventos", async () => {
      como(ana);
      const r = await A.createEventAction({ aceptaPolitica: true } as Parameters<typeof A.createEventAction>[0]);
      expect(r).toMatchObject({ ok: false, error: "No tienes permiso para esta acción." });
    });

    it("el dueño del evento sale de la sesión, aunque el navegador mande otro", async () => {
      como(org);
      const r = await A.createEventAction({
        ...({ organizadorId: org2.id } as object),
        nombre: "Evento",
        disciplina: "Ciclismo",
        fecha: "2099-02-02",
        lugar: "Girón",
        latitud: null,
        longitud: null,
        descripcion: "x",
        categorias: [{ id: "c1", nombre: "Única", cupos: 1, cuposDisponibles: 1, tarifa: 0 }],
        camposAdicionales: [],
        recomendaciones: [],
        bannerId: null,
        aceptaPolitica: true,
      } as Parameters<typeof A.createEventAction>[0]);
      expect(r.ok && r.data.organizadorId).toBe(org.id);
    });

    it("rechaza eventos sin categorías, con coordenadas imposibles o con enlaces peligrosos", async () => {
      como(org);
      const base = {
        nombre: "E",
        disciplina: "Running",
        fecha: "2099-01-01",
        lugar: "x",
        latitud: 7,
        longitud: -73,
        descripcion: "x",
        categorias: [{ id: "c1", nombre: "A", cupos: 1, cuposDisponibles: 1, tarifa: 0 }],
        camposAdicionales: [],
        recomendaciones: [],
        bannerId: null,
        aceptaPolitica: true,
      };
      expect(await A.createEventAction({ ...base, categorias: [] })).toMatchObject({ error: "Agrega al menos una categoría." });
      expect(await A.createEventAction({ ...base, latitud: 120 })).toMatchObject({ error: "La ubicación en el mapa no es válida." });
      const xss = await A.createEventAction({
        ...base,
        recomendaciones: [{ id: "r", tipo: "otro", nombre: "Truco", enlace: "javascript:alert(1)" }],
      });
      expect(xss).toMatchObject({ ok: false, error: expect.stringMatching(/http:\/\/ o https:\/\//) });
    });

    it("un organizador no ve ni modifica el evento de otro; el administrador sí", async () => {
      const e = await crearEvento(org);
      como(org2);
      expect(await A.getEventoGestionAction(e.id)).toMatchObject({ ok: false, error: "No tienes permiso sobre este evento." });
      expect(await A.cambiarEstadoEventoAction(e.id, "cerrado")).toMatchObject({ ok: false });
      como(admin);
      expect(await A.getEventoGestionAction(e.id)).toMatchObject({ ok: true });
    });

    it("solo el administrador suspende eventos, y el organizador no puede reactivarlos", async () => {
      const e = await crearEvento(org);
      como(org);
      expect(await A.cambiarEstadoEventoAction(e.id, "suspendido")).toMatchObject({ ok: false, error: "Estado no permitido." });
      como(admin);
      expect(await A.cambiarEstadoEventoAction(e.id, "suspendido")).toMatchObject({ ok: true });
      como(org);
      expect(await A.cambiarEstadoEventoAction(e.id, "publicado")).toMatchObject({
        ok: false,
        error: expect.stringMatching(/suspendido por la administración/),
      });
    });
  });

  describe("ingreso con QR", () => {
    it("el escáner distingue código inválido, otro evento, pago pendiente, listo y ya ingresó", async () => {
      const e = await crearEvento(org);
      const otro = await crearEvento(org);
      const pendiente = await inscribir(ana, e.id);
      const deOtro = await inscribir(beto, otro.id);
      como(org);
      expect(await A.escanearAction(e.id, "hola mundo")).toMatchObject({ data: { estado: "no_valido" } });
      expect(await A.escanearAction(e.id, "EVENTFLOW:reg-' OR 1=1 --")).toMatchObject({ data: { estado: "no_valido" } });
      expect(await A.escanearAction(e.id, `EVENTFLOW:${deOtro.id}`)).toMatchObject({ data: { estado: "otro_evento" } });
      expect(await A.escanearAction(e.id, `EVENTFLOW:${pendiente.id}`)).toMatchObject({ data: { estado: "pago_pendiente" } });
      como(ana);
      await A.confirmPaymentAction(pendiente.id);
      como(org);
      expect(await A.escanearAction(e.id, `EVENTFLOW:${pendiente.id}`)).toMatchObject({ data: { estado: "listo" } });
      await A.checkInAction(pendiente.id);
      expect(await A.escanearAction(e.id, `EVENTFLOW:${pendiente.id}`)).toMatchObject({ data: { estado: "ya_ingreso" } });
    });

    it("no se registra el ingreso sin pago confirmado, y la misma boleta no entra dos veces", async () => {
      const e = await crearEvento(org);
      const reg = await inscribir(ana, e.id);
      como(org);
      expect(await A.checkInAction(reg.id)).toMatchObject({ ok: false, error: "Esta inscripción no tiene el pago confirmado." });
      como(ana);
      await A.confirmPaymentAction(reg.id);
      como(org);
      const [a, b] = await Promise.all([A.checkInAction(reg.id), A.checkInAction(reg.id)]);
      const ya = [a, b].map((r) => r.ok && r.data.yaIngreso).sort();
      expect(ya).toEqual([false, true]);
    });

    it("un organizador no puede escanear boletas de un evento que no es suyo", async () => {
      const e = await crearEvento(org);
      const reg = await inscribir(ana, e.id);
      como(org2);
      expect(await A.escanearAction(e.id, `EVENTFLOW:${reg.id}`)).toMatchObject({ ok: false, error: "No tienes permiso sobre este evento." });
    });
  });

  describe("perfil, novedades y administración", () => {
    it("el documento se registra una sola vez y solo el administrador lo corrige, también en las inscripciones", async () => {
      const p = await crearUsuario("participante");
      como(p);
      expect(await A.actualizarPerfilAction({ nombre: "Pepa", telefono: "", documento: "111222333", aceptaPolitica: true })).toEqual({ ok: true });
      p.documento = "111222333";
      expect(await A.actualizarPerfilAction({ nombre: "Pepa", telefono: "", documento: "999", aceptaPolitica: true })).toMatchObject({
        ok: false,
        error: expect.stringMatching(/no se puede cambiar/),
      });
      const e = await crearEvento(org);
      await inscribir(p, e.id);
      como(p);
      expect(await A.corregirDocumentoAction(p.id, "444555666")).toMatchObject({ ok: false, error: "No tienes permiso para esta acción." });
      como(admin);
      expect(await A.corregirDocumentoAction(p.id, "444555666")).toEqual({ ok: true, data: null });
      const r = await getPool().query(`SELECT participante->>'documento' AS d FROM registrations WHERE user_id = $1`, [p.id]);
      expect(r.rows[0].d).toBe("444555666");
    });

    it("el administrador no puede desactivar su propia cuenta", async () => {
      como(admin);
      expect(await A.setUserBannedAction(admin.id, true)).toMatchObject({ ok: false, error: "No puedes desactivar tu propia cuenta." });
    });

    it("las novedades se validan y tienen un límite de 5 por hora para evitar spam", async () => {
      const e = await crearEvento(org);
      como(org);
      expect(await A.enviarNovedadAction(e.id, { titulo: "", mensaje: "x" })).toMatchObject({ ok: false });
      for (let i = 0; i < 5; i++) {
        expect(await A.enviarNovedadAction(e.id, { titulo: `Aviso ${i}`, mensaje: "Cambio de hora" })).toMatchObject({ ok: true });
      }
      expect(await A.enviarNovedadAction(e.id, { titulo: "Otro", mensaje: "x" })).toMatchObject({
        ok: false,
        error: expect.stringMatching(/5 novedades en la última hora/),
      });
    });

    it("eventos cercanos: ignora coordenadas inválidas y ordena por distancia real", async () => {
      expect(await A.listEventosCercanosAction(Number.NaN, 0)).toEqual([]);
      expect(await A.listEventosCercanosAction(95, 0)).toEqual([]);
      await crearEvento(org);
      const lista = await A.listEventosCercanosAction(7.11, -73.12);
      expect(lista.length).toBeGreaterThan(0);
      expect(lista.length).toBeLessThanOrEqual(6);
      expect(lista[0].distanciaKm).toBeLessThan(0.5);
      const distancias = lista.map((x) => x.distanciaKm);
      expect(distancias).toEqual([...distancias].sort((x, y) => x - y));
    });
  });
});
