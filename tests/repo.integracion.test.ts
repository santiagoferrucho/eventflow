// Pruebas de integración del repositorio contra una Postgres real.
// Necesitan DATABASE_URL y el esquema ya creado (`npm run db:setup`).
// Si no hay base, se omiten.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getPool } from "@/lib/db";
import { postgresRepo as repo } from "@/lib/repo/postgres-repo";
import type { NewEventInput } from "@/lib/types";

const hayBase = Boolean(process.env.DATABASE_URL);
const ORG = "test-org-" + Date.now();
const creados: string[] = [];

const base = (extra: Partial<NewEventInput> = {}): NewEventInput => ({
  organizadorId: ORG,
  nombre: "Evento de prueba",
  disciplina: "Running",
  fecha: "2099-01-01",
  lugar: "Bucaramanga",
  latitud: 7.1193,
  longitud: -73.1227,
  descripcion: "x",
  categorias: [{ id: "c1", nombre: "5K", cupos: 2, cuposDisponibles: 2, tarifa: 1000 }],
  camposAdicionales: [],
  recomendaciones: [],
  bannerId: null,
  ...extra,
});

const persona = (n: string) => ({ nombre: `Persona ${n}`, correo: `${n}@test.com`, documento: `10${n}`, telefono: "3001234567" });

