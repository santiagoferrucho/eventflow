"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Button, Card, Field, TextInput } from "@/components/ui";

export function LoginForm({ next }: { next: string | null }) {
  const { login } = useAuth();
  const router = useRouter();
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      const user = await login(correo, password);
      const destino = user.debeCambiarPassword
        ? "/cambiar-password"
        : next ??
          (user.rol === "administrador" ? "/admin" : user.rol === "organizador" ? "/organizador" : "/");
      router.push(destino);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos iniciar sesión.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16 sm:px-6">
      <h1 className="font-display mb-2 text-2xl font-semibold text-ink">Inicia sesión</h1>
      {next && <p className="mb-6 text-sm text-ink-soft">Necesitas una cuenta para continuar con tu inscripción.</p>}
      {!next && <div className="mb-6" />}
      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
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
          <Field label="Contraseña">
            <TextInput
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </Field>
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" className="w-full" disabled={cargando}>
            {cargando ? "Ingresando..." : "Ingresar"}
          </Button>
        </form>
      </Card>
      <p className="mt-4 text-sm text-ink-soft">
        ¿No tienes cuenta?{" "}
        <Link href={next ? `/registro?next=${encodeURIComponent(next)}` : "/registro"} className="font-medium text-brand-dark">
          Crear una cuenta
        </Link>
      </p>
    </div>
  );
}
