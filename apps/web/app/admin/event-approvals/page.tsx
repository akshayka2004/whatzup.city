'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { CalendarCheck, Check, ExternalLink, Loader2, X } from 'lucide-react';
import { AdminLayout } from '@/components/layouts/admin-layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/common/empty-state';
import { toast } from '@/components/ui/sonner';
import { apiService } from '@/lib/services/api-service';
import { fmtWhen } from '@/lib/event-booking';

interface Row {
  id: string;
  title: string;
  description: string;
  venue: string | null;
  city: string | null;
  startDate: string;
  endDate: string;
  capacity: number | null;
  maxPerUser: number;
  seatsTaken: number;
  checkedInCount: number;
  createdAt: string;
  bookingApproval: 'PENDING' | 'APPROVED' | 'REJECTED';
  bookingRejectReason: string | null;
  bookingResubmitCount: number;
  business: { id: string; name: string; city: string | null; isVerified?: boolean } | null;
}

const STATUS_TABS = [
  { key: 'PENDING', label: 'Waiting' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'REJECTED', label: 'Not approved' },
  { key: 'ALL', label: 'All' },
] as const;

const WHEN_TABS = [
  { key: '', label: 'Any time' },
  { key: 'UPCOMING', label: 'Not over yet' },
  { key: 'PAST', label: 'Over' },
] as const;

const MIN_REASON = 5;

