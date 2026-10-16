"use client";

import { useEffect, useState } from "react";
import { enviarNovedadAction, listNovedadesEventoAction } from "@/lib/actions";
import { Button, Card, Field, TextInput } from "@/components/ui";

type Fila = { id: number; titulo: string; mensaje: string; enviadoEn: string; destinatarios: number; pushEnviados: number };

export function NovedadesPanel({ eventoId }: { eventoId: string }) {
  const [titulo, setTitulo] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [lista, setLista] = useState<Fila[]>([]);
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let activo = true;
    listNovedadesEventoAction(eventoId).then((r) => activo && r.ok && setLista(r.data));
    return () => {
      activo = false;
    };
  }, [eventoId, version]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setAviso(null);
    try {
      const r = await enviarNovedadAction(eventoId, { titulo, mensaje });
      if (!r.ok) return setAviso({ ok: false, texto: r.error });
      setAviso({
        ok: true,
        texto: `Enviada a ${r.data.destinatarios} inscrito${r.data.destinatarios === 1 ? "" : "s"} (${r.data.pushEnviados} con notificación en el dispositivo).`,
      });
      setTitulo("");
      setMensaje("");
      setVersion((v) => v + 1);
    } catch {
      setAviso({ ok: false, texto: "No pudimos enviar la novedad." });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Card className="mb-8">
      <h2 className="font-display mb-1 text-lg font-semibold text-ink">Enviar una novedad</h2>
      <p className="mb-4 text-sm text-ink-soft">
        La ven en «Mis inscripciones» todas las personas con cupo, y les llega como aviso a quienes activaron las notificaciones.
      </p>
      <form onSubmit={enviar} className="space-y-3">
        <Field label="Título">
          <TextInput required maxLength={80} value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Cambio de hora de salida" />
        </Field>
        <Field label="Mensaje">
          <textarea
            required
            maxLength={300}
            rows={2}
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            className="w-full rounded-xl border border-line-strong bg-surface px-3.5 py-2.5 text-ink focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
          />
        </Field>
        {aviso && <p className={`text-sm ${aviso.ok ? "text-success" : "text-danger"}`}>{aviso.texto}</p>}
        <Button type="submit" disabled={enviando}>
          {enviando ? "Enviando..." : "Enviar novedad"}
        </Button>
      </form>
      {lista.length > 0 && (
        <ul className="mt-5 divide-y divide-line border-t border-line text-sm">
          {lista.map((n) => (
            <li key={n.id} className="py-2">
              <p className="font-medium text-ink">{n.titulo}</p>
              <p className="text-ink-soft">{n.mensaje}</p>
              <p className="text-xs text-ink-faint">
                {new Date(n.enviadoEn).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })} · {n.destinatarios} destinatarios
              </p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
