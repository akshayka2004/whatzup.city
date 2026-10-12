'use client';

import { BarChart3, Ticket, Tag } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { StatusPill } from '@/components/common/status-pill';
import { cn } from '@/lib/utils';
import type { PlanEntitlements } from '@/hooks/use-entitlements';

function Meter({
  icon: Icon,
  label,
  used,
  limit,
  over,
}: {
  icon: typeof Tag;
  label: string;
  used: number;
  limit: number;
  over: number;
}) {
  const none = limit <= 0;
  const pct = none ? 0 : Math.min(100, Math.round((used / limit) * 100));
  const full = !none && used >= limit;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
          {label}
        </span>
        <span
          className={cn(
            'tabular-nums font-semibold',
            over > 0 ? 'text-danger-soft-foreground' : 'text-foreground',
          )}
        >
          {none ? 'Not in your plan' : `${used} / ${limit} live`}
        </span>
      </div>
      <Progress
        value={pct}
        aria-label={`${label} in use`}
        className={cn(
          'h-2',
          over > 0 && 'bg-danger-soft [&>div]:bg-destructive',
          full && over === 0 && '[&>div]:bg-warning',
        )}
      />
    </div>
  );
}

/** Live offers / vouchers against the plan limit, plus whether analytics is on. */
export function UsageMeters({ ent }: { ent: PlanEntitlements }) {
  return (
    <div className="space-y-4">
      <Meter
        icon={Tag}
        label="Offers"
        used={ent.usage.offers}
        limit={ent.offers}
        over={ent.overLimit.offers}
      />
      <Meter
        icon={Ticket}
        label="Vouchers"
        used={ent.usage.vouchers}
        limit={ent.vouchers}
        over={ent.overLimit.vouchers}
      />
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
          <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
          Analytics
        </span>
        <StatusPill
          tone={ent.analytics ? 'success' : 'neutral'}
          label={ent.analytics ? 'On' : 'Off'}
          dot={false}
        />
      </div>
    </div>
  );
}
