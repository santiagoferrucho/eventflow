import { manejar, ok } from "@/lib/api-movil";
import { repo } from "@/lib/repo";

export const dynamic = "force-dynamic";

// Top global: lo que se muestra cuando la persona no comparte su ubicación.
export async function GET() {
  return manejar(async () => ok(await repo.listPopularEvents(6)));
}
