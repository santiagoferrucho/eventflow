import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

// Sirve una imagen solo a: quien la subió, el administrador, y el organizador
// dueño del evento al que se inscribió esa persona.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return new NextResponse("No autorizado", { status: 401 });
  if (!/^img-[a-f0-9]{24}$/.test(id)) return new NextResponse("No encontrada", { status: 404 });

  const { rows } = await getPool().query(
    `SELECT i.user_id, i.tipo, i.datos, i.evento_id, e.organizador_id
     FROM imagenes i LEFT JOIN events e ON e.id = i.evento_id WHERE i.id = $1`,
    [id]
  );
  const img = rows[0];
  if (!img) return new NextResponse("No encontrada", { status: 404 });
  const permitido =
    img.user_id === user.id ||
    user.rol === "administrador" ||
    (user.rol === "organizador" && img.organizador_id === user.id);
  if (!permitido) return new NextResponse("No autorizado", { status: 403 });

  return new NextResponse(new Uint8Array(img.datos as Buffer), {
    headers: {
      "Content-Type": img.tipo as string,
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": "inline",
    },
  });
}
