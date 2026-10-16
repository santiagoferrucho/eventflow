import type { Metadata } from "next";
import type { ReactNode } from "react";
import { POLITICA_FECHA, POLITICA_PENDIENTE, POLITICA_VERSION, RESPONSABLE } from "@/lib/politica";

export const metadata: Metadata = {
  title: "Política de tratamiento de datos personales — EventFlow",
  description: "Cómo EventFlow recoge, usa y protege tus datos personales, y cómo puedes ejercer tus derechos.",
};

function Seccion({ id, titulo, children }: { id: string; titulo: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="font-display mb-3 text-xl font-semibold text-ink">{titulo}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-ink-soft">{children}</div>
    </section>
  );
}

function Lista({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5 marker:text-brand">
      {items.map((it, i) => (
        <li key={i}>{it}</li>
      ))}
    </ul>
  );
}

const INDICE = [
  ["responsable", "Quién es el responsable"],
  ["marco", "Marco legal"],
  ["datos", "Qué datos recogemos"],
  ["finalidades", "Para qué los usamos"],
  ["autorizacion", "Tu autorización"],
  ["menores", "Menores de edad"],
  ["derechos", "Tus derechos"],
  ["ejercer", "Cómo ejercer tus derechos"],
  ["terceros", "Con quién compartimos los datos"],
  ["seguridad", "Seguridad y conservación"],
  ["cookies", "Cookies"],
  ["cambios", "Cambios a esta política"],
] as const;

