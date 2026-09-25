# EventFlow

Sistema web para gestión de inscripciones a eventos deportivos: creación
de eventos con formulario configurable, inscripción con pago y boleta
digital de código QR, y paneles para participante, organizador y
administrador.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS.
- Datos: por defecto se guardan en un archivo local
  (`.eventflow-data/mock-db.json`) a través de una capa de repositorio
  (`lib/repo`); en cuanto exista la variable de entorno `DATABASE_URL`,
  la app pasa sola a usar Postgres (pensado para Neon, que es con lo que
  Vercel integra de forma nativa) sin tocar ninguna pantalla.
- Todas las escrituras/lecturas desde componentes de cliente pasan por
  Server Actions (`lib/actions.ts`), nunca por el repositorio directo.

## Cómo correrlo

```bash
npm install
npm run dev
```

Abre `http://localhost:3000`.

## Cuentas de prueba

- Cualquier correo/rol vía `/registro` (participante u organizador).
- Administrador (única cuenta, fija): `/login` con
  `admin@eventflow.com` / `admin123`.

## Datos

Se guardan en `.eventflow-data/mock-db.json` dentro del proyecto
(excluido de git). Bórralo para reiniciar a los datos de ejemplo.

## Base de datos real (Postgres / Neon)

1. Crea una cuenta en [neon.tech](https://neon.tech) (gratis, sin
   tarjeta) y un proyecto nuevo.
2. Copia el **connection string** que te da (empieza con
   `postgresql://...`).
3. En el **SQL Editor** de Neon, pega y corre el contenido completo del
   archivo `schema.sql` de este repositorio — crea las tablas y precarga
   el evento de ejemplo.
4. Para probarlo en tu PC: crea un archivo `.env.local` con
   ```
   DATABASE_URL=postgresql://... (el connection string de Neon)
   ```
   y corre `npm run dev` de nuevo. La app detecta la variable y empieza
   a usar Postgres en vez del archivo local.

## Desplegar en Vercel

1. En [vercel.com](https://vercel.com), inicia sesión con GitHub y da
   clic en **Add New → Project**.
2. Elige el repositorio `eventflow`. Vercel detecta que es Next.js y
   configura el build automáticamente — no hay que tocar nada.
3. Antes de darle "Deploy", agrega la variable de entorno
   `DATABASE_URL` con el connection string de Neon (paso anterior).
4. Deploy. Cada `git push` a `main` vuelve a desplegar solo.

Sin disco persistente, sin servicio que "duerma": las funciones de
Vercel son efímeras por petición, pero como los datos viven en Postgres
(no en un archivo local), eso deja de ser un problema.
