// Gráficas sencillas en SVG/CSS (sin librerías externas).

function corto(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(".0", "")}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(n);
}

export function BarrasPorDia({
  datos,
  color = "var(--brand)",
  formato = (n: number) => String(n),
}: {
  datos: { etiqueta: string; valor: number }[];
  color?: string;
  formato?: (n: number) => string;
}) {
  const max = Math.max(1, ...datos.map((d) => d.valor));
  const W = 560;
  const H = 160;
  const base = 130;
  const ancho = W / datos.length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-44 w-full" role="img" aria-label="Gráfica de barras por día">
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <line key={f} x1="0" x2={W} y1={base - f * 110} y2={base - f * 110} stroke="var(--line)" strokeDasharray="3 4" />
      ))}
      {datos.map((d, i) => {
        const h = (d.valor / max) * 110;
        const x = i * ancho + ancho * 0.18;
        return (
          <g key={i}>
            <title>{`${d.etiqueta}: ${formato(d.valor)}`}</title>
            <rect x={x} y={base - h} width={ancho * 0.64} height={Math.max(h, d.valor > 0 ? 2 : 0)} rx="4" fill={color} opacity={d.valor ? 1 : 0.15} />
            {d.valor > 0 && (
              <text x={x + ancho * 0.32} y={base - h - 5} textAnchor="middle" fontSize="13" fill="var(--ink-soft)">
                {corto(d.valor)}
              </text>
            )}
            {(i % 2 === 0 || datos.length < 8) && (
              <text x={x + ancho * 0.32} y={base + 16} textAnchor="middle" fontSize="13" fill="var(--ink-faint)">
                {d.etiqueta}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export function BarrasHorizontales({ datos }: { datos: { etiqueta: string; valor: number; detalle?: string }[] }) {
  const max = Math.max(1, ...datos.map((d) => d.valor));
  return (
    <ul className="space-y-3">
      {datos.map((d, i) => (
        <li key={i}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate font-medium text-ink">{d.etiqueta}</span>
            <span className="shrink-0 text-ink-soft">{d.detalle ?? d.valor}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-line">
            <div className="h-full rounded-full bg-gradient-to-r from-brand to-accent" style={{ width: `${(d.valor / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

// Reparto por categorías en una sola barra segmentada con leyenda.
export function BarraSegmentada({ datos }: { datos: { etiqueta: string; valor: number; color: string }[] }) {
  const total = datos.reduce((s, d) => s + d.valor, 0) || 1;
  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-full bg-line">
        {datos.map((d) => (
          <div key={d.etiqueta} style={{ width: `${(d.valor / total) * 100}%`, background: d.color }} title={`${d.etiqueta}: ${d.valor}`} />
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
        {datos.map((d) => (
          <li key={d.etiqueta} className="flex items-center gap-2 text-ink-soft">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
            {d.etiqueta} <span className="font-medium text-ink">{d.valor}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