export default function PoliticaDatosPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="font-display text-3xl font-semibold text-ink">Política de tratamiento de datos personales</h1>
      <p className="mt-2 text-sm text-ink-soft">
        Versión {POLITICA_VERSION} · vigente desde el {POLITICA_FECHA}
      </p>

      {POLITICA_PENDIENTE && (
        <div role="note" className="mt-6 rounded-2xl border border-gold/40 bg-gold-soft p-4 text-sm text-ink">
          <p className="font-medium text-gold">Falta completar los datos del responsable</p>
          <p className="mt-1 text-ink-soft">
            Los campos marcados como [COMPLETAR] están en <code className="text-xs">lib/politica.ts</code>. La ley exige
            que esta página muestre la identificación y el contacto reales del responsable antes de publicarla.
          </p>
        </div>
      )}

      <div className="mt-8 rounded-2xl border border-line bg-surface p-5 shadow-[0_1px_2px_rgba(11,17,32,0.04)]">
        <h2 className="font-display mb-2 text-base font-semibold text-ink">En pocas palabras</h2>
        <Lista
          items={[
            "Usamos tus datos para crear tu cuenta, gestionar tus inscripciones y emitir tu tiquete con código QR.",
            "El organizador del evento al que te inscribes recibe los datos que necesita para realizarlo y controlar tu ingreso.",
            "No vendemos tus datos ni los usamos para publicidad de terceros.",
            "Puedes consultar, corregir o pedir que eliminemos tus datos, y retirar tu autorización cuando quieras.",
            "Si no estás de acuerdo con cómo los tratamos, puedes quejarte ante la Superintendencia de Industria y Comercio.",
          ]}
        />
      </div>

      <nav aria-label="Contenido" className="mt-8 rounded-2xl bg-background p-4">
        <p className="mb-2 text-sm font-medium text-ink">Contenido</p>
        <ol className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
          {INDICE.map(([id, titulo], i) => (
            <li key={id}>
              <a href={`#${id}`} className="text-brand-dark hover:underline">
                {i + 1}. {titulo}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="mt-10 space-y-10">
        <Seccion id="responsable" titulo="1. Quién es el responsable">
          <p>
            EventFlow es una plataforma web para crear eventos, inscribirse a ellos, pagar y recibir un tiquete digital.
            El responsable del tratamiento de los datos que recogemos en la plataforma es:
          </p>
          <dl className="grid gap-x-6 gap-y-2 rounded-2xl border border-line bg-surface p-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-ink-faint">Nombre o razón social</dt>
              <dd className="text-ink">{RESPONSABLE.nombre}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-faint">NIT o documento</dt>
              <dd className="text-ink">{RESPONSABLE.identificacion}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-faint">Domicilio</dt>
              <dd className="text-ink">{RESPONSABLE.domicilio}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-faint">Teléfono</dt>
              <dd className="text-ink">{RESPONSABLE.telefono}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-faint">Correo para solicitudes de datos</dt>
              <dd className="break-all text-ink">{RESPONSABLE.correo}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-faint">Quién atiende consultas y reclamos</dt>
              <dd className="text-ink">{RESPONSABLE.area}</dd>
            </div>
          </dl>
          <p>
            Cada organizador de eventos recibe, además, los datos de las personas inscritas a sus eventos y se
            compromete a usarlos solo para realizar ese evento, conforme a esta política.
          </p>
        </Seccion>

        <Seccion id="marco" titulo="2. Marco legal">
          <p>Esta política se basa en la normativa colombiana de protección de datos personales:</p>
          <Lista
            items={[
              "Artículo 15 de la Constitución Política (derecho de habeas data).",
              "Ley Estatutaria 1581 de 2012, por la cual se dictan disposiciones generales para la protección de datos personales.",
              "Decreto 1377 de 2013, que reglamenta parcialmente la Ley 1581 y hoy está compilado en el Decreto Único Reglamentario 1074 de 2015.",
              "Las circulares y la guía de la Superintendencia de Industria y Comercio (SIC), que es la autoridad de protección de datos.",
            ]}
          />
        </Seccion>

        <Seccion id="datos" titulo="3. Qué datos recogemos">
          <Lista
            items={[
              <>
                <strong className="font-medium text-ink">Cuenta:</strong> nombre, correo electrónico y contraseña
                (guardada con cifrado irreversible; nadie puede leerla).
              </>,
              <>
                <strong className="font-medium text-ink">Identificación y contacto:</strong> número de documento y
                teléfono.
              </>,
              <>
                <strong className="font-medium text-ink">Inscripción:</strong> el evento y la categoría elegidos, y las
                respuestas que das al formulario que el organizador define para su evento.
              </>,
              <>
                <strong className="font-medium text-ink">Pago:</strong> el valor y el estado del pago. Los datos de
                tarjetas o cuentas bancarias los procesa directamente la pasarela de pagos; EventFlow no los guarda.
              </>,
              <>
                <strong className="font-medium text-ink">Ingreso al evento:</strong> la hora en que se registra tu
                entrada y la persona que la registró.
              </>,
              <>
                <strong className="font-medium text-ink">Imágenes:</strong> si el formulario de un evento pide una
                imagen (por ejemplo, un documento o un comprobante), la guardamos de forma privada; solo la ven tú, el
                organizador de ese evento y la administración.
              </>,
              <>
                <strong className="font-medium text-ink">Ubicación aproximada (opcional):</strong> si pulsas «Ver
                eventos cerca de mí», tu navegador te pide permiso y usamos tu ubicación únicamente en ese momento para
                ordenar los eventos por cercanía. No la guardamos. Si no la compartes, te mostramos los eventos más
                populares.
              </>,
              <>
                <strong className="font-medium text-ink">Notificaciones (opcional):</strong> si las activas, guardamos
                el identificador de suscripción de tu dispositivo para enviarte las novedades de tus eventos. Puedes
                desactivarlas cuando quieras.
              </>,
              <>
                <strong className="font-medium text-ink">Boleta en tu dispositivo (opcional):</strong> si eliges
                «Guardar sin conexión», tu nombre, el evento y el código QR se guardan en tu propio dispositivo; se
                borran al cerrar sesión.
              </>,
              <>
                <strong className="font-medium text-ink">Datos técnicos:</strong> al aceptar esta política guardamos la
                fecha, la versión, el formulario, tu dirección IP y el tipo de navegador, como prueba de tu
                autorización.
              </>,
            ]}
          />
          <p>
            <strong className="font-medium text-ink">Datos sensibles.</strong> EventFlow no pide datos sensibles (los
            que afectan tu intimidad, como los de salud). Si un organizador incluye en su formulario una pregunta de
            ese tipo, por ejemplo sobre condiciones médicas, responderla es facultativo: no estás obligado a hacerlo.
          </p>
        </Seccion>

        <Seccion id="finalidades" titulo="4. Para qué los usamos">
          <Lista
            items={[
              "Crear y administrar tu cuenta y permitirte iniciar sesión.",
              "Gestionar tu inscripción a eventos, tu pago y la emisión de tu tiquete con código QR.",
              "Compartir tus datos con el organizador del evento para que lo realice, te identifique y controle tu ingreso.",
              "Enviarte comunicaciones necesarias sobre tu cuenta o tus inscripciones, incluidas las novedades del evento si activaste las notificaciones.",
              "Mostrarte eventos cercanos o populares y, en la ficha de cada evento, cómo llegar.",
              "Prevenir fraudes y mantener la seguridad de la plataforma.",
              "Cumplir obligaciones legales, contables y tributarias, y atender requerimientos de las autoridades.",
              "Atender tus consultas, peticiones y reclamos.",
              "Elaborar estadísticas agregadas que no te identifican, para mejorar el servicio.",
            ]}
          />
          <p>
            No usaremos tus datos para enviarte publicidad ni para fines distintos de los anteriores sin pedirte antes
            una autorización aparte.
          </p>
        </Seccion>

        <Seccion id="autorizacion" titulo="5. Tu autorización">
          <p>
            Tratamos tus datos únicamente con tu autorización previa, expresa e informada. La das marcando la casilla
            que aparece en cada formulario donde nos entregas información. Sin marcarla no podemos procesar el
            formulario. El silencio nunca se entiende como autorización.
          </p>
          <p>
            Como la ley nos obliga a conservar prueba de tu autorización, cada vez que la das guardamos la fecha, la
            versión de esta política, el formulario, tu dirección IP y tu navegador. Puedes pedirnos copia de esa
            prueba. Puedes retirar tu autorización en cualquier momento, salvo cuando exista un deber legal o
            contractual de conservar tus datos.
          </p>
        </Seccion>

        <Seccion id="menores" titulo="6. Menores de edad">
          <p>
            EventFlow está dirigido a personas mayores de edad. Los datos de niños, niñas y adolescentes solo se
            tratan respetando su interés superior y con la autorización de su representante legal. Si un evento admite
            menores, la inscripción debe hacerla su madre, padre o representante legal, quien autoriza el tratamiento
            de los datos del menor. Si detectamos datos de un menor sin esa autorización, los eliminaremos.
          </p>
        </Seccion>

        <Seccion id="derechos" titulo="7. Tus derechos">
          <p>Como titular de los datos, según el artículo 8 de la Ley 1581 de 2012, tienes derecho a:</p>
          <Lista
            items={[
              "Conocer, actualizar y rectificar tus datos personales. Parte de esto puedes hacerlo tú mismo en tu perfil; el documento queda bloqueado una vez registrado y se corrige solicitándolo al responsable.",
              "Solicitar prueba de la autorización que nos diste.",
              "Ser informado, previa solicitud, del uso que se ha dado a tus datos.",
              "Presentar quejas ante la Superintendencia de Industria y Comercio por infracciones a la ley.",
              "Revocar la autorización y solicitar la supresión de tus datos cuando no se respeten los principios, derechos y garantías legales, o cuando ya no sean necesarios y no haya un deber legal de conservarlos.",
              "Acceder de forma gratuita a tus datos personales que hayamos tratado.",
            ]}
          />
        </Seccion>

        <Seccion id="ejercer" titulo="8. Cómo ejercer tus derechos">
          <p>
            Escribe al correo <span className="break-all font-medium text-ink">{RESPONSABLE.correo}</span> desde el
            correo con el que usas EventFlow, indicando tu nombre, tu documento, qué quieres hacer (consultar,
            corregir, suprimir, revocar o pedir la prueba de tu autorización) y una descripción clara de tu solicitud.
          </p>
          <Lista
            items={[
              <>
                <strong className="font-medium text-ink">Consultas:</strong> las respondemos en máximo diez (10) días
                hábiles. Si no podemos hacerlo en ese plazo, te lo informamos con los motivos y la nueva fecha, que no
                superará cinco (5) días hábiles adicionales.
              </>,
              <>
                <strong className="font-medium text-ink">Reclamos</strong> (corrección, supresión, revocatoria o
                presunto incumplimiento): los atendemos en máximo quince (15) días hábiles. Si la solicitud está
                incompleta, te pediremos corregirla dentro de los cinco (5) días siguientes. Si necesitamos más tiempo,
                te avisaremos, y no superará ocho (8) días hábiles adicionales.
              </>,
            ]}
          />
          <p>
            Solo puedes elevar queja ante la Superintendencia de Industria y Comercio después de haber agotado este
            trámite con nosotros.
          </p>
        </Seccion>

        <Seccion id="terceros" titulo="9. Con quién compartimos los datos">
          <Lista
            items={[
              "El organizador del evento al que te inscribes, que recibe tus datos de inscripción para realizar el evento y controlar el ingreso.",
              "Proveedores tecnológicos que nos prestan servicios (alojamiento de la plataforma, base de datos, pasarela de pagos y envío de correos). Actúan por cuenta nuestra y solo pueden usar los datos para prestarnos ese servicio.",
              "Autoridades, cuando una norma o una orden judicial o administrativa lo exija.",
            ]}
          />
          <p>
            Algunos de estos proveedores pueden tener sus servidores fuera de Colombia, por ejemplo en Estados Unidos,
            país que la SIC reconoce entre los de nivel adecuado de protección de datos. En esos casos exigimos medidas
            de seguridad equivalentes a las de esta política. No vendemos tus datos.
          </p>
        </Seccion>

        <Seccion id="seguridad" titulo="10. Seguridad y conservación">
          <p>
            Protegemos los datos con conexiones cifradas (HTTPS), contraseñas almacenadas con cifrado irreversible y
            permisos por rol: cada persona solo ve la información que necesita para su función. Ningún sistema es
            infalible; si ocurre un incidente de seguridad que afecte tus datos, lo gestionaremos y lo reportaremos a
            la SIC y a los titulares cuando la ley lo exija.
          </p>
          <p>
            Conservamos tus datos mientras tengas una cuenta y durante el tiempo que exijan las normas contables,
            tributarias y comerciales y la atención de posibles reclamaciones. La base de datos de EventFlow estará
            vigente mientras la plataforma esté en operación y subsistan las finalidades descritas en esta política.
          </p>
        </Seccion>

        <Seccion id="cookies" titulo="11. Cookies">
          <p>
            Usamos únicamente la cookie de sesión necesaria para que sigas con tu sesión iniciada. No usamos cookies
            publicitarias ni de seguimiento de terceros.
          </p>
        </Seccion>

        <Seccion id="cambios" titulo="12. Cambios a esta política">
          <p>
            Si cambiamos esta política de forma sustancial, te lo comunicaremos antes de aplicar los cambios y, cuando
            sea necesario, te pediremos una nueva autorización. Cada versión tiene un número y una fecha en la parte
            superior de esta página, y la versión que aceptaste queda registrada junto con tu autorización.
          </p>
        </Seccion>
      </div>
    </div>
  );
}
