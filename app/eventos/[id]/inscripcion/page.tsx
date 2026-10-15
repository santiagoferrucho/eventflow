import { notFound, redirect } from "next/navigation";
import { repo } from "@/lib/repo";
import { getSessionUser } from "@/lib/session";
import { InscripcionFlow } from "./inscripcion-flow";

export default async function InscripcionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ categoria?: string }>;
}) {
  const { id } = await params;
  const { categoria: categoriaId } = await searchParams;

  // Inscribirse exige cuenta: si no hay sesión, se manda a iniciar sesión (o
  // crear la cuenta) y después se regresa aquí mismo.
  const user = await getSessionUser();
  if (!user) {
    const destino = `/eventos/${id}/inscripcion${categoriaId ? `?categoria=${encodeURIComponent(categoriaId)}` : ""}`;
    redirect(`/login?next=${encodeURIComponent(destino)}`);
  }
  if (user.debeCambiarPassword) redirect("/cambiar-password");

  const evento = await repo.getEvent(id);
  if (!evento) notFound();

  const categoria = evento.categorias.find((c) => c.id === categoriaId) ?? evento.categorias[0];
  if (!categoria) notFound();

  return <InscripcionFlow evento={evento} categoria={categoria} />;
}
