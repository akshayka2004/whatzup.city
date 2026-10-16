'use client';

import { Minus, Plus } from 'lucide-react';
import { formatINR } from '@/lib/subscription-plans';
import { cn } from '@/lib/utils';
import type { CatalogueItem } from '@saas/types';
import { cycleSuffix, effectLabel, type PurchasableCycle } from './plan-helpers';

const MAX_UNITS = 50;

/** One add-on row: name, price for the chosen cycle, a 44px stepper and a live "+N" preview. */
export function AddonStepper({
  item,
  unit,
  cycle,
  quantity,
  onChange,
}: {
  item: CatalogueItem;
  /** GST-inclusive unit price for the cycle (never null here — unsellable cycles are hidden by the caller). */
  unit: number;
  cycle: PurchasableCycle;
  quantity: number;
  onChange: (next: number) => void;
}) {
  const set = (n: number) => onChange(Math.max(0, Math.min(MAX_UNITS, n)));
  const active = quantity > 0;
  return (
    <div
      className={cn(
        'rounded-card border bg-card p-4 transition-colors',
        active ? 'border-primary/50 bg-brand-soft/40' : 'border-border',
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-foreground">{item.name}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{formatINR(unit)}</span>
            {cycleSuffix(cycle)} each · {item.blurb}
          </div>
        </div>
        <div className="flex items-center gap-1" role="group" aria-label={`${item.name} quantity`}>
          <button
            type="button"
            onClick={() => set(quantity - 1)}
            disabled={quantity <= 0}
            aria-label={`Remove one ${item.name}`}
            className="ui-press inline-flex size-11 items-center justify-center rounded-control border border-border-strong/70 bg-card text-foreground transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span
            className="min-w-10 text-center text-base font-bold tabular-nums text-foreground"
            aria-live="polite"
          >
            {quantity}
          </span>
          <button
            type="button"
            onClick={() => set(quantity + 1)}
            disabled={quantity >= MAX_UNITS}
            aria-label={`Add one ${item.name}`}
            className="ui-press inline-flex size-11 items-center justify-center rounded-control border border-border-strong/70 bg-card text-foreground transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>
      {active && (
        <p className="ui-fade-up mt-2 text-xs font-semibold text-brand-soft-foreground">
          {effectLabel(item, quantity)} · {formatINR(unit * quantity)}
          {cycleSuffix(cycle)}
        </p>
      )}
    </div>
  );
}
