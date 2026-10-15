// Subida de imágenes del formulario de inscripción. Se guardan en la base de
// datos (tabla imagenes) y solo se sirven con permiso.
export const MAX_IMAGEN_BYTES = 3 * 1024 * 1024;

export type TipoImagen = "image/jpeg" | "image/png" | "image/webp";

// Se decide por los primeros bytes del archivo, no por lo que diga el navegador.
export function detectarTipoImagen(b: Uint8Array): TipoImagen | null {
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (
    b.length > 12 &&
    String.fromCharCode(b[0], b[1], b[2], b[3]) === "RIFF" &&
    String.fromCharCode(b[8], b[9], b[10], b[11]) === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

export const valorImagen = (id: string) => `img:${id}`;
export const idDesdeValorImagen = (v: string): string | null => {
  const m = /^img:(img-[a-f0-9]{24})$/.exec(v);
  return m ? m[1] : null;
};
export const urlImagen = (id: string) => `/api/imagenes/${id}`;

// Banner público de un evento; `v` cambia cuando cambia la imagen.
export const urlBanner = (eventoId: string, bannerId: string) => `/api/banners/${eventoId}?v=${bannerId}`;
