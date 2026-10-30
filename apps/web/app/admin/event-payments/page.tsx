'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Clock, Loader2, Search, Wallet } from 'lucide-react';
import { rupees } from '@saas/types';
import { AdminLayout } from '@/components/layouts/admin-layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/common/empty-state';
import { PaymentDetailModal, StatusChip, payments } from '@/components/events/host/payment-detail';
import { useAuth } from '@/hooks/use-auth';
import { apiService } from '@/lib/services/api-service';
import { fmtWhen } from '@/lib/event-booking';
import type { PaymentRow, PaymentSummary } from '@/lib/event-host';
import { cn } from '@/lib/utils';

const FILTERS = [
  { key: '', label: 'All' },
  { key: 'SUBMITTED', label: 'Waiting for host' },
  { key: 'PENDING', label: 'Waiting for payer' },
  { key: 'APPROVED', label: 'Verified' },
  { key: 'REJECTED', label: 'Rejected' },
  { key: 'EXPIRED', label: 'Expired' },
  { key: 'CANCELLED', label: 'Cancelled' },
] as const;

interface Listing {
  data: PaymentRow[];
  meta: { total: number; page: number; limit: number };
  summary: PaymentSummary;
}

/**
 * Every UPI ticket payment on the platform, for the admins to watch. Money moves directly between
 * attendee and host, so this is about spotting stuck, disputed or suspicious payments: proof the
 * host has sat on, the same reference used twice, a pile of rejections. Read-only: the host verifies.
 */
export default function EventPaymentsMonitorPage() {
  const { user } = useAuth();
  const [status, setStatus] = useState('');
  const [overdue, setOverdue] = useState(false);
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [list, setList] = useState<Listing | null>(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page) });
    if (status) params.set('status', status);
    if (overdue) params.set('overdue', '1');
    if (q) params.set('search', q);
    const res = await apiService.get<Listing>(`/v1/events/admin/payments?${params.toString()}`, {
      fresh: true,
    });
    if (res.error) setError(res.error);
    else {
      setError('');
      setList(res.data);
    }
  }, [status, overdue, q, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setQ(search.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(t);
  }, [search]);

  const s = list?.summary;
  const pages = list ? Math.max(1, Math.ceil(list.meta.total / list.meta.limit)) : 1;
  const hubHref = (eventId: string) =>
    user?.role === 'SUPER_ADMIN' ? `/super-admin/events/${eventId}?tab=payments` : null;

  return (
    <AdminLayout>
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-brand-soft text-brand-soft-foreground">
            <Wallet className="size-5" aria-hidden />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Event payments</h1>
            <p className="text-sm text-muted-foreground">
              UPI ticket payments across every event. Hosts verify them; every step is logged here.
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="gap-1 rounded-card p-4">
            <p className="text-xs text-muted-foreground">Verified by hosts</p>
            <p className="text-2xl font-bold tabular-nums text-foreground">
              {rupees(s?.verifiedAmount ?? 0)}
            </p>
            <p className="text-xs text-muted-foreground">{payments(s?.counts.APPROVED ?? 0)}</p>
          </Card>
          <Card className="gap-1 rounded-card p-4">
            <p className="text-xs text-muted-foreground">Waiting for hosts</p>
            <p className="text-2xl font-bold tabular-nums text-foreground">
              {rupees(s?.awaitingAmount ?? 0)}
            </p>
            <p className="text-xs text-muted-foreground">{payments(s?.counts.SUBMITTED ?? 0)}</p>
          </Card>
          <button
            type="button"
            onClick={() => {
              setOverdue((o) => !o);
              setStatus('');
              setPage(1);
            }}
            aria-pressed={overdue}
            className={cn(
              'cursor-pointer rounded-card border bg-card p-4 text-left',
              overdue ? 'border-destructive' : 'border-border',
            )}
          >
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="size-3" aria-hidden /> Unverified for over a day
            </p>
            <p
              className={cn(
                'text-2xl font-bold tabular-nums',
                (s?.overdue ?? 0) > 0 ? 'text-destructive' : 'text-foreground',
              )}
            >
              {s?.overdue ?? 0}
            </p>
            <p className="text-xs text-muted-foreground">
              {overdue ? 'Showing these. Tap to clear.' : 'Tap to show them'}
            </p>
          </button>
          <Card className="gap-1 rounded-card p-4">
            <p className="text-xs text-muted-foreground">Seats held, not yet paid</p>
            <p className="text-2xl font-bold tabular-nums text-foreground">
              {rupees(s?.heldAmount ?? 0)}
            </p>
            <p className="text-xs text-muted-foreground">
              {payments(s?.counts.PENDING ?? 0)} · {s?.counts.EXPIRED ?? 0} expired
            </p>
          </Card>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div role="tablist" aria-label="Payment status" className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f.key || 'all'}
                role="tab"
                type="button"
                aria-selected={!overdue && status === f.key}
                onClick={() => {
                  setStatus(f.key);
                  setOverdue(false);
                  setPage(1);
                }}
                className={cn(
                  'min-h-9 cursor-pointer rounded-full border px-3 text-sm font-medium transition-colors',
                  !overdue && status === f.key
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:text-foreground',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="relative ml-auto w-full sm:w-72">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Event, payer, email or reference"
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
            className="mx-auto my-16 size-6 animate-spin text-muted-foreground"
            aria-label="Loading"
          />
        ) : list.data.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="No payments match"
            description="Payments appear here as soon as someone holds a seat on a paid event."
          />
        ) : (
          <ul className="space-y-2">
            {list.data.map((p) => (
              <li key={p.id}>
                <div className="flex items-stretch gap-2">
                  <button
                    type="button"
                    onClick={() => setOpen(p.id)}
                    className="flex min-w-0 flex-1 cursor-pointer items-center justify-between gap-3 rounded-card border border-border bg-card p-4 text-left hover:bg-muted/40"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-foreground">
                        {p.event?.title}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {p.event?.host} · {p.payer.name} · {p.seats}{' '}
                        {p.seats === 1 ? 'ticket' : 'tickets'}
                        {p.utr ? ` · ref ${p.utr}` : ''}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {p.submittedAt
                          ? `Proof sent ${fmtWhen(p.submittedAt)}`
                          : `Started ${fmtWhen(p.createdAt)}`}
                        {p.resubmitCount > 0 ? ` · corrected ${p.resubmitCount}×` : ''}
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <span className="font-semibold tabular-nums text-foreground">
                        {rupees(p.amount)}
                      </span>
                      <StatusChip status={p.status} />
                      {p.overdue && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive">
                          <AlertTriangle className="size-3" aria-hidden /> Host has not answered
                        </span>
                      )}
                    </span>
                  </button>
                  {hubHref(p.eventId) && (
                    <Button asChild variant="outline" size="sm" className="self-center">
                      <Link href={hubHref(p.eventId)!}>Event</Link>
                    </Button>
                  )}
                </div>
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
      </div>

      {open && (
        <PaymentDetailModal
          paymentId={open}
          load={`/v1/events/admin/payments/${open}`}
          canAct={false}
          onClose={() => setOpen(null)}
        />
      )}
    </AdminLayout>
  );
}
