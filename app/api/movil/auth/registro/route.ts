import { leerJson, manejar, ok, texto, usuarioPublico } from "@/lib/api-movil";
import { llamarAuth } from "@/lib/api-movil-auth";
import { registrarConsentimiento } from "@/lib/consentimiento";
import { getPool } from "@/lib/db";
import { ErrorNegocio } from "@/lib/errores";
import { normalizarNombre, normalizarTelefono, validarDocumento, validarNombre, validarTelefono } from "@/lib/validacion";

export const dynamic = "force-dynamic";

// Registro público: siempre crea un participante (igual que /registro en la web).
// POST { nombre, correo, password, documento, telefono, aceptaPolitica } -> { token, usuario }
export async function POST(req: Request) {
  return manejar(async () => {
    const b = await leerJson(req);
    if (b.aceptaPolitica !== true) {
      throw new ErrorNegocio("Debes aceptar la política de tratamiento de datos personales para crear tu cuenta.");
    }
    const nombre = normalizarNombre(texto(b.nombre));
    const correo = texto(b.correo).trim().toLowerCase();
    const password = texto(b.password);
    const documento = texto(b.documento).trim();
    const telefono = normalizarTelefono(texto(b.telefono));
    // Se valida todo ANTES de crear la cuenta, para no dejarla a medias.
    const invalido =
      validarNombre(nombre) ??
      (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo) && correo.length <= 120 ? null : "El correo no es válido.") ??
      (password.length >= 8 ? null : "La contraseña debe tener al menos 8 caracteres.") ??
      validarDocumento(documento, true) ??
      validarTelefono(telefono, true);
    if (invalido) throw new ErrorNegocio(invalido);

    const { token, usuario } = await llamarAuth("/sign-up/email", {
      name: nombre,
      email: correo,
      password,
      aceptaPolitica: true,
    });
    await getPool().query(
      `UPDATE "user" SET telefono = $2, documento = COALESCE(documento, $3), "updatedAt" = now() WHERE id = $1`,
      [usuario.id, telefono, documento]
    );
    await registrarConsentimiento({ userId: usuario.id, formulario: "registro" });
    return ok({ token, usuario: usuarioPublico({ ...usuario, telefono, documento }) }, 201);
  });
}
