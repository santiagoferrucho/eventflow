// Tipos centrales del dominio. Cualquier implementación del repositorio
// (local o una base de datos real) debe devolver y aceptar exactamente estas formas,
// para que las pantallas nunca dependan de si el dato viene de memoria
// o de Firestore.

export type UserRole = "organizador" | "participante" | "administrador";

export interface AppUser {
  id: string;
  nombre: string;
  correo: string;
  rol: UserRole;
}

export interface EventCategory {
  id: string;
  nombre: string; // ej. "5K", "10K", "Infantil"
  cupos: number;
  cuposDisponibles: number;
  tarifa: number; // COP
}

// Campos adicionales configurables por el organizador, al estilo de un
// formulario de Google Forms: además de los datos fijos del participante
// (nombre, correo, documento, teléfono), el organizador puede pedir
// cualquier dato extra que necesite para su evento en particular.
export type CustomFieldType =
  | "corta" // respuesta corta
  | "parrafo"
  | "opcion_multiple" // radio, una sola respuesta
  | "casillas" // checkboxes, varias respuestas
  | "desplegable" // select
  | "fecha"
  | "hora"
  | "numero"
  | "imagen"; // subida de archivo

export interface CustomField {
  id: string;
  etiqueta: string; // ej. "Talla de camiseta", "¿Cómo te enteraste del evento?"
  descripcion?: string;
  tipo: CustomFieldType;
  requerido: boolean;
  // Solo aplica a opcion_multiple, casillas y desplegable.
  opciones?: string[];
}

export interface SportEvent {
  id: string;
  organizadorId: string;
  nombre: string;
  disciplina: string; // ej. "Running", "Ciclismo", "Trail"
  fecha: string; // ISO date
  lugar: string;
  descripcion: string;
  categorias: EventCategory[];
  camposAdicionales: CustomField[];
  creadoEn: string; // ISO datetime
}

export type EstadoPago = "pendiente" | "procesando" | "confirmado" | "rechazado";

export interface Registration {
  id: string;
  eventoId: string;
  categoriaId: string;
  participante: {
    nombre: string;
    correo: string;
    documento: string;
    telefono: string;
  };
  // Respuestas a los camposAdicionales del evento, indexadas por el id
  // del campo. Para campos de imagen guardamos por ahora el nombre del
  // archivo (ver nota de extensión en inscripcion-flow.tsx); cuando se
  // conecte un storage real (por ejemplo Cloudinary o S3), aquí iría la URL real del archivo subido.
  respuestas: Record<string, string>;
  estadoPago: EstadoPago;
  boletaCodigoQR: string | null; // se genera al confirmar el pago
  checkInRealizado: boolean;
  creadoEn: string; // ISO datetime
}

// Contrato que debe cumplir cualquier fuente de datos (local o una base de datos real).
export interface EventRepository {
  listEvents(): Promise<SportEvent[]>;
  getEvent(id: string): Promise<SportEvent | null>;
  createEvent(input: Omit<SportEvent, "id" | "creadoEn">): Promise<SportEvent>;
  listEventsByOrganizer(organizadorId: string): Promise<SportEvent[]>;

  createRegistration(
    input: Omit<Registration, "id" | "estadoPago" | "boletaCodigoQR" | "checkInRealizado" | "creadoEn">
  ): Promise<Registration>;
  getRegistration(id: string): Promise<Registration | null>;
  confirmPayment(registrationId: string): Promise<Registration>;
  listRegistrationsByEvent(eventoId: string): Promise<Registration[]>;
  listAllRegistrations(): Promise<Registration[]>;
  listRegistrationsByParticipantEmail(correo: string): Promise<Registration[]>;
  checkIn(registrationId: string): Promise<Registration>;
}
