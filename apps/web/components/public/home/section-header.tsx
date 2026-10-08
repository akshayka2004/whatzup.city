import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

/** Section title with a 44px-tall "See all" link on the right. */
export function SectionHeader({
  title,
  subtitle,
  href,
  linkLabel = 'See all',
}: {
  title: string;
  subtitle?: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3 sm:mb-4">
      <div className="min-w-0">
        <h2 className="text-lg font-black leading-tight text-foreground sm:text-xl">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {href && (
        <Link
          href={href}
          className="-mr-2 inline-flex min-h-11 shrink-0 items-center gap-0.5 rounded-lg px-2 text-sm font-semibold text-primary transition-colors hover:text-primary/80"
        >
          {linkLabel}
          <ChevronRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}
