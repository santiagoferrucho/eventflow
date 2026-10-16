import { requirePageRole } from "@/lib/session";
import { PanelShell, MENU_ORGANIZADOR, MENU_ADMIN } from "@/components/panel-shell";

export default async function OrganizadorLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageRole(["organizador", "administrador"]);
  // El administrador que entra a gestionar un evento conserva su propio menú.
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
