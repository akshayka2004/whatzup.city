'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  Phone,
  UtensilsCrossed,
  Users,
} from 'lucide-react';
import { PublicLayout } from '@/components/layouts/public-layout';
import { PageHeader } from '@/components/system/page-header';
import { ModalSurface } from '@/components/system/modal-surface';
import { EmptyState } from '@/components/common/empty-state';
import { ResponsiveImage } from '@/components/common/responsive-image';
import { FilterChip, ChipRow } from '@/components/system/filter-chip';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';
import { apiService } from '@/lib/services/api-service';
import { getViewerCity, setViewerCity } from '@/lib/constants';
import type { PlatformOfferDetails } from '@/lib/platform-offers';

type Buffet = {
  id: string;
  title: string;
  location: string;
  city?: string | null;
  price?: string | null;
  phone?: string | null;
  description?: string | null;
  imageSignedUrl?: string | null;
  details?: PlatformOfferDetails;
};

type MyRsvp = {
  id: string;
  visitDate: string;
  guests: number;
  status: string;
  buffet: { id: string; title: string; city: string | null; phone: string | null };
};

const today = () => new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);
const niceDay = (d: string) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Waiting for the hotel',
  CONFIRMED: 'Confirmed',
  CANCELLED: 'Cancelled',
};

/** Buffets in each city: hotel, timings, price per person, group discount, map, phone and an RSVP. */
export default function BuffetsPage() {
  return (
    <Suspense fallback={null}>
      <Buffets />
    </Suspense>
  );
}

