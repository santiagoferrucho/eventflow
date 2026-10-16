import "server-only";
import webpush from "web-push";

// Las claves VAPID identifican al servidor ante el servicio de push del
// navegador. Se generan una vez con `npm run vapid` y se ponen en el entorno.
const publica = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privada = process.env.VAPID_PRIVATE_KEY;
const sujeto = process.env.VAPID_SUBJECT || "mailto:admin@example.com";

let listo = false;
export function pushDisponible(): boolean {
  if (!publica || !privada) return false;
  if (!listo) {
    webpush.setVapidDetails(sujeto, publica, privada);
    listo = true;
  }
  return true;
}

export type ResultadoPush = "ok" | "expirada" | "error";

export async function enviarPush(
  sub: { endpoint: string; p256dh: string; auth: string },
  payload: { titulo: string; mensaje: string; url: string }
): Promise<ResultadoPush> {
  if (!pushDisponible()) return "error";
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload),
      { TTL: 60 * 60 * 24 }
    );
    return "ok";
  } catch (e) {
    const status = (e as { statusCode?: number }).statusCode;
    return status === 404 || status === 410 ? "expirada" : "error";
  }
}
