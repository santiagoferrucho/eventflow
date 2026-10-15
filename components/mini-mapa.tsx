// Mapa pequeño de OpenStreetMap hecho con teselas (imágenes de 256 px), sin
// librerías: se calcula qué teselas cubren el recuadro y se centra en el punto.

const TESELA = 256;

function pixelMundo(lat: number, lng: number, z: number) {
  const n = TESELA * 2 ** z;
  const x = ((lng + 180) / 360) * n;
  const rad = (lat * Math.PI) / 180;
  const y = ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n;
  return { x, y };
}

export function MiniMapa({
  latitud,
  longitud,
  zoom = 15,
  alto = 112,
  etiqueta,
  className = "",
}: {
  latitud: number;
  longitud: number;
  zoom?: number;
  alto?: number;
  etiqueta?: string;
  className?: string;
}) {
  const lat = Math.max(-85, Math.min(85, latitud));
  const { x, y } = pixelMundo(lat, longitud, zoom);
  const maxTesela = 2 ** zoom;
  // El recuadro es de ancho flexible: se cubren ±320 px alrededor del punto.
  const mitadX = 320;
  const mitadY = alto / 2;
  const x0 = Math.floor((x - mitadX) / TESELA);
  const x1 = Math.floor((x + mitadX) / TESELA);
  const y0 = Math.max(0, Math.floor((y - mitadY) / TESELA));
  const y1 = Math.min(maxTesela - 1, Math.floor((y + mitadY) / TESELA));

  const teselas: { key: string; src: string; dx: number; dy: number }[] = [];
  for (let tx = x0; tx <= x1; tx++) {
    for (let ty = y0; ty <= y1; ty++) {
      const txMod = ((tx % maxTesela) + maxTesela) % maxTesela;
      teselas.push({
        key: `${tx}-${ty}`,
        src: `https://tile.openstreetmap.org/${zoom}/${txMod}/${ty}.png`,
        dx: tx * TESELA - x,
        dy: ty * TESELA - y,
      });
    }
  }

  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-line bg-[#e8ecf3] ${className}`}
      style={{ height: alto }}
      role="img"
      aria-label={etiqueta ? `Mapa: ${etiqueta}` : "Mapa de ubicación"}
    >
      {teselas.map((t) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={t.key}
          src={t.src}
          alt=""
          width={TESELA}
          height={TESELA}
          loading="lazy"
          draggable={false}
          className="pointer-events-none absolute max-w-none select-none"
          style={{ left: `calc(50% + ${t.dx}px)`, top: `calc(50% + ${t.dy}px)` }}
        />
      ))}
      {/* Marcador en el centro */}
      <svg className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full drop-shadow" width="26" height="34" viewBox="0 0 26 34" aria-hidden>
        <path d="M13 1C6.4 1 1 6.3 1 12.8 1 21.5 13 33 13 33s12-11.5 12-20.2C25 6.3 19.6 1 13 1z" fill="#6355ff" stroke="#fff" strokeWidth="2" />
        <circle cx="13" cy="13" r="4.5" fill="#fff" />
      </svg>
      <span className="pointer-events-none absolute bottom-0 right-0 rounded-tl-md bg-white/80 px-1.5 py-0.5 text-[9px] text-ink-soft">
        © OpenStreetMap
      </span>
    </div>
  );
}
