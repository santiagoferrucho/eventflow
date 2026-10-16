import type { BetterAuthOptions } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { admin } from "better-auth/plugins";
import { createAccessControl } from "better-auth/plugins/access";
import { adminAc, defaultStatements } from "better-auth/plugins/admin/access";
import { getPool } from "@/lib/db";

// Roles de la plataforma. Solo "administrador" puede usar las funciones de
// gestión de usuarios del plugin (crear, listar, cambiar rol, bloquear...).
// "organizador" y "participante" no tienen permisos de administración: lo
// que pueden hacer sobre eventos e inscripciones lo decide nuestro propio
// código (lib/actions.ts), no este plugin.
const ac = createAccessControl(defaultStatements);
const roles = {
  administrador: ac.newRole({ ...adminAc.statements }),
  organizador: ac.newRole({ user: [], session: [] }),
  participante: ac.newRole({ user: [], session: [] }),
};

// Configuración compartida entre la app (lib/auth.ts) y el script de
// instalación (scripts/setup.ts), que no corre dentro de Next.js.
export const authOptions = {
  database: getPool(),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    autoSignIn: true,
  },
  user: {
    additionalFields: {
      debeCambiarPassword: { type: "boolean", defaultValue: false, input: false },
      // Datos del perfil. input:false = no se pueden escribir directamente
      // con los endpoints de Better Auth; se cambian solo mediante
      // actualizarPerfilAction, que los valida.
      // Número de su serie (participantes / organizadores). Lo asigna la base
      // de datos con un trigger; nadie lo puede escribir desde la API.
      numero: { type: "number", required: false, input: false },
      telefono: { type: "string", required: false, input: false },
      documento: { type: "string", required: false, input: false },
    },
  },
  // El registro público exige haber marcado la casilla de la política de
  // datos. Se comprueba aquí, en el servidor, y no solo en el formulario: así
  // no se puede crear una cuenta llamando a la API directamente sin aceptar.
  // Solo aplica a peticiones HTTP (ctx.request): el script de instalación,
  // que crea el administrador inicial, llama a la API desde el código.
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path === "/sign-up/email" && ctx.request) {
        const body = ctx.body as { aceptaPolitica?: unknown } | undefined;
        if (body?.aceptaPolitica !== true) {
          throw new APIError("BAD_REQUEST", {
            message: "Debes aceptar la política de tratamiento de datos personales.",
          });
        }
      }
    }),
  },
  // Google queda pendiente. Cuando se implemente, se agrega aquí:
  //   socialProviders: { google: { clientId: ..., clientSecret: ... } },
  // y un botón en /login y /registro. La tabla "account" que necesita ya
  // se crea con las demás tablas de autenticación.
  plugins: [
    admin({
      ac,
      roles,
      defaultRole: "participante",
      adminRoles: ["administrador"],
    }),
  ],
} satisfies BetterAuthOptions;
