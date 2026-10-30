'use client';

import { useCallback, useEffect, useState } from 'react';
import { Clock, Loader2, Search, Wallet } from 'lucide-react';
import { rupees } from '@saas/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { apiService } from '@/lib/services/api-service';
import { fmtWhen } from '@/lib/event-booking';
import type { HostSummary, PaymentRow, PaymentSummary } from '@/lib/event-host';
import { cn } from '@/lib/utils';
import { PaymentDetailModal, StatusChip, payments } from './payment-detail';

const FILTERS = [
  { key: 'SUBMITTED', label: 'To verify' },
  { key: 'PENDING', label: 'Waiting for payer' },
  { key: 'APPROVED', label: 'Verified' },
  { key: 'REJECTED', label: 'Rejected' },
  { key: 'EXPIRED', label: 'Expired' },
  { key: '', label: 'All' },
] as const;

interface Listing {
  data: PaymentRow[];
  meta: { total: number; page: number; limit: number };
  summary: PaymentSummary;
}

/** The host's queue of UPI payments: see the proof, check it in the bank app, approve or reject. */
export function PaymentsTab({
  eventId,
  summary,
  onChanged,
}: {
  eventId: string;
  summary: HostSummary;
  /** Refresh the numbers in the hub header and tab badge. */
  onChanged: () => void;
}) {
  const [status, setStatus] = useState<string>('SUBMITTED');
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [list, setList] = useState<Listing | null>(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page) });
    if (status) params.set('status', status);
    if (q) params.set('search', q);
    const res = await apiService.get<Listing>(
      `/v1/events/${eventId}/host/payments?${params.toString()}`,
      { fresh: true },
    );
    if (res.error) setError(res.error);
    else {
      setError('');
      setList(res.data);
    }
  }, [eventId, status, q, page]);

  useEffect(() => {
    load();
  }, [load]);

  // Wait a moment after typing before searching.
  useEffect(() => {
    const t = window.setTimeout(() => {
      setQ(search.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(t);
  }, [search]);

  if (
    !summary.payEnabled &&
    (list?.summary ? Object.values(list.summary.counts).every((n) => n === 0) : true)
  ) {
    return (
      <div className="rounded-card border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        <Wallet className="mx-auto mb-2 size-6 opacity-60" aria-hidden />
        {summary.isPaidEvent
          ? 'Payments are not switched on. Turn them on in Settings to sell tickets with UPI.'
          : 'This event has no paid tickets. Set a ticket price on the event first, then turn on payments in Settings.'}
      </div>
    );
  }

  const s = list?.summary;
  const pages = list ? Math.max(1, Math.ceil(list.meta.total / list.meta.limit)) : 1;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="gap-1 rounded-card p-4">
          <p className="text-xs text-muted-foreground">Verified payments</p>
          <p className="text-2xl font-bold tabular-nums text-foreground">
            {rupees(s?.verifiedAmount ?? 0)}
          </p>
          <p className="text-xs text-muted-foreground">{payments(s?.counts.APPROVED ?? 0)}</p>
        </Card>
        <Card
          className={cn(
            'gap-1 rounded-card p-4',
            (s?.counts.SUBMITTED ?? 0) > 0 && 'border-warning/40',
          )}
        >
          <p className="text-xs text-muted-foreground">Waiting for you to verify</p>
          <p className="text-2xl font-bold tabular-nums text-foreground">
            {rupees(s?.awaitingAmount ?? 0)}
          </p>
          <p className="text-xs text-muted-foreground">{payments(s?.counts.SUBMITTED ?? 0)}</p>
        </Card>
        <Card className="gap-1 rounded-card p-4">
          <p className="text-xs text-muted-foreground">Seats held, payer yet to pay</p>
          <p className="text-2xl font-bold tabular-nums text-foreground">
            {rupees(s?.heldAmount ?? 0)}
          </p>
          <p className="text-xs text-muted-foreground">{payments(s?.counts.PENDING ?? 0)}</p>
        </Card>
      </div>

      <p className="rounded-xl bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
        Money goes straight to your UPI account. Whtzup.city never holds it. Check each payment in
        your own UPI or bank app (amount and reference number) before approving. Every approval and
        rejection is recorded and visible to the admins.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <div role="tablist" aria-label="Payment status" className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => {
            const n = f.key ? s?.counts[f.key as keyof PaymentSummary['counts']] : undefined;
            return (
              <button
                key={f.key || 'all'}
                role="tab"
                type="button"
                aria-selected={status === f.key}
                onClick={() => {
                  setStatus(f.key);
                  setPage(1);
                }}
                className={cn(
                  'min-h-9 cursor-pointer rounded-full border px-3 text-sm font-medium transition-colors',
                  status === f.key
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:text-foreground',
                )}
              >
                {f.label}
                {n ? <span className="ml-1.5 tabular-nums">{n}</span> : null}
              </button>
            );
          })}
        </div>
        <div className="relative ml-auto w-full sm:w-64">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, email or reference"
            aria-label="Search payments"
            className="h-10 pl-9"
          />
        </div>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : !list ? (
        <Loader2
          className="mx-auto my-10 size-6 animate-spin text-muted-foreground"
          aria-label="Loading"
        />
      ) : list.data.length === 0 ? (
        <p className="rounded-card border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          {status === 'SUBMITTED'
            ? 'Nothing to verify right now.'
            : 'No payments match this filter.'}
        </p>
      ) : (
        <ul className="space-y-2">
          {list.data.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => setOpen(p.id)}
                className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-card border border-border bg-card p-4 text-left hover:bg-muted/40"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium text-foreground">{p.payer.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {p.seats} {p.seats === 1 ? 'ticket' : 'tickets'}
                    {p.tier ? ` · ${p.tier}` : ''}
                    {p.utr ? ` · ref ${p.utr}` : ''}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {p.submittedAt
                      ? `Sent ${fmtWhen(p.submittedAt)}`
                      : `Held until ${fmtWhen(p.expiresAt)}`}
                    {p.hasScreenshot ? ' · screenshot' : ''}
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1">
                  <span className="font-semibold tabular-nums text-foreground">
                    {rupees(p.amount)}
                  </span>
                  <StatusChip status={p.status} />
                  {p.overdue && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive">
                      <Clock className="size-3" aria-hidden /> Over a day
                    </span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {list && pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <span className="text-muted-foreground">
            Page {page} of {pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      )}

      {open && (
        <PaymentDetailModal
          paymentId={open}
          eventId={eventId}
          load={`/v1/events/${eventId}/host/payments/${open}`}
          canAct
          onClose={() => setOpen(null)}
          onChanged={() => {
            load();
            onChanged();
          }}
        />
      )}
    </div>
  );
}
