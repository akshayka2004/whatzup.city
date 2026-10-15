import type { CSSProperties } from 'react';
import { categoryIconFor } from '@/components/public/search/category-icon';
import { cn } from '@/lib/utils';

// Hues that sit well beside the indigo brand in both themes. Picked per category
// (not per business) so a whole category shares one recognisable tint.
const HUES = [277, 166, 30, 345, 230, 300, 75, 200];

function hueFor(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return HUES[h % HUES.length];
}

/**
 * Placeholder art for listings without a photo: a soft category tint, a dotted
 * texture and the category's icon. Replaces the giant initial, which made most
 * listings look unfinished. Pure CSS/SVG, so it costs nothing to load.
 */
export function CategoryCover({
  category,
  className,
  iconClassName,
  size = 'lg',
}: {
  category?: string | null;
  className?: string;
  iconClassName?: string;
  size?: 'sm' | 'lg';
}) {
  const key = (category || 'listing').toLowerCase();
  const Icon = categoryIconFor(key);
  const hue = hueFor(key);
  const tint = `oklch(0.62 0.13 ${hue})`;
  const style = {
    backgroundColor: `color-mix(in oklch, var(--card) 86%, ${tint})`,
    backgroundImage: [
      `radial-gradient(circle at 20% 15%, color-mix(in oklch, ${tint} 22%, transparent), transparent 55%)`,
      `radial-gradient(color-mix(in oklch, ${tint} 28%, transparent) 1px, transparent 1.5px)`,
    ].join(', '),
    backgroundSize: 'auto, 14px 14px',
  } as CSSProperties;

  return (
    <div
      aria-hidden
      className={cn('flex h-full w-full items-center justify-center', className)}
      style={style}
    >
      <span
        className={cn(
          'flex items-center justify-center rounded-full bg-card/70 shadow-e1 backdrop-blur-sm',
          size === 'lg' ? 'h-20 w-20 sm:h-24 sm:w-24' : 'h-11 w-11',
        )}
        style={{ color: `color-mix(in oklch, ${tint} 75%, var(--foreground))` }}
      >
        <Icon
          className={cn(size === 'lg' ? 'h-9 w-9 sm:h-10 sm:w-10' : 'h-5 w-5', iconClassName)}
          strokeWidth={1.75}
        />
      </span>
    </div>
  );
}
