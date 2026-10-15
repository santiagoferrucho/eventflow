import { requirePageRole } from "@/lib/session";

export default async function MisInscripcionesLayout({ children }: { children: React.ReactNode }) {
  await requirePageRole(["participante", "organizador", "administrador"]);
  return <>{children}</>;
}
