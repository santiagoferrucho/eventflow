import type { UserRole } from "@/lib/types";

// Códigos oficiales que se muestran y se buscan. El número lo asigna la base
// de datos (un contador propio por serie), nunca cambia y no se reutiliza.
//   Participantes: solo números      000000012
//   Organizadores: prefijo O         O000000007
//   Eventos:       prefijo E         E000000045
// El número guardado es un entero; esto solo le da formato.
const pad = (n: number) => String(n).padStart(9, "0");

export const codigoParticipante = (n: number) => pad(n);
export const codigoOrganizador = (n: number) => `O${pad(n)}`;
export const codigoEvento = (n: number) => `E${pad(n)}`;

// Código de una cuenta según su rol. Los administradores no llevan código.
export function codigoUsuario(rol: UserRole | string, numero: number | null | undefined): string | null {
  if (numero == null) return null;
  if (rol === "participante") return codigoParticipante(numero);
  if (rol === "organizador") return codigoOrganizador(numero);
  return null;
}
