"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { getEventAction, listRegistrationsByEventAction, checkInAction } from "@/lib/actions";
import type { Registration, SportEvent } from "@/lib/types";
import { Badge, Button, Card } from "@/components/ui";

function formatCOP(value: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(
    value
  );
}

export default function DetalleEventoOrganizadorPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading } = useAuth();
  const [evento, setEvento] = useState<SportEvent | null>(null);
  const [registros, setRegistros] = useState<Registration[] | null>(null);
  const [marcando, setMarcando] = useState<string | null>(null);

  useEffect(() => {
    getEventAction(id).then(setEvento);
    listRegistrationsByEventAction(id).then(setRegistros);
  }, [id]);

  async function marcarIngreso(registrationId: string) {
    setMarcando(registrationId);
    try {
      const actualizado = await checkInAction(registrationId);
      setRegistros((prev) => prev?.map((r) => (r.id === registrationId ? actualizado : r)) ?? null);
    } catch {
      // Si el pago no está confirmado, el check-in se rechaza; no hay
      // nada más que mostrar aquí en este cascarón.
    } finally {
      setMarcando(null);
    }
  }

  if (loading || evento === null || registros === null) {
    return <div className="mx-auto max-w-4xl px-6 py-16 text-ink-soft">Cargando...</div>;
  }

  if (!user || user.rol !== "organizador" || evento.organizadorId !== user.id) {
    return (
      <div className="mx-auto max-w-lg px-6 py-16 text-center">
        <p className="text-ink-soft">No tienes acceso a este evento.</p>
      </div>
    );
  }

  const confirmados = registros.filter((r) => r.estadoPago === "confirmado");
  const recaudo = confirmados.reduce((sum, r) => {
    const cat = evento.categorias.find((c) => c.id === r.categoriaId);
    return sum + (cat?.tarifa ?? 0);
  }, 0);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <Link href="/organizador" className="mb-4 inline-block text-sm text-ink-soft hover:text-ink">
        ← Mis eventos
      </Link>
      <h1 className="font-display mb-1 text-2xl font-semibold text-ink">{evento.nombre}</h1>
      <p className="mb-8 text-sm text-ink-soft">
        {evento.lugar} ·{" "}
        {new Date(evento.fecha + "T00:00:00").toLocaleDateString("es-CO", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
      </p>

      <div className="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="text-center">
          <p className="font-display text-3xl font-semibold text-ink">{registros.length}</p>
          <p className="text-sm text-ink-soft">Inscritos</p>
        </Card>
        <Card className="text-center">
          <p className="font-display text-3xl font-semibold text-brand-dark">{confirmados.length}</p>
          <p className="text-sm text-ink-soft">Pagos confirmados</p>
        </Card>
        <Card className="text-center">
          <p className="font-display text-3xl font-semibold text-brand-dark">
            {confirmados.filter((r) => r.checkInRealizado).length}
          </p>
          <p className="text-sm text-ink-soft">Check-in hecho</p>
        </Card>
        <Card className="text-center">
          <p className="font-display text-3xl font-semibold text-brand-dark">{formatCOP(recaudo)}</p>
          <p className="text-sm text-ink-soft">Recaudo confirmado</p>
        </Card>
      </div>

      <h2 className="mb-3 font-display text-lg font-semibold text-ink">Ocupación por categoría</h2>
      <div className="mb-10 space-y-2">
        {evento.categorias.map((cat) => (
          <Card key={cat.id} className="flex items-center justify-between">
            <p className="text-ink">{cat.nombre}</p>
            <p className="text-sm text-ink-soft">
              {cat.cupos - cat.cuposDisponibles} / {cat.cupos} ocupados
            </p>
          </Card>
        ))}
      </div>

      <h2 className="mb-3 font-display text-lg font-semibold text-ink">Inscritos</h2>
      <div className="overflow-x-auto rounded-2xl border border-line">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-background text-left text-ink-soft">
            <tr>
              <th className="px-4 py-2 font-medium">Participante</th>
              <th className="px-4 py-2 font-medium">Categoría</th>
              <th className="px-4 py-2 font-medium">Pago</th>
              <th className="px-4 py-2 font-medium">Check-in</th>
            </tr>
          </thead>
          <tbody>
            {registros.map((reg) => {
              const cat = evento.categorias.find((c) => c.id === reg.categoriaId);
              return (
                <tr key={reg.id} className="border-t border-line">
                  <td className="px-4 py-2">
                    <p className="text-ink">{reg.participante.nombre}</p>
                    <p className="text-xs text-ink-soft">{reg.participante.correo}</p>
                  </td>
                  <td className="px-4 py-2 text-ink-soft">{cat?.nombre ?? "—"}</td>
                  <td className="px-4 py-2">
                    <Badge tone={reg.estadoPago === "confirmado" ? "success" : "danger"}>{reg.estadoPago}</Badge>
                  </td>
                  <td className="px-4 py-2">
                    {reg.checkInRealizado ? (
                      <Badge tone="gold">Ingresó</Badge>
                    ) : reg.estadoPago === "confirmado" ? (
                      <Button
                        variant="ghost"
                        className="px-3 py-1 text-xs"
                        disabled={marcando === reg.id}
                        onClick={() => marcarIngreso(reg.id)}
                      >
                        {marcando === reg.id ? "Marcando..." : "Marcar ingreso"}
                      </Button>
                    ) : (
                      <span className="text-xs text-ink-soft">Pago pendiente</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {registros.length === 0 && (
              <tr>
                <td className="px-4 py-3 text-ink-soft" colSpan={4}>
                  Todavía no hay inscritos en este evento.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-ink-soft">
        &ldquo;Marcar ingreso&rdquo; es manual por ahora. El siguiente paso natural (H6 del backlog) es
        hacerlo leyendo el código QR con la cámara del celular en vez de un clic.
      </p>
    </div>
  );
}
