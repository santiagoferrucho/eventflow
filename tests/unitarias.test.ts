import { describe, expect, it } from "vitest";
import { validarDocumento, validarNombre, validarTelefono, normalizarTelefono } from "@/lib/validacion";
import { codigoEvento, codigoOrganizador, codigoParticipante, codigoUsuario } from "@/lib/codigos";
import { detectarTipoImagen, idDesdeValorImagen, valorImagen } from "@/lib/imagenes";
import { RESERVA_MINUTOS, reservaVenceEn } from "@/lib/reservas";
import { hoyBogota } from "@/lib/fechas";
import { nombreSeguro } from "@/lib/csv";

describe("validaciones", () => {
  it("nombre", () => {
    expect(validarNombre("Ana")).toBeNull();
    expect(validarNombre("A")).not.toBeNull();
    expect(validarNombre("x".repeat(81))).not.toBeNull();
  });
  it("teléfono", () => {
    expect(validarTelefono("+57 300 123 4567")).toBeNull();
    expect(normalizarTelefono("(300) 123-4567")).toBe("3001234567");
    expect(validarTelefono("123")).not.toBeNull();
    expect(validarTelefono("", true)).not.toBeNull();
    expect(validarTelefono("")).toBeNull();
  });
  it("documento", () => {
    expect(validarDocumento("1098765432")).toBeNull();
    expect(validarDocumento("", true)).not.toBeNull();
    expect(validarDocumento("<script>")).not.toBeNull();
  });
});

describe("códigos", () => {
  it("formato por rol", () => {
    expect(codigoParticipante(12)).toBe("000000012");
    expect(codigoOrganizador(7)).toBe("O000000007");
    expect(codigoEvento(45)).toBe("E000000045");
    expect(codigoUsuario("organizador", 7)).toBe("O000000007");
    expect(codigoUsuario("administrador", 1)).toBeNull();
    expect(codigoUsuario("participante", null)).toBeNull();
  });
});

describe("imágenes", () => {
  it("detecta el tipo por los bytes, no por el nombre", () => {
    expect(detectarTipoImagen(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]))).toBe("image/jpeg");
    expect(detectarTipoImagen(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]))).toBe("image/png");
    const webp = new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 ");
    expect(detectarTipoImagen(webp)).toBe("image/webp");
    expect(detectarTipoImagen(new TextEncoder().encode("<svg onload=alert(1)>"))).toBeNull();
    expect(detectarTipoImagen(new TextEncoder().encode("%PDF-1.7 ......"))).toBeNull();
  });
  it("valor guardado en la respuesta", () => {
    const id = "img-" + "a".repeat(24);
    expect(idDesdeValorImagen(valorImagen(id))).toBe(id);
    expect(idDesdeValorImagen("img:../../etc/passwd")).toBeNull();
    expect(idDesdeValorImagen("archivo.png")).toBeNull();
  });
});

describe("reservas y fechas", () => {
  it("la reserva vence a los 30 minutos", () => {
    expect(RESERVA_MINUTOS).toBe(30);
    const inicio = "2026-10-20T10:00:00.000Z";
    expect(reservaVenceEn(inicio).toISOString()).toBe("2026-10-20T10:30:00.000Z");
  });
  it("hoyBogota tiene formato AAAA-MM-DD", () => {
    expect(hoyBogota()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
  it("nombreSeguro quita tildes y símbolos", () => {
    expect(nombreSeguro("Carrera Atardecer UPB ¡2026!")).toBe("carrera-atardecer-upb-2026");
  });
});

describe("seguridad de datos", () => {
  it("al exportar CSV, una celda que empieza por = + - @ no se ejecuta como fórmula en Excel", async () => {
    const { descargarCSV } = await import("@/lib/csv");
    let contenido = "";
    const g = globalThis as unknown as Record<string, unknown>;
    const antes = { Blob: g.Blob, URL: g.URL, document: g.document };
    g.Blob = class {
      constructor(partes: string[]) {
        contenido = partes.join("");
      }
    };
    g.URL = { createObjectURL: () => "blob:x", revokeObjectURL: () => undefined };
    g.document = {
      createElement: () => ({ click() {}, remove() {} }),
      body: { appendChild() {} },
    };
    try {
      descargarCSV("x.csv", [["Nombre", "Respuesta"], ['=HYPERLINK("http://malo")', 'Dice "hola"']]);
    } finally {
      Object.assign(g, antes);
    }
    expect(contenido).toContain(`"'=HYPERLINK(""http://malo"")"`);
    expect(contenido).toContain(`"Dice ""hola"""`);
  });

  it("la autorización de datos solo vale si llega exactamente true", async () => {
    const { exigirAceptacion } = await import("@/lib/consentimiento");
    expect(() => exigirAceptacion(true)).not.toThrow();
    for (const v of [false, "true", 1, undefined, null]) {
      expect(() => exigirAceptacion(v)).toThrow(/política de tratamiento/);
    }
  });
});
