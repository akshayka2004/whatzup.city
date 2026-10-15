import { cn } from '@/lib/utils';

/**
 * The Whtzup.city mark: an indigo tile with a geometric "w" and a mint dot (the
 * "you are here" of a city guide). Inline SVG, so it stays crisp at the 20-32px
 * it is shown at, follows the theme tokens and costs no request. The old raster
 * wordmark was unreadable at these sizes; the name is set as text beside it.
 */
export function BrandLogo({
  alt = 'Whtzup.city',
  className,
}: {
  alt?: string;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 32 32"
      {...(alt ? { role: 'img', 'aria-label': alt } : { 'aria-hidden': true })}
      className={cn('aspect-square h-8 w-auto', className)}
    >
      <rect width="32" height="32" rx="9" fill="var(--primary)" />
      <path
        d="M7.5 11.5 L11.6 22 L16 13.8 L20.4 22 L24.5 11.5"
        fill="none"
        stroke="var(--primary-foreground)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="24.5" cy="7.5" r="2.6" fill="var(--highlight)" />
    </svg>
  );
}