export default function EventRsvpApprovalsPage() {
  const [status, setStatus] = useState<(typeof STATUS_TABS)[number]['key']>('PENDING');
  const [when, setWhen] = useState<(typeof WHEN_TABS)[number]['key']>('');
  const [items, setItems] = useState<Row[] | null>(null);
  const [error, setError] = useState('');
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState('');
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    const qs = new URLSearchParams({ status });
    if (when) qs.set('when', when);
    const res = await apiService.get<{ data: Row[] }>(`/v1/events/admin/booking/pending?${qs}`, {
      fresh: true,
    });
    if (res.error) setError(res.error);
    else {
      setError('');
      setItems(res.data.data);
    }
  }, [status, when]);

  useEffect(() => {
    setItems(null);
    load();
  }, [load]);

  const decide = async (id: string, approve: boolean) => {
    if (!approve && reason.trim().length < MIN_REASON) {
      setReasonError('Say why, in a few words. The host sees this and can fix it.');
      return;
    }
    setReasonError('');
    setBusy(id);
    const res = await apiService.post(
      `/v1/events/admin/booking/${id}/${approve ? 'approve' : 'reject'}`,
      approve ? {} : { reason: reason.trim() },
    );
    setBusy('');
    if (res.error) return toast.error(res.error);
    toast.success(
      approve ? 'Approved. People can RSVP now.' : 'Not approved. The host was told why.',
    );
    setRejecting(null);
    setReason('');
    load();
  };

  return (
    <AdminLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-brand-soft text-brand-soft-foreground">
            <CalendarCheck className="size-5" aria-hidden />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Event RSVP approvals</h1>
            <p className="text-sm text-muted-foreground">
              Businesses that want to take RSVPs and issue tickets. Open an event to see everything:
              its details, attendees, payments and analytics, before approval and after it is over.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div role="tablist" aria-label="Approval status" className="flex flex-wrap gap-2">
            {STATUS_TABS.map((t) => (
              <button
                key={t.key}
                role="tab"
                aria-selected={status === t.key}
                onClick={() => setStatus(t.key)}
                className={`min-h-10 cursor-pointer rounded-full border px-4 text-sm font-medium ${
                  status === t.key
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background text-muted-foreground hover:text-foreground'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div role="tablist" aria-label="When" className="flex flex-wrap gap-2">
            {WHEN_TABS.map((t) => (
              <button
                key={t.key || 'any'}
                role="tab"
                aria-selected={when === t.key}
                onClick={() => setWhen(t.key)}
                className={`min-h-9 cursor-pointer rounded-full border px-3 text-xs font-medium ${
                  when === t.key
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-background text-muted-foreground hover:text-foreground'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        {items === null ? (
          <Loader2
            className="mx-auto my-16 size-6 animate-spin text-muted-foreground"
            aria-label="Loading"
          />
        ) : items.length === 0 ? (
          <EmptyState
            icon={CalendarCheck}
            title="Nothing here"
            description={
              status === 'PENDING'
                ? 'New requests appear here as soon as a host turns RSVP on.'
                : 'No events match these filters.'
            }
          />
        ) : (
          <ul className="space-y-3">
            {items.map((e) => (
              <li key={e.id}>
                <Card className="rounded-card p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-lg font-semibold text-foreground">{e.title}</h2>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {e.business?.name ?? 'Unknown host'}
                        {e.business?.isVerified ? ' · verified business' : ' · not verified'}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {fmtWhen(e.startDate)} to {fmtWhen(e.endDate)}
                        {[e.venue, e.city].filter(Boolean).length
                          ? ` · ${[e.venue, e.city].filter(Boolean).join(', ')}`
                          : ''}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {e.seatsTaken}
                        {e.capacity != null ? ` of ${e.capacity}` : ''} seats taken ·{' '}
                        {e.checkedInCount} arrived · {e.maxPerUser} per account
                      </p>
                      <p className="mt-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            e.bookingApproval === 'APPROVED'
                              ? 'bg-success-soft text-success-soft-foreground'
                              : e.bookingApproval === 'REJECTED'
                                ? 'bg-danger-soft text-danger-soft-foreground'
                                : 'bg-warning-soft text-warning-soft-foreground'
                          }`}
                        >
                          {e.bookingApproval === 'APPROVED'
                            ? 'Approved'
                            : e.bookingApproval === 'REJECTED'
                              ? 'Not approved'
                              : 'Waiting for a decision'}
                        </span>
                        {e.bookingResubmitCount > 0 && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            sent again {e.bookingResubmitCount}×
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/super-admin/events/${e.id}`}>
                          <ExternalLink /> Open everything
                        </Link>
                      </Button>
                      {e.bookingApproval !== 'APPROVED' && (
                        <Button
                          size="sm"
                          loading={busy === e.id}
                          onClick={() => decide(e.id, true)}
                        >
                          <Check /> Approve
                        </Button>
                      )}
                      {e.bookingApproval !== 'REJECTED' && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy === e.id}
                          onClick={() => {
                            setRejecting(rejecting === e.id ? null : e.id);
                            setReason('');
                            setReasonError('');
                          }}
                        >
                          <X /> Reject
                        </Button>
                      )}
                    </div>
                  </div>
                  {e.description && (
                    <p className="mt-3 line-clamp-3 whitespace-pre-line text-sm text-foreground">
                      {e.description}
                    </p>
                  )}
                  {e.bookingApproval === 'REJECTED' && e.bookingRejectReason && (
                    <p className="mt-3 rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger-soft-foreground">
                      <span className="block text-xs font-medium">Reason given to the host</span>
                      {e.bookingRejectReason}
                    </p>
                  )}
                  {rejecting === e.id && (
                    <div className="mt-4 space-y-2 border-t border-border pt-4">
                      <label
                        htmlFor={`why-${e.id}`}
                        className="text-sm font-medium text-foreground"
                      >
                        Why is this event not approved? <span className="text-destructive">*</span>
                      </label>
                      <textarea
                        id={`why-${e.id}`}
                        value={reason}
                        onChange={(ev) => setReason(ev.target.value)}
                        placeholder="Tell the host what to fix, for example: the venue address is missing."
                        maxLength={300}
                        rows={3}
                        aria-invalid={!!reasonError}
                        className="w-full rounded-control border border-input bg-background px-3 py-2 text-sm text-foreground"
                      />
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs text-muted-foreground">
                          The host sees this, and can fix the event and send it again.
                        </span>
                        <span className="text-xs text-muted-foreground">{reason.length}/300</span>
                      </div>
                      {reasonError && (
                        <p role="alert" className="text-sm text-destructive">
                          {reasonError}
                        </p>
                      )}
                      <Button
                        size="sm"
                        variant="destructive"
                        loading={busy === e.id}
                        onClick={() => decide(e.id, false)}
                      >
                        Reject event
                      </Button>
                    </div>
                  )}
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AdminLayout>
  );
}
