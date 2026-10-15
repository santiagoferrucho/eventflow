// Datos de la política de tratamiento de datos personales.
//
// VERSION: cada vez que cambie el texto de /politica-de-datos, sube este
// número y actualiza la fecha. Cada aceptación queda guardada con la versión
// que la persona vio (tabla `consentimientos`), que es la prueba de la
// autorización que exige la ley.
export const POLITICA_VERSION = "1.1";
export const POLITICA_FECHA = "15 de octubre de 2026";

// Datos del responsable del tratamiento. COMPLETAR antes de publicar: son los
// que la ley exige mostrar (identificación y contacto del responsable y del
// área que atiende las solicitudes). Mientras queden valores "[COMPLETAR…]",
// la página de la política muestra un aviso.
export const RESPONSABLE = {
  nombre: "[COMPLETAR: razón social o nombre completo del responsable]",
  identificacion: "[COMPLETAR: NIT o cédula]",
  domicilio: "Bucaramanga, Santander, Colombia",
  correo: "[COMPLETAR: correo para solicitudes de datos personales]",
  telefono: "[COMPLETAR: teléfono de contacto]",
  area: "[COMPLETAR: persona o área que atiende consultas y reclamos]",
};

export const POLITICA_PENDIENTE = Object.values(RESPONSABLE).some((v) => v.startsWith("[COMPLETAR"));

// Dónde se pidió la aceptación. Se guarda tal cual en la tabla `consentimientos`.
export type FormularioConsentimiento =
  | "registro"
  | "perfil"
  | "cambio_correo"
  | "inscripcion"
  | "crear_evento"
  | "admin_crear_organizador"
  | "primer_ingreso"
  | "notificaciones";
