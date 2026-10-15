import type { InputHTMLAttributes, ReactNode } from "react";
import { Check } from "lucide-react";

export { Button } from "@/components/ui/button";

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink-soft">{label}</span>
      {children}
    </label>
  );
}

export function TextInput({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl border border-line-strong bg-surface px-3.5 py-2.5 text-[15px] text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-colors ${className}`}
    />
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-line bg-surface p-6 shadow-[0_1px_2px_rgba(11,17,32,0.04),0_10px_30px_-14px_rgba(11,17,32,0.10)] ${className}`}
    >
      {children}
    </div>
  );
}

export { Badge } from "@/components/ui/badge";

export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="mb-8 flex items-center gap-2 sm:gap-3">
      {steps.map((step, i) => {
        const isDone = i < current;
        const isCurrent = i === current;
        return (
          <li key={step} className="flex flex-1 items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2 sm:gap-2.5">
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                  isDone
                    ? "bg-gradient-to-br from-brand to-accent text-white"
                    : isCurrent
                    ? "border-2 border-brand text-brand-dark"
                    : "border border-line-strong text-ink-faint"
                }`}
              >
                {isDone ? <Check className="size-4" aria-hidden /> : i + 1}
              </span>
              <span
                className={`hidden text-sm font-medium sm:inline ${
                  isCurrent ? "text-ink" : "text-ink-soft"
                }`}
              >
                {step}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`h-px flex-1 ${isDone ? "bg-gradient-to-r from-brand to-accent" : "bg-line-strong"}`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

export function IconCircle({ children, tone = "brand" }: { children: ReactNode; tone?: "brand" | "accent" }) {
  const styles =
    tone === "brand"
      ? "bg-brand-soft text-brand-dark"
      : "bg-accent-soft text-accent";
  return (
    <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${styles}`}>{children}</span>
  );
}

// Casilla de autorización para el tratamiento de datos personales (Ley 1581
// de 2012). Empieza SIEMPRE desmarcada: la autorización debe ser expresa, no
// presumida. `texto` dice para qué se usarán los datos en ese formulario.
export function AceptarPolitica({
  checked,
  onChange,
  texto,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  texto: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-background/60 p-3.5">
      <input
        type="checkbox"
        required
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-[var(--brand)]"
      />
      <span className="text-sm leading-snug text-ink-soft">
        He leído y acepto la{" "}
        <a
          href="/politica-de-datos"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-brand-dark underline underline-offset-2"
        >
          política de tratamiento de datos personales
        </a>{" "}
        y autorizo el tratamiento de mis datos para {texto}.
      </span>
    </label>
  );
}
