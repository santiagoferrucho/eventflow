import "server-only";
import { headers } from "next/headers";
import { getPool } from "@/lib/db";
import { ErrorNegocio } from "@/lib/errores";
import { POLITICA_VERSION, type FormularioConsentimiento } from "@/lib/politica";

// La casilla se valida aquí, en el servidor: el navegador solo avisa rápido.
export function exigirAceptacion(acepta: unknown) {
  if (acepta !== true) {
    throw new ErrorNegocio("Debes aceptar la política de tratamiento de datos personales para continuar.");
  }
}

// Guarda la prueba de la autorización (Decreto 1377 de 2013, art. 8): quién,
// cuándo, qué versión de la política, en qué formulario y desde dónde.
// Se guarda sin llave foránea a propósito: si la persona pide eliminar su
// cuenta, la prueba de que alguna vez autorizó se conserva.
export async function registrarConsentimiento(datos: {
  userId: string | null;
  formulario: FormularioConsentimiento;
  referencia?: string | null;
}) {
  const h = await headers();
  const ip = (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "").trim() || null;
  const ua = h.get("user-agent")?.slice(0, 300) ?? null;
  await getPool().query(
    `INSERT INTO consentimientos (user_id, politica_version, formulario, referencia, aceptado_en, ip, user_agent)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [datos.userId, POLITICA_VERSION, datos.formulario, datos.referencia ?? null, new Date().toISOString(), ip, ua]
  );
}
