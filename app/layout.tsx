import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { NavBar } from "@/components/nav-bar";
import { Toaster } from "@/components/ui/sonner";
import { RegistrarSW } from "@/components/registrar-sw";

export const metadata: Metadata = {
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon-192.png", apple: "/apple-touch-icon.png" },
  title: "EventFlow — Inscripciones a eventos deportivos",
  description:
    "Crea y vende inscripciones a eventos deportivos sin intermediarios: formulario, pago y boleta digital en un solo flujo.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#6355ff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Sora:wght@500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <AuthProvider>
          <RegistrarSW />
          <Toaster />
          <NavBar />
          <main>{children}</main>
          <footer className="mt-16 border-t border-line px-4 py-8 text-center text-sm text-ink-soft sm:px-6">
            <p>
              EventFlow ·{" "}
              <Link href="/politica-de-datos" className="font-medium text-brand-dark hover:underline">
                Política de tratamiento de datos
              </Link>
            </p>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
