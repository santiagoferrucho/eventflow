"use client";

import { useState } from "react";
import Link from "next/link";
import { actualizarPerfilAction, cambiarCorreoAction } from "@/lib/actions";
import { authClient } from "@/lib/auth-client";
import { useAuth } from "@/lib/auth-context";
import { codigoUsuario } from "@/lib/codigos";
import type { AppUser } from "@/lib/types";
import { AceptarPolitica, Badge, Button, Card, Field, TextInput } from "@/components/ui";

export default function PerfilPage() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) {
    return <div className="mx-auto max-w-lg px-4 py-16 text-center text-ink-soft">Inicia sesión para ver tu perfil.</div>;
  }
  // Los formularios nacen ya con los datos del usuario, sin efectos de sincronización.
  return <FormularioPerfil user={user} />;
}

function FormularioPerfil({ user }: { user: AppUser }) {
  const { refrescar } = useAuth();

  // Datos personales
  const [nombre, setNombre] = useState(user.nombre);
  const [telefono, setTelefono] = useState(user.telefono ?? "");
  const [documento, setDocumento] = useState(user.documento ?? "");
  const [guardando, setGuardando] = useState(false);
  const [errorPerfil, setErrorPerfil] = useState<string | null>(null);
  const [exitoPerfil, setExitoPerfil] = useState(false);
  const [aceptaPerfil, setAceptaPerfil] = useState(false);
  const documentoBloqueado = Boolean(user.documento);

  // Correo
  const [nuevoCorreo, setNuevoCorreo] = useState("");
  const [passCorreo, setPassCorreo] = useState("");
  const [cambiandoCorreo, setCambiandoCorreo] = useState(false);
  const [errorCorreo, setErrorCorreo] = useState<string | null>(null);
  const [exitoCorreo, setExitoCorreo] = useState(false);
  const [aceptaCorreo, setAceptaCorreo] = useState(false);

  // Contraseña
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [cambiando, setCambiando] = useState(false);
  const [errorPass, setErrorPass] = useState<string | null>(null);
  const [exitoPass, setExitoPass] = useState(false);

  async function guardarPerfil(e: React.FormEvent) {
    e.preventDefault();
    setErrorPerfil(null);
    setExitoPerfil(false);
    setGuardando(true);
    try {
      const res = await actualizarPerfilAction({ nombre, telefono, documento, aceptaPolitica: aceptaPerfil, formulario: "perfil" });
      if (!res.ok) return setErrorPerfil(res.error);
      await refrescar();
      setAceptaPerfil(false);
      setExitoPerfil(true);
    } catch {
      setErrorPerfil("No pudimos guardar tus datos. Intenta de nuevo.");
    } finally {
      setGuardando(false);
    }
  }

  async function cambiarCorreo(e: React.FormEvent) {
    e.preventDefault();
    setErrorCorreo(null);
    setExitoCorreo(false);
    setCambiandoCorreo(true);
    try {
      const res = await cambiarCorreoAction({ nuevoCorreo, password: passCorreo, aceptaPolitica: aceptaCorreo });
      if (!res.ok) return setErrorCorreo(res.error);
      setNuevoCorreo("");
      setPassCorreo("");
      setAceptaCorreo(false);
      await refrescar();
      setExitoCorreo(true);
    } catch {
      setErrorCorreo("No pudimos cambiar el correo. Intenta de nuevo.");
    } finally {
      setCambiandoCorreo(false);
    }
  }

  async function cambiarPassword(e: React.FormEvent) {
    e.preventDefault();
    setErrorPass(null);
    setExitoPass(false);
    if (nueva !== confirmar) return setErrorPass("Las contraseñas nuevas no coinciden.");
    if (nueva === actual) return setErrorPass("La contraseña nueva debe ser distinta a la actual.");
    setCambiando(true);
    try {
      const { error } = await authClient.changePassword({
        currentPassword: actual,
        newPassword: nueva,
        revokeOtherSessions: true,
      });
      if (error) {
        return setErrorPass(
          /invalid/i.test(error.message ?? "") ? "La contraseña actual no es correcta." : "No pudimos cambiar la contraseña."
        );
      }
      setActual("");
      setNueva("");
      setConfirmar("");
      setExitoPass(true);
    } catch {
      setErrorPass("No pudimos cambiar la contraseña. Intenta de nuevo.");
    } finally {
      setCambiando(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold text-ink">Mi perfil</h1>
        <div className="flex items-center gap-2">
          {codigoUsuario(user.rol, user.numero) && (
            <span className="font-mono text-sm text-ink-soft" title="Tu código no cambia nunca">
              {codigoUsuario(user.rol, user.numero)}
            </span>
          )}
          <Badge>{user.rol}</Badge>
        </div>
      </div>

      <Card className="mb-6">
        <h2 className="font-display mb-1 text-lg font-semibold text-ink">Datos personales</h2>
        <p className="mb-5 text-sm text-ink-soft">
          Tu teléfono y documento se rellenan solos cuando te inscribes a un evento.
        </p>
        <form onSubmit={guardarPerfil} className="space-y-4">
          <Field label="Nombre completo">
            <TextInput required autoComplete="name" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Teléfono (opcional)">
              <TextInput
                type="tel"
                autoComplete="tel"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="3001234567"
              />
            </Field>
            <Field label={documentoBloqueado ? "Documento" : "Documento (opcional)"}>
              <TextInput
                value={documento}
                disabled={documentoBloqueado}
                onChange={(e) => setDocumento(e.target.value)}
                placeholder="1098765432"
                className={documentoBloqueado ? "bg-background text-ink-soft" : ""}
              />
              <span className="mt-1.5 block text-xs text-ink-soft">
                {documentoBloqueado
                  ? "El documento no se puede cambiar. Si necesitas corregirlo, contacta al administrador."
                  : "Solo puedes registrarlo una vez; después queda bloqueado."}
              </span>
            </Field>
          </div>
          <AceptarPolitica
            checked={aceptaPerfil}
            onChange={setAceptaPerfil}
            texto="actualizar los datos de mi perfil"
          />
          {errorPerfil && <p className="text-sm text-danger">{errorPerfil}</p>}
          {exitoPerfil && <p className="text-sm text-success">Cambios guardados.</p>}
          <Button type="submit" disabled={guardando}>
            {guardando ? "Guardando..." : "Guardar cambios"}
          </Button>
        </form>
      </Card>

      <Card className="mb-6">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <h2 className="font-display text-lg font-semibold text-ink">Correo</h2>
          {user.correoVerificado ? <Badge tone="success">Verificado</Badge> : <Badge tone="gold">Sin verificar</Badge>}
        </div>
        <p className="mb-5 text-sm text-ink-soft">
          Con este correo entras a EventFlow: <span className="font-medium text-ink">{user.correo}</span>
        </p>
        <form onSubmit={cambiarCorreo} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Correo nuevo">
              <TextInput type="email" required autoComplete="email" value={nuevoCorreo} onChange={(e) => setNuevoCorreo(e.target.value)} placeholder="nuevo@correo.com" />
            </Field>
            <Field label="Tu contraseña actual">
              <TextInput type="password" required autoComplete="current-password" value={passCorreo} onChange={(e) => setPassCorreo(e.target.value)} />
            </Field>
          </div>
          <p className="text-xs text-ink-soft">
            Tus inscripciones hechas con esta cuenta se conservan. Como todavía no verificamos correos, el nuevo
            queda como sin verificar, y las inscripciones que hiciste sin iniciar sesión no se vinculan por correo.
          </p>
          <AceptarPolitica
            checked={aceptaCorreo}
            onChange={setAceptaCorreo}
            texto="actualizar el correo de mi cuenta"
          />
          {errorCorreo && <p className="text-sm text-danger">{errorCorreo}</p>}
          {exitoCorreo && <p className="text-sm text-success">Correo actualizado. Úsalo la próxima vez que inicies sesión.</p>}
          <Button type="submit" variant="outline" disabled={cambiandoCorreo}>
            {cambiandoCorreo ? "Cambiando..." : "Cambiar correo"}
          </Button>
        </form>
      </Card>

      <Card className="mb-6">
        <h2 className="font-display mb-1 text-lg font-semibold text-ink">Cambiar contraseña</h2>
        <p className="mb-5 text-sm text-ink-soft">Al cambiarla se cierra tu sesión en los demás dispositivos.</p>
        <form onSubmit={cambiarPassword} className="space-y-4">
          <Field label="Contraseña actual">
            <TextInput type="password" required autoComplete="current-password" value={actual} onChange={(e) => setActual(e.target.value)} />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Contraseña nueva">
              <TextInput type="password" required minLength={8} autoComplete="new-password" value={nueva} onChange={(e) => setNueva(e.target.value)} placeholder="Mínimo 8 caracteres" />
            </Field>
            <Field label="Repite la contraseña nueva">
              <TextInput type="password" required minLength={8} autoComplete="new-password" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} />
            </Field>
          </div>
          {errorPass && <p className="text-sm text-danger">{errorPass}</p>}
          {exitoPass && <p className="text-sm text-success">Contraseña actualizada.</p>}
          <Button type="submit" variant="outline" disabled={cambiando}>
            {cambiando ? "Cambiando..." : "Cambiar contraseña"}
          </Button>
        </form>
      </Card>

      {user.rol === "participante" && (
        <Link href="/mis-inscripciones" className="text-sm font-medium text-brand-dark">
          Ver mis inscripciones
        </Link>
      )}
    </div>
  );
}
