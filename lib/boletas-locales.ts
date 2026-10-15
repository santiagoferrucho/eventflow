// Boletas guardadas en el dispositivo para abrirlas sin conexión. Contienen
// datos personales mínimos (nombre, evento, QR) y se borran al cerrar sesión.
export interface BoletaLocal {
  registroId: string;
  eventoNombre: string;
  eventoCodigo: string;
  fecha: string; // AAAA-MM-DD
  lugar: string;
  categoria: string;
  participante: string;
  qr: string;
  guardadaEn: string;
}

const CLAVE = "eventflow.boletas.v1";

export function leerBoletas(): BoletaLocal[] {
  try {
    const crudo = localStorage.getItem(CLAVE);
    return crudo ? (JSON.parse(crudo) as BoletaLocal[]) : [];
  } catch {
    return [];
  }
}

export function guardarBoleta(b: BoletaLocal): void {
  try {
    const otras = leerBoletas().filter((x) => x.registroId !== b.registroId);
    localStorage.setItem(CLAVE, JSON.stringify([...otras, b]));
  } catch {
    /* sin almacenamiento disponible */
  }
}

export function quitarBoleta(registroId: string): void {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(leerBoletas().filter((x) => x.registroId !== registroId)));
  } catch {
    /* nada */
  }
}

export function limpiarDatosLocales(): void {
  try {
    localStorage.removeItem(CLAVE);
  } catch {
    /* nada */
  }
  if (typeof navigator !== "undefined" && navigator.serviceWorker?.controller) {
    navigator.serviceWorker.controller.postMessage("limpiar");
  }
}
