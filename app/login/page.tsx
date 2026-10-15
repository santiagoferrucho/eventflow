import { rutaInternaSegura } from "@/lib/redirect";
import { LoginForm } from "./login-form";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return <LoginForm next={rutaInternaSegura(next)} />;
}
