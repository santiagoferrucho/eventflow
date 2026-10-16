// Error con un mensaje pensado para mostrarse tal cual a la persona
// ("Esta categoría ya no tiene cupos."). En producción Next.js oculta el texto
// de los errores que lanza una Server Action, así que las acciones atrapan
// este tipo y devuelven el mensaje dentro de su resultado.
export class ErrorNegocio extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "ErrorNegocio";
  }
}
