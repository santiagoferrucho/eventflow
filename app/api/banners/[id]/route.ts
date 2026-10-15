import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export const dynamic = "force-dynamic";

// Banner público de un evento publicado (se muestra en la ficha y en la tarjeta).
// Solo sirve la imagen que el evento tiene asignada como banner.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { rows } = await getPool().query(
    `SELECT i.tipo, i.datos FROM events e JOIN imagenes i ON i.id = e.banner_id
     WHERE e.id = $1 AND e.estado <> 'borrador'`,
    [id]
  );
  const img = rows[0];
  if (!img) return new NextResponse("No encontrado", { status: 404 });
  return new NextResponse(new Uint8Array(img.datos as Buffer), {
    headers: {
      "Content-Type": img.tipo as string,
      // La URL lleva ?v=<id de la imagen>, así que puede cachearse sin riesgo.
      "Cache-Control": "public, max-age=86400, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": "inline",
    },
  });
}
