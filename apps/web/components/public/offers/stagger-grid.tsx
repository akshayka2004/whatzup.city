import { Children } from 'react';
import { cn } from '@/lib/utils';

const GAP = {
  4: ['gap-4', 'mt-4'],
  5: ['gap-5', 'mt-5'],
  6: ['gap-6', 'mt-6'],
} as const;

/**
 * Grid whose first screenful rises in one after another (`ui-stagger`); everything
 * after that renders in a second, identically-laid-out grid with no entrance
 * animation, so a long list never sits invisible waiting for its turn.
 *
 * Pass the grid columns in `className`; the gap comes from `gap`. Each child
 * should be its own wrapper element — `ui-stagger` animates direct children, so
 * hover/exit transitions belong on an element inside that wrapper.
 */
export function StaggerGrid({
  children,
  className,
  gap = 4,
  first = 6,
}: {
  children: React.ReactNode;
  className?: string;
  gap?: keyof typeof GAP;
  first?: number;
}) {
  const items = Children.toArray(children);
  const [gapCls, marginCls] = GAP[gap];
  if (items.length <= first) {
    return <div className={cn('ui-stagger', gapCls, className)}>{items}</div>;
  }
  return (
    <>
      <div className={cn('ui-stagger', gapCls, className)}>{items.slice(0, first)}</div>
      <div className={cn(marginCls, gapCls, className)}>{items.slice(first)}</div>
    </>
  );
}
