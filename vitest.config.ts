import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
      // "server-only" lanza error fuera de Next.js; en las pruebas se sustituye.
      "server-only": path.resolve(__dirname, "tests/vacio.ts"),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    testTimeout: 20000,
    // Las pruebas de integración comparten una base: se ejecutan en serie.
    fileParallelism: false,
  },
});
