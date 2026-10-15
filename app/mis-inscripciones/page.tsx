"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { Bell, Download, QrCode, WifiOff, Ticket } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth-context";
import { listMyRegistrationsAction, getEventAction, confirmPaymentAction, listMisNovedadesAction, type Novedad } from "@/lib/actions";
import type { Registration, SportEvent } from "@/lib/types";
import { codigoEvento } from "@/lib/codigos";
import { guardarBoleta, leerBoletas, quitarBoleta } from "@/lib/boletas-locales";
import { descargarBoletaPNG } from "@/lib/boleta-imagen";
import { reservaVenceEn, RESERVA_MINUTOS } from "@/lib/reservas";
import { Badge, Button, Card } from "@/components/ui";
import { PushToggle } from "@/components/push-toggle";

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
  const [pagando, setPagando] = useState<string | null>(null);
  const [novedades, setNovedades] = useState<Novedad[]>([]);
  const [guardadas, setGuardadas] = useState<string[]>([]);

  useEffect(() => {
    const t = setTimeout(() => setGuardadas(leerBoletas().map((b) => b.registroId)), 0);
    return () => clearTimeout(t);
  }, []);

  function boletaDe(registro: Registration, evento: SportEvent | null) {
    return {
      registroId: registro.id,
      eventoNombre: evento?.nombre ?? "Evento",
      eventoCodigo: evento ? codigoEvento(evento.numero) : "",
      fecha: evento?.fecha ?? "",
      lugar: evento?.lugar ?? "",
      categoria: evento?.categorias.find((c) => c.id === registro.categoriaId)?.nombre ?? "",
      participante: registro.participante.nombre,
      qr: registro.boletaCodigoQR ?? "",
      guardadaEn: new Date().toISOString(),
    };
  }

  function alternarGuardada(registro: Registration, evento: SportEvent | null) {
    if (guardadas.includes(registro.id)) {
      quitarBoleta(registro.id);
      setGuardadas((g) => g.filter((x) => x !== registro.id));
    } else {
      guardarBoleta(boletaDe(registro, evento));
      toast.success("Boleta guardada para usarla sin conexión.");
      setGuardadas((g) => [...g, registro.id]);
      // Visita /boleta una vez con conexión para que el navegador la guarde.
      fetch("/boleta").catch(() => undefined);
    }
  }

  // Pago SIMULADO de una inscripción que quedó pendiente.
  async function pagar(registroId: string) {
    setPagando(registroId);
    try {
      const res = await confirmPaymentAction(registroId);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setFilas((prev) => prev?.map((f) => (f.registro.id === registroId ? { ...f, registro: res.data } : f)) ?? null);
      setBoletaAbierta(registroId);
      toast.success("Pago confirmado. Tu boleta está lista.");
    } catch {
      toast.error("No pudimos conectar con el servidor. Intenta de nuevo.");
    } finally {
      setPagando(null);
    }
  }

  useEffect(() => {
    if (!user) return;
    listMisNovedadesAction().then(setNovedades).catch(() => undefined);
    listMyRegistrationsAction().then(async (registros) => {
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
        Inscripciones ligadas a tu cuenta ({user.correo}).
      </p>

      <PushToggle />

      {novedades.length > 0 && (
        <Card className="mb-6">
          <p className="mb-2 flex items-center gap-2 font-medium text-ink"><Bell className="size-4 text-brand-dark" aria-hidden />Novedades de tus eventos</p>
          <ul className="divide-y divide-line text-sm">
            {novedades.slice(0, 5).map((n) => (
              <li key={n.id} className="py-2">
                <p className="font-medium text-ink">
                  {n.titulo} <span className="font-normal text-ink-faint">· {n.eventoNombre}</span>
                </p>
                <p className="text-ink-soft">{n.mensaje}</p>
                <p className="text-xs text-ink-faint">
                  {new Date(n.enviadoEn).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {filas === null && <div className="space-y-3"><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /></div>}
      

      {filas?.length === 0 && (
        <Card className="flex flex-col items-center text-center">
          <Ticket className="mb-3 size-8 text-ink-faint" aria-hidden />
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
                  <p className="font-medium text-ink">
                    {evento && <span className="mr-2 text-xs font-medium text-ink-faint">{codigoEvento(evento.numero)}</span>}
                    {evento?.nombre ?? "Evento"}
                  </p>
                  <p className="text-sm text-ink-soft">
                    {categoria?.nombre} {evento && `· ${formatFecha(evento.fecha)}`}
                  </p>
                </div>
                <Badge tone={registro.estadoPago === "confirmado" ? "success" : "danger"}>
                  {{ confirmado: "Confirmado", pendiente: "Pago pendiente", expirado: "Reserva vencida", procesando: "Procesando", rechazado: "Rechazado" }[registro.estadoPago]}
                </Badge>
              </div>

              {registro.estadoPago !== "confirmado" && (
                <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3">
                  <p className="text-sm text-ink-soft">
                    {registro.estadoPago === "expirado"
                      ? `Pasaron más de ${RESERVA_MINUTOS} minutos sin pagar y el cupo se liberó. Si aún hay cupos, puedes pagar de nuevo.`
                      : `Tu cupo está reservado hasta las ${reservaVenceEn(registro.creadoEn).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}. Si no pagas a tiempo, se libera.`}
                  </p>
                  <Button className="shrink-0 px-4 py-2" disabled={pagando === registro.id} onClick={() => pagar(registro.id)}>
                    {pagando === registro.id ? "Procesando..." : registro.estadoPago === "expirado" ? "Pagar de nuevo" : "Completar pago"}
                  </Button>
                </div>
              )}

              {registro.estadoPago === "confirmado" && registro.boletaCodigoQR && (
                <div className="mt-3 border-t border-line pt-3">
                  <button
                    onClick={() => setBoletaAbierta(abierta ? null : registro.id)}
                    className="text-sm font-medium text-brand-dark"
                  >
                    <span className="inline-flex items-center gap-1.5"><QrCode className="size-4" aria-hidden />{abierta ? "Ocultar boleta" : "Ver mi boleta"}</span>
                  </button>
                  {abierta && (
                    <div className="mt-3 flex flex-col items-center gap-2">
                      <div className="rounded-lg border border-line bg-white p-4">
                        <QRCodeSVG value={registro.boletaCodigoQR} size={168} />
                      </div>
                      <p className="text-xs text-ink-soft">
                        {registro.checkInRealizado ? "Ingreso ya registrado" : "Muestra este código el día del evento"}
                      </p>
                      <div className="flex flex-wrap justify-center gap-2">
                        <Button variant="outline" className="px-3 py-1.5 text-xs" onClick={() => descargarBoletaPNG(boletaDe(registro, evento))}>
                          <Download className="size-3.5" aria-hidden />Descargar imagen
                        </Button>
                        <Button variant="outline" className="px-3 py-1.5 text-xs" onClick={() => alternarGuardada(registro, evento)}>
                          <WifiOff className="size-3.5" aria-hidden />{guardadas.includes(registro.id) ? "Quitar de este dispositivo" : "Guardar sin conexión"}
                        </Button>
                      </div>
                      {guardadas.includes(registro.id) && (
                        <Link href="/boleta" className="text-xs text-brand-dark underline">
                          Abrir mis boletas sin conexión
                        </Link>
                      )}
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
