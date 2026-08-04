import type { LucideIcon } from "lucide-react";
import { Card } from "./Card";

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "primary",
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
  tone?: "primary" | "accent" | "warning" | "success" | "danger";
}) {
  const toneClasses = {
    primary: "bg-primary-100 text-primary-700",
    accent: "bg-accent-100 text-accent-700",
    warning: "bg-warning-50 text-warning-600",
    success: "bg-success-50 text-success-600",
    danger: "bg-danger-50 text-danger-600",
  } as const;

  return (
    <Card className="flex items-center gap-4 p-5">
      <div className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${toneClasses[tone]}`}>
        <Icon className="size-6" aria-hidden="true" />
      </div>
      <div>
        <p className="text-sm font-medium text-primary-500">{label}</p>
        <p className="font-heading text-2xl font-bold text-primary-900">{value}</p>
      </div>
    </Card>
  );
}
