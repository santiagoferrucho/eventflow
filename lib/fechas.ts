// Fecha de hoy en Colombia (UTC-5, sin horario de verano) como AAAA-MM-DD.
// Los eventos guardan la fecha como texto en ese formato, así que se pueden
// comparar directamente.
export function hoyBogota(): string {
  return new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