describe.skipIf(!hayBase)("repositorio (Postgres)", () => {
  beforeAll(async () => {
    await getPool().query("SELECT 1");
  });
  afterAll(async () => {
    const pool = getPool();
    if (creados.length) {
      await pool.query(`DELETE FROM registrations WHERE evento_id = ANY($1::text[])`, [creados]);
      await pool.query(`DELETE FROM events WHERE id = ANY($1::text[])`, [creados]);
    }
    await pool.end();
  });

  it("guarda ubicación y recomendaciones", async () => {
    const e = await repo.createEvent(
      base({ recomendaciones: [{ id: "r1", tipo: "hospedaje", nombre: "Hotel", enlace: "https://x.co" }] })
    );
    creados.push(e.id);
    const leido = await repo.getEvent(e.id);
    expect(leido?.latitud).toBeCloseTo(7.1193);
    expect(leido?.recomendaciones[0].nombre).toBe("Hotel");
  });

  it("no deja pasar de los cupos ni inscribirse dos veces", async () => {
    const e = await repo.createEvent(base());
    creados.push(e.id);
    await repo.createRegistration({ eventoId: e.id, categoriaId: "c1", userId: "u1", participante: persona("1"), respuestas: {} });
    await expect(
      repo.createRegistration({ eventoId: e.id, categoriaId: "c1", userId: "u1", participante: persona("1"), respuestas: {} })
    ).rejects.toThrow(/Ya tienes una inscripción/);
    await repo.createRegistration({ eventoId: e.id, categoriaId: "c1", userId: "u2", participante: persona("2"), respuestas: {} });
    await expect(
      repo.createRegistration({ eventoId: e.id, categoriaId: "c1", userId: "u3", participante: persona("3"), respuestas: {} })
    ).rejects.toThrow(/cupos/);
  });

  it("devuelve el cupo de una reserva vencida y permite reinscribirse", async () => {
    const e = await repo.createEvent(base({ categorias: [{ id: "c1", nombre: "5K", cupos: 1, cuposDisponibles: 1, tarifa: 1000 }] }));
    creados.push(e.id);
    const r = await repo.createRegistration({ eventoId: e.id, categoriaId: "c1", userId: "u1", participante: persona("1"), respuestas: {} });
    expect((await repo.getEvent(e.id))!.categorias[0].cuposDisponibles).toBe(0);

    // Envejece la reserva 31 minutos.
    await getPool().query(`UPDATE registrations SET creado_en = $2 WHERE id = $1`, [r.id, new Date(Date.now() - 31 * 60_000).toISOString()]);
    expect(await repo.liberarVencidas(e.id)).toBe(1);
    expect((await repo.getRegistration(r.id))!.estadoPago).toBe("expirado");
    expect((await repo.getEvent(e.id))!.categorias[0].cuposDisponibles).toBe(1);

    // Otra persona toma el cupo; la reserva vencida ya no puede pagarse.
    await repo.createRegistration({ eventoId: e.id, categoriaId: "c1", userId: "u2", participante: persona("2"), respuestas: {} });
    await expect(repo.confirmPayment(r.id)).rejects.toThrow(/venció/);
  });

  it("una reserva vencida se puede pagar si todavía hay cupo", async () => {
    const e = await repo.createEvent(base());
    creados.push(e.id);
    const r = await repo.createRegistration({ eventoId: e.id, categoriaId: "c1", userId: "u1", participante: persona("1"), respuestas: {} });
    await getPool().query(`UPDATE registrations SET creado_en = $2 WHERE id = $1`, [r.id, new Date(Date.now() - 31 * 60_000).toISOString()]);
    await repo.liberarVencidas(e.id);
    const pagada = await repo.confirmPayment(r.id);
    expect(pagada.estadoPago).toBe("confirmado");
    expect((await repo.getEvent(e.id))!.categorias[0].cuposDisponibles).toBe(1);
  });

  it("editar evento respeta a los inscritos", async () => {
    const e = await repo.createEvent(base({ categorias: [{ id: "c1", nombre: "5K", cupos: 5, cuposDisponibles: 5, tarifa: 1000 }] }));
    creados.push(e.id);
    await repo.createRegistration({ eventoId: e.id, categoriaId: "c1", userId: "u1", participante: persona("1"), respuestas: {} });
    await repo.createRegistration({ eventoId: e.id, categoriaId: "c1", userId: "u2", participante: persona("2"), respuestas: {} });
    const { organizadorId: _o, ...datos } = base();
    void _o;

    await expect(
      repo.updateEvent(e.id, { ...datos, categorias: [{ id: "c1", nombre: "5K", cupos: 1, cuposDisponibles: 1, tarifa: 1000 }] })
    ).rejects.toThrow(/inscritos/);
    await expect(repo.updateEvent(e.id, { ...datos, categorias: [{ id: "c9", nombre: "10K", cupos: 5, cuposDisponibles: 5, tarifa: 1 }] })).rejects.toThrow(
      /quitar una categoría/
    );
    const ok = await repo.updateEvent(e.id, {
      ...datos,
      nombre: "Nuevo nombre",
      categorias: [{ id: "c1", nombre: "5K", cupos: 10, cuposDisponibles: 10, tarifa: 2000 }],
    });
    expect(ok.nombre).toBe("Nuevo nombre");
    expect(ok.categorias[0].cuposDisponibles).toBe(8);
  });

  it("cercanos ordena por distancia y populares por inscritos", async () => {
    const cerca = await repo.createEvent(base({ nombre: "Cerca", latitud: 7.12, longitud: -73.12 }));
    const lejos = await repo.createEvent(base({ nombre: "Lejos", latitud: 4.71, longitud: -74.07 }));
    creados.push(cerca.id, lejos.id);
    const lista = await repo.listNearbyEvents(7.1193, -73.1227, 500);
    const iCerca = lista.findIndex((x) => x.id === cerca.id);
    const iLejos = lista.findIndex((x) => x.id === lejos.id);
    expect(iCerca).toBeGreaterThanOrEqual(0);
    expect(iCerca).toBeLessThan(iLejos);
    expect(lista[iLejos].distanciaKm).toBeGreaterThan(270);
    expect(lista[iLejos].distanciaKm).toBeLessThan(310); // Bucaramanga–Bogotá ≈ 288 km en línea recta

    await repo.createRegistration({ eventoId: lejos.id, categoriaId: "c1", userId: "up", participante: persona("9"), respuestas: {} });
    const pop = await repo.listPopularEvents(500);
    expect(pop.findIndex((x) => x.id === lejos.id)).toBeLessThan(pop.findIndex((x) => x.id === cerca.id));
  });

  it("el check-in es atómico: el segundo intento recibe «ya_ingreso»", async () => {
    const e = await repo.createEvent(base());
    creados.push(e.id);
    const r = await repo.createRegistration({ eventoId: e.id, categoriaId: "c1", userId: "u1", participante: persona("1"), respuestas: {} });
    await repo.confirmPayment(r.id);
    const [a, b] = await Promise.all([repo.checkIn(r.id, "staff-1"), repo.checkIn(r.id, "staff-2")]);
    expect([a.resultado, b.resultado].sort()).toEqual(["ok", "ya_ingreso"]);
  });
});
