import { cn } from '@/lib/utils';

/**
 * The Whtzup.city mark. `logo.png` is 1024px (46 KB) but is shown at 20-36px, so the page loads
 * two pre-sized copies instead (96px ≈ 2 KB, 192px ≈ 4 KB for 2x screens).
 *
 * Deliberately NOT next/image: the optimiser fetches the file back from this same server, and when
 * that internal fetch failed in production it logged "isn't a valid image for /logo.png" on every
 * request. Static files have no moving parts. The mark is black on transparent, so dark mode
 * inverts it.
 */
export function BrandLogo({
  alt = 'Whtzup.city',
  className,
}: {
  alt?: string;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo-96.png"
      srcSet="/logo-96.png 1x, /logo-192.png 2x"
      alt={alt}
      width={96}
      height={96}
      decoding="async"
      className={cn('dark:invert', className)}
    />
  );
}
