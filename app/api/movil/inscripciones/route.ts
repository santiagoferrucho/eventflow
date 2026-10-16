import { createRegistrationAction, listMyRegistrationsAction } from "@/lib/actions";
import { desdeResultado, exigirSesion, leerJson, manejar, ok, texto } from "@/lib/api-movil";
import { repo } from "@/lib/repo";

export const dynamic = "force-dynamic";

// Mis inscripciones, cada una con su evento (para mostrar la boleta sin otra consulta).
export async function GET() {
  return manejar(async () => {
    await exigirSesion();
    const registros = await listMyRegistrationsAction();
    const ids = [...new Set(registros.map((r) => r.eventoId))];
    const eventos = new Map((await Promise.all(ids.map((id) => repo.getEvent(id)))).filter(Boolean).map((e) => [e!.id, e!]));
    return ok(registros.map((registro) => ({ registro, evento: eventos.get(registro.eventoId) ?? null })));
  });
}

// POST { eventoId, categoriaId, documento, telefono, respuestas, aceptaPolitica }
export async function POST(req: Request) {
  return manejar(async () => {
    await exigirSesion();
    const b = await leerJson(req);
    const respuestas: Record<string, string> = {};
    if (b.respuestas && typeof b.respuestas === "object") {
      for (const [k, v] of Object.entries(b.respuestas as Record<string, unknown>)) {
        if (typeof v === "string") respuestas[k] = v;
      }
    }
    const res = await createRegistrationAction({
      eventoId: texto(b.eventoId),
      categoriaId: texto(b.categoriaId),
      documento: texto(b.documento),
      telefono: texto(b.telefono),
      respuestas,
      aceptaPolitica: b.aceptaPolitica === true,
    });
    return desdeResultado(res, 201);
  });
}
