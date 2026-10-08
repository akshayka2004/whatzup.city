'use client';

import { BusinessCard } from '@/components/business-card';
import { cn } from '@/lib/utils';

/**
 * The shared card grid for Search / Category / Nearby: one column at 375px,
 * two from `sm`, three from `lg`. Each item sits in a `ui-cv-auto` wrapper
 * (off-screen cards skip layout + paint) with a little padding so the card's
 * hover lift and shadow aren't clipped by the wrapper's paint containment.
 */
export function ResultsGrid({
  items,
  distances,
  showLinks,
  onLinkClick,
  className,
}: {
  items: any[];
  /** Business id → km, for the distance badge. */
  distances?: Map<string, number>;
  showLinks?: boolean;
  /** Fired when any link inside a card is followed (used to remember a search). */
  onLinkClick?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn('ui-stagger grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3', className)}
      onClickCapture={
        onLinkClick
          ? (e) => {
              if ((e.target as HTMLElement).closest?.('a')) onLinkClick();
            }
          : undefined
      }
    >
      {items.map((b, i) => (
        <div
          key={b.id}
          className="ui-cv-auto min-w-0 -mx-3 -mt-3 -mb-6 px-3 pb-6 pt-3 [contain-intrinsic-size:auto_430px]!"
        >
          <BusinessCard
            business={b}
            distanceKm={distances?.get(b.id) ?? null}
            priority={i < 2}
            showLinks={showLinks}
          />
        </div>
      ))}
    </div>
  );
}
