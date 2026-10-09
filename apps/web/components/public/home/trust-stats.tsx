'use client';

import { BadgeCheck, HeartHandshake, Receipt, type LucideIcon } from 'lucide-react';
import { CountUp } from '@/components/common/count-up';

export type HomeStat = { label: string; value: number; icon: LucideIcon };

/** A counter only earns a place on the page once the number is worth showing. */
const MIN_IMPRESSIVE = 25;

const TRUST: Array<{ icon: LucideIcon; title: string; note: string }> = [
  { icon: Receipt, title: 'Invoice-verified reviews', note: 'Every review is backed by a bill' },
  { icon: BadgeCheck, title: 'Verified merchants', note: 'Checked before they go live' },
  {
    icon: HeartHandshake,
    title: 'Free for customers',
    note: 'Browse, claim and review at no cost',
  },
];

const GRID: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-3',
};

export function TrustStats({ stats }: { stats: HomeStat[] }) {
  const strong = stats.filter((s) => s.value >= MIN_IMPRESSIVE);

  return (
    <section className="mb-10 space-y-3 md:mb-14">
      {strong.length > 0 && (
        <div className={`grid gap-3 ${GRID[Math.min(strong.length, 3)]}`}>
          {strong.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="ui-fade-up rounded-2xl border border-border bg-card p-5 text-center"
                style={{ animationDelay: `${Math.min(i, 8) * 0.05}s` }}
              >
                <div className="mb-2 flex justify-center">
                  <div className="rounded-lg border border-primary/20 bg-primary/12 p-2">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                </div>
                <span className="block text-2xl font-black tabular-nums text-foreground">
                  <CountUp value={stat.value} />+
                </span>
                <p className="mt-1 text-xs font-medium text-muted-foreground">{stat.label}</p>
              </div>
            );
          })}
        </div>
      )}

      <ul className="ui-hairline grid grid-cols-1 divide-y divide-border rounded-2xl sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {TRUST.map(({ icon: Icon, title, note }) => (
          <li key={title} className="flex items-center gap-3 px-4 py-3.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/12">
              <Icon className="h-5 w-5 text-primary" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold leading-tight text-foreground">{title}</span>
              <span className="block text-xs text-muted-foreground">{note}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
