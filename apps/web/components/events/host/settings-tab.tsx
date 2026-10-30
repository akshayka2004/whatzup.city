'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Clock, ImagePlus, Loader2, ShieldAlert, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';
import { apiService } from '@/lib/services/api-service';
import { IN_MOBILE_PATTERN, UPI_ID_PATTERN, normalizeMobile } from '@saas/types';
import { fromIstInput, toIstInput } from '@/lib/event-booking';
import { uploadImage } from '@/lib/storage-upload';
import type { HostSummary } from '@/lib/event-host';

const num = (v: string): number | null => (v.trim() === '' ? null : Number(v));

function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function SettingsTab({
  eventId,
  summary,
  onSaved,
}: {
  eventId: string;
  summary: HostSummary;
  onSaved: (s: HostSummary) => void;
}) {
  const [on, setOn] = useState(summary.bookingMode === 'RSVP');
  const [capacity, setCapacity] = useState(summary.capacity?.toString() ?? '');
  const [venueCapacity, setVenueCapacity] = useState(summary.venueCapacity?.toString() ?? '');
  const [opens, setOpens] = useState(toIstInput(summary.rsvpOpensAt));
  const [closes, setCloses] = useState(toIstInput(summary.rsvpClosesAt));
  const [maxPerUser, setMaxPerUser] = useState(String(summary.maxPerUser));
  const [cutoff, setCutoff] = useState(String(summary.cancelCutoffHours));
  const [minAge, setMinAge] = useState(summary.minAge?.toString() ?? '');
  const [note, setNote] = useState(summary.bookingNote ?? '');
  const [ciOpens, setCiOpens] = useState(toIstInput(summary.checkInOpensAt));
  const [ciCloses, setCiCloses] = useState(toIstInput(summary.checkInClosesAt));
  const [payOn, setPayOn] = useState(summary.payEnabled);
  const [payee, setPayee] = useState(summary.payeeName ?? '');
  const [upi, setUpi] = useState(summary.payUpiId ?? '');
  const [phone, setPhone] = useState(summary.payPhone ?? '');
  const [windowH, setWindowH] = useState(String(summary.payWindowHours));
  const [qr, setQr] = useState(summary.payQrImage ?? '');
  const [qrBusy, setQrBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  // Payment details are frozen while someone is part-way through paying.
  const midPayment = summary.paymentsToVerify + summary.paymentsWaiting > 0;

  useEffect(() => setOn(summary.bookingMode === 'RSVP'), [summary.bookingMode]);

  const uploadQr = async (file: File) => {
    setQrBusy(true);
    setError('');
    try {
      const up = await uploadImage(file, 'event', eventId, { maxSide: 1400, quality: 0.92 });
      setQr(up.publicUrl);
    } catch (err: any) {
      setError(err?.message || 'The QR photo did not upload. Try again.');
    } finally {
      setQrBusy(false);
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (on && payOn) {
      if (!payee.trim()) return setError('Enter the name shown on your UPI account.');
      if (!UPI_ID_PATTERN.test(upi.trim()))
        return setError('Enter a valid UPI ID, like name@bank.');
      if (!IN_MOBILE_PATTERN.test(normalizeMobile(phone)))
        return setError('Enter a 10-digit mobile number attendees can call.');
    }
    setSaving(true);
    const res = await apiService.patch<HostSummary>(`/v1/events/${eventId}/booking`, {
      bookingMode: on ? 'RSVP' : 'NONE',
      capacity: num(capacity),
      venueCapacity: num(venueCapacity),
      rsvpOpensAt: fromIstInput(opens),
      rsvpClosesAt: fromIstInput(closes),
      maxPerUser: Number(maxPerUser) || 1,
      cancelCutoffHours: Number(cutoff) || 0,
      minAge: num(minAge),
      bookingNote: note,
      checkInOpensAt: fromIstInput(ciOpens),
      checkInClosesAt: fromIstInput(ciCloses),
      // Payment details go only with paid events, and only the pieces that can change.
      ...(summary.isPaidEvent || summary.payEnabled
        ? {
            payEnabled: on && payOn,
            ...(on && payOn
              ? {
                  payeeName: payee.trim(),
                  payUpiId: upi.trim(),
                  payPhone: normalizeMobile(phone),
                  payWindowHours: Number(windowH) || 24,
                  payQrImage: qr || null,
                }
              : {}),
          }
        : {}),
    });
    setSaving(false);
    if (res.error || !res.data) {
      setError(res.error || 'Could not save.');
      return;
    }
    toast.success('Settings saved.');
    onSaved(res.data);
  };

  return (
    <form onSubmit={save} className="max-w-2xl space-y-6">
      {summary.bookingMode === 'RSVP' && summary.bookingApproval === 'PENDING' && (
        <p className="flex items-start gap-2 rounded-xl bg-warning-soft px-4 py-3 text-sm text-warning-soft-foreground">
          <Clock className="mt-0.5 size-4 shrink-0" aria-hidden /> Waiting for approval. People can
          RSVP as soon as a moderator approves this event.
        </p>
      )}
      {summary.bookingApproval === 'REJECTED' && (
        <p className="flex items-start gap-2 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger-soft-foreground">
          <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden /> RSVP was not approved for
          this event. Change the settings and save to send it for review again.
        </p>
      )}
      {summary.bookingMode === 'RSVP' && summary.bookingApproval === 'APPROVED' && (
        <p className="flex items-center gap-2 rounded-xl bg-success-soft px-4 py-3 text-sm text-success-soft-foreground">
          <CheckCircle2 className="size-4" aria-hidden /> Approved. {summary.stateLabel}.
        </p>
      )}

      <Card className="rounded-card p-5">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            id="rsvp-on"
            type="checkbox"
            checked={on}
            onChange={(e) => setOn(e.target.checked)}
            className="mt-1 size-5 accent-primary"
          />
          <span>
            <span className="block font-semibold text-foreground">Take RSVPs on Whtzup.city</span>
            <span className="block text-sm text-muted-foreground">
              Signed-in users register, get a QR ticket, and you scan them in at the gate. Your
              external links stay as they are.
            </span>
          </span>
        </label>
      </Card>

      {on && (
        <>
          <Card className="space-y-4 rounded-card p-5">
            <h3 className="font-semibold">Seats</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                id="capacity"
                label="Seats available"
                hint={`Leave empty for no limit. ${summary.seatsTaken} taken so far.`}
              >
                <Input
                  id="capacity"
                  inputMode="numeric"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value.replace(/\D/g, ''))}
                  className="h-11"
                />
              </Field>
              <Field
                id="venue-capacity"
                label="Venue limit"
                hint="Most people the venue can safely hold. The scanner warns if more are in."
              >
                <Input
                  id="venue-capacity"
                  inputMode="numeric"
                  value={venueCapacity}
                  onChange={(e) => setVenueCapacity(e.target.value.replace(/\D/g, ''))}
                  className="h-11"
                />
              </Field>
              <Field
                id="max-per-user"
                label="People per account"
                hint="1 means no guests. Each person gets their own ticket."
              >
                <Input
                  id="max-per-user"
                  type="number"
                  min={1}
                  max={10}
                  value={maxPerUser}
                  onChange={(e) => setMaxPerUser(e.target.value)}
                  className="h-11"
                />
              </Field>
              <Field
                id="min-age"
                label="Minimum age"
                hint="Optional. Shown on the ticket; crew check ID at the gate."
              >
                <Input
                  id="min-age"
                  inputMode="numeric"
                  value={minAge}
                  onChange={(e) => setMinAge(e.target.value.replace(/\D/g, ''))}
                  className="h-11"
                />
              </Field>
            </div>
          </Card>

          <Card className="space-y-4 rounded-card p-5">
            <h3 className="font-semibold">When people can RSVP</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                id="rsvp-opens"
                label="RSVP opens"
                hint="Empty means now. Times are India time."
              >
                <Input
                  id="rsvp-opens"
                  type="datetime-local"
                  value={opens}
                  onChange={(e) => setOpens(e.target.value)}
                  className="h-11"
                />
              </Field>
              <Field id="rsvp-closes" label="RSVP closes" hint="Empty means when the event starts.">
                <Input
                  id="rsvp-closes"
                  type="datetime-local"
                  value={closes}
                  onChange={(e) => setCloses(e.target.value)}
                  className="h-11"
                />
              </Field>
              <Field
                id="cutoff"
                label="Cancel until"
                hint="Hours before the start. People can cancel their own tickets until then."
              >
                <Input
                  id="cutoff"
                  type="number"
                  min={0}
                  max={168}
                  value={cutoff}
                  onChange={(e) => setCutoff(e.target.value)}
                  className="h-11"
                />
              </Field>
            </div>
          </Card>

          <Card className="space-y-4 rounded-card p-5">
            <h3 className="font-semibold">Gate</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                id="ci-opens"
                label="Check-in opens"
                hint="Empty means 2 hours before the start."
              >
                <Input
                  id="ci-opens"
                  type="datetime-local"
                  value={ciOpens}
                  onChange={(e) => setCiOpens(e.target.value)}
                  className="h-11"
                />
              </Field>
              <Field
                id="ci-closes"
                label="Check-in closes"
                hint="Empty means 2 hours after the end."
              >
                <Input
                  id="ci-closes"
                  type="datetime-local"
                  value={ciCloses}
                  onChange={(e) => setCiCloses(e.target.value)}
                  className="h-11"
                />
              </Field>
            </div>
            <Field
              id="note"
              label="Note for ticket holders"
              hint="Shown on the event page and the ticket: entry gate, parking, what to bring."
            >
              <textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={1000}
                rows={4}
                className="w-full rounded-control border border-input bg-background p-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30"
              />
            </Field>
          </Card>

          <Card className="space-y-4 rounded-card p-5">
            <h3 className="flex items-center gap-2 font-semibold">
              <Wallet className="size-4" aria-hidden /> Ticket payments
            </h3>
            {!summary.isPaidEvent ? (
              <p className="text-sm text-muted-foreground">
                This event is free, so tickets are issued at once. To sell tickets, set a paid price
                (or ticket types) when you edit the event, then come back here to turn on payments.
              </p>
            ) : (
              <>
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={payOn}
                    disabled={midPayment && summary.payEnabled}
                    onChange={(e) => setPayOn(e.target.checked)}
                    className="mt-1 size-5 accent-primary"
                  />
                  <span>
                    <span className="block font-medium text-foreground">
                      I accept ticket payments by UPI
                    </span>
                    <span className="block text-sm text-muted-foreground">
                      Attendees pay your UPI account directly and send you the reference number. You
                      check it in your own UPI or bank app and approve it. Whtzup.city never holds
                      the money.
                    </span>
                  </span>
                </label>

                {payOn && (
                  <div className="space-y-4 border-t border-border pt-4">
                    {midPayment && (
                      <p className="rounded-xl bg-warning-soft px-3 py-2 text-sm text-warning-soft-foreground">
                        {summary.paymentsToVerify + summary.paymentsWaiting} people are part-way
                        through paying. Payment details are locked until they are verified or their
                        time runs out.
                      </p>
                    )}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field
                        id="payee"
                        label="Name on your UPI account"
                        hint="Shown to attendees so they can check the payee."
                      >
                        <Input
                          id="payee"
                          value={payee}
                          disabled={midPayment}
                          onChange={(e) => setPayee(e.target.value)}
                          maxLength={120}
                          className="h-11"
                        />
                      </Field>
                      <Field id="upi" label="UPI ID" hint="For example name@okbank.">
                        <Input
                          id="upi"
                          value={upi}
                          disabled={midPayment}
                          onChange={(e) => setUpi(e.target.value.trim())}
                          maxLength={100}
                          autoCapitalize="none"
                          className="h-11 font-mono"
                        />
                      </Field>
                      <Field
                        id="pay-phone"
                        label="Phone number"
                        hint="Attendees can call you if a payment is stuck."
                      >
                        <Input
                          id="pay-phone"
                          type="tel"
                          inputMode="tel"
                          value={phone}
                          disabled={midPayment}
                          onChange={(e) => setPhone(e.target.value)}
                          maxLength={20}
                          className="h-11"
                        />
                      </Field>
                      <Field
                        id="pay-window"
                        label="Time to pay (hours)"
                        hint="A held seat goes back if proof does not arrive in this time."
                      >
                        <Input
                          id="pay-window"
                          type="number"
                          min={1}
                          max={72}
                          value={windowH}
                          onChange={(e) => setWindowH(e.target.value)}
                          className="h-11"
                        />
                      </Field>
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-sm font-medium text-foreground">
                        Your UPI QR code photo
                      </span>
                      <div className="flex items-center gap-3">
                        {qr && (
                          // eslint-disable-next-line @next/next/no-img-element -- host-uploaded photo
                          <img
                            src={qr}
                            alt="Your UPI QR code"
                            className="size-20 rounded-lg border border-border bg-white object-contain"
                          />
                        )}
                        <label
                          className={`flex min-h-11 flex-1 items-center gap-2 rounded-control border border-dashed border-input bg-background px-3 text-sm text-muted-foreground ${
                            midPayment
                              ? 'cursor-not-allowed opacity-60'
                              : 'cursor-pointer hover:border-primary/50'
                          }`}
                        >
                          {qrBusy ? (
                            <Loader2 className="size-4 animate-spin" aria-hidden />
                          ) : (
                            <ImagePlus className="size-4" aria-hidden />
                          )}
                          {qrBusy ? 'Uploading…' : qr ? 'Replace QR photo' : 'Upload your QR photo'}
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            disabled={midPayment || qrBusy}
                            className="sr-only"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) uploadQr(f);
                              e.target.value = '';
                            }}
                          />
                        </label>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        This is the main way attendees pay. Big photos are shrunk for you. Without
                        one, we show a QR made from your UPI ID with the exact amount filled in.
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </Card>
        </>
      )}

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" loading={saving}>
        Save settings
      </Button>
    </form>
  );
}
