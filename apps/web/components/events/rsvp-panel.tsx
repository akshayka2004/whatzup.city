'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Clock, Loader2, Plus, Ticket, Users, X } from 'lucide-react';
import { RSVP_SOURCES } from '@saas/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';
import { SectionCard } from '@/components/system/section-card';
import { useConfirm } from '@/components/common/confirm-dialog';
import { useAuth } from '@/hooks/use-auth';
import { apiService } from '@/lib/services/api-service';
import { inferSource } from '@/lib/analytics/track';
import { fmtWhen, prettyCode, type BookingInfo, type MyBooking } from '@/lib/event-booking';

/** Where this visit came from, in the words the host's analytics use. */
function rsvpSource(): string {
  if (typeof window === 'undefined') return 'direct';
  const fromUrl = new URLSearchParams(window.location.search).get('src');
  if (fromUrl && (RSVP_SOURCES as readonly string[]).includes(fromUrl)) return fromUrl;
  const seen = inferSource();
  if (seen === 'external') return 'share';
  return (RSVP_SOURCES as readonly string[]).includes(seen) ? seen : 'direct';
}

/**
 * RSVP block on the public event page. Shows live seats, and for a signed-in person their tickets,
 * a way to add guests or cancel, and the waitlist when the event is full. Renders nothing for events
 * that do not take RSVPs on the platform.
 */
