'use client';

import { useEffect, useRef, useState } from 'react';
import { CalendarPlus, Check, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DAY_MS, istDayStart, parseDate } from './format';

const BTN =
  'ui-press inline-flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-3 text-xs font-medium text-foreground transition-colors hover:bg-secondary sm:min-h-9';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string | null;
  venue?: string | null;
  city?: string | null;
  startDate: string;
  endDate?: string | null;
}

const MIDNIGHT_UTC = (t: number) => t % DAY_MS === 0;
const MIDNIGHT_IST = (t: number) => istDayStart(t) === t;

/**
 * The start/end of an event as epoch ms. Events saved as bare dates (both ends
 * at midnight) are treated as all-day, so they stay "live" for the whole day.
 */
export function eventWindow(ev: Pick<CalendarEvent, 'startDate' | 'endDate'>) {
  const s = parseDate(ev.startDate)?.getTime();
  if (s == null) return null;
  const e = parseDate(ev.endDate)?.getTime();
  const allDay = (MIDNIGHT_UTC(s) || MIDNIGHT_IST(s)) && (e == null || MIDNIGHT_UTC(e) || MIDNIGHT_IST(e));
  if (allDay) {
    const lastDay = istDayStart(Math.max(e ?? s, s));
    return { start: istDayStart(s), end: lastDay + DAY_MS, allDay: true };
  }
  const end = e != null && e > s ? e : s + 2 * 60 * 60 * 1000;
  return { start: s, end, allDay: false };
}

const icsUtc = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const icsDate = (ms: number) => icsUtc(ms + 5.5 * 60 * 60 * 1000).slice(0, 8); // calendar date as seen in IST
const icsEscape = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/** RFC 5545 asks for lines <= 75 octets; fold generously at 70 characters. */
function fold(line: string) {
  const out: string[] = [];
  for (let i = 0; i < line.length; i += 70) out.push((i ? ' ' : '') + line.slice(i, i + 70));
  return out.join('\r\n');
}

/** A minimal single-event .ics document, or null when the event has no usable start date. */
export function buildIcs(ev: CalendarEvent): string | null {
  const w = eventWindow(ev);
  if (!w) return null;
  const where = [ev.venue, ev.city].filter(Boolean).join(', ');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Whtzup.city//Events//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${ev.id}@whtzup.city`,
    `DTSTAMP:${icsUtc(Date.now())}`,
    w.allDay ? `DTSTART;VALUE=DATE:${icsDate(w.start)}` : `DTSTART:${icsUtc(w.start)}`,
    w.allDay ? `DTEND;VALUE=DATE:${icsDate(w.end)}` : `DTEND:${icsUtc(w.end)}`,
    `SUMMARY:${icsEscape(ev.title)}`,
    ...(ev.description ? [`DESCRIPTION:${icsEscape(ev.description.slice(0, 800))}`] : []),
    ...(where ? [`LOCATION:${icsEscape(where)}`] : []),
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.map(fold).join('\r\n') + '\r\n';
}

function useFlash() {
  const [on, setOn] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const flash = () => {
    setOn(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setOn(false), 2000);
  };
  return [on, flash] as const;
}

/** Builds a tiny .ics Blob in the browser and downloads it. Renders nothing without a start date. */
export function AddToCalendarButton({ event, className }: { event: CalendarEvent; className?: string }) {
  const [done, flash] = useFlash();
  if (!parseDate(event.startDate)) return null;

  const add = () => {
    try {
      const ics = buildIcs(event);
      if (!ics) return;
      const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(event.title || 'event').replace(/[^\w-]+/g, '-').slice(0, 40) || 'event'}.ics`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      flash();
    } catch {
      /* downloads blocked — nothing useful to do */
    }
  };

  return (
    <button type="button" onClick={add} className={cn(BTN, className)} aria-label={`Add ${event.title} to calendar`}>
      {done ? <Check className="h-3.5 w-3.5 text-success" /> : <CalendarPlus className="h-3.5 w-3.5" />}
      <span aria-live="polite">{done ? 'Saved' : 'Add to calendar'}</span>
    </button>
  );
}

/** Native share sheet where available, otherwise copies the link. Never throws. */
export function ShareButton({
  title,
  text,
  url,
  label = 'Share',
  className,
}: {
  title: string;
  text?: string;
  /** Defaults to the current page URL. */
  url?: string;
  label?: string;
  className?: string;
}) {
  const [copied, flash] = useFlash();

  const share = async () => {
    const href = url || (typeof window !== 'undefined' ? window.location.href : '');
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        await navigator.share({ title, text, url: href });
        return;
      }
    } catch (err) {
      if ((err as { name?: string })?.name === 'AbortError') return; // user closed the sheet
    }
    try {
      await navigator.clipboard.writeText(href);
      flash();
    } catch {
      /* clipboard unavailable (insecure context / permissions) */
    }
  };

  return (
    <button type="button" onClick={share} className={cn(BTN, className)} aria-label={`Share ${title}`}>
      {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Share2 className="h-3.5 w-3.5" />}
      <span aria-live="polite">{copied ? 'Link copied' : label}</span>
    </button>
  );
}
