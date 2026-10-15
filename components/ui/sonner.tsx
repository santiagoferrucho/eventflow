"use client";

import { Toaster as Sonner } from "sonner";

// Avisos emergentes (toasts). Se monta una sola vez en el layout.
export function Toaster() {
  return (
    <Sonner
      position="top-center"
      richColors
      closeButton
      toastOptions={{ classNames: { toast: "!rounded-xl !border-line !font-body" } }}
    />
  );
}
