import { createAuthClient } from "better-auth/react";
import { adminClient, inferAdditionalFields } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [
    adminClient(),
    inferAdditionalFields({
      user: {
        debeCambiarPassword: { type: "boolean", input: false },
        numero: { type: "number", required: false, input: false },
        telefono: { type: "string", required: false, input: false },
        documento: { type: "string", required: false, input: false },
      },
    }),
  ],
});
