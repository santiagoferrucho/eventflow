"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { getOrganizerDashboardAction } from "@/lib/actions";
import type { Registration, SportEvent } from "@/lib/types";
import { Button, Card, Badge } from "@/components/ui";

function formatCOP(value: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(
    value
  );
}

interface Fila {
  evento: SportEvent;
  registros: Registration[];
}

export default function OrganizadorPage() {
  const { user, loading } = useAuth();
  const [filas, setFilas] = useState<Fila[] | null>(null);

  useEffect(() => {
    if (!user) return;
    getOrganizerDashboardAction(user.id).then(setFilas);
  }, [user]);

  if (loading) return null;

  if (!user || user.rol !== "organizador") {
    return (
      <div className="mx-auto max-w-lg px-6 py-16 text-center">
        <p className="text-ink-soft">
          Esta sección es solo para cuentas de organizador. Inicia sesión con una cuenta de ese tipo.
        </p>
      </div>
    );
  }

  const cargando = filas === null;
  const totalInscritos = filas?.reduce((sum, f) => sum + f.registros.length, 0) ?? 0;
  const confirmados = filas?.flatMap((f) => f.registros).filter((r) => r.estadoPago === "confirmado") ?? [];
  const recaudoTotal = filas?.reduce((sum, f) => {
    const deEsteEvento = f.registros.filter((r) => r.estadoPago === "confirmado");
    return (
      sum +
      deEsteEvento.reduce((s, r) => {
        const cat = f.evento.categorias.find((c) => c.id === r.categoriaId);
        return s + (cat?.tarifa ?? 0);
      }, 0)
    );
  }, 0) ?? 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-ink">Mis eventos</h1>
        <Link href="/organizador/eventos/nuevo">
          <Button>Crear evento</Button>
        </Link>
      </div>

      {cargando && <p className="text-ink-soft">Cargando...</p>}

      {!cargando && (
        <>
          <div className="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Card className="text-center">
              <p className="font-display text-3xl font-semibold text-ink">{filas!.length}</p>
              <p className="text-sm text-ink-soft">Eventos publicados</p>
            </Card>
            <Card className="text-center">
              <p className="font-display text-3xl font-semibold text-ink">{totalInscritos}</p>
              <p className="text-sm text-ink-soft">Inscripciones totales</p>
            </Card>
            <Card className="text-center">
              <p className="font-display text-3xl font-semibold text-brand-dark">{confirmados.length}</p>
              <p className="text-sm text-ink-soft">Pagos confirmados</p>
            </Card>
            <Card className="text-center">
              <p className="font-display text-3xl font-semibold text-brand-dark">{formatCOP(recaudoTotal)}</p>
              <p className="text-sm text-ink-soft">Recaudo confirmado</p>
            </Card>
          </div>

          {filas!.length === 0 && (
            <Card className="text-center">
              <p className="text-ink-soft">Todavía no has publicado ningún evento.</p>
            </Card>
          )}

          <div className="space-y-3">
            {filas!.map(({ evento, registros }) => {
              const confirmadosEvento = registros.filter((r) => r.estadoPago === "confirmado").length;
              return (
                <Link key={evento.id} href={`/organizador/eventos/${evento.id}`}>
                  <Card className="flex items-center justify-between transition-shadow hover:shadow-sm">
                    <div>
                      <p className="font-display font-semibold text-ink">{evento.nombre}</p>
                      <p className="text-sm text-ink-soft">
                        {new Date(evento.fecha + "T00:00:00").toLocaleDateString("es-CO")} · {evento.lugar}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge>{registros.length} inscritos</Badge>
                      <Badge tone="gold">{confirmadosEvento} confirmados</Badge>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
