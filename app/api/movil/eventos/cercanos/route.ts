import { listEventosCercanosAction } from "@/lib/actions";
import { manejar, ok } from "@/lib/api-movil";

export const dynamic = "force-dynamic";

// GET ?lat=..&lng=.. La ubicación solo se usa para esta consulta; no se guarda.
export async function GET(req: Request) {
  return manejar(async () => {
    const url = new URL(req.url);
    const lat = Number(url.searchParams.get("lat"));
    const lng = Number(url.searchParams.get("lng"));
    return ok(await listEventosCercanosAction(lat, lng));
  });
}
