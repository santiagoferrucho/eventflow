// Una inscripción sin pagar reserva el cupo por este tiempo. Pasado el plazo,
// el cupo se devuelve a la categoría (ver liberarVencidas en el repositorio).
export const RESERVA_MINUTOS = 30;

export function reservaVenceEn(creadoEn: string): Date {
  return new Date(new Date(creadoEn).getTime() + RESERVA_MINUTOS * 60_000);
}
