import { rutaInternaSegura } from "@/lib/redirect";
import { RegistroForm } from "./registro-form";

export default async function RegistroPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return <RegistroForm next={rutaInternaSegura(next)} />;
}
