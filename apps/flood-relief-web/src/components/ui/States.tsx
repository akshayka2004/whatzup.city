import type { ReactNode } from "react";
import { Loader2, Inbox, AlertTriangle, type LucideIcon } from "lucide-react";

export function Spinner({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-primary-500">
      <Loader2 className="size-8 animate-spin" aria-hidden="true" />
      <p className="text-sm font-medium">{label}</p>
    </div>
  );
}

export function EmptyState({
  title = "Nothing here yet",
  description,
  action,
  icon: Icon = Inbox,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-primary-200 bg-white px-6 py-16 text-center">
      <Icon className="size-9 text-primary-300" aria-hidden="true" />
      <h3 className="font-heading text-base font-semibold text-primary-900">{title}</h3>
      {description && <p className="max-w-sm text-sm text-primary-500">{description}</p>}
      {action}
    </div>
  );
}

export function ErrorState({
  message = "We couldn't load this. Please try again.",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-danger-100 bg-danger-50 px-6 py-16 text-center">
      <AlertTriangle className="size-9 text-danger-500" aria-hidden="true" />
      <p className="max-w-sm text-sm font-medium text-danger-700">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="cursor-pointer rounded-lg bg-danger-600 px-4 py-2 text-sm font-semibold text-white transition-[transform] duration-150 active:scale-[0.97]"
        >
          Try again
        </button>
      )}
    </div>
  );
}
