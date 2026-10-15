"use client";

import { useRouter } from "next/navigation";
import { createEventAction } from "@/lib/actions";
import { EventoForm } from "@/components/evento-form";

export default function NuevoEventoPage() {
  const router = useRouter();
  return (
    <div className="max-w-2xl px-4 py-8 sm:px-8">
      <h1 className="font-display mb-6 text-2xl font-semibold text-ink">Crear evento</h1>
      <EventoForm
        etiquetaEnviar="Publicar evento"
        pedirPolitica
        onSubmit={async (datos, aceptaPolitica) => {
          const res = await createEventAction({ ...datos, aceptaPolitica });
          if (!res.ok) return res.error;
          router.push(`/eventos/${res.data.id}`);
          return null;
        }}
      />
    </div>
  );
}
