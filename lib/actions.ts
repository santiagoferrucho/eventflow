"use server";

// Todas las funciones de este archivo corren SIEMPRE en el servidor,
// aunque las llame un componente "use client" — esa es la garantía que
// resuelve el bug del pago: la inscripción se crea en el mismo proceso
// de servidor donde el endpoint de webhook la va a buscar después.
//
// Regla del proyecto: cualquier componente cliente que necesite leer o
// escribir datos debe pasar por una función de este archivo, nunca
// importar `repo` directamente. Los únicos que pueden importar `repo`
// directamente son: componentes de servidor (páginas async sin "use
// client") y Route Handlers (app/api/.../route.ts).

import { repo } from "@/lib/repo";
import type { Registration, SportEvent } from "@/lib/types";

export async function createEventAction(input: Omit<SportEvent, "id" | "creadoEn">) {
  return repo.createEvent(input);
}

export async function listEventsByOrganizerAction(organizadorId: string) {
  return repo.listEventsByOrganizer(organizadorId);
}

export async function createRegistrationAction(
  input: Omit<Registration, "id" | "estadoPago" | "boletaCodigoQR" | "checkInRealizado" | "creadoEn">
) {
  return repo.createRegistration(input);
}

export async function listRegistrationsByEventAction(eventoId: string) {
  return repo.listRegistrationsByEvent(eventoId);
}

export async function getEventAction(id: string) {
  return repo.getEvent(id);
}

// Panel del participante: sus propias inscripciones, buscadas por correo
// (no exigimos que haya iniciado sesión al momento de inscribirse, así
// que el correo es el punto de enlace más simple y confiable).
export async function listMyRegistrationsAction(correo: string) {
  return repo.listRegistrationsByParticipantEmail(correo);
}

// Panel del organizador: sus eventos junto con las inscripciones de cada
// uno, en una sola llamada, para no encadenar varias idas y vueltas al
// servidor desde el cliente.
export async function getOrganizerDashboardAction(organizadorId: string) {
  const eventos = await repo.listEventsByOrganizer(organizadorId);
  const registrosPorEvento = await Promise.all(
    eventos.map((evento) => repo.listRegistrationsByEvent(evento.id))
  );
  return eventos.map((evento, i) => ({ evento, registros: registrosPorEvento[i] }));
}

export async function checkInAction(registrationId: string) {
  return repo.checkIn(registrationId);
}

// Confirmación del pago simulado para el cascarón. En producción, la
// confirmación real la dispara el webhook de la pasarela de pago (ver
// app/api/payments/[registrationId]/webhook/route.ts), no esta acción.
// Para el modo demo usamos una Server Action en vez de un fetch a esa
// ruta porque es más directa y evita cualquier problema de red/URL en
// el paso de "Pagar" del flujo de inscripción.
export async function confirmPaymentAction(registrationId: string) {
  return repo.confirmPayment(registrationId);
}

// --- Panel de administrador (visión global de la plataforma) ---

export async function listAllEventsAction() {
  return repo.listEvents();
}

export async function listAllRegistrationsAction() {
  return repo.listAllRegistrations();
}
