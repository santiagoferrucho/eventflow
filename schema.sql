-- Esquema de EventFlow para Postgres (Neon).
-- Cómo usarlo: pega este archivo completo en el editor SQL de Neon
-- (console.neon.tech → tu proyecto → SQL Editor) y ejecútalo una vez.
-- Es seguro volver a correrlo: usa IF NOT EXISTS y ON CONFLICT DO NOTHING.

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  organizador_id TEXT NOT NULL,
  nombre TEXT NOT NULL,
  disciplina TEXT NOT NULL,
  fecha TEXT NOT NULL,
  lugar TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  categorias JSONB NOT NULL,
  campos_adicionales JSONB NOT NULL DEFAULT '[]'::jsonb,
  creado_en TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS registrations (
  id TEXT PRIMARY KEY,
  evento_id TEXT NOT NULL REFERENCES events(id),
  categoria_id TEXT NOT NULL,
  participante JSONB NOT NULL,
  respuestas JSONB NOT NULL DEFAULT '{}'::jsonb,
  estado_pago TEXT NOT NULL DEFAULT 'pendiente',
  boleta_codigo_qr TEXT,
  check_in_realizado BOOLEAN NOT NULL DEFAULT false,
  creado_en TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_events_organizador ON events (organizador_id);
CREATE INDEX IF NOT EXISTS idx_registrations_evento ON registrations (evento_id);
CREATE INDEX IF NOT EXISTS idx_registrations_correo ON registrations ((participante->>'correo'));

-- Evento de ejemplo, igual al que trae el modo demo en memoria.
INSERT INTO events (
  id, organizador_id, nombre, disciplina, fecha, lugar, descripcion,
  categorias, campos_adicionales, creado_en
) VALUES (
  'evt-demo-1',
  'org-demo',
  'Carrera Atardecer UPB',
  'Running',
  '2026-10-18',
  'Parque de los Niños, Bucaramanga',
  'Carrera nocturna abierta a la comunidad, con recorridos de 5K y 10K y punto de hidratación cada 2 km.',
  '[
    {"id":"cat-5k","nombre":"5K","cupos":200,"cuposDisponibles":137,"tarifa":45000},
    {"id":"cat-10k","nombre":"10K","cupos":150,"cuposDisponibles":62,"tarifa":60000}
  ]'::jsonb,
  '[
    {"id":"camp-talla","etiqueta":"Talla de camiseta","tipo":"opcion_multiple","requerido":true,"opciones":["XS","S","M","L","XL"]},
    {"id":"camp-grupo","etiqueta":"¿Con quién corres?","descripcion":"Marca todo lo que aplique","tipo":"casillas","requerido":false,"opciones":["Voy solo/a","Con mi club","Con familia o amigos"]},
    {"id":"camp-foto","etiqueta":"Foto para el carné del evento","tipo":"imagen","requerido":false}
  ]'::jsonb,
  now()::text
)
ON CONFLICT (id) DO NOTHING;
