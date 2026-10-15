"use client";

import { TablaCargando } from "@/components/ui/cargando";
import { useEffect, useState } from "react";
import {
  corregirDocumentoAction,
  listUsersAction,
  setUserBannedAction,
  type UsuarioFila,
} from "@/lib/actions";
import { toast } from "sonner";
import { Badge, Button, TextInput } from "@/components/ui";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";

function tonoRol(rol: string) {
  return rol === "administrador" ? "danger" : rol === "organizador" ? "brand" : "gold";
}

export default function UsuariosAdminPage() {
  const [usuarios, setUsuarios] = useState<UsuarioFila[] | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [filtroRol, setFiltroRol] = useState<"todos" | "participante" | "organizador" | "administrador">("todos");
  const [editandoDoc, setEditandoDoc] = useState<{ id: string; valor: string } | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [aConfirmar, setAConfirmar] = useState<UsuarioFila | null>(null);
  const [trabajando, setTrabajando] = useState<string | null>(null);

  async function alternarBloqueo(u: UsuarioFila) {
    setTrabajando(u.id);
    setAviso(null);
    try {
      const res = await setUserBannedAction(u.id, !u.baneado);
      if (!res.ok) {
        toast.error(res.error);
        return setAviso(res.error);
      }
      toast.success(u.baneado ? "Cuenta reactivada." : "Cuenta desactivada.");
      await recargar();
    } catch {
      setAviso("No pudimos conectar con el servidor. Intenta de nuevo.");
    } finally {
      setTrabajando(null);
    }
  }

  async function guardarDocumento() {
    if (!editandoDoc) return;
    setTrabajando(editandoDoc.id);
    setAviso(null);
    try {
      const res = await corregirDocumentoAction(editandoDoc.id, editandoDoc.valor);
      if (!res.ok) {
        toast.error(res.error);
        return setAviso(res.error);
      }
      toast.success("Documento corregido.");
      setEditandoDoc(null);
      await recargar();
    } catch {
      setAviso("No pudimos conectar con el servidor. Intenta de nuevo.");
    } finally {
      setTrabajando(null);
    }
  }

  const visibles = (usuarios ?? []).filter((u) => {
    if (filtroRol !== "todos" && u.rol !== filtroRol) return false;
    const q = busqueda.trim().toLowerCase();
    if (!q) return true;
    return [u.nombre, u.correo, u.codigo ?? "", u.documento ?? "", u.telefono ?? ""].join(" ").toLowerCase().includes(q);
  });

  const recargar = () => listUsersAction().then(setUsuarios);
  useEffect(() => {
    recargar();
  }, []);

  return (
    <div className="px-4 py-8 sm:px-8">
      <h1 className="font-display mb-1 text-2xl font-semibold text-ink">Usuarios</h1>
      <p className="mb-7 text-sm text-ink-soft">Todas las cuentas. Para crear un organizador, ve a «Organizadores».</p>


      {usuarios === null && <TablaCargando />}
      {usuarios && (
        <>
          <div className="mb-3 flex flex-wrap gap-2">
            <div className="min-w-0 flex-1 sm:max-w-xs">
              <TextInput
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre, correo, documento o código"
                aria-label="Buscar usuarios"
              />
            </div>
            <div className="flex gap-1 rounded-xl bg-line/60 p-1">
              {(["todos", "participante", "organizador", "administrador"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setFiltroRol(r)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    filtroRol === r ? "bg-surface text-ink shadow-sm" : "text-ink-soft hover:text-ink"
                  }`}
                >
                  {r === "todos" ? "Todos" : r === "participante" ? "Participantes" : r === "organizador" ? "Organizadores" : "Admins"}
                </button>
              ))}
            </div>
          </div>
          {aviso && <p className="sr-only" role="alert">{aviso}</p>}
          <Dialog open={aConfirmar !== null} onOpenChange={(o) => !o && setAConfirmar(null)}>
            <DialogContent>
              <DialogTitle>¿Desactivar esta cuenta?</DialogTitle>
              <DialogDescription>
                {aConfirmar?.nombre} ({aConfirmar?.correo}) no podrá iniciar sesión hasta que la reactives. Sus inscripciones no se borran.
              </DialogDescription>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAConfirmar(null)}>Cancelar</Button>
                <Button
                  variant="danger"
                  onClick={() => {
                    const u = aConfirmar;
                    setAConfirmar(null);
                    if (u) alternarBloqueo(u);
                  }}
                >
                  Desactivar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-background text-left text-ink-soft">
                <tr>
                  <th className="px-4 py-2 font-medium">Código</th>
                  <th className="px-4 py-2 font-medium">Persona</th>
                  <th className="px-4 py-2 font-medium">Documento</th>
                  <th className="px-4 py-2 font-medium">Rol</th>
                  <th className="px-4 py-2 font-medium">Inscrip.</th>
                  <th className="px-4 py-2 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((u) => (
                  <tr key={u.id} className="border-t border-line align-top">
                    <td className="px-4 py-2 font-mono text-xs text-ink-soft">{u.codigo ?? "—"}</td>
                    <td className="px-4 py-2">
                      <p className="text-ink">
                        {u.nombre} {u.baneado && <Badge tone="danger">Desactivada</Badge>}
                      </p>
                      <p className="text-xs text-ink-soft">{u.correo}</p>
                      {u.telefono && <p className="text-xs text-ink-soft">{u.telefono}</p>}
                    </td>
                    <td className="px-4 py-2">
                      {editandoDoc?.id === u.id ? (
                        <div className="flex gap-1">
                          <TextInput
                            className="w-32 px-2 py-1 text-sm"
                            value={editandoDoc.valor}
                            onChange={(e) => setEditandoDoc({ id: u.id, valor: e.target.value })}
                            aria-label="Nuevo documento"
                          />
                          <Button className="px-3 py-1 text-xs" disabled={trabajando === u.id} onClick={guardarDocumento}>
                            Guardar
                          </Button>
                          <Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => setEditandoDoc(null)}>
                            Cancelar
                          </Button>
                        </div>
                      ) : (
                        <span className="text-ink-soft">{u.documento ?? "—"}</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <Badge tone={tonoRol(u.rol)}>{u.rol}</Badge>
                    </td>
                    <td className="px-4 py-2 text-ink-soft">{u.inscripciones}</td>
                    <td className="px-4 py-2">
                      <div className="flex flex-wrap gap-1">
                        {u.documento && editandoDoc?.id !== u.id && (
                          <Button
                            variant="ghost"
                            className="px-2.5 py-1 text-xs"
                            onClick={() => setEditandoDoc({ id: u.id, valor: u.documento ?? "" })}
                          >
                            Corregir documento
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          className="px-2.5 py-1 text-xs"
                          disabled={trabajando === u.id}
                          onClick={() => (u.baneado ? alternarBloqueo(u) : setAConfirmar(u))}
                        >
                          {u.baneado ? "Reactivar" : "Desactivar"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {visibles.length === 0 && (
                  <tr>
                    <td className="px-4 py-3 text-ink-soft" colSpan={6}>
                      Ningún usuario coincide.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
