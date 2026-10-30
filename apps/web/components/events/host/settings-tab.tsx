'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Clock, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';
import { apiService } from '@/lib/services/api-service';
import { fromIstInput, toIstInput } from '@/lib/event-booking';
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => setOn(summary.bookingMode === 'RSVP'), [summary.bookingMode]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
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
