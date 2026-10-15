'use client';

import {
  Calendar,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  MapPin,
  Ticket,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ResponsiveImage } from '@/components/common/responsive-image';
import { StatusPill } from '@/components/common/status-pill';
import { EVENT_CATEGORIES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { DateBadge } from './date-badge';
import { AddToCalendarButton, ShareButton, eventWindow } from './event-actions';
import { fmtDateIST } from './format';

export interface Ev {
  id: string;
  title: string;
  description: string;
  posterImage?: string | null;
  venue?: string | null;
  city?: string | null;
  category?: string | null;
  ticketType?: string;
  ticketPrice?: number | string | null;
  ticketTiers?: { name: string; price: number }[] | null;
  hostLabel?: string | null;
  startDate: string;
  endDate: string;
  registrationUrl?: string | null;
  ticketUrl?: string | null;
  business?: { name?: string; logo?: string | null } | null;
}

/** True while `now` falls inside the event's window. `now` is null until the page has mounted. */
export function isHappeningNow(ev: Ev, now: number | null): boolean {
  if (now == null) return false;
  const w = eventWindow(ev);
  return !!w && now >= w.start && now < w.end;
}

function priceLabel(ev: Ev): string {
  if (ev.ticketType !== 'PAID') return 'Free';
  return Array.isArray(ev.ticketTiers) && ev.ticketTiers.length
    ? `From ₹${Math.min(...ev.ticketTiers.map((t) => Number(t.price) || 0)).toLocaleString('en-IN')}`
    : `₹${Number(ev.ticketPrice || 0).toLocaleString('en-IN')}`;
}

export function EventCard({
  ev,
  now,
  expanded,
  onToggle,
  onGo,
  priority,
}: {
  ev: Ev;
  now: number | null;
  expanded: boolean;
  onToggle: (id: string) => void;
  onGo: (ev: Ev, type: 'REGISTER' | 'TICKET') => void;
  priority?: boolean;
}) {
  const live = isHappeningNow(ev, now);
  // A run of several days (exhibitions, show seasons) reads as "On till 6 Dec",
  // not a "Happening now" pulse that stays on for weeks.
  const win = eventWindow(ev);
  const longRun = !!win && win.end - win.start > 3 * 86_400_000;
  const liveLabel =
    longRun && win
      ? `On till ${new Date(win.end - 1).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' })}`
      : 'Happening now';
  const tiers = Array.isArray(ev.ticketTiers) ? ev.ticketTiers : [];
  const sameDay = !ev.endDate || ev.endDate === ev.startDate;
  const where = [ev.venue, ev.city].filter(Boolean).join(', ');

  return (
    <article className="ui-lift group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="relative">
        <ResponsiveImage
          src={ev.posterImage}
          alt={ev.title}
          ratio="4 / 3"
          fit="contain"
          quality={70}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          priority={priority}
          fallback={<CalendarDays className="h-10 w-10 opacity-40" />}
          imgClassName="transition-transform duration-500 ease-out group-hover:scale-105 motion-reduce:group-hover:scale-100"
        />
        <DateBadge date={ev.startDate} className="absolute left-3 top-3" />
        {live && (
          <StatusPill
            tone="success"
            live={!longRun}
            label={liveLabel}
            className="absolute right-3 top-3 bg-card/95 shadow-sm backdrop-blur-sm"
          />
        )}
      </div>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-1.5">
          {ev.category && (
            <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {EVENT_CATEGORIES.find((c) => c.value === ev.category)?.label || ev.category}
            </span>
          )}
          <span
            className={cn(
              'rounded-md px-2 py-0.5 text-xs font-semibold',
              ev.ticketType === 'PAID'
                ? 'bg-brand-soft text-brand-soft-foreground'
                : 'bg-success-soft text-success-soft-foreground',
            )}
          >
            {priceLabel(ev)}
          </span>
        </div>

        <h3 className="mt-2 break-words text-lg font-semibold leading-tight text-foreground">
          <Link href={`/events/${ev.id}`} className="hover:underline">
            {ev.title}
          </Link>
        </h3>
        {(ev.business?.name || ev.hostLabel) && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            by {ev.business?.name || ev.hostLabel}
          </p>
        )}

        {tiers.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {tiers.map((t, i) => (
              <span
                key={i}
                className="break-words rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-foreground"
              >
                {t.name}: ₹{Number(t.price).toLocaleString('en-IN')}
              </span>
            ))}
          </div>
        )}

        <div className="mt-2 flex-1">
          <p
            className={cn('break-words text-sm text-muted-foreground', !expanded && 'line-clamp-2')}
          >
            {ev.description}
          </p>
          {ev.description && ev.description.length > 90 && (
            <button
              type="button"
              onClick={() => onToggle(ev.id)}
              aria-expanded={expanded}
              className="mt-1 inline-flex min-h-11 cursor-pointer items-center gap-0.5 text-xs font-medium text-primary hover:underline sm:min-h-8"
            >
              {expanded ? (
                <>
                  View less <ChevronUp className="h-3 w-3" />
                </>
              ) : (
                <>
                  View more <ChevronDown className="h-3 w-3" />
                </>
              )}
            </button>
          )}
        </div>

        <div className="mt-2 flex flex-col gap-1.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            {fmtDateIST(ev.startDate)}
            {!sameDay ? ` – ${fmtDateIST(ev.endDate)}` : ''}
          </span>
          {where && (
            <span className="flex items-start gap-1.5">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span className="min-w-0 break-words">{where}</span>
            </span>
          )}
        </div>

        {(ev.registrationUrl || ev.ticketUrl) && (
          <div className="mt-4 flex gap-2">
            {ev.registrationUrl && (
              <Button
                onClick={() => onGo(ev, 'REGISTER')}
                size="sm"
                className="ui-press h-11 flex-1 cursor-pointer gap-1.5 rounded-xl bg-primary font-semibold text-primary-foreground"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Register
              </Button>
            )}
            {ev.ticketUrl && (
              <Button
                onClick={() => onGo(ev, 'TICKET')}
                size="sm"
                variant="outline"
                className="ui-press h-11 flex-1 cursor-pointer gap-1.5 rounded-xl border-primary/30 text-primary hover:bg-primary/10"
              >
                <Ticket className="h-3.5 w-3.5" /> Tickets
              </Button>
            )}
          </div>
        )}

        <div className="mt-2 flex gap-2">
          <AddToCalendarButton event={ev} />
          <ShareButton
            title={ev.title}
            text={`${ev.title}${where ? ` — ${where}` : ''} on Whtzup.city`}
          />
        </div>
      </div>
    </article>
  );
}
