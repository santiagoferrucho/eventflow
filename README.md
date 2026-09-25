# EventFlow

Sistema web para gestión de inscripciones a eventos deportivos: creación
de eventos con formulario configurable, inscripción con pago y boleta
digital de código QR, y paneles para participante, organizador y
administrador.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS.
- Datos guardados en un archivo local (`.eventflow-data/mock-db.json`),
  a través de una capa de repositorio (`lib/repo`) pensada para poder
  reemplazarse por una base de datos real sin tocar ninguna pantalla.
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

## Desplegar en Render

El repositorio ya incluye `render.yaml`, así que Render puede
configurarse solo:

1. En [render.com](https://render.com), crea cuenta/inicia sesión y da
   clic en **New → Blueprint**.
2. Conecta tu cuenta de GitHub y elige el repositorio `eventflow`.
   Render detecta `render.yaml` automáticamente y propone el servicio
   web con el build/start command correctos.
3. Confirma y espera el primer despliegue (unos minutos). Te da una URL
   tipo `https://eventflow.onrender.com`.
4. Cada `git push` a `main` vuelve a desplegar solo.

Si prefieres configurarlo a mano en vez de con el blueprint: **New → Web
Service**, conecta el repo, y usa:
- Build Command: `npm install && npm run build`
- Start Command: `npm run start`

**Nota sobre los datos en producción:** el plan gratuito de Render no
incluye disco persistente, así que `.eventflow-data/mock-db.json` se
reinicia con cada redeploy (no en cada visita — el servicio se mantiene
corriendo entre peticiones, a diferencia de un hosting serverless). Para
datos que persistan de verdad entre despliegues, el siguiente paso es
conectar una base de datos real (Render ofrece PostgreSQL gestionado)
implementando una nueva versión de `EventRepository` en `lib/repo/`.
