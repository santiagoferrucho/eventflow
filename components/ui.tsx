import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "outline" }) {
  const base =
    "inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]";
  const styles = {
    primary:
      "bg-brand text-white shadow-[0_1px_2px_rgba(11,17,32,0.05),0_8px_20px_-6px_rgba(99,85,255,0.45)] hover:bg-brand-dark hover:shadow-[0_1px_2px_rgba(11,17,32,0.05),0_10px_24px_-6px_rgba(99,85,255,0.55)]",
    ghost: "bg-transparent text-ink-soft hover:bg-brand-soft hover:text-brand-dark",
    outline: "bg-surface text-ink border border-line-strong hover:border-brand hover:text-brand-dark",
  }[variant];
  return <button className={`${base} ${styles} ${className}`} {...props} />;
}

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

export function Badge({
  children,
  tone = "brand",
}: {
  children: ReactNode;
  tone?: "brand" | "gold" | "danger" | "success";
}) {
  const styles = {
    brand: "bg-brand-soft text-brand-dark",
    gold: "bg-gold-soft text-gold",
    danger: "bg-danger-soft text-danger",
    success: "bg-success-soft text-success",
  }[tone];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${styles}`}>
      {children}
    </span>
  );
}

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
                {isDone ? "✓" : i + 1}
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
