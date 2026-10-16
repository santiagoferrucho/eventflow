"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { actualizarPerfilAction } from "@/lib/actions";
import { validarDocumento, validarNombre, validarTelefono } from "@/lib/validacion";
import { AceptarPolitica, Button, Card, Field, TextInput } from "@/components/ui";

// El registro público crea siempre cuentas de participante. Las cuentas de
// organizador las crea el administrador.
export function RegistroForm({ next }: { next: string | null }) {
  const { register } = useAuth();
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [documento, setDocumento] = useState("");
  const [telefono, setTelefono] = useState("");
  const [password, setPassword] = useState("");
  const [acepta, setAcepta] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    // Se validan los datos del perfil ANTES de crear la cuenta, para no
    // dejar una cuenta a medias si alguno está mal escrito.
    if (!acepta) {
      setError("Debes aceptar la política de tratamiento de datos personales para crear tu cuenta.");
      return;
    }
    const invalido = validarNombre(nombre) ?? validarDocumento(documento, true) ?? validarTelefono(telefono, true);
    if (invalido) {
      setError(invalido);
      return;
    }
    setCargando(true);
    try {
      await register(nombre, correo, password, acepta);
      // Documento y teléfono quedan guardados en el perfil desde el primer
      // día; así las inscripciones los traen ya llenos.
      const perfil = await actualizarPerfilAction({ nombre, telefono, documento, aceptaPolitica: acepta, formulario: "registro" });
      if (!perfil.ok) {
        router.push("/perfil");
        router.refresh();
        return;
      }
      router.push(next ?? "/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos crear la cuenta.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16 sm:px-6">
      <h1 className="font-display mb-2 text-2xl font-semibold text-ink">Crea tu cuenta</h1>
      {next && <p className="mb-6 text-sm text-ink-soft">Con tu cuenta quedan guardadas todas tus inscripciones.</p>}
      {!next && <div className="mb-6" />}
      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Nombre completo">
            <TextInput required autoComplete="name" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </Field>
          <Field label="Correo">
            <TextInput
              type="email"
              required
              autoComplete="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              placeholder="tu@correo.com"
            />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Documento">
              <TextInput
                required
                autoComplete="off"
                value={documento}
                onChange={(e) => setDocumento(e.target.value)}
                placeholder="Cédula o pasaporte"
              />
            </Field>
            <Field label="Teléfono">
              <TextInput
                required
                type="tel"
                autoComplete="tel"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="3001234567"
              />
            </Field>
          </div>
          <p className="-mt-1 text-xs text-ink-soft">
            El documento no se puede cambiar después. Revísalo bien: es el que verán en la puerta del evento.
          </p>
          <Field label="Contraseña">
            <TextInput
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
            />
          </Field>
          <AceptarPolitica
            checked={acepta}
            onChange={setAcepta}
            texto="crear mi cuenta, gestionar mis inscripciones y recibir mis tiquetes"
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" className="w-full" disabled={cargando}>
            {cargando ? "Creando cuenta..." : "Crear cuenta"}
          </Button>
        </form>
      </Card>
      <p className="mt-4 text-sm text-ink-soft">
        ¿Ya tienes cuenta?{" "}
        <Link href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"} className="font-medium text-brand-dark">
          Inicia sesión
        </Link>
      </p>
    </div>
  );
}
