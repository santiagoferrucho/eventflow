"use client";

import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";

type Estado = "iniciando" | "activa" | "error";

// Lector de códigos QR con la cámara del dispositivo. Pide la cámara trasera
// (si hay), lee cada fotograma con jsQR y avisa con onScan. Funciona en
// cualquier navegador moderno con HTTPS (o localhost); no depende de
// BarcodeDetector, que Safari y Firefox no tienen.
export function QrScanner({ onScan, pausado }: { onScan: (texto: string) => void; pausado: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [estado, setEstado] = useState<Estado>("iniciando");
  const [mensaje, setMensaje] = useState("");
  const [camara, setCamara] = useState<"environment" | "user">("environment");

  // Referencias para que el bucle de lectura use siempre los valores actuales
  // sin tener que reiniciar la cámara cuando cambian.
  const onScanRef = useRef(onScan);
  const pausadoRef = useRef(pausado);
  useEffect(() => {
    onScanRef.current = onScan;
    pausadoRef.current = pausado;
  });

  useEffect(() => {
    let detenido = false;
    let stream: MediaStream | null = null;
    let raf = 0;
    let ultimaLectura = 0;
    let ultimoTexto = "";
    let ultimoEn = 0;

    function fallo(texto: string) {
      if (detenido) return;
      setEstado("error");
      setMensaje(texto);
    }

    async function iniciar() {
      if (!navigator.mediaDevices?.getUserMedia) {
        fallo("Este navegador no permite usar la cámara. Abre la página con HTTPS en Chrome, Safari o Firefox actualizados.");
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: camara }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
      } catch (e) {
        const nombre = (e as { name?: string }).name;
        if (nombre === "NotAllowedError" || nombre === "SecurityError") {
          fallo("No diste permiso para usar la cámara. Actívalo en los ajustes del navegador y recarga la página.");
        } else if (nombre === "NotFoundError" || nombre === "OverconstrainedError") {
          fallo("No encontramos una cámara en este dispositivo.");
        } else {
          fallo("No pudimos abrir la cámara. Cierra otras apps que la estén usando e inténtalo de nuevo.");
        }
        return;
      }
      if (detenido) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      try {
        await video.play();
      } catch {
        fallo("No pudimos iniciar el video de la cámara.");
        return;
      }
      setEstado("activa");

      const ciclo = (t: number) => {
        raf = requestAnimationFrame(ciclo);
        if (pausadoRef.current || t - ultimaLectura < 120) return;
        ultimaLectura = t;
        const canvas = canvasRef.current;
        if (!canvas || video.readyState < 2 || !video.videoWidth) return;
        // Se reduce el fotograma para que leer sea rápido incluso en celulares modestos.
        const escala = Math.min(1, 720 / video.videoWidth);
        const w = Math.round(video.videoWidth * escala);
        const h = Math.round(video.videoHeight * escala);
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;
        ctx.drawImage(video, 0, 0, w, h);
        const codigo = jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: "dontInvert" });
        if (!codigo?.data) return;
        // El mismo código visto de nuevo en menos de 3 s no se vuelve a reportar.
        const ahora = Date.now();
        if (codigo.data === ultimoTexto && ahora - ultimoEn < 3000) return;
        ultimoTexto = codigo.data;
        ultimoEn = ahora;
        onScanRef.current(codigo.data);
      };
      raf = requestAnimationFrame(ciclo);
    }

    iniciar();
    return () => {
      detenido = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [camara]);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-ink">
      <video
        ref={videoRef}
        playsInline
        muted
        className={`aspect-[4/3] w-full object-cover sm:aspect-video ${camara === "user" ? "-scale-x-100" : ""}`}
      />
      <canvas ref={canvasRef} className="hidden" />

      {estado === "activa" && (
        <>
          {/* Marco de apuntado */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="relative h-3/5 max-h-64 aspect-square">
              <span className="absolute left-0 top-0 h-8 w-8 rounded-tl-xl border-l-4 border-t-4 border-accent" />
              <span className="absolute right-0 top-0 h-8 w-8 rounded-tr-xl border-r-4 border-t-4 border-accent" />
              <span className="absolute bottom-0 left-0 h-8 w-8 rounded-bl-xl border-b-4 border-l-4 border-accent" />
              <span className="absolute bottom-0 right-0 h-8 w-8 rounded-br-xl border-b-4 border-r-4 border-accent" />
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setEstado("iniciando");
              setCamara((c) => (c === "environment" ? "user" : "environment"));
            }}
            className="absolute bottom-3 right-3 rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-ink shadow"
          >
            Cambiar cámara
          </button>
          {pausado && (
            <div className="absolute inset-0 flex items-center justify-center bg-ink/60 text-sm font-medium text-white">
              Lectura en pausa
            </div>
          )}
        </>
      )}

      {estado === "iniciando" && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-white/80">Abriendo cámara...</div>
      )}
      {estado === "error" && (
        <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-white">
          {mensaje}
        </div>
      )}
    </div>
  );
}
