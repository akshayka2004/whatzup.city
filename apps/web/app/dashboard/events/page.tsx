'use client';

import { ModalSurface } from '@/components/system/modal-surface';
import { useConfirm } from '@/components/common/confirm-dialog';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { BusinessLayout } from '@/components/layouts/business-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Plus,
  CalendarDays,
  Trash2,
  Edit,
  X,
  Loader2,
  ExternalLink,
  Ticket,
  Users,
  MapPin,
  ImagePlus,
  QrCode,
} from 'lucide-react';
import { apiService } from '@/lib/services/api-service';
import { uploadImage } from '@/lib/storage-upload';
import {
  BusinessEventsAnalytics,
  BusinessEventsHistory,
} from '@/components/events/host/business-overview';
import { useAuth } from '@/hooks/use-auth';
import { KERALA_CITIES, EVENT_CATEGORIES } from '@/lib/constants';
import { ListFilters, countBy, matchesSearch } from '@/components/system/list-filters';

interface Ev {
  id: string;
  title: string;
  description?: string;
  posterImage?: string | null;
  venue?: string | null;
  city?: string | null;
  targetCities?: string[];
  category?: string | null;
  ticketType?: string;
  ticketPrice?: number | string | null;
  ticketTiers?: { name: string; price: number }[] | null;
  startDate: string;
  endDate: string;
  registrationUrl?: string | null;
  ticketUrl?: string | null;
  registrationClicks?: number;
  ticketClicks?: number;
  status?: string;
  bookingMode?: 'NONE' | 'RSVP';
}

const empty = {
  title: '',
  description: '',
  posterImage: '',
  venue: '',
  city: '',
  category: '',
  ticketType: 'FREE',
  ticketPrice: '',
  startDate: '',
  endDate: '',
  registrationUrl: '',
  ticketUrl: '',
};

