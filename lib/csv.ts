// Descarga de tablas como CSV (abre bien en Excel y Google Sheets).

// Los nombres y respuestas los escriben los participantes. Una celda que
// empiece por = + - @ puede ejecutarse como fórmula al abrir el archivo en
// Excel, así que se les antepone un apóstrofo.
function celda(valor: string): string {
  const seguro = /^[=+\-@\t\r]/.test(valor) ? `'${valor}` : valor;
  return `"${seguro.replace(/"/g, '""')}"`;
}

export function descargarCSV(nombreArchivo: string, filas: string[][]) {
  const texto = filas.map((f) => f.map(celda).join(",")).join("\r\n");
  // BOM para que Excel reconozca los acentos (UTF-8).
  const blob = new Blob(["﻿", texto], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function nombreSeguro(texto: string) {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
}