function Buffets() {
  const { user } = useAuth();
  const params = useSearchParams();
  const wanted = params.get('offer');

  const [city, setCity] = useState('');
  const [all, setAll] = useState<Buffet[] | null>(null);
  const [error, setError] = useState('');
  const [rsvpFor, setRsvpFor] = useState<Buffet | null>(null);
  const [mine, setMine] = useState<MyRsvp[]>([]);
  const [thanks, setThanks] = useState('');

  useEffect(() => {
    setCity(getViewerCity());
  }, []);

  useEffect(() => {
    let live = true;
    apiService.get<any>('/v1/platform-offers/public?category=BUFFET').then((res) => {
      if (!live) return;
      if (res.error) {
        setError(res.error);
        return;
      }
      const list = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
      setAll(list);
    });
    return () => {
      live = false;
    };
  }, []);

  const loadMine = useCallback(async () => {
    if (!user) return setMine([]);
    const res = await apiService.get<MyRsvp[]>('/v1/platform-offers/rsvps/mine', { fresh: true });
    if (!res.error && Array.isArray(res.data)) setMine(res.data);
  }, [user]);
  useEffect(() => {
    loadMine();
  }, [loadMine]);

  // Arriving from an offer card (?offer=id): open that buffet's RSVP once the list is in.
  useEffect(() => {
    if (!wanted || !all) return;
    const b = all.find((x) => x.id === wanted);
    if (b) {
      if (b.city) setCity(b.city);
      setRsvpFor(b);
    }
    // Only on first load of the list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all]);

  const pick = (c: string) => {
    setCity(c);
    setViewerCity(c);
  };

  // Cities that have a buffet, plus the viewer's own so an empty city says so honestly.
  const cities = useMemo(() => {
    const have = new Set((all ?? []).map((b) => b.city).filter(Boolean) as string[]);
    return [...have].sort();
  }, [all]);

  const shown = useMemo(
    () => (all ?? []).filter((b) => !city || (b.city ?? '').toLowerCase() === city.toLowerCase()),
    [all, city],
  );
  const grouped = useMemo(() => {
    const m = new Map<string, Buffet[]>();
    for (const b of shown) {
      const k = b.city || 'Kerala';
      m.set(k, [...(m.get(k) ?? []), b]);
    }
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [shown]);

  const cancel = async (id: string) => {
    const res = await apiService.patch<any>(`/v1/platform-offers/rsvps/${id}/cancel`, {});
    if (!res.error) loadMine();
  };

  return (
    <PublicLayout>
      <div className="mx-auto max-w-4xl space-y-6 py-2">
        <PageHeader
          title="Buffets"
          description="Hotel buffets in your city. See the timings and price, then send an RSVP and the hotel will call you."
        />

        {thanks && (
          <Card
            className="flex items-start gap-3 rounded-card border-success/30 bg-success-soft p-4"
            role="status"
            aria-live="polite"
            data-testid="rsvp-thanks"
          >
            <CheckCircle2
              className="mt-0.5 size-5 shrink-0 text-success-soft-foreground"
              aria-hidden
            />
            <p className="text-sm text-success-soft-foreground">{thanks}</p>
          </Card>
        )}

        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">City</p>
          <ChipRow wrap label="City">
            <FilterChip selected={city === ''} onClick={() => pick('')}>
              All cities
            </FilterChip>
            {cities.map((c) => (
              <FilterChip key={c} selected={city === c} onClick={() => pick(c)}>
                {c}
              </FilterChip>
            ))}
            {city && !cities.includes(city) && (
              <FilterChip selected onClick={() => pick(city)}>
                {city}
              </FilterChip>
            )}
          </ChipRow>
        </div>

        {error ? (
          <Card className="rounded-card p-6 text-center">
            <p className="text-sm text-destructive">{error}</p>
          </Card>
        ) : !all ? (
          <Loader2
            className="mx-auto my-12 size-6 animate-spin text-muted-foreground"
            aria-label="Loading"
          />
        ) : shown.length === 0 ? (
          <EmptyState
            icon={UtensilsCrossed}
            title={city ? `No buffets in ${city} yet` : 'No buffets yet'}
            description={
              city && cities.length
                ? 'Try another city. More hotels are added all the time.'
                : 'Check back soon. We are adding hotels.'
            }
            action={city ? { label: 'See all cities', onClick: () => pick('') } : undefined}
          />
        ) : (
          grouped.map(([group, list]) => (
            <section key={group} className="space-y-3" aria-label={`Buffets in ${group}`}>
              {!city && <h2 className="text-lg font-bold text-foreground">{group}</h2>}
              <div className="grid gap-4 sm:grid-cols-2">
                {list.map((b) => (
                  <BuffetCard key={b.id} b={b} onRsvp={() => setRsvpFor(b)} />
                ))}
              </div>
            </section>
          ))
        )}

        {user && mine.length > 0 && (
          <section className="space-y-3" aria-label="My RSVPs">
            <h2 className="text-lg font-bold text-foreground">My RSVPs</h2>
            <div className="space-y-2">
              {mine.map((r) => (
                <Card
                  key={r.id}
                  className="flex-row flex-wrap items-center justify-between gap-3 rounded-2xl p-4"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">{r.buffet.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {niceDay(r.visitDate)} · {r.guests} {r.guests === 1 ? 'guest' : 'guests'}
                      {r.buffet.city ? ` · ${r.buffet.city}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-foreground">
                      {STATUS_LABEL[r.status] ?? r.status}
                    </span>
                    {r.status !== 'CANCELLED' && r.visitDate >= today() && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="min-h-10"
                        onClick={() => cancel(r.id)}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}
      </div>

      {rsvpFor && (
        <RsvpDialog
          buffet={rsvpFor}
          signedIn={!!user}
          defaultName={user?.name ?? ''}
          onClose={() => setRsvpFor(null)}
          onDone={(msg) => {
            setRsvpFor(null);
            setThanks(msg);
            loadMine();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      )}
    </PublicLayout>
  );
}

function BuffetCard({ b, onRsvp }: { b: Buffet; onRsvp: () => void }) {
  const d = b.details ?? {};
  const open = d.rsvpOpen !== false;
  return (
    <Card className="flex flex-col overflow-hidden rounded-card" data-testid="buffet-card">
      {b.imageSignedUrl && (
        <ResponsiveImage src={b.imageSignedUrl} alt="" ratio="16 / 9" fit="contain" quality={70} />
      )}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h3 className="text-lg font-bold text-foreground">{b.title}</h3>
          <p className="mt-0.5 flex items-start gap-1.5 text-sm text-muted-foreground">
            <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>{b.location}</span>
          </p>
        </div>
        {b.price && <p className="text-xl font-extrabold text-primary">{b.price}</p>}
        <dl className="space-y-1.5 text-sm">
          {d.timings && (
            <div className="flex items-start gap-2">
              <Clock className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
              <div>
                <dt className="sr-only">Timings</dt>
                <dd className="text-foreground">{d.timings}</dd>
              </div>
            </div>
          )}
          {d.groupDiscount && (
            <div className="flex items-start gap-2">
              <Users className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
              <div>
                <dt className="sr-only">Group discount</dt>
                <dd className="text-foreground">{d.groupDiscount}</dd>
              </div>
            </div>
          )}
        </dl>
        {b.description && <p className="text-sm text-muted-foreground">{b.description}</p>}
        <div className="mt-auto flex flex-wrap gap-2 pt-1">
          {open && (
            <Button className="min-h-11 flex-1" onClick={onRsvp}>
              RSVP
            </Button>
          )}
          {b.phone && (
            <Button asChild variant="outline" className="min-h-11 flex-1 gap-1.5">
              <a href={`tel:${b.phone}`}>
                <Phone className="size-4" aria-hidden /> Call
              </a>
            </Button>
          )}
          {d.mapLink && /^https?:\/\//i.test(d.mapLink) && (
            <Button asChild variant="outline" className="min-h-11 flex-1 gap-1.5">
              <a href={d.mapLink} target="_blank" rel="noopener noreferrer">
                <MapPin className="size-4" aria-hidden /> Map
              </a>
            </Button>
          )}
        </div>
        {!open && (
          <p className="text-xs text-muted-foreground">
            RSVPs are closed here for now. Please call the hotel.
          </p>
        )}
      </div>
    </Card>
  );
}

function RsvpDialog({
  buffet,
  signedIn,
  defaultName,
  onClose,
  onDone,
}: {
  buffet: Buffet;
  signedIn: boolean;
  defaultName: string;
  onClose: () => void;
  onDone: (thanks: string) => void;
}) {
  const [name, setName] = useState(defaultName);
  const [phone, setPhone] = useState('');
  const [visitDate, setVisitDate] = useState(today());
  const [guests, setGuests] = useState(2);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    const res = await apiService.post<{ id: string; thanks: string }>(
      `/v1/platform-offers/${buffet.id}/rsvp`,
      { name: name.trim(), phone: phone.trim(), visitDate, guests, note: note.trim() || undefined },
    );
    setBusy(false);
    if (res.error || !res.data) {
      setError(res.error || 'We could not send that. Please try again.');
      return;
    }
    onDone(res.data.thanks);
  };

  return (
    <ModalSurface onClose={onClose} label={`RSVP for ${buffet.title}`} className="sm:max-w-md">
      <div className="space-y-4">
        <div>
          <h3 className="text-xl font-bold text-foreground">RSVP</h3>
          <p className="text-sm text-muted-foreground">
            {buffet.title}
            {buffet.city ? ` · ${buffet.city}` : ''}
          </p>
        </div>

        {!signedIn ? (
          <EmptyState
            icon={CalendarDays}
            title="Sign in to send an RSVP"
            description="So the hotel has a way to reach you."
            action={{
              label: 'Sign in',
              href: `/login?redirect=${encodeURIComponent(`/buffets?offer=${buffet.id}`)}`,
            }}
          />
        ) : (
          <form onSubmit={send} className="space-y-3">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-foreground">Your name</span>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={120}
                required
                className="h-11"
                autoComplete="name"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-foreground">Phone the hotel can call</span>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                maxLength={30}
                required
                inputMode="tel"
                autoComplete="tel"
                className="h-11"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-foreground">Day</span>
                <Input
                  type="date"
                  value={visitDate}
                  min={today()}
                  onChange={(e) => setVisitDate(e.target.value)}
                  required
                  className="h-11"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-foreground">Guests</span>
                <Input
                  type="number"
                  value={guests}
                  min={1}
                  max={50}
                  onChange={(e) =>
                    setGuests(Math.max(1, Math.min(50, Number(e.target.value) || 1)))
                  }
                  required
                  className="h-11"
                />
              </label>
            </div>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-foreground">
                Anything the hotel should know <span className="font-normal">(optional)</span>
              </span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={500}
                rows={2}
                className="w-full rounded-xl border border-input bg-background p-3 text-sm"
              />
            </label>
            {buffet.details?.timings && (
              <p className="text-xs text-muted-foreground">Timings: {buffet.details.timings}</p>
            )}
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            <Button type="submit" className="min-h-11 w-full" loading={busy}>
              Send RSVP
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              No payment now. The hotel confirms by phone.
            </p>
          </form>
        )}
      </div>
    </ModalSurface>
  );
}
