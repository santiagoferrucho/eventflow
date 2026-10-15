"use client";

import { TablaCargando } from "@/components/ui/cargando";
import { useEffect, useState } from "react";
import { createOrganizerAction, listOrganizadoresAction, setUserBannedAction, type OrganizadorFila } from "@/lib/actions";
import { Encabezado } from "@/components/kpi";
import { AceptarPolitica, Badge, Button, Card, Field, TextInput } from "@/components/ui";

const COP = (v: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(v);

export default function OrganizadoresAdminPage() {
  const [lista, setLista] = useState<OrganizadorFila[] | null>(null);
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [acepta, setAcepta] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [trabajando, setTrabajando] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let activo = true;
    listOrganizadoresAction().then((l) => activo && setLista(l));
    return () => {
      activo = false;
    };
  }, [version]);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setExito(null);
    setCargando(true);
    try {
      const res = await createOrganizerAction({ nombre, correo, password, aceptaPolitica: acepta });
      if (!res.ok) return setError(res.error);
      setExito(`Cuenta ${res.codigo} creada para ${res.correo}. Entrégale la contraseña temporal: la cambiará en su primer ingreso.`);
      setNombre("");
      setCorreo("");
      setPassword("");
      setAcepta(false);
      setVersion((v) => v + 1);
    } catch {
      setError("No se pudo crear la cuenta. Intenta de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  async function alternar(o: OrganizadorFila) {
    setTrabajando(o.id);
    try {
      const r = await setUserBannedAction(o.id, !o.baneado);
      if (!r.ok) setError(r.error);
      setVersion((v) => v + 1);
    } finally {
      setTrabajando(null);
    }
  }

  return (
    <div className="px-4 py-8 sm:px-8">
      <Encabezado titulo="Organizadores" descripcion="Quién organiza eventos y cuánto movimiento tiene cada uno." />

      <Card className="mb-8">
        <h2 className="font-display mb-1 text-lg font-semibold text-ink">Crear organizador</h2>
        <p className="mb-4 text-sm text-ink-soft">
          Las cuentas de organizador solo se crean aquí. La contraseña es temporal: la persona debe cambiarla al entrar por primera vez.
        </p>
        <form onSubmit={crear} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Nombre"><TextInput required value={nombre} onChange={(e) => setNombre(e.target.value)} /></Field>
          <Field label="Correo"><TextInput type="email" required value={correo} onChange={(e) => setCorreo(e.target.value)} /></Field>
          <Field label="Contraseña temporal"><TextInput required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 8 caracteres" /></Field>
          <div className="sm:col-span-3">
            <div className="mb-3">
              <AceptarPolitica
                checked={acepta}
                onChange={setAcepta}
                texto="registrar a esta persona como organizador; confirmo que me autorizó, y ella misma aceptará la política al entrar por primera vez"
              />
            </div>
            {error && <p className="mb-3 text-sm text-danger">{error}</p>}
            {exito && <p className="mb-3 text-sm text-success">{exito}</p>}
            <Button type="submit" disabled={cargando}>{cargando ? "Creando..." : "Crear organizador"}</Button>
          </div>
        </form>
      </Card>

      {lista === null && <TablaCargando />}
      {lista && (
        <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-background text-left text-xs text-ink-soft">
              <tr>
                <th className="px-4 py-3 font-medium">Organizador</th>
                <th className="px-4 py-3 font-medium">Eventos</th>
                <th className="px-4 py-3 font-medium">Inscritos</th>
                <th className="px-4 py-3 font-medium">Recaudo</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {lista.map((o) => (
                <tr key={o.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink">{o.nombre}</p>
                    <p className="text-xs text-ink-faint">{o.codigo} · {o.correo}</p>
                  </td>
                  <td className="px-4 py-3">{o.eventos}</td>
                  <td className="px-4 py-3">{o.inscritos}</td>
                  <td className="px-4 py-3 font-medium text-ink">{COP(o.recaudo)}</td>
                  <td className="px-4 py-3"><Badge tone={o.baneado ? "danger" : "success"}>{o.baneado ? "Desactivado" : "Activo"}</Badge></td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="outline" className="px-3 py-1.5 text-xs" disabled={trabajando === o.id} onClick={() => alternar(o)}>
                      {o.baneado ? "Reactivar" : "Desactivar"}
                    </Button>
                  </td>
                </tr>
              ))}
              {lista.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-ink-soft">Todavía no hay organizadores.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
