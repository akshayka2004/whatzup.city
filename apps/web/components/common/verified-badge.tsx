import { BadgeCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Trust marker for verified businesses. Green = trust (per brand palette).
 * Always pairs the color with an icon + label — never hue alone.
 */
export function VerifiedBadge({ className, label = 'Verified' }: { className?: string; label?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-success/25 bg-success/12 px-1.5 py-0.5 text-[10px] font-semibold text-success',
        className,
      )}
    >
      <BadgeCheck className="h-3 w-3" />
      {label}
    </span>
  );
}
