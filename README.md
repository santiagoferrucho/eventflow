# EventFlow

Plataforma de inscripciones a eventos deportivos: formulario configurable,
inscripción con pago y boleta con código QR, y paneles por rol
(participante, organizador y administrador).

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS.
- Postgres (Neon) con `pg`.
- Autenticación con [Better Auth](https://better-auth.com): correo y
  contraseña, sesión en cookie, plugin de administración.
- Los componentes de cliente leen y escriben datos solo a través de
  Server Actions (`lib/actions.ts`), y cada acción valida la sesión y el
  rol en el servidor.

## Roles

| Rol | Cómo se obtiene | Qué puede hacer |
|---|---|---|
| Participante | Se registra en `/registro` | Inscribirse (con sesión), ver sus inscripciones y editar su perfil |
| Organizador | Lo crea el administrador | Panel de sus eventos (cifras, inscritos, estado, CSV) y escáner de ingreso |
| Administrador | Se siembra con `npm run db:setup` | Panel de toda la plataforma, usuarios, inscripciones, estado de cualquier evento y escáner |

Todos pueden editar su perfil en `/perfil`: nombre, teléfono, correo (pide la contraseña actual y queda sin verificar) y contraseña. El documento se registra una sola vez y después queda bloqueado; solo el administrador podrá corregirlo. Un organizador solo ve y gestiona sus eventos. Un organizador creado por el
administrador entra con una contraseña temporal y debe cambiarla en su
primer ingreso.

## Códigos

Cada persona y cada evento tiene un código oficial que no cambia, no se
reutiliza y no se puede editar. Lo asigna la base de datos (un contador
propio por serie), no depende del correo ni de ningún dato editable.

| Serie | Formato | Ejemplo |
|---|---|---|
| Participantes | solo números | `000112345` |
| Organizadores | prefijo `O` | `O000000007` |
| Eventos | prefijo `E` | `E000000045` |

Los administradores no llevan código. Los contadores empiezan en 1 y
pueden tener saltos (un registro que falla gasta su número), pero nunca
repeticiones. El formato está en `lib/codigos.ts`.

Toda inscripción exige iniciar sesión, así que queda ligada a la persona
por su id interno y su código, no por su correo: cambiar de correo no
pierde inscripciones, boletas ni pagos. Las inscripciones anteriores a esta
regla (hechas sin cuenta) conservan solo el correo que se escribió.

## Control de ingreso (escáner QR)

En `/escaner` el organizador (sus eventos) o el administrador (todos) elige un
evento y apunta la cámara al QR del tiquete. La pantalla muestra los datos de la
persona y las respuestas de su formulario; al pulsar «Confirmar ingreso» queda
registrado con la hora y quién lo hizo, y pasa a la lista «Ya ingresaron». Un
segundo escaneo avisa «ya ingresó», y un tiquete sin pago confirmado o de otro
evento se rechaza. La cámara exige HTTPS (Vercel lo da) o `localhost`. Si no
lee, se puede pegar el código a mano o marcar el ingreso desde la lista.

## Política de datos (Ley 1581 de 2012)

- La política está en `/politica-de-datos` (enlace en el pie de página). Su texto
  y los datos del responsable se editan en `app/politica-de-datos/page.tsx` y
  `lib/politica.ts`. **Completa los campos `[COMPLETAR]` antes de publicar**;
  mientras falten, la página muestra un aviso.
- Cada formulario que envía datos tiene una casilla obligatoria, siempre
  desmarcada: registro, inscripción, perfil, cambio de correo, crear evento,
  crear organizador (administrador) y primer ingreso del organizador. El
  servidor también la exige.
- Cada aceptación queda en la tabla `consentimientos` (usuario, versión de la
  política, formulario, fecha, IP, navegador) como prueba de la autorización.
- Si cambias el texto de la política, sube `POLITICA_VERSION` en `lib/politica.ts`.

## Puesta en marcha

1. Crea una rama `dev` en tu proyecto de Neon y copia su cadena de conexión.
2. Copia `.env.example` a `.env.local` y completa los valores.
3. Instala y prepara la base de datos:

```bash
npm install
npm run db:setup   # crea las tablas y siembra el administrador
npm run dev
```

`npm run db:setup` es repetible: no duplica ni borra datos, y solo siembra el administrador si todavía no hay ninguno.

## Desplegar en Vercel

Variables de entorno del proyecto (no incluyas `ADMIN_EMAIL` ni
`ADMIN_PASSWORD`):

- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL` (la URL pública, por ejemplo `https://eventflow-ten-jet.vercel.app`)

Para preparar la base de datos de producción, corre `db:setup` una vez
desde tu PC apuntando a esa base (en PowerShell):

```powershell
$env:DATABASE_URL="<cadena de producción>"; $env:ADMIN_EMAIL="..."; $env:ADMIN_PASSWORD="..."
npm run db:setup
```

## Pendiente

- Inicio de sesión con Google (el lugar está marcado en `lib/auth-options.ts`).
- Pasarela de pago real con webhook firmado. Hoy el pago es simulado y
  `confirmPaymentAction` puede confirmar cualquier inscripción.
- Envío de correos (boleta, invitaciones) y verificación de correo.
- El nombre también se puede cambiar por la API de Better Auth sin pasar por la validación de longitud de `/perfil`.
- Liberar cupos de inscripciones que nunca se pagan.
- Si una cuenta cambia de rol, recibe un número de la serie del nuevo rol (aún no hay pantalla para cambiar roles).
- Cambiar el rol de una cuenta desde el panel del administrador.
- Edición de un evento ya creado (hoy solo se cambia su estado).


## Novedades de la versión 4

- **Reserva de cupo con vencimiento:** una inscripción sin pagar reserva el cupo 30 minutos; después se libera sola (estado «Reserva vencida») y la persona puede pagar de nuevo si aún hay cupo.
- **Editar evento** (`/organizador/eventos/[id]/editar`): respeta a los inscritos (no se pueden bajar los cupos por debajo de los inscritos ni quitar categorías con inscritos).
- **Ubicación del evento:** botón «Ubicar en el mapa» (OpenStreetMap/Nominatim) o coordenadas a mano; la ficha muestra mapa y botones de Google Maps y Waze.
- **Recomendaciones** de hospedaje, comida y transporte que carga el organizador.
- **Subida real de imágenes** (JPG/PNG/WebP, 3 MB) en el formulario de inscripción; se guardan en la base y solo las ven quien las subió, el organizador dueño y el administrador.
- **Eventos cercanos / populares** en el inicio: pide permiso de ubicación solo al pulsar el botón; si se rechaza se muestra el top global. La ubicación no se guarda.
- **Boleta:** descarga en PNG y «Guardar sin conexión» (`/boleta`, PWA con service worker). Se borra al cerrar sesión. El service worker solo se activa en producción.
- **Novedades y notificaciones push:** el organizador envía novedades por evento; se ven en «Mis inscripciones» y llegan como push a quien las activó. Para el push genera las claves con `npm run vapid` y ponlas en `.env.local` y Vercel (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`). Sin ellas todo funciona menos el push.
- **Política de datos v1.1** (ubicación, imágenes, notificaciones, boleta en el dispositivo).
- **Pruebas:** `npm test` (Vitest: unitarias + integración contra Postgres; necesita `DATABASE_URL` y `npm run db:setup`). CI en `.github/workflows/ci.yml` (lint, tipos, pruebas y build).
- El escaneo de ingresos lo hace el organizador (o el administrador); no hay rol aparte.
- Fuera de alcance a propósito: correos (boleta, verificación, recuperación de contraseña) y pasarela de pagos real (el pago sigue simulado).

Después de actualizar el código, corre `npm run db:setup` (en tu `.env.local` y luego contra producción) para crear las columnas y tablas nuevas.

## Paneles con menú lateral (v5)

- **Administrador** (`/admin`): Resumen (KPIs y gráficas), Eventos (filtros, estado, paginación), Inscripciones, Control de ingreso, Organizadores (crear, métricas, desactivar), Usuarios y Autorizaciones (evidencia de aceptación de la política, exportable).
- **Organizador** (`/organizador`): Resumen, Eventos, Crear evento, Inscritos (de todos sus eventos, con filtros y CSV), Control de ingreso y Novedades.
- En el celular el menú lateral se convierte en pestañas con desplazamiento horizontal.

## Banner del evento (v7)

El organizador puede subir un banner (JPG/PNG/WebP, máx. 3 MB) al crear o editar un evento. Se muestra en la tarjeta del inicio y en la ficha; sin banner, la tarjeta se ve como siempre. Se sirve público en `/api/banners/[idEvento]`. El mini mapa quedó solo como vista previa dentro del formulario; la ficha conserva el mapa grande. Corre `npm run db:setup` para crear la columna `banner_id`.

## v9 — Rediseño del front (shadcn/ui + Lucide)
- Componentes base en `components/ui/` (Button, Badge, Dialog, Tabs, Select, Skeleton, Sonner) escritos con el patrón de shadcn/ui (Radix + cva + tailwind-merge) sobre los tokens de color del proyecto. Iconos con Lucide.
- Inicio: buscador, filtros por disciplina y «solo con cupos»; tarjetas con fecha, barra de ocupación y «Últimos cupos».
- Ficha: dos columnas con tarjeta de inscripción fija; Maps/Waze con iconos.
- Inscripción: resumen del evento, pago con candado y boleta con forma de tiquete.
- Paneles: menú con Lucide, KPIs con icono, esqueletos de carga, diálogo de confirmación y toasts.
- Escáner: iconos grandes de estado (válido, ya ingresó, pago pendiente, no válido).
