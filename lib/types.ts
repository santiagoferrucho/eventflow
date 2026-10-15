// Tipos centrales del dominio. Cualquier implementación del repositorio
// debe devolver y aceptar exactamente estas formas, para que las pantallas
// nunca dependan de cómo se guardan los datos.

export type UserRole = "organizador" | "participante" | "administrador";

export interface AppUser {
  id: string;
  nombre: string;
  correo: string;
  rol: UserRole;
  correoVerificado?: boolean;
  telefono?: string | null;
  documento?: string | null;
  // Número de su serie (participantes u organizadores). Ver lib/codigos.ts.
  numero?: number | null;
  // Verdadero cuando el administrador creó la cuenta con una contraseña
  // temporal: hasta que la persona la cambie, no puede usar el sistema.
  debeCambiarPassword?: boolean;
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

// Recomendación que el organizador agrega a su evento (dónde dormir, comer, cómo llegar).
export type TipoRecomendacion = "hospedaje" | "comida" | "transporte" | "otro";
export interface Recomendacion {
  id: string;
  tipo: TipoRecomendacion;
  nombre: string;
  descripcion?: string;
  enlace?: string; // solo http(s)
}

export type EventStatus = "borrador" | "publicado" | "pausado" | "cerrado" | "suspendido";

export interface SportEvent {
  id: string;
  // Número de la serie de eventos (código E000000045). Ver lib/codigos.ts.
  numero: number;
  organizadorId: string;
  // Número del organizador dueño (código O000000007); null si no tiene cuenta.
  organizadorNumero: number | null;
  nombre: string;
  disciplina: string; // ej. "Running", "Ciclismo", "Trail"
  fecha: string; // ISO date
  lugar: string;
  // Punto en el mapa. Vacío si el organizador no lo marcó.
  latitud: number | null;
  longitud: number | null;
  descripcion: string;
  estado: EventStatus;
  categorias: EventCategory[];
  camposAdicionales: CustomField[];
  recomendaciones: Recomendacion[];
  // Imagen de portada opcional (id en la tabla imagenes); null = sin banner.
  bannerId: string | null;
  creadoEn: string; // ISO datetime
}

// "expirado": la reserva (pendiente de pago) venció y el cupo se devolvió.
export type EstadoPago = "pendiente" | "procesando" | "confirmado" | "rechazado" | "expirado";

export interface Registration {
  id: string;
  eventoId: string;
  categoriaId: string;
  // Cuenta con la que se inscribió. Toda inscripción nueva exige sesión, así
  // que queda ligada a la persona por su id interno y no por su correo. Solo
  // las anteriores a esa regla pueden tenerlo vacío.
  userId: string | null;
  // Número del participante (código de 9 dígitos); null en inscripciones antiguas sin cuenta.
  participanteNumero: number | null;
  participante: {
    nombre: string;
    correo: string;
    documento: string;
    telefono: string;
  };
  // Respuestas a los camposAdicionales del evento, indexadas por el id del
  // campo. Para campos de imagen se guarda por ahora solo el nombre del
  // archivo; cuando se conecte un storage real, aquí iría la URL.
  respuestas: Record<string, string>;
  // Tarifa que se cobró en el momento de inscribirse. Se guarda aparte para
  // que el recaudo histórico no cambie si el organizador modifica la tarifa.
  precioPagado: number;
  estadoPago: EstadoPago;
  boletaCodigoQR: string | null; // se genera al confirmar el pago
  checkInRealizado: boolean;
  // Cuándo se registró el ingreso y quién lo hizo (nombre del organizador o
  // administrador que escaneó). Vacíos si aún no ingresa.
  checkInEn: string | null;
  checkInPor: string | null;
  creadoEn: string; // ISO datetime
}

export type NewRegistrationInput = Pick<
  Registration,
  "eventoId" | "categoriaId" | "participante" | "respuestas"
> & { userId?: string | null };

export type NewEventInput = Omit<SportEvent, "id" | "numero" | "organizadorNumero" | "creadoEn" | "estado">;

export interface EventRepository {
  listEvents(opts?: { incluirNoPublicados?: boolean }): Promise<SportEvent[]>;
  getEvent(id: string): Promise<SportEvent | null>;
  createEvent(input: NewEventInput): Promise<SportEvent>;
  listEventsByOrganizer(organizadorId: string): Promise<SportEvent[]>;

  createRegistration(input: NewRegistrationInput): Promise<Registration>;
  getRegistration(id: string): Promise<Registration | null>;
  confirmPayment(registrationId: string): Promise<Registration>;
  listRegistrationsByEvent(eventoId: string): Promise<Registration[]>;
  listAllRegistrations(): Promise<Registration[]>;
  listRegistrationsForUser(userId: string, correoVerificado: string | null): Promise<Registration[]>;
  // Registra el ingreso de forma atómica: si dos personas escanean el mismo
  // QR a la vez, solo una obtiene "ok"; la otra recibe "ya_ingreso".
  checkIn(registrationId: string, porUserId: string): Promise<{ registro: Registration; resultado: "ok" | "ya_ingreso" }>;
  updateEventStatus(eventoId: string, estado: EventStatus): Promise<SportEvent>;
  // Edita un evento ya creado respetando las inscripciones existentes.
  updateEvent(eventoId: string, input: Omit<NewEventInput, "organizadorId">): Promise<SportEvent>;
  // Devuelve el cupo de las reservas sin pagar que vencieron.
  liberarVencidas(eventoId?: string): Promise<number>;
  listPopularEvents(limit: number): Promise<SportEvent[]>;
  listNearbyEvents(lat: number, lng: number, limit: number): Promise<(SportEvent & { distanciaKm: number })[]>;
}
