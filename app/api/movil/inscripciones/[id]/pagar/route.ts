import { confirmPaymentAction } from "@/lib/actions";
import { desdeResultado, exigirSesion, manejar } from "@/lib/api-movil";

export const dynamic = "force-dynamic";

// Pago SIMULADO, igual que en la web: solo la persona dueña de la inscripción.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return manejar(async () => {
    await exigirSesion();
    const { id } = await params;
    return desdeResultado(await confirmPaymentAction(id));
  });
}
