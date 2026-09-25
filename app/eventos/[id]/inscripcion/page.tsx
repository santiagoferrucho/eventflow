import { notFound } from "next/navigation";
import { repo } from "@/lib/repo";
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

  const evento = await repo.getEvent(id);
  if (!evento) notFound();

  const categoria = evento.categorias.find((c) => c.id === categoriaId) ?? evento.categorias[0];
  if (!categoria) notFound();

  return <InscripcionFlow evento={evento} categoria={categoria} />;
}
