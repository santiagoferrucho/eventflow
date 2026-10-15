import QRCode from "qrcode";
import type { BoletaLocal } from "@/lib/boletas-locales";

// Dibuja la boleta en un PNG (funciona sin conexión) y la descarga.
export async function descargarBoletaPNG(b: BoletaLocal): Promise<void> {
  const qr = await QRCode.toDataURL(b.qr, { margin: 1, width: 520, errorCorrectionLevel: "M" });
  const img = new Image();
  await new Promise<void>((ok, fail) => {
    img.onload = () => ok();
    img.onerror = () => fail(new Error("qr"));
    img.src = qr;
  });

  const W = 720;
  const H = 1000;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const c = canvas.getContext("2d")!;
  c.fillStyle = "#ffffff";
  c.fillRect(0, 0, W, H);
  c.fillStyle = "#6355ff";
  c.fillRect(0, 0, W, 130);
  c.fillStyle = "#ffffff";
  c.font = "700 44px Arial, sans-serif";
  c.textAlign = "center";
  c.fillText("EventFlow · Boleta", W / 2, 82);

  c.fillStyle = "#0b1120";
  c.font = "700 38px Arial, sans-serif";
  const lineas = partir(c, b.eventoNombre, W - 80);
  let y = 205;
  for (const l of lineas.slice(0, 2)) {
    c.fillText(l, W / 2, y);
    y += 46;
  }
  c.fillStyle = "#4b5565";
  c.font = "400 28px Arial, sans-serif";
  const fecha = new Date(b.fecha + "T00:00:00").toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });
  for (const l of partir(c, `${fecha} · ${b.lugar}`, W - 80).slice(0, 2)) {
    c.fillText(l, W / 2, y);
    y += 36;
  }
  c.drawImage(img, (W - 520) / 2, y + 20, 520, 520);
  y += 580;
  c.fillStyle = "#0b1120";
  c.font = "600 32px Arial, sans-serif";
  c.fillText(b.participante, W / 2, y);
  c.fillStyle = "#4b5565";
  c.font = "400 26px Arial, sans-serif";
  c.fillText(`${b.categoria} · ${b.eventoCodigo}`, W / 2, y + 40);
  c.font = "400 20px Arial, sans-serif";
  c.fillText("Presenta este código QR en la entrada.", W / 2, H - 40);

  const blob: Blob = await new Promise((ok, fail) => canvas.toBlob((x) => (x ? ok(x) : fail(new Error("png"))), "image/png"));
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `boleta-${b.eventoNombre.replace(/[^\w]+/g, "-").toLowerCase().slice(0, 40)}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function partir(c: CanvasRenderingContext2D, texto: string, ancho: number): string[] {
  const palabras = texto.split(" ");
  const out: string[] = [];
  let actual = "";
  for (const p of palabras) {
    const prueba = actual ? `${actual} ${p}` : p;
    if (c.measureText(prueba).width > ancho && actual) {
      out.push(actual);
      actual = p;
    } else actual = prueba;
  }
  if (actual) out.push(actual);
  return out;
}
