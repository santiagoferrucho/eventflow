import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap [&_svg]:size-3", {
  variants: {
    tone: {
      brand: "bg-brand-soft text-brand-dark",
      gold: "bg-gold-soft text-gold",
      danger: "bg-danger-soft text-danger",
      success: "bg-success-soft text-success",
      neutral: "bg-line text-ink-soft",
    },
  },
  defaultVariants: { tone: "brand" },
});

export function Badge({ className, tone, ...props }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