export default function DashboardEventsPage() {
  const { user } = useAuth();
  const businessId = user?.businessId || user?.entity?.id;

  const [events, setEvents] = useState<Ev[]>([]);
  // List filters
  const [fq, setFq] = useState('');
  const [fWhen, setFWhen] = useState('');
  const [fCategory, setFCategory] = useState('');
  const [fCity, setFCity] = useState('');
  const [fTicket, setFTicket] = useState('');
  const resetFilters = () => {
    setFq('');
    setFWhen('');
    setFCategory('');
    setFCity('');
    setFTicket('');
  };
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Ev | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [form, setForm] = useState<any>(empty);
  const [targetCities, setTargetCities] = useState<string[]>([]);
  const [posterUploading, setPosterUploading] = useState(false);
  const [tiers, setTiers] = useState<{ name: string; price: string }[]>([]);
  // Events (publish and manage), History (events that are over), Analytics (the whole picture).
  const [view, setView] = useState<'events' | 'history' | 'analytics'>('events');
  useEffect(() => {
    const v = new URLSearchParams(window.location.search).get('view');
    if (v === 'history' || v === 'analytics') setView(v);
  }, []);
  const switchView = (v: typeof view) => {
    setView(v);
    window.history.replaceState(null, '', v === 'events' ? '/dashboard/events' : `?view=${v}`);
  };

  const fetchEvents = useCallback(async () => {
    if (!businessId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const res = await apiService.get<any>(`/v1/events/mine/${businessId}`);
    setEvents(res.error ? [] : Array.isArray(res.data) ? res.data : []);
    setLoading(false);
  }, [businessId]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const openCreate = () => {
    setEditing(null);
    setForm(empty);
    setTargetCities([]);
    setTiers([]);
    setErr('');
    setOpen(true);
  };
  const openEdit = (ev: Ev) => {
    setEditing(ev);
    setForm({
      title: ev.title,
      description: ev.description || '',
      posterImage: ev.posterImage || '',
      venue: ev.venue || '',
      city: ev.city || '',
      category: ev.category || '',
      ticketType: ev.ticketType || 'FREE',
      ticketPrice: ev.ticketPrice != null ? String(ev.ticketPrice) : '',
      startDate: ev.startDate?.slice(0, 16) || '',
      endDate: ev.endDate?.slice(0, 16) || '',
      registrationUrl: ev.registrationUrl || '',
      ticketUrl: ev.ticketUrl || '',
    });
    setTargetCities(ev.targetCities || []);
    setTiers(
      Array.isArray(ev.ticketTiers)
        ? ev.ticketTiers.map((t) => ({ name: t.name || '', price: String(t.price ?? '') }))
        : [],
    );
    setErr('');
    setOpen(true);
  };

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  const toggleCity = (c: string) =>
    setTargetCities((cs) => (cs.includes(c) ? cs.filter((x) => x !== c) : [...cs, c]));
  const addTier = () => setTiers((t) => [...t, { name: '', price: '' }]);
  const updateTier = (i: number, patch: Partial<{ name: string; price: string }>) =>
    setTiers((t) => t.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  const removeTier = (i: number) => setTiers((t) => t.filter((_, idx) => idx !== i));

  const handlePosterUpload = async (file: File) => {
    setPosterUploading(true);
    setErr('');
    try {
      // Heavy phone photos are shrunk first, so a big picture uploads instead of failing.
      const up = await uploadImage(file, 'event', editing?.id || businessId || 'new');
      set('posterImage', up.publicUrl);
    } catch (e: any) {
      setErr(e?.message || 'Poster upload failed');
    } finally {
      setPosterUploading(false);
    }
  };

  const save = async () => {
    if (!businessId) return;
    if (!form.title || !form.startDate || !form.endDate) {
      setErr('Title, start and end dates are required.');
      return;
    }
    const cleanTiers = tiers
      .map((t) => ({ name: t.name.trim(), price: Number(t.price) }))
      .filter((t) => t.name && Number.isFinite(t.price) && t.price >= 0);
    if (form.ticketType === 'PAID' && !form.ticketPrice && cleanTiers.length === 0) {
      setErr('Enter a ticket price, add ticket tiers, or switch to Free.');
      return;
    }
    setSaving(true);
    setErr('');
    const payload = {
      businessId,
      ...form,
      ticketPrice:
        form.ticketType === 'PAID'
          ? form.ticketPrice
            ? Number(form.ticketPrice)
            : undefined
          : undefined,
      ticketTiers: form.ticketType === 'PAID' && cleanTiers.length ? cleanTiers : null,
      targetCities,
      startDate: new Date(form.startDate).toISOString(),
      endDate: new Date(form.endDate).toISOString(),
    };
    const res = editing
      ? await apiService.patch<any>(`/v1/events/${editing.id}`, payload)
      : await apiService.post<any>('/v1/events', payload);
    setSaving(false);
    if (res.error) {
      setErr(res.error);
      return;
    }
    setOpen(false);
    fetchEvents();
  };

  const confirmDialog = useConfirm();

  const remove = async (ev: Ev) => {
    if (!businessId) return;
    if (
      !(await confirmDialog({
        title: 'Delete this event?',
        description: `"${ev.title}" will be removed permanently.`,
        confirmLabel: 'Delete',
        tone: 'danger',
      }))
    )
      return;
    await apiService.delete<any>(`/v1/events/${ev.id}?businessId=${businessId}`);
    fetchEvents();
  };

  const nowMs = Date.now();
  const whenOf = (e: Ev) => {
    const start = Date.parse(e.startDate);
    const end = e.endDate ? Date.parse(e.endDate) : start;
    if (Number.isFinite(end) && end < nowMs) return 'PAST';
    if (Number.isFinite(start) && start <= nowMs) return 'LIVE';
    return 'UPCOMING';
  };
  const whenCounts = countBy(events, whenOf);
  const categoryCounts = countBy(events, (e) => e.category);
  const cityCounts = countBy(events, (e) => e.city);
  const ticketCounts = countBy(events, (e) => (e.ticketType === 'PAID' ? 'PAID' : 'FREE'));
  const visibleEvents = events.filter(
    (e) =>
      (!fWhen || whenOf(e) === fWhen) &&
      (!fCategory || e.category === fCategory) &&
      (!fCity || e.city === fCity) &&
      (!fTicket || (e.ticketType === 'PAID' ? 'PAID' : 'FREE') === fTicket) &&
      matchesSearch([e.title, e.venue, e.city], fq),
  );

  return (
    <BusinessLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Events</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Publish events and track registration & ticket clicks.
            </p>
          </div>
          <Button
            onClick={openCreate}
            className="rounded-xl bg-primary text-primary-foreground font-semibold gap-1.5 cursor-pointer"
          >
            <Plus className="h-4 w-4" /> New Event
          </Button>
        </div>

        <div
          role="tablist"
          aria-label="Events sections"
          className="flex w-full gap-1 rounded-xl bg-muted/60 p-1 sm:w-fit"
        >
          {(
            [
              ['events', 'Events'],
              ['history', 'History'],
              ['analytics', 'Analytics'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              role="tab"
              type="button"
              aria-selected={view === key}
              onClick={() => switchView(key)}
              className={`min-h-10 flex-1 cursor-pointer rounded-lg px-4 text-sm font-medium transition-colors sm:flex-none ${
                view === key
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {view === 'history' && <BusinessEventsHistory businessId={businessId} />}
        {view === 'analytics' && <BusinessEventsAnalytics businessId={businessId} />}

        {view === 'events' && (
          <>
            {!loading && events.length > 0 && (
              <ListFilters
                noun="events"
                shown={visibleEvents.length}
                total={events.length}
                onReset={resetFilters}
                search={{ value: fq, onChange: setFq, placeholder: 'Search title, venue, city…' }}
                groups={[
                  {
                    key: 'when',
                    label: 'When',
                    value: fWhen,
                    onChange: setFWhen,
                    options: [
                      { value: 'UPCOMING', label: 'Upcoming', count: whenCounts.UPCOMING ?? 0 },
                      { value: 'LIVE', label: 'Happening now', count: whenCounts.LIVE ?? 0 },
                      { value: 'PAST', label: 'Past', count: whenCounts.PAST ?? 0 },
                    ],
                  },
                  {
                    key: 'ticket',
                    label: 'Tickets',
                    value: fTicket,
                    onChange: setFTicket,
                    options: [
                      { value: 'FREE', label: 'Free', count: ticketCounts.FREE ?? 0 },
                      { value: 'PAID', label: 'Paid', count: ticketCounts.PAID ?? 0 },
                    ],
                  },
                  {
                    key: 'category',
                    label: 'Category',
                    value: fCategory,
                    onChange: setFCategory,
                    display: 'select',
                    options: Object.keys(categoryCounts)
                      .sort()
                      .map((k) => ({
                        value: k,
                        label: EVENT_CATEGORIES.find((c) => c.value === k)?.label ?? k,
                        count: categoryCounts[k],
                      })),
                  },
                  {
                    key: 'city',
                    label: 'City',
                    value: fCity,
                    onChange: setFCity,
                    display: 'select',
                    options: Object.keys(cityCounts)
                      .sort()
                      .map((k) => ({ value: k, label: k, count: cityCounts[k] })),
                  },
                ]}
              />
            )}
            {!loading && events.length > 0 && visibleEvents.length === 0 && (
              <p className="text-sm text-muted-foreground">No events match these filters.</p>
            )}
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : events.length === 0 ? (
              <Card className="p-12 rounded-2xl text-center border-dashed border-border bg-card/40">
                <CalendarDays className="h-10 w-10 mx-auto text-muted-foreground mb-3 opacity-50" />
                <p className="text-sm text-muted-foreground">
                  No events yet. Publish your first one.
                </p>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {visibleEvents.map((ev, i) => (
                  <Card
                    key={ev.id}
                    className="ui-fade-up p-5 rounded-2xl border-border bg-card"
                    style={{ animationDelay: `${Math.min(i, 8) * 0.05}s` }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-foreground">{ev.title}</h3>
                        <div className="flex items-center gap-1.5 mt-1">
                          {ev.category && (
                            <span className="px-1.5 py-0.5 rounded-md text-xs font-medium bg-secondary text-muted-foreground">
                              {EVENT_CATEGORIES.find((c) => c.value === ev.category)?.label ||
                                ev.category}
                            </span>
                          )}
                          <span
                            className={`px-1.5 py-0.5 rounded-md text-xs font-medium ${ev.ticketType === 'PAID' ? 'bg-brand-soft text-brand-soft-foreground' : 'bg-success-soft text-success-soft-foreground'}`}
                          >
                            {ev.ticketType !== 'PAID'
                              ? 'Free'
                              : Array.isArray(ev.ticketTiers) && ev.ticketTiers.length
                                ? `${ev.ticketTiers.length} tiers from ₹${Math.min(...ev.ticketTiers.map((t) => Number(t.price) || 0)).toLocaleString('en-IN')}`
                                : `₹${Number(ev.ticketPrice || 0).toLocaleString('en-IN')}`}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                          <MapPin className="h-3 w-3" />{' '}
                          {[ev.venue, ev.city].filter(Boolean).join(', ') || '—'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {ev.startDate?.slice(0, 10)} → {ev.endDate?.slice(0, 10)}
                        </p>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <Button
                          onClick={() => openEdit(ev)}
                          aria-label={`Edit ${ev.title}`}
                          variant="outline"
                          size="icon"
                          className="h-10 w-10 rounded-lg border-border cursor-pointer"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          onClick={() => remove(ev)}
                          aria-label={`Delete ${ev.title}`}
                          variant="outline"
                          size="icon"
                          className="h-10 w-10 rounded-lg border-destructive/30 text-destructive cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-3">
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="cursor-pointer rounded-lg"
                      >
                        <Link href={`/dashboard/events/${ev.id}`}>
                          <QrCode className="h-3.5 w-3.5" />
                          {ev.bookingMode === 'RSVP'
                            ? 'Tickets and check-in'
                            : 'Take RSVPs and tickets'}
                        </Link>
                      </Button>
                    </div>
                    <div className="flex gap-3 mt-3">
                      <span className="inline-flex items-center gap-1 text-xs text-foreground">
                        <ExternalLink className="h-3.5 w-3.5 text-primary" />{' '}
                        {ev.registrationClicks ?? 0} registrations
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs text-foreground">
                        <Ticket className="h-3.5 w-3.5 text-success-soft-foreground" />{' '}
                        {ev.ticketClicks ?? 0} ticket clicks
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {open && (
        <ModalSurface onClose={() => setOpen(false)} label="Event" className="sm:max-w-lg">
          <h3 className="text-lg font-bold text-foreground mb-4">
            {editing ? 'Edit Event' : 'New Event'}
          </h3>

          <div className="space-y-3">
            <Input
              placeholder="Event title"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              className="h-10 bg-background border-input rounded-xl text-foreground"
            />
            <textarea
              placeholder="Description"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              className="w-full min-h-20 p-3 bg-background border border-input rounded-xl text-sm text-foreground"
            />

            <div>
              <label className="text-xs text-muted-foreground">Poster image</label>
              <div className="flex items-center gap-3 mt-1">
                {form.posterImage && (
                  // eslint-disable-next-line @next/next/no-img-element -- local upload preview (blob URL)
                  <img
                    src={form.posterImage}
                    alt="Poster"
                    className="h-14 w-14 rounded-lg object-cover border border-border shrink-0"
                  />
                )}
                <label className="flex-1 h-10 px-3 flex items-center gap-2 bg-background border border-dashed border-input rounded-xl text-sm text-muted-foreground cursor-pointer hover:border-primary/50">
                  {posterUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ImagePlus className="h-4 w-4" />
                  )}
                  {posterUploading
                    ? 'Uploading…'
                    : form.posterImage
                      ? 'Replace poster'
                      : 'Upload poster'}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handlePosterUpload(f);
                    }}
                  />
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                placeholder="Venue"
                value={form.venue}
                onChange={(e) => set('venue', e.target.value)}
                className="h-10 bg-background border-input rounded-xl text-foreground"
              />
              <select
                value={form.city}
                onChange={(e) => set('city', e.target.value)}
                className="h-10 px-3 bg-background border border-input rounded-xl text-sm text-foreground"
              >
                <option value="">City (location)</option>
                {KERALA_CITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <select
                value={form.category}
                onChange={(e) => set('category', e.target.value)}
                className="h-10 px-3 bg-background border border-input rounded-xl text-sm text-foreground"
              >
                <option value="">Category</option>
                {EVENT_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={form.ticketType}
                  onChange={(e) => set('ticketType', e.target.value)}
                  className="h-10 px-3 bg-background border border-input rounded-xl text-sm text-foreground"
                >
                  <option value="FREE">Free</option>
                  <option value="PAID">Paid</option>
                </select>
                {form.ticketType === 'PAID' && (
                  <Input
                    type="number"
                    placeholder="Price ₹"
                    value={form.ticketPrice}
                    onChange={(e) => set('ticketPrice', e.target.value)}
                    className="h-10 bg-background border-input rounded-xl text-foreground"
                  />
                )}
              </div>
            </div>

            {form.ticketType === 'PAID' && (
              <div>
                <label className="text-xs text-muted-foreground">
                  Ticket tiers (optional — e.g. Gold, Platinum). Leave empty to use the flat price
                  above.
                </label>
                <div className="space-y-2 mt-1">
                  {tiers.map((t, i) => (
                    <div key={i} className="flex gap-2">
                      <Input
                        placeholder="Tier name (e.g. Gold)"
                        value={t.name}
                        onChange={(e) => updateTier(i, { name: e.target.value })}
                        className="h-9 bg-background border-input rounded-lg text-foreground flex-1"
                      />
                      <Input
                        type="number"
                        placeholder="Price ₹"
                        value={t.price}
                        onChange={(e) => updateTier(i, { price: e.target.value })}
                        className="h-9 bg-background border-input rounded-lg text-foreground w-28"
                      />
                      <button
                        type="button"
                        onClick={() => removeTier(i)}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addTier}
                    className="text-xs font-medium text-primary hover:underline cursor-pointer"
                  >
                    + Add tier
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Start date &amp; time</label>
                <Input
                  type="datetime-local"
                  value={form.startDate}
                  onChange={(e) => set('startDate', e.target.value)}
                  className="h-10 bg-background border-input rounded-xl text-foreground"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">End date &amp; time</label>
                <Input
                  type="datetime-local"
                  value={form.endDate}
                  onChange={(e) => set('endDate', e.target.value)}
                  className="h-10 bg-background border-input rounded-xl text-foreground"
                />
              </div>
            </div>
            <Input
              placeholder="Registration URL (external)"
              value={form.registrationUrl}
              onChange={(e) => set('registrationUrl', e.target.value)}
              className="h-10 bg-background border-input rounded-xl text-foreground"
            />
            <Input
              placeholder="Ticket / booking URL (external)"
              value={form.ticketUrl}
              onChange={(e) => set('ticketUrl', e.target.value)}
              className="h-10 bg-background border-input rounded-xl text-foreground"
            />

            <div>
              <label className="text-xs text-muted-foreground">
                Show in cities (none = all cities)
              </label>
              <div className="flex flex-wrap gap-1.5 mt-1 max-h-28 overflow-y-auto">
                {KERALA_CITIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggleCity(c)}
                    className={`px-2 py-1 rounded-lg text-xs border cursor-pointer ${targetCities.includes(c) ? 'bg-primary/20 border-primary text-primary' : 'bg-background border-input text-muted-foreground'}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {err && <p className="text-xs text-destructive">{err}</p>}
          </div>

          <div className="flex justify-end gap-2 mt-5">
            <Button
              onClick={() => setOpen(false)}
              variant="outline"
              className="rounded-xl border-border text-muted-foreground"
            >
              Cancel
            </Button>
            <Button
              onClick={save}
              disabled={saving}
              className="rounded-xl bg-primary text-primary-foreground font-semibold gap-1.5"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CalendarDays className="h-4 w-4" />
              )}{' '}
              {editing ? 'Save' : 'Publish'}
            </Button>
          </div>
        </ModalSurface>
      )}
    </BusinessLayout>
  );
}
