import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

type Tone = "neutral" | "success" | "warning" | "danger" | "accent";

const toneClasses: Record<Tone, string> = {
  neutral: "bg-primary-100 text-primary-700",
  success: "bg-success-50 text-success-600",
  warning: "bg-warning-50 text-warning-600",
  danger: "bg-danger-50 text-danger-600",
  accent: "bg-accent-100 text-accent-700",
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
        toneClasses[tone]
      )}
    >
      {children}
    </span>
  );
}
