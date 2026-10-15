import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { detectarTipoImagen, MAX_IMAGEN_BYTES, valorImagen } from "@/lib/imagenes";

export const dynamic = "force-dynamic";

// Sube una imagen. Requiere sesión; máximo 3 MB; solo JPG, PNG o WebP.
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || user.debeCambiarPassword) return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });

  let archivo: File | null = null;
  try {
    const form = await req.formData();
    const f = form.get("archivo");
    if (f instanceof File) archivo = f;
  } catch {
    return NextResponse.json({ error: "No pudimos leer el archivo." }, { status: 400 });
  }
  if (!archivo || archivo.size === 0) return NextResponse.json({ error: "Elige una imagen." }, { status: 400 });
  if (archivo.size > MAX_IMAGEN_BYTES) {
    return NextResponse.json({ error: "La imagen pesa más de 3 MB." }, { status: 413 });
  }
  const datos = new Uint8Array(await archivo.arrayBuffer());
  const tipo = detectarTipoImagen(datos);
  if (!tipo) return NextResponse.json({ error: "Solo se aceptan imágenes JPG, PNG o WebP." }, { status: 415 });

  // Freno simple contra abuso: 20 imágenes por hora y persona.
  const reciente = await getPool().query(
    `SELECT count(*)::int AS n FROM imagenes WHERE user_id = $1 AND creado_en > $2`,
    [user.id, new Date(Date.now() - 3600_000).toISOString()]
  );
  if (reciente.rows[0].n >= 20) {
    return NextResponse.json({ error: "Subiste muchas imágenes seguidas. Intenta más tarde." }, { status: 429 });
  }

  const id = `img-${randomBytes(12).toString("hex")}`;
  const nombre = archivo.name.replace(/[^\w.\- ]+/g, "_").slice(0, 80) || "imagen";
  await getPool().query(
    `INSERT INTO imagenes (id, user_id, nombre, tipo, tamano, datos, creado_en) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [id, user.id, nombre, tipo, datos.length, Buffer.from(datos), new Date().toISOString()]
  );
  return NextResponse.json({ id, valor: valorImagen(id), nombre });
}
