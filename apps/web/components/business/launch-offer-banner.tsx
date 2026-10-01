'use client';

import { Gift } from 'lucide-react';

interface LaunchOfferBannerProps {
  slotsPerCategory: number;
  price: number;
  durationDays: number;
  /** null until the business has chosen a category. */
  categoryName: string | null;
  slotsLeft: number;
}

/** "First N businesses per category get the launch price" — with the live count once a category is known. */
export function LaunchOfferBanner({ slotsPerCategory, price, durationDays, categoryName, slotsLeft }: LaunchOfferBannerProps) {
  const soldOut = categoryName !== null && slotsLeft <= 0;
  return (
    <div
      role="status"
      className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${
        soldOut
          ? 'border-border bg-secondary/50 text-muted-foreground'
          : 'border-emerald-500/30 bg-emerald-500/10 text-foreground'
      }`}
    >
      <Gift className={`mt-0.5 h-5 w-5 shrink-0 ${soldOut ? 'text-muted-foreground' : 'text-emerald-400'}`} />
      <div className="min-w-0">
        {categoryName === null ? (
          <>
            <p className="font-semibold">Launch offer</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              The first {slotsPerCategory} businesses in every category get our launch plan for just ₹{price.toLocaleString('en-IN')}
              , valid {durationDays} days. Pick your category to see how many slots are left.
            </p>
          </>
        ) : soldOut ? (
          <>
            <p className="font-semibold">Launch-offer slots for {categoryName} are all taken</p>
            <p className="text-xs mt-0.5">You can still register with any regular plan.</p>
          </>
        ) : (
          <>
            <p className="font-semibold">
              <span className="text-emerald-400">
                {slotsLeft} of {slotsPerCategory}
              </span>{' '}
              launch-offer slots left in {categoryName}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Register now for just ₹{price.toLocaleString('en-IN')}, valid {durationDays} days.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
