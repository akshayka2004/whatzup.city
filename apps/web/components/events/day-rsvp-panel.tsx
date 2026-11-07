'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CalendarDays, CheckCircle2, Clock, Plus, Ticket, Users, Wallet, X } from 'lucide-react';
import { dayPricing, rupees } from '@saas/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';
import { SectionCard } from '@/components/system/section-card';
import { useConfirm } from '@/components/common/confirm-dialog';
import { apiService } from '@/lib/services/api-service';
import { rsvpSource } from '@/lib/rsvp-source';
import {
  fmtDayRange,
  fmtWhen,
  prettyCode,
  type BookingInfo,
  type DayInfo,
  type MyBooking,
} from '@/lib/event-booking';

/**
 * Booking block for events that sell each day on its own. The person ticks the days they want (or
 * taps "all days"), can bring guests, sees what it costs, and can later cancel one day or wait for a
 * day that is full. Ordinary events use RsvpPanel instead.
 */
export function DayRsvpPanel({
  eventId,
  info,
  mine,
  signedIn,
  onChanged,
}: {
  eventId: string;
  info: BookingInfo;
  mine: MyBooking | null;
  signedIn: boolean;
  onChanged: () => Promise<void>;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const days = info.days ?? [];
  const [picked, setPicked] = useState<string[]>([]);
  const [guests, setGuests] = useState<string[]>([]);
  const [skipSelf, setSkipSelf] = useState(false);
  const [busy, setBusy] = useState(false);
  // One key per attempt: a double tap or a retry on a bad connection returns the same tickets.
  const attemptKey = useRef('');
  if (!attemptKey.current && typeof crypto !== 'undefined')
    attemptKey.current = crypto.randomUUID();

  const tickets = mine?.tickets ?? [];
  const held = tickets.filter((t) => t.status === 'ISSUED' || t.status === 'CHECKED_IN');
  const owing = mine?.payments?.[0] ?? null;
  const payRequired = info.payment?.required === true;
  const heldOn = (dayId: string) => held.filter((t) => t.dayId === dayId);
  const selfOn = (dayId: string) => heldOn(dayId).some((t) => !t.isGuest);
  const hasSelfAnywhere = held.some((t) => !t.isGuest);
  const names = guests.map((g) => g.trim()).filter(Boolean);
  const peopleOn = (d: DayInfo) => (skipSelf || selfOn(d.id) ? 0 : 1) + names.length;

  const chosen = days.filter((d) => picked.includes(d.id));
  const openDays = days.filter((d) => d.state === 'OPEN' && heldOn(d.id).length < info.maxPerUser);
  const allPicked = openDays.length > 0 && openDays.every((d) => picked.includes(d.id));

  // Guests allowed: what every chosen day still has room for.
  const guestRoom = Math.max(
    0,
    chosen.length === 0
      ? info.maxPerUser - 1
      : Math.min(
          ...chosen.map(
            (d) => info.maxPerUser - heldOn(d.id).length - (skipSelf || selfOn(d.id) ? 0 : 1),
          ),
        ),
  );

  // Price: each day's own, or the all-days price when everyone comes every day.
  let total = 0;
  let bundle = false;
  if (payRequired && chosen.length > 0) {
    const price = dayPricing(
      { ticketType: 'PAID', ticketPrice: 0, allDaysPrice: info.allDaysPrice ?? null },
      chosen as never,
      days as never,
    );
    const counts = chosen.map(peopleOn);
    const uniform = counts[0] > 0 && counts.every((n) => n === counts[0]);
    if (price.bundle && uniform) {
      bundle = true;
      total = price.perPerson * counts[0];
    } else {
      total = price.lines.reduce((n, l, i) => n + l.price * counts[i], 0);
    }
    total = Math.round(total * 100) / 100;
  }
  const newTickets = chosen.reduce((n, d) => n + peopleOn(d), 0);

  const act = async <T,>(
    run: () => Promise<{ error?: string | null; data?: T | null }>,
    ok: string,
  ): Promise<{ ok: boolean; data?: T | null }> => {
    setBusy(true);
    const res = await run();
    setBusy(false);
    if (res.error) {
      toast.error(res.error);
      await onChanged();
      return { ok: false };
    }
    toast.success(ok);
    attemptKey.current = crypto.randomUUID();
    setPicked([]);
    setGuests([]);
    setSkipSelf(false);
    await onChanged();
    return { ok: true, data: res.data };
  };

  const book = async () => {
    const out = await act(
      () =>
        apiService.post<{ payment: { id: string } | null }>(`/v1/events/${eventId}/rsvp`, {
          dayIds: picked,
          guests: names,
          ...(skipSelf ? { skipSelf: true } : {}),
          source: rsvpSource(),
          idempotencyKey: attemptKey.current,
        }),
      total > 0
        ? 'Seats held. Now pay to confirm them.'
        : "You're registered. Your tickets are ready.",
    );
    // Paid seats are only held until the payment is verified: take them straight to paying.
    if (out.ok && out.data?.payment?.id) router.push(`/tickets/pay/${out.data.payment.id}`);
  };

  const cancelDay = async (d: DayInfo) => {
    const mineOnDay = heldOn(d.id).filter((t) => t.status === 'ISSUED');
    if (mineOnDay.length === 0) return;
    const ok = await confirm({
      title: `Cancel ${d.label}?`,
      description: `${mineOnDay.length === 1 ? 'Your ticket' : 'Your tickets'} for this day go back to the pool. Your other days are not affected.`,
      confirmLabel: 'Cancel this day',
      tone: 'danger',
    });
    if (ok)
      await act(
        () =>
          apiService.post(`/v1/events/${eventId}/rsvp/cancel`, {
            ticketIds: mineOnDay.map((t) => t.id),
          }),
        `${d.label} cancelled.`,
      );
  };

  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const signInHref = `/login?redirect=${encodeURIComponent(`/events/${eventId}`)}`;
  const nothingNew = chosen.length > 0 && newTickets === 0;

  return (
    <SectionCard title="Book your days">
      <div className="space-y-4 text-sm">
        <p className="flex items-center gap-2 font-semibold text-foreground">
          {info.state === 'OPEN' ? (
            <span className="inline-flex size-2 rounded-full bg-success" aria-hidden />
          ) : (
            <Clock className="size-4 text-muted-foreground" aria-hidden />
          )}
          {info.state === 'OPEN' ? 'Pick the days you are coming' : info.stateLabel}
        </p>

        {owing && (
          <div className="rounded-xl border border-warning/30 bg-warning-soft p-3">
            <p className="flex items-center gap-1.5 font-semibold text-warning-soft-foreground">
              <Wallet className="size-4" aria-hidden />{' '}
              {owing.status === 'SUBMITTED'
                ? 'Waiting for the host to verify your payment'
                : `Pay ${rupees(owing.amount)} to confirm your seats`}
            </p>
            <p className="mt-1 text-xs text-warning-soft-foreground">
              {owing.status === 'PENDING'
                ? `Your seats are held until ${fmtWhen(owing.expiresAt)}.`
                : 'Your seats stay held until the host decides.'}
            </p>
            <Button asChild size="sm" className="mt-2">
              <Link href={`/tickets/pay/${owing.id}`}>
                {owing.status === 'PENDING' ? 'Pay now' : 'View payment'}
              </Link>
            </Button>
          </div>
        )}

        <ul className="space-y-2">
          {days.map((d) => {
            const mineHere = heldOn(d.id);
            const full = d.state === 'FULL';
            const selectable =
              signedIn && !owing && d.state === 'OPEN' && mineHere.length < info.maxPerUser;
            const waiting = mine?.waitlists?.find((w) => w.dayId === d.id);
            const checkedIn = mineHere.some((t) => t.status === 'CHECKED_IN');
            const cancelUntil = mineHere[0]?.day?.cancelDeadline;
            const canCancel =
              mineHere.length > 0 &&
              !checkedIn &&
              (!cancelUntil || Date.now() < new Date(cancelUntil).getTime());
            const left = d.seatsLeft;
            const isPicked = picked.includes(d.id);
            return (
              <li
                key={d.id}
                className={`rounded-xl border p-3 ${
                  isPicked ? 'border-primary bg-primary/5' : 'border-border'
                }`}
              >
                <div className="flex items-start gap-3">
                  {selectable ? (
                    <input
                      id={`day-${d.id}`}
                      type="checkbox"
                      checked={isPicked}
                      onChange={() => toggle(d.id)}
                      className="mt-1 size-5 shrink-0 accent-primary"
                      aria-label={`Book ${d.label}`}
                    />
                  ) : (
                    <CalendarDays
                      className="mt-0.5 size-5 shrink-0 text-muted-foreground"
                      aria-hidden
                    />
                  )}
                  <label
                    htmlFor={selectable ? `day-${d.id}` : undefined}
                    className={`min-w-0 flex-1 ${selectable ? 'cursor-pointer' : ''}`}
                  >
                    <span className="flex flex-wrap items-center justify-between gap-x-3">
                      <span className="font-semibold text-foreground">{d.label}</span>
                      {payRequired && (
                        <span className="font-semibold tabular-nums text-foreground">
                          {d.price > 0 ? rupees(d.price) : 'Free'}
                        </span>
                      )}
                    </span>
                    <span className="block text-muted-foreground">
                      {fmtDayRange(d.startsAt, d.endsAt)}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {d.state === 'OPEN' &&
                        (left == null
                          ? 'Seats available'
                          : left <= 5
                            ? `Only ${left} seat${left === 1 ? '' : 's'} left`
                            : `${left} seats left`)}
                      {full && 'Sold out'}
                      {d.state === 'CLOSED' && 'Booking closed for this day'}
                      {d.state === 'NOT_OPEN' &&
                        `Booking opens ${d.opensAt ? fmtWhen(d.opensAt) : 'soon'}`}
                      {d.state === 'ENDED' && 'This day is over'}
                    </span>
                  </label>
                </div>

                {mineHere.length > 0 && (
                  <div className="mt-2 rounded-lg border border-success/25 bg-success-soft p-2.5">
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-success-soft-foreground">
                      <CheckCircle2 className="size-4" aria-hidden /> You&apos;re going
                    </p>
                    <ul className="mt-1.5 space-y-1">
                      {mineHere.map((t) => (
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
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button asChild size="sm">
                        <Link href={`/tickets/${mineHere[0].id}`}>Show my ticket</Link>
                      </Button>
                      {canCancel && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => cancelDay(d)}
                          disabled={busy}
                        >
                          Cancel this day
                        </Button>
                      )}
                    </div>
                    {!checkedIn && cancelUntil && !canCancel && (
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        Cancelling closed {fmtWhen(cancelUntil)}.
                      </p>
                    )}
                  </div>
                )}

                {full && mineHere.length === 0 && signedIn && !owing && (
                  <div className="mt-2">
                    {waiting ? (
                      <div className="rounded-lg border border-border bg-muted/40 p-2.5">
                        <p className="flex items-center gap-1.5 font-medium text-foreground">
                          <Users className="size-4" aria-hidden /> On the waitlist
                          {waiting.position ? ` (number ${waiting.position})` : ''}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          If a seat opens you get a ticket for this day automatically.
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-2"
                          disabled={busy}
                          onClick={() =>
                            act(
                              () =>
                                apiService.delete(`/v1/events/${eventId}/waitlist?dayId=${d.id}`),
                              'Removed from the waitlist.',
                            )
                          }
                        >
                          Leave waitlist
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() =>
                          act(
                            () =>
                              apiService.post(`/v1/events/${eventId}/waitlist`, {
                                seats: 1,
                                dayId: d.id,
                              }),
                            `You are on the waitlist for ${d.label}.`,
                          )
                        }
                      >
                        Join the waitlist for this day
                      </Button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        {!signedIn && info.state === 'OPEN' && (
          <div className="grid gap-2">
            <Button asChild size="lg">
              <Link href={signInHref}>Sign in to book</Link>
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Only people with a Whtzup.city account can book.{' '}
              <Link href="/register?role=customer" className="text-primary hover:underline">
                Create one free
              </Link>
            </p>
          </div>
        )}

        {signedIn && !owing && openDays.length > 0 && (
          <div className="space-y-3">
            {openDays.length > 1 && (
              <button
                type="button"
                onClick={() => setPicked(allPicked ? [] : openDays.map((d) => d.id))}
                className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                {allPicked ? 'Clear the days' : 'Pick all days'}
                {info.allDaysPrice != null && payRequired && !allPicked && (
                  <span className="text-muted-foreground">
                    (all days together {rupees(info.allDaysPrice)} per person)
                  </span>
                )}
              </button>
            )}

            {hasSelfAnywhere && (
              <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-input bg-background px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={skipSelf}
                  onChange={(e) => setSkipSelf(e.target.checked)}
                  className="mt-0.5 size-5 shrink-0 accent-primary"
                />
                <span>Book only my guests for these days, not me</span>
              </label>
            )}

            {guestRoom > 0 && (
              <div className="space-y-2">
                {guests.map((g, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
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
                {guests.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Guests come on every day you pick. To bring a guest on one day only, book that
                    day separately.
                  </p>
                )}
              </div>
            )}

            {chosen.length > 0 && (
              <div className="rounded-xl border border-border bg-muted/40 p-3 text-sm">
                <p className="font-medium text-foreground">
                  {chosen.length} {chosen.length === 1 ? 'day' : 'days'}, {newTickets}{' '}
                  {newTickets === 1 ? 'ticket' : 'tickets'}
                </p>
                {payRequired && total > 0 && (
                  <p className="mt-0.5 text-muted-foreground">
                    Total {rupees(total)}
                    {bundle ? ' (all-days price applied)' : ''}. You pay the host by UPI on the next
                    screen, and your seats are held while you do.
                  </p>
                )}
                {nothingNew && (
                  <p className="mt-0.5 text-muted-foreground">
                    You already have a ticket for {chosen.length === 1 ? 'that day' : 'those days'}.
                    Add a guest or pick another day.
                  </p>
                )}
              </div>
            )}

            <Button
              size="lg"
              className="w-full"
              onClick={book}
              loading={busy}
              disabled={chosen.length === 0 || nothingNew}
            >
              {chosen.length === 0
                ? 'Pick a day to continue'
                : total > 0
                  ? `Reserve and pay ${rupees(total)}`
                  : `Book ${chosen.length === 1 ? chosen[0].label : `${chosen.length} days`}`}
            </Button>
            {info.maxPerUser > 1 && (
              <p className="text-xs text-muted-foreground">
                Up to {info.maxPerUser} people per account on each day. Each gets their own ticket.
              </p>
            )}
          </div>
        )}

        {(info.note || info.minAge != null) && (
          <div className="space-y-1 border-t border-border pt-3 text-xs text-muted-foreground">
            {info.minAge != null && <p>Minimum age: {info.minAge}.</p>}
            {info.note && <p className="whitespace-pre-line">{info.note}</p>}
          </div>
        )}
      </div>
    </SectionCard>
  );
}
