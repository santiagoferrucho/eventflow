"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui";

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand to-accent text-sm font-bold text-white">
        E
      </span>
      <span className="font-display text-lg font-semibold text-ink">EventFlow</span>
    </Link>
  );
}

export function NavBar() {
  const { user, logout, loading } = useAuth();
  const [menuAbierto, setMenuAbierto] = useState(false);

  const linksPorRol = !loading && user && (
    <>
      {user.rol === "participante" && (
        <Link href="/mis-inscripciones" className="text-ink-soft hover:text-ink" onClick={() => setMenuAbierto(false)}>
          Mis inscripciones
        </Link>
      )}
      {user.rol === "organizador" && (
        <Link href="/organizador" className="text-ink-soft hover:text-ink" onClick={() => setMenuAbierto(false)}>
          Mi panel
        </Link>
      )}
      {user.rol === "administrador" && (
        <Link href="/admin" className="text-ink-soft hover:text-ink" onClick={() => setMenuAbierto(false)}>
          Panel admin
        </Link>
      )}
    </>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/80 px-4 py-3.5 backdrop-blur-md sm:px-6">
      <div className="mx-auto flex max-w-5xl items-center justify-between">
        <Logo />

        {/* Navegación de escritorio */}
        <nav className="hidden items-center gap-5 text-sm sm:flex">
          {linksPorRol}
          {!loading && user && (
            <>
              <span className="text-ink-soft">{user.nombre}</span>
              <Button variant="ghost" onClick={() => logout()}>
                Cerrar sesión
              </Button>
            </>
          )}
          {!loading && !user && (
            <>
              <Link href="/login" className="text-ink-soft hover:text-ink">
                Iniciar sesión
              </Link>
              <Link href="/registro">
                <Button>Crear cuenta</Button>
              </Link>
            </>
          )}
        </nav>

        {/* Botón hamburguesa en móvil */}
        <button
          className="flex h-9 w-9 items-center justify-center rounded-lg text-ink sm:hidden"
          aria-label="Abrir menú"
          onClick={() => setMenuAbierto((v) => !v)}
        >
          {menuAbierto ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
            </svg>
          )}
        </button>
      </div>

      {/* Menú móvil desplegable */}
      {menuAbierto && (
        <nav className="mx-auto mt-3 flex max-w-5xl flex-col gap-1 border-t border-line pt-3 text-sm sm:hidden">
          {linksPorRol}
          {!loading && user && (
            <>
              <span className="px-1 py-1.5 text-ink-soft">{user.nombre}</span>
              <Button
                variant="ghost"
                className="justify-start"
                onClick={() => {
                  logout();
                  setMenuAbierto(false);
                }}
              >
                Cerrar sesión
              </Button>
            </>
          )}
          {!loading && !user && (
            <>
              <Link href="/login" className="px-1 py-1.5 text-ink-soft hover:text-ink" onClick={() => setMenuAbierto(false)}>
                Iniciar sesión
              </Link>
              <Link href="/registro" onClick={() => setMenuAbierto(false)}>
                <Button className="mt-1 w-full">Crear cuenta</Button>
              </Link>
            </>
          )}
        </nav>
      )}
    </header>
  );
}
