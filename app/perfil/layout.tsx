import { requirePageRole } from "@/lib/session";

export default async function PerfilLayout({ children }: { children: React.ReactNode }) {
  await requirePageRole(["participante", "organizador", "administrador"]);
  return <>{children}</>;
}
