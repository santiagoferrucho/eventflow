-- Tablas de EventFlow (eventos e inscripciones) y numeración.
-- Las tablas de autenticación (user, session, account, verification) las
-- crea Better Auth con `npm run db:setup`, que corre ese paso ANTES que este
-- archivo. Es seguro volver a correrlo: todo es idempotente y volver a
-- correrlo no consume números de los contadores.

-- Un contador propio por serie. Los asigna la base de datos, así que dos
-- personas a la vez nunca reciben el mismo número. No se reutilizan.
CREATE SEQUENCE IF NOT EXISTS seq_participantes;
CREATE SEQUENCE IF NOT EXISTS seq_organizadores;
CREATE SEQUENCE IF NOT EXISTS seq_eventos;

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  organizador_id TEXT NOT NULL,
  nombre TEXT NOT NULL,
  disciplina TEXT NOT NULL,
  fecha TEXT NOT NULL,
  lugar TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'publicado',
  categorias JSONB NOT NULL,
  campos_adicionales JSONB NOT NULL DEFAULT '[]'::jsonb,
  creado_en TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS registrations (
  id TEXT PRIMARY KEY,
  evento_id TEXT NOT NULL REFERENCES events(id),
  categoria_id TEXT NOT NULL,
  user_id TEXT,
  participante JSONB NOT NULL,
  respuestas JSONB NOT NULL DEFAULT '{}'::jsonb,
  precio_pagado INTEGER NOT NULL DEFAULT 0,
  estado_pago TEXT NOT NULL DEFAULT 'pendiente',
  boleta_codigo_qr TEXT,
  check_in_realizado BOOLEAN NOT NULL DEFAULT false,
  creado_en TEXT NOT NULL
);

-- Prueba de la autorización para el tratamiento de datos personales: cada vez
-- que alguien marca la casilla de la política queda una fila. Sin llave
-- foránea a propósito: si se elimina una cuenta, la prueba se conserva.
CREATE TABLE IF NOT EXISTS consentimientos (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT,
  politica_version TEXT NOT NULL,
  formulario TEXT NOT NULL,
  referencia TEXT,
  aceptado_en TEXT NOT NULL,
  ip TEXT,
  user_agent TEXT
);
CREATE INDEX IF NOT EXISTS idx_consentimientos_user ON consentimientos (user_id);

-- Imágenes que los participantes cargan en el formulario de inscripción. Se
-- guardan en la base y solo se sirven con permiso (ver app/api/imagenes).
CREATE TABLE IF NOT EXISTS imagenes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  evento_id TEXT,
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL,
  tamano INTEGER NOT NULL,
  datos BYTEA NOT NULL,
  creado_en TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_imagenes_user ON imagenes (user_id, creado_en);

