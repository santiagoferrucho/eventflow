// Validaciones compartidas entre formularios (para avisar rápido) y Server
// Actions (que son las que de verdad mandan). Devuelven el mensaje de error o
// null si el dato es válido.

export function normalizarNombre(v: string) {
  return v.trim().replace(/\s+/g, " ");
}

export function validarNombre(v: string): string | null {
  const n = normalizarNombre(v);
  return n.length < 2 || n.length > 80 ? "El nombre debe tener entre 2 y 80 caracteres." : null;
}

export function normalizarTelefono(v: string) {
  return v.replace(/[\s().-]/g, "");
}

export function validarTelefono(v: string, requerido = false): string | null {
  const t = normalizarTelefono(v);
  if (!t) return requerido ? "Escribe tu teléfono." : null;
  return /^\+?\d{7,15}$/.test(t) ? null : "El teléfono debe tener entre 7 y 15 dígitos (puede empezar con +).";
}

export function validarDocumento(v: string, requerido = false): string | null {
  const d = v.trim();
  if (!d) return requerido ? "Escribe tu documento." : null;
  return /^[A-Za-z0-9.-]{5,20}$/.test(d)
    ? null
    : "El documento debe tener entre 5 y 20 caracteres, solo letras, números, punto o guion.";
}
