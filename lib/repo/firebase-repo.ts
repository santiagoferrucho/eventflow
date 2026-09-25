import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { EventRepository, SportEvent, Registration } from "@/lib/types";

// Implementación real sobre Firestore. Cumple exactamente el mismo
// contrato (EventRepository) que mock-repo.ts, así que las pantallas
// nunca se enteran del cambio: solo cambia lib/repo/index.ts.
//
// Colecciones esperadas en Firestore:
//   events        -> documentos SportEvent (sin "id", es el id del doc)
//   registrations -> documentos Registration (sin "id", es el id del doc)
//
// La confirmación de pago (confirmPayment) está pensada para ser llamada
// SOLO desde el endpoint de servidor que recibe el webhook de la pasarela
// real (app/api/payments/[registrationId]/webhook/route.ts), nunca desde
// el cliente. Ver R6 en el plan de riesgos del proyecto.

function requireDb() {
  if (!db) {
    throw new Error(
      "Firebase no está configurado. Define las variables NEXT_PUBLIC_FIREBASE_* en .env.local."
    );
  }
  return db;
}

export const firebaseRepo: EventRepository = {
  async listEvents() {
    const snap = await getDocs(collection(requireDb(), "events"));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as SportEvent));
  },

  async getEvent(id) {
    const ref = doc(requireDb(), "events", id);
    const snap = await getDoc(ref);
    return snap.exists() ? ({ id: snap.id, ...snap.data() } as SportEvent) : null;
  },

  async listEventsByOrganizer(organizadorId) {
    const q = query(collection(requireDb(), "events"), where("organizadorId", "==", organizadorId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as SportEvent));
  },

  async createEvent(input) {
    const payload = { ...input, creadoEn: new Date().toISOString() };
    const ref = await addDoc(collection(requireDb(), "events"), payload);
    return { id: ref.id, ...payload };
  },

  async createRegistration(input) {
    const payload = {
      ...input,
      estadoPago: "pendiente" as const,
      boletaCodigoQR: null,
      checkInRealizado: false,
      creadoEn: new Date().toISOString(),
    };
    const ref = await addDoc(collection(requireDb(), "registrations"), payload);
    return { id: ref.id, ...payload };
  },

  async getRegistration(id) {
    const ref = doc(requireDb(), "registrations", id);
    const snap = await getDoc(ref);
    return snap.exists() ? ({ id: snap.id, ...snap.data() } as Registration) : null;
  },

  async confirmPayment(registrationId) {
    const ref = doc(requireDb(), "registrations", registrationId);
    const boletaCodigoQR = `EVENTFLOW:${registrationId}`;
    await updateDoc(ref, { estadoPago: "confirmado", boletaCodigoQR });
    const snap = await getDoc(ref);
    return { id: snap.id, ...snap.data() } as Registration;
  },

  async listRegistrationsByEvent(eventoId) {
    const q = query(
      collection(requireDb(), "registrations"),
      where("eventoId", "==", eventoId),
      orderBy("creadoEn", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Registration));
  },

  async listAllRegistrations() {
    const q = query(collection(requireDb(), "registrations"), orderBy("creadoEn", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Registration));
  },

  async listRegistrationsByParticipantEmail(correo) {
    // Sin orderBy aquí a propósito: un where + orderBy sobre campos
    // distintos en Firestore suele exigir un índice compuesto. Como la
    // lista de "mis inscripciones" de una persona es corta, ordenamos
    // en memoria después de traerla.
    const q = query(collection(requireDb(), "registrations"), where("participante.correo", "==", correo));
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as Registration))
      .sort((a, b) => b.creadoEn.localeCompare(a.creadoEn));
  },

  async checkIn(registrationId) {
    const ref = doc(requireDb(), "registrations", registrationId);
    const snap = await getDoc(ref);
    const reg = snap.data() as Registration | undefined;
    if (!reg || reg.estadoPago !== "confirmado") {
      throw new Error("No se puede hacer check-in sin pago confirmado");
    }
    await updateDoc(ref, { checkInRealizado: true });
    return { ...reg, id: registrationId, checkInRealizado: true };
  },
};