-- Novedades que el organizador envía a los inscritos de un evento.
CREATE TABLE IF NOT EXISTS novedades (
  id BIGSERIAL PRIMARY KEY,
  evento_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  mensaje TEXT NOT NULL,
  enviado_por TEXT,
  enviado_en TEXT NOT NULL,
  destinatarios INTEGER NOT NULL DEFAULT 0,
  push_enviados INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_novedades_evento ON novedades (evento_id, enviado_en);

-- Suscripciones a notificaciones push del navegador (una por dispositivo).
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  creado_en TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_push_user ON push_subscriptions (user_id);

-- Para bases creadas con versiones anteriores del esquema.
ALTER TABLE events ADD COLUMN IF NOT EXISTS estado TEXT NOT NULL DEFAULT 'publicado';
ALTER TABLE events ADD COLUMN IF NOT EXISTS numero INTEGER;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS precio_pagado INTEGER NOT NULL DEFAULT 0;
-- Ubicación del evento (para «Cómo llegar» y «Eventos cerca de ti») y
-- recomendaciones de hospedaje, comida y transporte que carga el organizador.
ALTER TABLE events ADD COLUMN IF NOT EXISTS latitud DOUBLE PRECISION;
ALTER TABLE events ADD COLUMN IF NOT EXISTS longitud DOUBLE PRECISION;
ALTER TABLE events ADD COLUMN IF NOT EXISTS recomendaciones JSONB NOT NULL DEFAULT '[]'::jsonb;
-- Banner opcional del evento (id de una fila de `imagenes`; se sirve público en /api/banners/[id]).
ALTER TABLE events ADD COLUMN IF NOT EXISTS banner_id TEXT;
-- Cuándo y quién registró el ingreso (check-in) en la puerta.
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS check_in_en TEXT;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS check_in_por TEXT;

-- Numerar los eventos que ya existían, en orden de creación.
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM events WHERE numero IS NULL ORDER BY creado_en, id LOOP
    UPDATE events SET numero = nextval('seq_eventos') WHERE id = r.id;
  END LOOP;
END $$;
ALTER TABLE events ALTER COLUMN numero SET DEFAULT nextval('seq_eventos');
ALTER TABLE events ALTER COLUMN numero SET NOT NULL;

-- Inscripciones antiguas: reconstruir el precio pagado con la tarifa de su categoría.
UPDATE registrations r
SET precio_pagado = COALESCE((
  SELECT (c->>'tarifa')::int
  FROM events e, jsonb_array_elements(e.categorias) c
  WHERE e.id = r.evento_id AND c->>'id' = r.categoria_id
  LIMIT 1
), 0)
WHERE r.precio_pagado = 0;

CREATE UNIQUE INDEX IF NOT EXISTS ux_events_numero ON events (numero);
CREATE INDEX IF NOT EXISTS idx_events_organizador ON events (organizador_id);
CREATE INDEX IF NOT EXISTS idx_events_estado ON events (estado);
CREATE INDEX IF NOT EXISTS idx_registrations_evento ON registrations (evento_id);
CREATE INDEX IF NOT EXISTS idx_registrations_user ON registrations (user_id);
CREATE INDEX IF NOT EXISTS idx_registrations_checkin ON registrations (evento_id, check_in_realizado);
CREATE INDEX IF NOT EXISTS idx_registrations_correo ON registrations ((participante->>'correo'));

-- Numeración de cuentas. Participantes y organizadores tienen cada uno su
-- serie; los administradores no llevan número. El número se asigna al crear la
-- cuenta (por rol) y no cambia al editar el perfil o el correo.
CREATE OR REPLACE FUNCTION asignar_numero_usuario() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.role IS DISTINCT FROM OLD.role THEN
    IF NEW.role = 'participante' THEN
      NEW.numero := nextval('seq_participantes');
    ELSIF NEW.role = 'organizador' THEN
      NEW.numero := nextval('seq_organizadores');
    ELSE
      NEW.numero := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_numero_usuario ON "user";
CREATE TRIGGER trg_numero_usuario
  BEFORE INSERT OR UPDATE OF role ON "user"
  FOR EACH ROW EXECUTE FUNCTION asignar_numero_usuario();

-- Numerar las cuentas que ya existían, en orden de creación.
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM "user" WHERE numero IS NULL AND role = 'participante' ORDER BY "createdAt", id LOOP
    UPDATE "user" SET numero = nextval('seq_participantes') WHERE id = r.id;
  END LOOP;
  FOR r IN SELECT id FROM "user" WHERE numero IS NULL AND role = 'organizador' ORDER BY "createdAt", id LOOP
    UPDATE "user" SET numero = nextval('seq_organizadores') WHERE id = r.id;
  END LOOP;
END $$;

-- Un número no se repite dentro de su serie (la serie la define el rol).
CREATE UNIQUE INDEX IF NOT EXISTS ux_user_serie_numero ON "user" (role, numero) WHERE numero IS NOT NULL;

-- Evento de ejemplo (solo si no existe, para no gastar un número en cada corrida).
INSERT INTO events (
  id, organizador_id, nombre, disciplina, fecha, lugar, descripcion, estado,
  categorias, campos_adicionales, creado_en
)
SELECT
  'evt-demo-1',
  'org-demo',
  'Carrera Atardecer UPB',
  'Running',
  '2026-10-18',
  'Parque de los Niños, Bucaramanga',
  'Carrera nocturna abierta a la comunidad, con recorridos de 5K y 10K y punto de hidratación cada 2 km.',
  'publicado',
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
WHERE NOT EXISTS (SELECT 1 FROM events WHERE id = 'evt-demo-1');
