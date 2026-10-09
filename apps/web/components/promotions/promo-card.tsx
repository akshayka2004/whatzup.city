'use client';

import { Fragment, type ComponentType, type ReactNode } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { StatusPill, type PillTone } from '@/components/common/status-pill';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export type PromoStat = { label: string; value: number | string; hint?: string };
export type PromoMenuItem = {
  label: string;
  onClick: () => void;
  icon?: ComponentType<{ className?: string }>;
  danger?: boolean;
};

/**
 * One card for every promotion type (offers, vouchers, discount wheels): a ticket-style
 * value stub on the left, title + status + meta in the middle, and a single stat row so
 * owners compare performance at a glance. The primary toggle stays visible; the rest
 * lives in an overflow menu.
 */
export function PromoCard({
  icon: Icon,
  value,
  valueCaption,
  title,
  subtitle,
  status,
  chips,
  stats,
  primary,
  menu,
  muted = false,
  onOpen,
}: {
  icon: ComponentType<{ className?: string }>;
  value: string;
  valueCaption?: string;
  title: string;
  subtitle?: ReactNode;
  status: { tone: PillTone; label: string; live?: boolean };
  chips?: { label: string; tone?: PillTone }[];
  stats?: PromoStat[];
  primary?: ReactNode;
  menu?: PromoMenuItem[];
  muted?: boolean;
  onOpen?: () => void;
}) {
  return (
    <article
      className={cn(
        'group flex overflow-hidden rounded-card border border-border bg-card shadow-e1 transition-shadow hover:shadow-e2',
        muted && 'opacity-75',
      )}
    >
      {/* Ticket stub */}
      <div className="relative flex w-24 shrink-0 flex-col items-center justify-center gap-1 border-r border-dashed border-border bg-brand-soft px-2 py-4 text-center text-brand-soft-foreground sm:w-28">
        <Icon className="size-4 opacity-70" aria-hidden />
        <span className="text-heading font-bold leading-tight tabular-nums break-words">
          {value}
        </span>
        {valueCaption && <span className="text-caption opacity-80">{valueCaption}</span>}
        <span
          className="absolute -right-2 -top-2 size-4 rounded-full border border-border bg-background"
          aria-hidden
        />
        <span
          className="absolute -bottom-2 -right-2 size-4 rounded-full border border-border bg-background"
          aria-hidden
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            {onOpen ? (
              <button
                type="button"
                onClick={onOpen}
                className="text-left font-semibold leading-snug hover:underline"
              >
                <span className="line-clamp-2 break-words">{title}</span>
              </button>
            ) : (
              <h3 className="line-clamp-2 break-words font-semibold leading-snug">{title}</h3>
            )}
            {subtitle && <p className="mt-0.5 text-caption text-muted-foreground">{subtitle}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <StatusPill tone={status.tone} label={status.label} live={status.live} />
            {menu && menu.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" aria-label={`More actions for ${title}`}>
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {menu.map((m, i) => (
                    <Fragment key={m.label}>
                      {m.danger && i > 0 && <DropdownMenuSeparator />}
                      <DropdownMenuItem
                        onSelect={m.onClick}
                        variant={m.danger ? 'destructive' : 'default'}
                      >
                        {m.icon && <m.icon className="size-4" />}
                        {m.label}
                      </DropdownMenuItem>
                    </Fragment>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {chips && chips.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {chips.map((c) => (
              <StatusPill key={c.label} tone={c.tone ?? 'neutral'} label={c.label} />
            ))}
          </div>
        )}

        <div className="mt-auto flex flex-wrap items-end justify-between gap-3">
          {stats && stats.length > 0 && (
            <dl className="flex gap-5">
              {stats.map((s) => (
                <div key={s.label} title={s.hint}>
                  <dt className="text-caption text-muted-foreground">{s.label}</dt>
                  <dd className="text-sm font-semibold tabular-nums">
                    {typeof s.value === 'number' ? s.value.toLocaleString('en-IN') : s.value}
                  </dd>
                </div>
              ))}
            </dl>
          )}
          {primary}
        </div>
      </div>
    </article>
  );
}

export function PromoGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">{children}</div>;
}

export function PromoGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <PromoGrid>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="ui-skeleton h-40 rounded-card" />
      ))}
    </PromoGrid>
  );
}