export function RsvpPanel({ eventId }: { eventId: string }) {
  const { user } = useAuth();
  const confirm = useConfirm();
  const [info, setInfo] = useState<BookingInfo | null>(null);
  const [mine, setMine] = useState<MyBooking | null>(null);
  const [guests, setGuests] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  // One key per attempt: a double tap or a retry on a bad connection returns the same tickets.
  const attemptKey = useRef('');
  if (!attemptKey.current && typeof crypto !== 'undefined')
    attemptKey.current = crypto.randomUUID();

  const loadInfo = useCallback(async () => {
    const res = await apiService.get<BookingInfo>(`/v1/events/${eventId}/booking`, { fresh: true });
    if (!res.error && res.data) setInfo(res.data);
  }, [eventId]);

  const loadMine = useCallback(async () => {
    if (!user) return setMine(null);
    const res = await apiService.get<MyBooking>(`/v1/events/${eventId}/booking/me`, {
      fresh: true,
    });
    if (!res.error && res.data) setMine(res.data);
  }, [eventId, user]);

  useEffect(() => {
    loadInfo();
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') loadInfo();
    }, 20_000);
    return () => window.clearInterval(timer);
  }, [loadInfo]);
  useEffect(() => {
    loadMine();
  }, [loadMine]);

  if (!info || info.mode !== 'RSVP') return null;

  const held = mine?.tickets.filter((t) => t.status !== 'CANCELLED') ?? [];
  const canAddMore = held.length < info.maxPerUser;
  const guestRoom = Math.max(
    0,
    info.maxPerUser - held.length - (held.some((t) => !t.isGuest) ? 0 : 1),
  );
  const beforeDeadline = Date.now() < new Date(info.cancelDeadline).getTime();
  const used = held.some((t) => t.status === 'CHECKED_IN');

  const act = async (run: () => Promise<{ error?: string | null }>, ok: string) => {
    setBusy(true);
    const res = await run();
    setBusy(false);
    if (res.error) {
      toast.error(res.error);
      loadInfo();
      return false;
    }
    toast.success(ok);
    attemptKey.current = crypto.randomUUID();
    setGuests([]);
    await Promise.all([loadInfo(), loadMine()]);
    return true;
  };

  const rsvp = () =>
    act(
      () =>
        apiService.post(`/v1/events/${eventId}/rsvp`, {
          guests: guests.map((g) => g.trim()).filter(Boolean),
          source: rsvpSource(),
          idempotencyKey: attemptKey.current,
        }),
      "You're registered. Your ticket is ready.",
    );

  const cancel = async () => {
    const ok = await confirm({
      title: 'Cancel your tickets?',
      description: 'Your seats go back to the pool. You can register again if seats remain.',
      confirmLabel: 'Cancel tickets',
      tone: 'danger',
    });
    if (ok)
      await act(
        () => apiService.post(`/v1/events/${eventId}/rsvp/cancel`, {}),
        'Tickets cancelled.',
      );
  };

  const signInHref = `/login?redirect=${encodeURIComponent(`/events/${eventId}`)}`;
  const fill =
    info.capacity && info.seatsLeft != null
      ? 100 - Math.round((info.seatsLeft / info.capacity) * 100)
      : null;

  return (
    <SectionCard title="RSVP">
      <div className="space-y-4 text-sm">
        <div>
          <p className="flex items-center gap-2 font-semibold text-foreground">
            {info.state === 'OPEN' ? (
              <span className="inline-flex size-2 rounded-full bg-success" aria-hidden />
            ) : (
              <Clock className="size-4 text-muted-foreground" aria-hidden />
            )}
            {info.stateLabel}
          </p>
          {info.seatsLeft != null && info.capacity != null && info.state !== 'ENDED' && (
            <>
              <p className="mt-1 text-muted-foreground">
                {info.seatsLeft === 0
                  ? 'No seats left'
                  : info.seatsLeft <= Math.max(5, Math.round(info.capacity * 0.1))
                    ? `Only ${info.seatsLeft} seat${info.seatsLeft === 1 ? '' : 's'} left`
                    : `${info.seatsLeft} of ${info.capacity} seats left`}
              </p>
              {fill != null && (
                <div
                  className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-sunken"
                  aria-hidden
                >
                  <div className="h-full rounded-full bg-primary" style={{ width: `${fill}%` }} />
                </div>
              )}
            </>
          )}
          {info.state === 'NOT_OPEN' && info.opensAt && (
            <p className="mt-1 text-muted-foreground">Opens {fmtWhen(info.opensAt)}</p>
          )}
        </div>

        {held.length > 0 && (
          <div className="rounded-xl border border-success/25 bg-success-soft p-3">
            <p className="flex items-center gap-1.5 font-semibold text-success-soft-foreground">
              <CheckCircle2 className="size-4" aria-hidden /> You&apos;re going
            </p>
            <ul className="mt-2 space-y-1.5">
              {held.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-foreground">
                    {t.holderName}
                    {t.isGuest && <span className="text-muted-foreground"> (guest)</span>}
                  </span>
                  <Link
                    href={`/tickets/${t.id}`}
                    className="inline-flex shrink-0 items-center gap-1 text-primary hover:underline"
                  >
                    <Ticket className="size-3.5" aria-hidden />
                    {t.status === 'CHECKED_IN' ? 'Used' : prettyCode(t.code)}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button asChild size="sm">
                <Link href={`/tickets/${held[0].id}`}>Show my ticket</Link>
              </Button>
              {!used && beforeDeadline && (
                <Button size="sm" variant="outline" onClick={cancel} disabled={busy}>
                  Cancel
                </Button>
              )}
            </div>
            {!used && !beforeDeadline && (
              <p className="mt-2 text-xs text-muted-foreground">
                Cancelling closed {fmtWhen(info.cancelDeadline)}.
              </p>
            )}
          </div>
        )}

        {/* Register, or add guests to an existing registration */}
        {info.state === 'OPEN' &&
          (!user ? (
            <div className="grid gap-2">
              <Button asChild size="lg">
                <Link href={signInHref}>Sign in to RSVP</Link>
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Only people with a Whtzup.city account can RSVP.{' '}
                <Link href="/register?role=customer" className="text-primary hover:underline">
                  Create one free
                </Link>
              </p>
            </div>
          ) : (
            (held.length === 0 || (canAddMore && guestRoom > 0)) && (
              <div className="space-y-3">
                {guestRoom > 0 && (
                  <div className="space-y-2">
                    {guests.map((g, i) => (
                      <div key={i} className="flex gap-2">
                        <Input
                          id={`guest-${i}`}
                          value={g}
                          onChange={(e) =>
                            setGuests(guests.map((x, j) => (j === i ? e.target.value : x)))
                          }
                          placeholder={`Guest ${i + 1} name`}
                          maxLength={120}
                          aria-label={`Guest ${i + 1} name`}
                          className="h-11"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="size-11 shrink-0"
                          aria-label={`Remove guest ${i + 1}`}
                          onClick={() => setGuests(guests.filter((_, j) => j !== i))}
                        >
                          <X />
                        </Button>
                      </div>
                    ))}
                    {guests.length < guestRoom && (
                      <button
                        type="button"
                        onClick={() => setGuests([...guests, ''])}
                        className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                      >
                        <Plus className="size-4" aria-hidden /> Bring a guest
                      </button>
                    )}
                  </div>
                )}
                <Button
                  size="lg"
                  className="w-full"
                  onClick={rsvp}
                  loading={busy}
                  disabled={held.length > 0 && guests.every((g) => !g.trim())}
                >
                  {held.length > 0
                    ? 'Add guests'
                    : guests.filter((g) => g.trim()).length > 0
                      ? `RSVP for ${1 + guests.filter((g) => g.trim()).length} people`
                      : 'RSVP'}
                </Button>
                {info.maxPerUser > 1 && held.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Up to {info.maxPerUser} people per account. Each gets their own ticket.
                  </p>
                )}
              </div>
            )
          ))}

        {/* Full: waitlist */}
        {info.state === 'FULL' && held.length === 0 && (
          <div className="space-y-2">
            {!user ? (
              <Button asChild size="lg" variant="outline" className="w-full">
                <Link href={signInHref}>Sign in to join the waitlist</Link>
              </Button>
            ) : mine?.waitlist ? (
              <div className="rounded-xl border border-border bg-muted/40 p-3">
                <p className="flex items-center gap-1.5 font-medium text-foreground">
                  <Users className="size-4" aria-hidden /> You&apos;re on the waitlist
                  {mine.waitlist.position ? ` (number ${mine.waitlist.position})` : ''}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  If a seat opens up you get a ticket automatically and we tell you.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2"
                  disabled={busy}
                  onClick={() =>
                    act(
                      () => apiService.delete(`/v1/events/${eventId}/waitlist`),
                      'Removed from the waitlist.',
                    )
                  }
                >
                  Leave waitlist
                </Button>
              </div>
            ) : (
              <>
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full"
                  loading={busy}
                  onClick={() =>
                    act(
                      () => apiService.post(`/v1/events/${eventId}/waitlist`, { seats: 1 }),
                      'You are on the waitlist.',
                    )
                  }
                >
                  Join the waitlist
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Seats free up when people cancel. You are placed in the order you join.
                </p>
              </>
            )}
          </div>
        )}

        {(info.note || info.minAge != null) && (
          <div className="space-y-1 border-t border-border pt-3 text-xs text-muted-foreground">
            {info.minAge != null && <p>Minimum age: {info.minAge}.</p>}
            {info.note && <p className="whitespace-pre-line">{info.note}</p>}
          </div>
        )}
        {busy && (
          <Loader2 className="mx-auto size-4 animate-spin text-muted-foreground" aria-hidden />
        )}
      </div>
    </SectionCard>
  );
}
