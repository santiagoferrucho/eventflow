import { requirePageRole } from "@/lib/session";
import { PanelShell, MENU_ORGANIZADOR, MENU_ADMIN } from "@/components/panel-shell";

export default async function EscanerLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageRole(["organizador", "administrador"]);
  const admin = user.rol === "administrador";
  return (
    <PanelShell
      titulo={admin ? "Administración" : "Panel del organizador"}
      subtitulo={admin ? "Toda la plataforma" : "Tus eventos y su gestión"}
      grupos={admin ? MENU_ADMIN : MENU_ORGANIZADOR}
    >
      {children}
    </PanelShell>
  );
}
