"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { useAuth } from "@/lib/auth-context";
import { createRegistrationAction, confirmPaymentAction } from "@/lib/actions";
import type { EventCategory, Registration, SportEvent } from "@/lib/types";
import { Button, Card, Field, Stepper, TextInput } from "@/components/ui";
import { GoogleFormFiller } from "@/components/google-form-filler";

const PASOS = ["Tus datos", "Pago", "Confirmación"];

function formatCOP(value: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(
    value
  );
}

export function InscripcionFlow({ evento, categoria }: { evento: SportEvent; categoria: EventCategory }) {
  const { user } = useAuth();
  const router = useRouter();
  const [paso, setPaso] = useState(0);
  const [datos, setDatos] = useState({
    nombre: user?.nombre ?? "",
    correo: user?.correo ?? "",
    documento: "",
    telefono: "",
  });
  // Respuestas a las preguntas personalizadas del evento, indexadas por el
  // id de cada pregunta. Para campos de imagen guardamos por ahora solo
  // el nombre del archivo elegido — subir el archivo real a un storage
  // (Cloudinary, S3, etc.) es la siguiente extensión natural de este punto.
  const [respuestas, setRespuestas] = useState<Record<string, string>>({});
  const [registro, setRegistro] = useState<Registration | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDatosSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setProcesando(true);
    try {
      // Server Action: esto corre en el servidor aunque lo llamemos desde
      // este componente cliente, así que la inscripción queda en el mismo
      // lugar donde se confirma el pago después.
      const nuevaInscripcion = await createRegistrationAction({
        eventoId: evento.id,
        categoriaId: categoria.id,
        participante: datos,
        respuestas,
      });
      setRegistro(nuevaInscripcion);
      setPaso(1);
    } catch {
      setError("No pudimos guardar tus datos. Intenta de nuevo.");
    } finally {
      setProcesando(false);
    }
  }

  async function handlePagar() {
    if (!registro) return;
    setError(null);
    setProcesando(true);
    try {
      const confirmado = await confirmPaymentAction(registro.id);
      setRegistro(confirmado);
      setPaso(2);
    } catch {
      setError("El pago no pudo confirmarse. Intenta de nuevo.");
    } finally {
      setProcesando(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6 sm:py-12">
      <p className="mb-1 text-sm text-ink-soft">{evento.nombre} · {categoria.nombre}</p>
      <h1 className="font-display mb-8 text-2xl font-semibold text-ink">Completa tu inscripción</h1>

      <Stepper steps={PASOS} current={paso} />

      {paso === 0 && (
        <form onSubmit={handleDatosSubmit} className="space-y-5">
          <Card>
            <div className="space-y-4">
              <Field label="Nombre completo">
                <TextInput
                  required
                  value={datos.nombre}
                  onChange={(e) => setDatos({ ...datos, nombre: e.target.value })}
                />
              </Field>
              <Field label="Correo">
                <TextInput
                  type="email"
                  required
                  value={datos.correo}
                  onChange={(e) => setDatos({ ...datos, correo: e.target.value })}
                />
              </Field>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Documento">
                  <TextInput
                    required
                    value={datos.documento}
                    onChange={(e) => setDatos({ ...datos, documento: e.target.value })}
                  />
                </Field>
                <Field label="Teléfono">
                  <TextInput
                    required
                    value={datos.telefono}
                    onChange={(e) => setDatos({ ...datos, telefono: e.target.value })}
                  />
                </Field>
              </div>
            </div>
          </Card>

          <GoogleFormFiller
            campos={evento.camposAdicionales}
            respuestas={respuestas}
            onChange={(id, valor) => setRespuestas((prev) => ({ ...prev, [id]: valor }))}
          />

          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" className="w-full" disabled={procesando}>
            {procesando ? "Guardando..." : "Continuar al pago"}
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
          {error && <p className="mb-3 text-sm text-danger">{error}</p>}
          <Button onClick={handlePagar} className="w-full" disabled={procesando}>
            {procesando ? "Procesando pago..." : `Pagar ${formatCOP(categoria.tarifa)}`}
          </Button>
        </Card>
      )}

      {paso === 2 && registro && (
        <Card className="text-center">
          <p className="mb-1 text-sm font-medium text-success">Pago confirmado</p>
          <h2 className="font-display mb-4 text-xl font-semibold text-ink">Tu boleta digital</h2>
          <div className="mb-4 flex justify-center">
            <div className="rounded-xl border border-line bg-white p-4">
              <QRCodeSVG value={registro.boletaCodigoQR ?? registro.id} size={168} />
            </div>
          </div>
          <p className="text-sm text-ink-soft">
            Muestra este código el día del evento para tu ingreso. También la enviamos a{" "}
            {registro.participante.correo}.
          </p>
          <Button variant="ghost" className="mt-6" onClick={() => router.push("/")}>
            Volver al inicio
          </Button>
        </Card>
      )}
    </div>
  );
}
