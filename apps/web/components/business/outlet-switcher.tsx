'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, ChevronsUpDown, Loader2, Plus, Settings2, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useActiveBusiness } from '@/hooks/use-active-business';

type PillTone = 'live' | 'pending' | 'rejected' | 'other';

export function outletStatusMeta(status?: string | null): { label: string; tone: PillTone } {
  switch ((status || '').toUpperCase()) {
    case 'APPROVED':
      return { label: 'Live', tone: 'live' };
    case 'DRAFT':
    case 'PENDING_VERIFICATION':
    case 'UNDER_REVIEW':
      return { label: 'Pending', tone: 'pending' };
    case 'REJECTED':
      return { label: 'Rejected', tone: 'rejected' };
    default:
      return { label: (status || 'Unknown').toLowerCase().replace(/_/g, ' '), tone: 'other' };
  }
}

const TONE_CLASS: Record<PillTone, string> = {
  live: 'bg-success/10 text-success',
  pending: 'bg-warning/10 text-warning',
  rejected: 'bg-destructive/10 text-destructive',
  other: 'bg-muted text-muted-foreground',
};

export function OutletStatusPill({ status, className }: { status?: string | null; className?: string }) {
  const { label, tone } = outletStatusMeta(status);
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize',
        TONE_CLASS[tone],
        className,
      )}
    >
      {label}
    </span>
  );
}

/** Label shown for an outlet: its own label when set, otherwise the full listing name. */
export function outletDisplayName(o: { name: string; outletLabel?: string | null }) {
  return o.outletLabel?.trim() || o.name;
}

/** Brand-owner outlet picker. Renders nothing for single-business accounts. */
export function OutletSwitcher({ compact }: { compact?: boolean }) {
  const { brand, outlets, activeBusinessId, isBrand, loading, switchOutlet } = useActiveBusiness();
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  if (loading || !isBrand || !brand) return null;

  const active = outlets.find((o) => o.id === activeBusinessId) ?? outlets[0];
  const busy = switchingId !== null;

  const pick = async (id: string) => {
    if (id === activeBusinessId || busy) return;
    setError('');
    setSwitchingId(id);
    const res = await switchOutlet(id);
    // On success the page reloads; only a failure leaves us here.
    if (!res.ok) {
      setError(res.error || 'Could not switch outlet.');
      setSwitchingId(null);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          aria-label="Switch outlet"
          className={cn(
            'h-11 rounded-xl border-border bg-card text-foreground cursor-pointer ui-press',
            compact ? 'w-11 px-0' : 'w-full max-w-xs justify-between gap-2 px-3',
          )}
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : compact ? (
            <Store className="h-4 w-4" />
          ) : (
            <>
              <span className="flex min-w-0 items-center gap-2">
                <Store className="h-4 w-4 shrink-0 text-primary" />
                <span className="truncate text-sm font-medium">{active ? outletDisplayName(active) : brand.name}</span>
              </span>
              <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={6}
        className="z-[300] w-[min(22rem,calc(100vw-1.5rem))] max-h-[70vh] overflow-y-auto rounded-xl p-1.5"
      >
        <DropdownMenuLabel className="px-2 pb-1 pt-1.5">
          <span className="block truncate text-sm font-semibold text-foreground">{brand.name}</span>
          <span className="block text-[11px] font-normal text-muted-foreground">
            {outlets.length} outlet{outlets.length === 1 ? '' : 's'}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {outlets.map((o) => {
          const isActive = o.id === activeBusinessId;
          return (
            <DropdownMenuItem
              key={o.id}
              onSelect={() => pick(o.id)}
              className="min-h-11 cursor-pointer gap-3 rounded-lg px-2 py-2"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-foreground">{outletDisplayName(o)}</span>
                {o.city && <span className="block truncate text-xs text-muted-foreground">{o.city}</span>}
              </span>
              <OutletStatusPill status={o.status} />
              {isActive ? <Check className="h-4 w-4 shrink-0 text-primary" /> : <span className="h-4 w-4 shrink-0" />}
            </DropdownMenuItem>
          );
        })}
        {error && <p className="px-2 py-1.5 text-xs text-destructive">{error}</p>}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="min-h-11 cursor-pointer gap-2 rounded-lg px-2">
          <Link href="/dashboard/outlets">
            <Settings2 className="h-4 w-4" /> Manage outlets
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="min-h-11 cursor-pointer gap-2 rounded-lg px-2">
          <Link href="/dashboard/outlets?add=1">
            <Plus className="h-4 w-4" /> Add outlet
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
