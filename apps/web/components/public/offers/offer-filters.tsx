'use client';

import type { ComponentType } from 'react';
import { Clock, Globe, ShoppingBag, Sparkles, Star, Store } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OfferChip, OfferSort } from './offer-model';

const CHIPS: { id: OfferChip; label: string; icon?: ComponentType<{ className?: string }> }[] = [
  { id: 'all', label: 'All', icon: Sparkles },
  { id: 'instore', label: 'Instore', icon: Store },
  { id: 'takeaway', label: 'Takeaway', icon: ShoppingBag },
  { id: 'online', label: 'Online', icon: Globe },
  { id: 'ending', label: 'Ending soon', icon: Clock },
  { id: 'platform', label: 'Platform offers', icon: Star },
];

export const SORT_OPTIONS: { value: OfferSort; label: string }[] = [
  { value: 'featured', label: 'Featured' },
  { value: 'ending', label: 'Ending soonest' },
  { value: 'discount', label: 'Biggest discount' },
];

/** Horizontally scrolling quick filters. 44px tall touch targets; the row scrolls, the page never does. */
export function OfferFilterChips({
  value,
  onChange,
}: {
  value: OfferChip;
  onChange: (chip: OfferChip) => void;
}) {
  return (
    <div role="group" aria-label="Filter offers" className="ui-scroll-x flex gap-2 pb-1">
      {CHIPS.map(({ id, label, icon: Icon }) => {
        const active = value === id;
        return (
          <button
            key={id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(id)}
            className={cn(
              'ui-press inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors',
              active
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-card text-foreground hover:bg-secondary',
            )}
          >
            {Icon && <Icon className="h-4 w-4" />}
            {label}
          </button>
        );
      })}
    </div>
  );
}
