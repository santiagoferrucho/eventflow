import { isFirebaseConfigured } from "@/lib/firebase";

// Seguro de importar desde componentes "use client": solo depende de
// variables NEXT_PUBLIC_*, nunca del módulo del repositorio (que desde
// que mock-repo usa el sistema de archivos, está marcado como
// server-only y no puede entrar al bundle del navegador).
export const usingMockData = !isFirebaseConfigured;
