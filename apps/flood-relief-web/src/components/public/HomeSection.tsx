import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export function HomeSection({
  title,
  description,
  viewAllHref,
  children,
}: {
  title: string;
  description?: string;
  viewAllHref: string;
  children: ReactNode;
}) {
  return (
    <section className="container-page py-10">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h2 className="font-heading text-xl font-bold text-primary-900 sm:text-2xl">{title}</h2>
          {description && <p className="mt-1 text-sm text-primary-500">{description}</p>}
        </div>
        <Link
          to={viewAllHref}
          className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-accent-700 transition-colors hover:text-accent-800"
        >
          View all
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
      {children}
    </section>
  );
}
