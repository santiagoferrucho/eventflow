"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { CalendarDays, CirclePlus, FileCheck2, LayoutDashboard, Megaphone, ScanLine, ShieldCheck, UserRound, Users, type LucideIcon } from "lucide-react";

type Icono = "resumen" | "eventos" | "crear" | "inscritos" | "ingreso" | "novedades" | "organizadores" | "usuarios" | "consentimientos";

export interface ItemMenu {
  href: string;
  etiqueta: string;
  icono: Icono;
  // Rutas que también dejan este ítem activo (p. ej. el detalle de un evento).
  tambien?: string[];
}
export interface GrupoMenu {
  titulo: string;
  items: ItemMenu[];
}

const ICONOS: Record<Icono, LucideIcon> = {
  resumen: LayoutDashboard,
  eventos: CalendarDays,
  crear: CirclePlus,
  inscritos: Users,
  ingreso: ScanLine,
  novedades: Megaphone,
  organizadores: ShieldCheck,
  usuarios: UserRound,
  consentimientos: FileCheck2,
};

function Svg({ icono }: { icono: Icono }) {
  const I = ICONOS[icono];
  return <I className="size-[18px]" aria-hidden />;
}

function activo(ruta: string, item: ItemMenu): boolean {
  const rutas = [item.href, ...(item.tambien ?? [])];
  return rutas.some((r) => (r === "/admin" || r === "/organizador" ? ruta === r : ruta === r || ruta.startsWith(r + "/")));
}

// Marco de los paneles de organizador y administrador: menú lateral por
// función en pantallas grandes y franja de pestañas en el celular.
export function PanelShell({ titulo, subtitulo, grupos, children }: { titulo: string; subtitulo: string; grupos: GrupoMenu[]; children: ReactNode }) {
  const ruta = usePathname();
  const planos = grupos.flatMap((g) => g.items);
  // El ítem más específico gana (p. ej. /organizador/eventos/nuevo sobre /organizador/eventos).
  const mejor = planos
    .filter((i) => activo(ruta, i))
    .sort((a, b) => b.href.length - a.href.length)[0];

  return (
    <div className="mx-auto flex max-w-7xl flex-col lg:flex-row">
      <aside className="shrink-0 border-b border-line bg-surface lg:sticky lg:top-[65px] lg:h-[calc(100vh-65px)] lg:w-64 lg:overflow-y-auto lg:border-b-0 lg:border-r">
        <div className="hidden px-5 pb-2 pt-6 lg:block">
          <p className="font-display text-base font-semibold text-ink">{titulo}</p>
          <p className="text-xs text-ink-soft">{subtitulo}</p>
        </div>

        {/* Escritorio: menú agrupado */}
        <nav aria-label={titulo} className="hidden px-3 pb-6 lg:block">
          {grupos.map((g) => (
            <div key={g.titulo} className="mt-5">
              <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">{g.titulo}</p>
              <ul className="space-y-0.5">
                {g.items.map((i) => {
                  const on = i === mejor;
                  return (
                    <li key={i.href}>
                      <Link
                        href={i.href}
                        aria-current={on ? "page" : undefined}
                        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                          on ? "bg-brand-soft text-brand-dark" : "text-ink-soft hover:bg-background hover:text-ink"
                        }`}
                      >
                        <Svg icono={i.icono} />
                        {i.etiqueta}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Celular: pestañas con desplazamiento horizontal */}
        <nav aria-label={titulo} className="flex gap-1 overflow-x-auto px-3 py-2 lg:hidden">
          {planos.map((i) => {
            const on = i === mejor;
            return (
              <Link
                key={i.href}
                href={i.href}
                aria-current={on ? "page" : undefined}
                className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
                  on ? "bg-brand-soft text-brand-dark" : "text-ink-soft"
                }`}
              >
                <Svg icono={i.icono} />
                {i.etiqueta}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export const MENU_ORGANIZADOR: GrupoMenu[] = [
  {
    titulo: "General",
    items: [{ href: "/organizador", etiqueta: "Resumen", icono: "resumen" }],
  },
  {
    titulo: "Mis eventos",
    items: [
      { href: "/organizador/eventos", etiqueta: "Eventos", icono: "eventos" },
      { href: "/organizador/eventos/nuevo", etiqueta: "Crear evento", icono: "crear" },
    ],
  },
  {
    titulo: "Gestión",
    items: [
      { href: "/organizador/inscritos", etiqueta: "Inscritos", icono: "inscritos" },
      { href: "/escaner", etiqueta: "Control de ingreso", icono: "ingreso" },
      { href: "/organizador/novedades", etiqueta: "Novedades", icono: "novedades" },
    ],
  },
];

export const MENU_ADMIN: GrupoMenu[] = [
  {
    titulo: "General",
    items: [{ href: "/admin", etiqueta: "Resumen", icono: "resumen" }],
  },
  {
    titulo: "Plataforma",
    items: [
      { href: "/admin/eventos", etiqueta: "Eventos", icono: "eventos", tambien: ["/organizador/eventos"] },
      { href: "/admin/inscripciones", etiqueta: "Inscripciones", icono: "inscritos" },
      { href: "/escaner", etiqueta: "Control de ingreso", icono: "ingreso" },
    ],
  },
  {
    titulo: "Personas",
    items: [
      { href: "/admin/organizadores", etiqueta: "Organizadores", icono: "organizadores" },
      { href: "/admin/usuarios", etiqueta: "Usuarios", icono: "usuarios" },
    ],
  },
  {
    titulo: "Cumplimiento",
    items: [{ href: "/admin/consentimientos", etiqueta: "Autorizaciones", icono: "consentimientos" }],
  },
];
