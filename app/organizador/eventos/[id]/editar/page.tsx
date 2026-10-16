"use client";

import { TablaCargando } from "@/components/ui/cargando";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getEventoGestionAction, updateEventAction } from "@/lib/actions";
import { EventoForm } from "@/components/evento-form";
import type { Registration, SportEvent } from "@/lib/types";

export default function EditarEventoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [datos, setDatos] = useState<{ evento: SportEvent; registros: Registration[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;
    getEventoGestionAction(id)
      .then((r) => {
        if (!activo) return;
        if (r.ok) setDatos(r.data);
        else setError(r.error);
      })
      .catch(() => activo && setError("No pudimos cargar el evento."));
    return () => {
      activo = false;
    };
  }, [id]);

  if (error) return <p className="mx-auto max-w-2xl px-4 py-12 text-danger">{error}</p>;
  if (!datos) return <TablaCargando />;

  const ocupados: Record<string, number> = {};
  for (const r of datos.registros) {
    if (r.estadoPago === "pendiente" || r.estadoPago === "confirmado") ocupados[r.categoriaId] = (ocupados[r.categoriaId] ?? 0) + 1;
  }

  return (
    <div className="max-w-2xl px-4 py-8 sm:px-8">
      <Link href={`/organizador/eventos/${id}`} className="text-sm text-brand-dark">← Volver al evento</Link>
      <h1 className="font-display mb-6 mt-2 text-2xl font-semibold text-ink">Editar evento</h1>
      <EventoForm
        inicial={datos.evento}
        inscritosPorCategoria={ocupados}
        etiquetaEnviar="Guardar cambios"
        pedirPolitica={false}
        onSubmit={async (d) => {
          const res = await updateEventAction(id, d);
          if (!res.ok) return res.error;
          router.push(`/organizador/eventos/${id}`);
          return null;
        }}
      />
    </div>
  );
}
