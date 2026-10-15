"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { CalendarDays, CheckCircle2, CreditCard, Lock, MapPin, ShieldCheck, TriangleAlert } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { createRegistrationAction, confirmPaymentAction } from "@/lib/actions";
import type { EventCategory, Registration, SportEvent } from "@/lib/types";
import { codigoEvento, codigoParticipante } from "@/lib/codigos";
import { AceptarPolitica, Button, Card, Field, Stepper, TextInput } from "@/components/ui";
import { GoogleFormFiller } from "@/components/google-form-filler";

const PASOS = ["Tus datos", "Pago", "Confirmación"];

function Alerta({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
      <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
      {children}
    </p>
  );
}

function formatCOP(value: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(
    value
  );
}

export function InscripcionFlow({ evento, categoria }: { evento: SportEvent; categoria: EventCategory }) {
  const { user, refrescar } = useAuth();
  const router = useRouter();
  const [paso, setPaso] = useState(0);
  // Nombre y correo salen de la cuenta (se cambian en el perfil). El
  // documento también, una vez registrado; el teléfono se puede ajustar aquí.
  // Lo que la persona escribió a mano manda; lo que no tocó viene del perfil.
  const [editados, setEditados] = useState<{ documento?: string; telefono?: string }>({});
  const datos = {
    nombre: user?.nombre ?? "",
    correo: user?.correo ?? "",
    documento: user?.documento ?? editados.documento ?? "",
    telefono: editados.telefono ?? user?.telefono ?? "",
  };
  const documentoBloqueado = Boolean(user?.documento);
  // Respuestas a las preguntas personalizadas del evento, indexadas por el
  // id de cada pregunta. Para campos de imagen guardamos por ahora solo
  // el nombre del archivo elegido — subir el archivo real a un storage
  // (Cloudinary, S3, etc.) es la siguiente extensión natural de este punto.
  const [respuestas, setRespuestas] = useState<Record<string, string>>({});
  const [acepta, setAcepta] = useState(false);
  const [registro, setRegistro] = useState<Registration | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDatosSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setProcesando(true);
    try {
      // Server Action: corre en el servidor y deja la inscripción guardada
      // en la base antes de pasar al pago.
      const res = await createRegistrationAction({
        eventoId: evento.id,
        categoriaId: categoria.id,
        documento: datos.documento,
        telefono: datos.telefono,
        respuestas,
        aceptaPolitica: acepta,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setRegistro(res.data);
      setPaso(1);
      refrescar();
    } catch {
      setError("No pudimos conectar con el servidor. Revisa tu conexión e intenta de nuevo.");
    } finally {
      setProcesando(false);
    }
  }

  async function handlePagar() {
    if (!registro) return;
    setError(null);
    setProcesando(true);
    try {
      const res = await confirmPaymentAction(registro.id);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setRegistro(res.data);
      setPaso(2);
    } catch {
      setError("No pudimos conectar con el servidor. Revisa tu conexión e intenta de nuevo.");
    } finally {
      setProcesando(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6 sm:py-12">
      <h1 className="font-display mb-4 text-2xl font-semibold text-ink">Completa tu inscripción</h1>
      <div className="mb-8 flex items-center justify-between gap-3 rounded-xl border border-line bg-surface p-4 text-sm">
        <div className="min-w-0">
          <p className="truncate font-medium text-ink">{evento.nombre}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-ink-soft">
            <span className="inline-flex items-center gap-1"><CalendarDays className="size-3.5" aria-hidden />{new Date(evento.fecha + "T12:00:00").toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" })}</span>
            <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" aria-hidden />{evento.lugar}</span>
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xs text-ink-soft">{categoria.nombre}</p>
          <p className="font-display font-semibold text-brand-dark">{formatCOP(categoria.tarifa)}</p>
        </div>
      </div>

      <Stepper steps={PASOS} current={paso} />

      {paso === 0 && (
        <form onSubmit={handleDatosSubmit} className="space-y-5">
          <Card>
            <div className="space-y-4">
              <Field label="Nombre completo">
                <TextInput value={datos.nombre} readOnly className="bg-background text-ink-soft" />
              </Field>
              <Field label="Correo">
                <TextInput value={datos.correo} readOnly className="bg-background text-ink-soft" />
              </Field>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Documento">
                  <TextInput
                    required
                    readOnly={documentoBloqueado}
                    className={documentoBloqueado ? "bg-background text-ink-soft" : ""}
                    value={datos.documento}
                    onChange={(e) => setEditados((p) => ({ ...p, documento: e.target.value }))}
                  />
                </Field>
                <Field label="Teléfono">
                  <TextInput
                    required
                    type="tel"
                    value={datos.telefono}
                    onChange={(e) => setEditados((p) => ({ ...p, telefono: e.target.value }))}
                  />
                </Field>
              </div>
              <p className="text-xs text-ink-soft">
                Nombre y correo vienen de tu cuenta; puedes cambiarlos en{" "}
                <a href="/perfil" className="font-medium text-brand-dark">tu perfil</a>.
                {!documentoBloqueado && " El documento, una vez guardado, ya no se puede cambiar."}
              </p>
            </div>
          </Card>

          <GoogleFormFiller
            campos={evento.camposAdicionales}
            respuestas={respuestas}
            onChange={(id, valor) => setRespuestas((prev) => ({ ...prev, [id]: valor }))}
          />

          <AceptarPolitica
            checked={acepta}
            onChange={setAcepta}
            texto="gestionar mi inscripción y compartirlos con el organizador del evento para su realización y el control de ingreso"
          />
          {error && <Alerta>{error}</Alerta>}
          <Button type="submit" className="w-full" loading={procesando}>
            {procesando ? "Guardando..." : <>Continuar al pago <CreditCard className="size-4" aria-hidden /></>}
          </Button>
        </form>
      )}

      {paso === 1 && registro && (
        <Card>
          <div className="mb-5 space-y-2 border-b border-line pb-5 text-sm">
            <div className="flex justify-between">
              <span className="text-ink-soft">Categoría</span>
              <span className="text-ink">{categoria.nombre}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-soft">Participante</span>
              <span className="text-ink">{registro.participante.nombre}</span>
            </div>
            <div className="flex justify-between font-medium">
              <span className="text-ink-soft">Total a pagar</span>
              <span className="font-display text-lg text-brand-dark">{formatCOP(categoria.tarifa)}</span>
            </div>
          </div>
          <p className="mb-4 text-sm text-ink-soft">
            Esta es una pasarela simulada para el cascarón. Al conectar una pasarela real
            (Wompi, PayU o Stripe), esta pantalla abrirá su checkout y el resto del flujo
            queda igual.
          </p>
          {error && <div className="mb-3"><Alerta>{error}</Alerta></div>}
          <Button onClick={handlePagar} className="w-full" loading={procesando}>
            {procesando ? "Procesando pago..." : <><Lock className="size-4" aria-hidden />{`Pagar ${formatCOP(categoria.tarifa)}`}</>}
          </Button>
        </Card>
      )}

      {paso === 2 && registro && (
        <div>
          <p className="mb-4 flex items-center justify-center gap-2 text-sm font-medium text-success">
            <CheckCircle2 className="size-5" aria-hidden /> Pago confirmado. ¡Ya estás inscrito!
          </p>
          <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_18px_40px_-18px_rgba(99,85,255,0.35)]">
            <div className="bg-gradient-to-br from-brand to-accent p-5 text-white">
              <p className="text-xs uppercase tracking-wide text-white/80">{evento.disciplina} · {codigoEvento(evento.numero)}</p>
              <h2 className="font-display mt-1 text-xl font-semibold leading-snug">{evento.nombre}</h2>
              <p className="mt-2 text-sm text-white/90">{categoria.nombre}</p>
            </div>
            <div className="relative flex flex-col items-center px-5 pb-6 pt-8">
              <span className="absolute -left-3 -top-3 size-6 rounded-full bg-background" aria-hidden />
              <span className="absolute -right-3 -top-3 size-6 rounded-full bg-background" aria-hidden />
              <div className="absolute inset-x-6 top-0 border-t-2 border-dashed border-line-strong" aria-hidden />
              <div className="rounded-xl border border-line bg-white p-4">
                <QRCodeSVG value={registro.boletaCodigoQR ?? registro.id} size={176} />
              </div>
              <p className="mt-4 font-medium text-ink">{registro.participante.nombre}</p>
              <p className="font-mono text-xs text-ink-soft">
                {registro.participanteNumero != null ? `Participante ${codigoParticipante(registro.participanteNumero)}` : codigoEvento(evento.numero)}
              </p>
              <p className="mt-4 flex items-start gap-2 text-center text-xs text-ink-soft">
                <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
                Muestra este código el día del evento. Siempre lo encuentras en «Mis inscripciones», donde puedes descargarlo o guardarlo sin conexión.
              </p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Button onClick={() => router.push("/mis-inscripciones")}>Ir a mis inscripciones</Button>
            <Button variant="ghost" onClick={() => router.push("/")}>Volver al inicio</Button>
          </div>
        </div>
      )}
    </div>
  );
}
