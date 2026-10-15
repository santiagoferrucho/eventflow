import { requirePageRole } from "@/lib/session";
import { PanelShell, MENU_ADMIN } from "@/components/panel-shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requirePageRole(["administrador"]);
  return (
    <PanelShell titulo="Administración" subtitulo="Toda la plataforma" grupos={MENU_ADMIN}>
      {children}
    </PanelShell>
  );
}
