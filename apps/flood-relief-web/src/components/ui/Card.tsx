import type { HTMLAttributes } from "react";
import { cn } from "@/utils/cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border-subtle bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
        className
      )}
      {...props}
    />
  );
}
