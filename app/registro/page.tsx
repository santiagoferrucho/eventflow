"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Button, Card, Field, TextInput } from "@/components/ui";
import type { UserRole } from "@/lib/types";

export default function RegistroPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [rol, setRol] = useState<UserRole>("participante");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      await register(nombre, correo, password, rol);
      router.push(rol === "organizador" ? "/organizador" : "/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos crear la cuenta.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16 sm:px-6">
      <h1 className="font-display mb-6 text-2xl font-semibold text-ink">Crea tu cuenta</h1>
      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Nombre completo">
            <TextInput required value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </Field>
          <Field label="Correo">
            <TextInput
              type="email"
              required
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              placeholder="tu@correo.com"
            />
          </Field>
          <Field label="Contraseña">
            <TextInput
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
            />
          </Field>
          <Field label="Voy a usar EventFlow como">
            <div className="flex gap-2">
              {(["participante", "organizador"] as const).map((opcion) => (
                <button
                  type="button"
                  key={opcion}
                  onClick={() => setRol(opcion)}
                  className={`flex-1 rounded-md border px-3 py-2.5 text-sm font-medium capitalize transition-colors ${
                    rol === opcion
                      ? "border-brand bg-brand/10 text-brand-dark"
                      : "border-line text-ink-soft hover:bg-background"
                  }`}
                >
                  {opcion}
                </button>
              ))}
            </div>
          </Field>
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" className="w-full" disabled={cargando}>
            {cargando ? "Creando cuenta..." : "Crear cuenta"}
          </Button>
        </form>
      </Card>
      <p className="mt-4 text-sm text-ink-soft">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="font-medium text-brand-dark">
          Inicia sesión
        </Link>
      </p>
    </div>
  );
}
