"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { aceptarPoliticaPrimerIngresoAction, completarCambioPasswordAction } from "@/lib/actions";
import { useAuth } from "@/lib/auth-context";
import { AceptarPolitica, Button, Card, Field, TextInput } from "@/components/ui";

export default function CambiarPasswordPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [acepta, setAcepta] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (nueva !== confirmar) return setError("Las contraseñas nuevas no coinciden.");
    if (nueva === actual) return setError("La contraseña nueva debe ser distinta a la temporal.");
    setCargando(true);
    try {
      // Primero la autorización: queda registrada con tu propia cuenta.
      const aceptada = await aceptarPoliticaPrimerIngresoAction(acepta);
      if (!aceptada.ok) {
        setError(aceptada.error);
        return;
      }
      const { error: err } = await authClient.changePassword({
        currentPassword: actual,
        newPassword: nueva,
        revokeOtherSessions: true,
      });
      if (err) {
        setError(
          /invalid/i.test(err.message ?? "") ? "La contraseña actual no es correcta." : "No pudimos cambiar la contraseña."
        );
        return;
      }
      await completarCambioPasswordAction();
      router.push(user?.rol === "administrador" ? "/admin" : user?.rol === "organizador" ? "/organizador" : "/");
      router.refresh();
    } catch {
      setError("No pudimos cambiar la contraseña. Intenta de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  if (loading) return null;
  if (!user) {
    return <div className="mx-auto max-w-sm px-4 py-16 text-center text-ink-soft">Inicia sesión para continuar.</div>;
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16 sm:px-6">
      <h1 className="font-display mb-2 text-2xl font-semibold text-ink">Cambia tu contraseña</h1>
      <p className="mb-6 text-sm text-ink-soft">
        Tu cuenta se creó con una contraseña temporal. Elige una propia para poder continuar.
      </p>
      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Contraseña temporal">
            <TextInput type="password" required autoComplete="current-password" value={actual} onChange={(e) => setActual(e.target.value)} />
          </Field>
          <Field label="Contraseña nueva">
            <TextInput type="password" required minLength={8} autoComplete="new-password" value={nueva} onChange={(e) => setNueva(e.target.value)} placeholder="Mínimo 8 caracteres" />
          </Field>
          <Field label="Repite la contraseña nueva">
            <TextInput type="password" required minLength={8} autoComplete="new-password" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} />
          </Field>
          <AceptarPolitica
            checked={acepta}
            onChange={setAcepta}
            texto="administrar mi cuenta y los eventos que gestione en EventFlow"
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" className="w-full" disabled={cargando}>
            {cargando ? "Guardando..." : "Guardar contraseña"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
