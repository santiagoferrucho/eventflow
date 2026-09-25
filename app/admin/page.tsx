"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { listAllEventsAction, listAllRegistrationsAction } from "@/lib/actions";
import type { Registration, SportEvent } from "@/lib/types";
import { Badge, Card } from "@/components/ui";

function formatCOP(value: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(
    value
  );
}

export default function AdminPage() {
  const { user, loading } = useAuth();
  const [eventos, setEventos] = useState<SportEvent[] | null>(null);
  const [inscripciones, setInscripciones] = useState<Registration[] | null>(null);

  useEffect(() => {
    if (!user || user.rol !== "administrador") return;
    listAllEventsAction().then(setEventos);
    listAllRegistrationsAction().then(setInscripciones);
  }, [user]);

  if (loading) return null;

  if (!user || user.rol !== "administrador") {
    return (
      <div className="mx-auto max-w-lg px-6 py-16 text-center">
        <p className="text-ink-soft">
          Esta sección es solo para cuentas de administrador. Inicia sesión con una cuenta de ese tipo.
        </p>
      </div>
    );
  }

  const cargando = eventos === null || inscripciones === null;
  const confirmadas = inscripciones?.filter((r) => r.estadoPago === "confirmado") ?? [];
  const recaudoTotal = confirmadas.reduce((sum, r) => {
    const evento = eventos?.find((e) => e.id === r.eventoId);
    const categoria = evento?.categorias.find((c) => c.id === r.categoriaId);
    return sum + (categoria?.tarifa ?? 0);
  }, 0);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <h1 className="font-display mb-1 text-2xl font-semibold text-ink">Panel de administrador</h1>
      <p className="mb-8 text-sm text-ink-soft">
        Visión de toda la plataforma: todos los eventos y todas las inscripciones, sin importar el organizador.
      </p>

      {cargando && <p className="text-ink-soft">Cargando...</p>}

      {!cargando && (
        <>
          <div className="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Card className="text-center">
              <p className="font-display text-3xl font-semibold text-ink">{eventos!.length}</p>
              <p className="text-sm text-ink-soft">Eventos publicados</p>
            </Card>
            <Card className="text-center">
              <p className="font-display text-3xl font-semibold text-ink">{inscripciones!.length}</p>
              <p className="text-sm text-ink-soft">Inscripciones totales</p>
            </Card>
            <Card className="text-center">
              <p className="font-display text-3xl font-semibold text-brand-dark">{confirmadas.length}</p>
              <p className="text-sm text-ink-soft">Pagos confirmados</p>
            </Card>
            <Card className="text-center">
              <p className="font-display text-3xl font-semibold text-brand-dark">{formatCOP(recaudoTotal)}</p>
              <p className="text-sm text-ink-soft">Recaudo confirmado</p>
            </Card>
          </div>

          <h2 className="mb-3 font-display text-lg font-semibold text-ink">Eventos</h2>
          <div className="mb-10 space-y-2">
            {eventos!.map((evento) => {
              const deEsteEvento = inscripciones!.filter((r) => r.eventoId === evento.id);
              return (
                <Card key={evento.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-ink">{evento.nombre}</p>
                    <p className="text-xs text-ink-soft">
                      Organizador: {evento.organizadorId} · {evento.lugar}
                    </p>
                  </div>
                  <Badge tone="gold">{deEsteEvento.length} inscritos</Badge>
                </Card>
              );
            })}
            {eventos!.length === 0 && <p className="text-ink-soft">Todavía no hay eventos en la plataforma.</p>}
          </div>

          <h2 className="mb-3 font-display text-lg font-semibold text-ink">Inscripciones recientes</h2>
          <div className="overflow-x-auto rounded-2xl border border-line">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="bg-background text-left text-ink-soft">
                <tr>
                  <th className="px-4 py-2 font-medium">Participante</th>
                  <th className="px-4 py-2 font-medium">Evento</th>
                  <th className="px-4 py-2 font-medium">Estado de pago</th>
                  <th className="px-4 py-2 font-medium">Check-in</th>
                </tr>
              </thead>
              <tbody>
                {inscripciones!.map((reg) => {
                  const evento = eventos!.find((e) => e.id === reg.eventoId);
                  return (
                    <tr key={reg.id} className="border-t border-line">
                      <td className="px-4 py-2 text-ink">{reg.participante.nombre}</td>
                      <td className="px-4 py-2 text-ink-soft">{evento?.nombre ?? reg.eventoId}</td>
                      <td className="px-4 py-2">
                        <Badge tone={reg.estadoPago === "confirmado" ? "success" : "danger"}>
                          {reg.estadoPago}
                        </Badge>
                      </td>
                      <td className="px-4 py-2 text-ink-soft">{reg.checkInRealizado ? "Sí" : "No"}</td>
                    </tr>
                  );
                })}
                {inscripciones!.length === 0 && (
                  <tr>
                    <td className="px-4 py-3 text-ink-soft" colSpan={4}>
                      Todavía no hay inscripciones en la plataforma.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
