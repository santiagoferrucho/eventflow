import { NextResponse } from "next/server";
import { repo } from "@/lib/repo";

// Este endpoint representa el webhook que, en producción, invocará la
// pasarela de pago real (Wompi, PayU, Stripe, etc.) cuando el pago se
// confirme — nunca el cliente. Por eso la ruta de pago del frontend no
// llama a `repo.confirmPayment` directamente: llama a este endpoint, que
// simula la latencia y la validación de una pasarela real antes de
// confirmar. Cuando se conecte una pasarela real, solo se reemplaza el
// cuerpo de esta función por la verificación de firma/token que exija
// esa pasarela; el resto de la app no cambia.

export async function POST(_req: Request, { params }: { params: Promise<{ registrationId: string }> }) {
  const { registrationId } = await params;

  const registro = await repo.getRegistration(registrationId);
  if (!registro) {
    return NextResponse.json({ error: "Inscripción no encontrada" }, { status: 404 });
  }

  // Simula el tiempo de respuesta real de una pasarela de pago.
  await new Promise((resolve) => setTimeout(resolve, 1500));

  const confirmado = await repo.confirmPayment(registrationId);
  return NextResponse.json(confirmado);
}
