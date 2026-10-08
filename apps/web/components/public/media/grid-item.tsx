import type { ReactNode } from 'react';

/**
 * Wrapper for a card in a long grid. It carries `ui-cv-auto` (off-screen cards
 * skip layout/paint) and is the element `ui-stagger` animates, so the card inside
 * can still use `ui-lift` without the entrance animation holding its transform.
 *
 * The negative margin / matching padding gives the hover shadow room inside the
 * containment box (content-visibility clips to its own padding box), and
 * pointer-events are handed back to the card so the invisible padding never
 * steals taps from neighbours.
 */
export function GridItem({ children, intrinsicHeight = 480 }: { children: ReactNode; intrinsicHeight?: number }) {
  return (
    <div
      className="ui-cv-auto pointer-events-none -mx-3 -mt-3 -mb-6 px-3 pb-6 pt-3"
      style={{ containIntrinsicSize: `auto ${intrinsicHeight}px` }}
    >
      <div className="pointer-events-auto h-full">{children}</div>
    </div>
  );
}
