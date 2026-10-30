'use client';

import { useCallback, useEffect, useState } from 'react';
import { CalendarCheck, Check, Loader2, X } from 'lucide-react';
import { AdminLayout } from '@/components/layouts/admin-layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/common/empty-state';
import { toast } from '@/components/ui/sonner';
import { apiService } from '@/lib/services/api-service';
import { fmtWhen } from '@/lib/event-booking';

interface Pending {
  id: string;
  title: string;
  description: string;
  venue: string | null;
  city: string | null;
  startDate: string;
  endDate: string;
  capacity: number | null;
  maxPerUser: number;
  createdAt: string;
  business: { id: string; name: string; city: string | null; isVerified?: boolean } | null;
}

export default function EventRsvpApprovalsPage() {
  const [items, setItems] = useState<Pending[] | null>(null);
  const [error, setError] = useState('');
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    const res = await apiService.get<{ data: Pending[] }>('/v1/events/admin/booking/pending', {
      fresh: true,
    });
    if (res.error) setError(res.error);
    else {
      setError('');
      setItems(res.data.data);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const decide = async (id: string, approve: boolean) => {
    setBusy(id);
    const res = await apiService.post(
      `/v1/events/admin/booking/${id}/${approve ? 'approve' : 'reject'}`,
      approve ? {} : { reason: reason.trim() || undefined },
    );
    setBusy('');
    if (res.error) return toast.error(res.error);
    toast.success(approve ? 'Approved. People can RSVP now.' : 'Rejected. The host was told.');
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
              Businesses that want to take RSVPs and issue tickets. Check the event is real before
              people give their details.
            </p>
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
            title="Nothing waiting"
            description="New requests appear here as soon as a host turns RSVP on."
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
                        {fmtWhen(e.startDate)}
                        {[e.venue, e.city].filter(Boolean).length
                          ? ` · ${[e.venue, e.city].filter(Boolean).join(', ')}`
                          : ''}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {e.capacity != null ? `${e.capacity} seats` : 'No seat limit'} ·{' '}
                        {e.maxPerUser} per account
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" loading={busy === e.id} onClick={() => decide(e.id, true)}>
                        <Check /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy === e.id}
                        onClick={() => setRejecting(rejecting === e.id ? null : e.id)}
                      >
                        <X /> Reject
                      </Button>
                    </div>
                  </div>
                  {e.description && (
                    <p className="mt-3 line-clamp-3 whitespace-pre-line text-sm text-foreground">
                      {e.description}
                    </p>
                  )}
                  {rejecting === e.id && (
                    <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
                      <Input
                        value={reason}
                        onChange={(ev) => setReason(ev.target.value)}
                        placeholder="Why? The host sees this."
                        aria-label="Reason for rejecting"
                        maxLength={300}
                        className="h-10 min-w-0 flex-1"
                      />
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
