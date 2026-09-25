"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { useAuth } from "@/lib/auth-context";
import { listMyRegistrationsAction, getEventAction } from "@/lib/actions";
import type { Registration, SportEvent } from "@/lib/types";
import { Badge, Card } from "@/components/ui";

function formatFecha(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

interface Fila {
  registro: Registration;
  evento: SportEvent | null;
}

export default function MisInscripcionesPage() {
  const { user, loading } = useAuth();
  const [filas, setFilas] = useState<Fila[] | null>(null);
  const [boletaAbierta, setBoletaAbierta] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    listMyRegistrationsAction(user.correo).then(async (registros) => {
      const eventos = await Promise.all(registros.map((r) => getEventAction(r.eventoId)));
      setFilas(registros.map((registro, i) => ({ registro, evento: eventos[i] })));
    });
  }, [user]);

  if (loading) return null;

  if (!user) {
    return (
      <div className="mx-auto max-w-lg px-6 py-16 text-center">
        <p className="text-ink-soft">
          Inicia sesión para ver tus inscripciones y tus boletas.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <h1 className="font-display mb-1 text-2xl font-semibold text-ink">Mis inscripciones</h1>
      <p className="mb-8 text-sm text-ink-soft">
        Buscamos por el correo con el que te inscribiste: {user.correo}
      </p>

      {filas === null && <p className="text-ink-soft">Cargando...</p>}

      {filas?.length === 0 && (
        <Card className="text-center">
          <p className="mb-3 text-ink-soft">Todavía no te has inscrito a ningún evento.</p>
          <Link href="/" className="text-sm font-medium text-brand-dark">
            Ver eventos disponibles
          </Link>
        </Card>
      )}

      <div className="space-y-3">
        {filas?.map(({ registro, evento }) => {
          const categoria = evento?.categorias.find((c) => c.id === registro.categoriaId);
          const abierta = boletaAbierta === registro.id;
          return (
            <Card key={registro.id}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-ink">{evento?.nombre ?? "Evento"}</p>
                  <p className="text-sm text-ink-soft">
                    {categoria?.nombre} {evento && `· ${formatFecha(evento.fecha)}`}
                  </p>
                </div>
                <Badge tone={registro.estadoPago === "confirmado" ? "success" : "danger"}>
                  {registro.estadoPago}
                </Badge>
              </div>

              {registro.estadoPago === "confirmado" && registro.boletaCodigoQR && (
                <div className="mt-3 border-t border-line pt-3">
                  <button
                    onClick={() => setBoletaAbierta(abierta ? null : registro.id)}
                    className="text-sm font-medium text-brand-dark"
                  >
                    {abierta ? "Ocultar boleta" : "Ver mi boleta"}
                  </button>
                  {abierta && (
                    <div className="mt-3 flex flex-col items-center gap-2">
                      <div className="rounded-lg border border-line bg-white p-4">
                        <QRCodeSVG value={registro.boletaCodigoQR} size={168} />
                      </div>
                      <p className="text-xs text-ink-soft">
                        {registro.checkInRealizado ? "Ingreso ya registrado" : "Muestra este código el día del evento"}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
