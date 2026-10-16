import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { authOptions } from "@/lib/auth-options";

// nextCookies debe ir al final de los plugins: permite que las Server
// Actions de Next.js escriban la cookie de sesión.
export const auth = betterAuth({
  ...authOptions,
  plugins: [...authOptions.plugins, nextCookies()],
});
