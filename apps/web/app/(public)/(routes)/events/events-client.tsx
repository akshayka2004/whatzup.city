'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { PublicLayout } from '@/components/layouts/public-layout';
import { CalendarDays } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EmptyState } from '@/components/common/empty-state';
import { apiService } from '@/lib/services/api-service';
import { KERALA_CITIES, EVENT_CATEGORIES, getViewerCity, setViewerCity } from '@/lib/constants';
import { EventCard, type Ev } from '@/components/public/media/event-card';
import { eventWindow } from '@/components/public/media/event-actions';
import { ChipRow, type ChipOption } from '@/components/public/media/filter-chips';
import { GridItem } from '@/components/public/media/grid-item';
import { EventGridSkeleton } from '@/components/public/media/media-skeletons';
import { DAY_MS, istDayStart, istWeekday } from '@/components/public/media/format';
import { useNow } from '@/components/public/media/use-now';

type When = 'all' | 'today' | 'weekend' | 'upcoming';

const WHEN_OPTIONS: ChipOption<When>[] = [
  { value: 'all', label: 'All events' },
  { value: 'today', label: 'Today' },
  { value: 'weekend', label: 'This weekend' },
  { value: 'upcoming', label: 'Upcoming' },
];

/** Same list-shape handling the page has always used for GET /v1/events. */
function extractList(body: any): Ev[] {
  const list = Array.isArray(body) ? body : (body?.data ?? []);
  return Array.isArray(list) ? list : [];
}

function matchesWhen(ev: Ev, when: When, now: number): boolean {
  const w = eventWindow(ev);
  if (!w) return false;
  const today = istDayStart(now);
  const overlaps = (from: number, to: number) => w.start < to && w.end > from;
  if (when === 'today') return overlaps(today, today + DAY_MS);
  if (when === 'upcoming') return w.start > now;
  if (when === 'weekend') {
    const dow = istWeekday(now); // 0 = Sun … 6 = Sat
    const sat = dow === 0 ? today - DAY_MS : today + (6 - dow) * DAY_MS;
    return overlaps(sat, sat + 2 * DAY_MS);
  }
  return true;
}

export function EventsClient({ initialEvents = null }: { initialEvents?: unknown | null }) {
  // The server renders the default (all cities) list; it stays valid until the viewer picks a city.
  const seeded = useRef(initialEvents != null);
  const [events, setEvents] = useState<Ev[]>(() =>
    initialEvents != null ? extractList(initialEvents) : [],
  );
  const [loading, setLoading] = useState(initialEvents == null);
  const [city, setCity] = useState('');
  const [category, setCategory] = useState('');
  const [when, setWhen] = useState<When>('all');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const now = useNow();

  useEffect(() => {
    const stored = getViewerCity();
    if (stored) {
      setLoading(true); // the seeded list is for all cities — don't flash it for a viewer with a saved city
      setCity(stored);
    }
  }, []);

  useEffect(() => {
    if (seeded.current && !city) return;
    seeded.current = false;
    let cancelled = false;
    setLoading(true);
    apiService
      .get<any>(`/v1/events${city ? `?city=${encodeURIComponent(city)}` : ''}`)
      .then((res) => {
        if (cancelled) return;
        setEvents(res.error ? [] : extractList(res.data));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [city]);

  const handleCityChange = (v: string) => {
    const next = v === 'all' ? '' : v;
    setCity(next);
    setViewerCity(next);
  };

  const visibleEvents = useMemo(() => {
    let list = category ? events.filter((ev) => ev.category === category) : events;
    if (when !== 'all' && now != null) list = list.filter((ev) => matchesWhen(ev, when, now));
    return list;
  }, [events, category, when, now]);

  const toggleExpanded = (id: string) =>
    setExpanded((cur) => {
      const next = new Set(cur);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  // Record the outbound click, then open the publisher's page in a new tab.
  const go = async (ev: Ev, type: 'REGISTER' | 'TICKET') => {
    const res = await apiService.post<any>(`/v1/events/${ev.id}/click`, { type });
    const url = res.data?.url;
    if (url) {
      window.open(url.startsWith('http') ? url : `https://${url}`, '_blank', 'noopener,noreferrer');
    }
  };

  const filtered = category !== '' || when !== 'all';
  const resetFilters = () => {
    setCategory('');
    setWhen('all');
  };

  return (
    <PublicLayout>
      <div>
        <h1 className="mb-1 text-2xl font-bold tracking-tight sm:text-3xl">Events</h1>
        <p className="mb-5 text-muted-foreground">
          Discover events near you — register or grab tickets.
        </p>

        <ChipRow
          options={WHEN_OPTIONS}
          value={when}
          onChange={setWhen}
          ariaLabel="When"
          className="mb-3"
        />

        <div className="mb-6 grid grid-cols-2 gap-3 sm:flex">
          <Select value={city || 'all'} onValueChange={handleCityChange}>
            <SelectTrigger
              aria-label="City"
              className="w-full rounded-xl data-[size=default]:h-11 sm:w-52"
            >
              <SelectValue placeholder="Filter by city" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cities</SelectItem>
              {KERALA_CITIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={category || 'all'}
            onValueChange={(v) => setCategory(v === 'all' ? '' : v)}
          >
            <SelectTrigger
              aria-label="Category"
              className="w-full rounded-xl data-[size=default]:h-11 sm:w-52"
            >
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {EVENT_CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <EventGridSkeleton />
        ) : visibleEvents.length === 0 ? (
          filtered && events.length > 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="No events match these filters"
              description="Try a different day or category."
              action={{ label: 'Show all events', onClick: resetFilters }}
            />
          ) : (
            <EmptyState
              icon={CalendarDays}
              title="No upcoming events"
              description="Check back soon."
              action={
                city
                  ? { label: 'Show all cities', onClick: () => handleCityChange('all') }
                  : undefined
              }
            />
          )
        ) : (
          <>
            <p className="mb-3 text-xs text-muted-foreground" aria-live="polite">
              {visibleEvents.length} {visibleEvents.length === 1 ? 'event' : 'events'}
            </p>
            <div className="ui-stagger grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visibleEvents.map((ev, i) => (
                <GridItem key={ev.id} intrinsicHeight={540}>
                  <EventCard
                    ev={ev}
                    now={now}
                    expanded={expanded.has(ev.id)}
                    onToggle={toggleExpanded}
                    onGo={go}
                    priority={i === 0}
                  />
                </GridItem>
              ))}
            </div>
          </>
        )}
      </div>
    </PublicLayout>
  );
}
