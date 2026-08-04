import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-heading text-2xl font-bold text-primary-900 sm:text-3xl">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-primary-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}
