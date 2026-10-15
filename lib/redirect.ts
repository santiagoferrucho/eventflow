// Solo se aceptan rutas internas de la app como destino tras iniciar sesión.
// Sin esto, un enlace /login?next=https://sitio-malo.com serviría para
// redirigir a las personas fuera de EventFlow.
export function rutaInternaSegura(valor: string | string[] | undefined | null): string | null {
  if (typeof valor !== "string") return null;
  if (!valor.startsWith("/") || valor.startsWith("//") || valor.includes("\\")) return null;
  if (/[\u0000-\u001f]/.test(valor)) return null;
  return valor;
}
