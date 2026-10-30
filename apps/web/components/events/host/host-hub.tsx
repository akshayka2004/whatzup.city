'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CalendarDays, Loader2, MapPin } from 'lucide-react';
import { apiService } from '@/lib/services/api-service';
import { fmtWhen } from '@/lib/event-booking';
import type { HostSummary } from '@/lib/event-host';
import { cn } from '@/lib/utils';
import { AttendeesTab } from './attendees-tab';
import { CrewTab } from './crew-tab';
import { OverviewTab } from './overview-tab';
import { PaymentsTab } from './payments-tab';
import { SettingsTab } from './settings-tab';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'settings', label: 'Settings' },
  { key: 'attendees', label: 'Attendees' },
  { key: 'payments', label: 'Payments' },
  { key: 'crew', label: 'Crew and gate' },
] as const;
type TabKey = (typeof TABS)[number]['key'];

/**
 * Everything a host does for one event's tickets: settings, who is coming, crew passes, and the
 * live numbers. Used by business owners and by platform staff for events the platform hosts.
 */
export function EventHostHub({ eventId, backHref }: { eventId: string; backHref: string }) {
  const [summary, setSummary] = useState<HostSummary | null>(null);
  const [error, setError] = useState('');
  // A notification can link straight to a tab (?tab=payments).
  const [wanted] = useState(() =>
    typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('tab'),
  );
  const [tab, setTab] = useState<TabKey>(
    TABS.some((t) => t.key === wanted) ? (wanted as TabKey) : 'overview',
  );

  const load = useCallback(async () => {
    const res = await apiService.get<HostSummary>(`/v1/events/${eventId}/host`, { fresh: true });
    if (res.error) setError(res.error);
    else {
      setError('');
      setSummary(res.data);
    }
  }, [eventId]);

  useEffect(() => {
    load();
  }, [load]);

  // Open on Settings the first time, when RSVP has not been turned on yet.
  useEffect(() => {
    if (summary && summary.bookingMode !== 'RSVP' && !wanted) setTab('settings');
  }, [summary?.bookingMode]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {
    return (
      <div className="space-y-3">
        <Link
          href={backHref}
          className="inline-flex min-h-10 items-center gap-1.5 text-sm text-primary hover:underline"
        >
          <ArrowLeft className="size-4" aria-hidden /> Back to events
        </Link>
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      </div>
    );
  }
  if (!summary)
    return (
      <Loader2
        className="mx-auto my-20 size-6 animate-spin text-muted-foreground"
        aria-label="Loading"
      />
    );

  const rsvp = summary.bookingMode === 'RSVP';
  // Payments only matter on events that charge, or that already took payments.
  const showPayments = summary.isPaidEvent || summary.payEnabled;
  const tabs = TABS.filter((t) => t.key !== 'payments' || showPayments);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <Link
          href={backHref}
          className="mb-1 inline-flex min-h-10 items-center gap-1.5 text-sm text-primary hover:underline"
        >
          <ArrowLeft className="size-4" aria-hidden /> Back to events
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-foreground">{summary.title}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="size-4" aria-hidden /> {fmtWhen(summary.startDate)}
              </span>
              {summary.venue && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="size-4" aria-hidden /> {summary.venue}
                </span>
              )}
            </p>
          </div>
          <div className="text-right text-sm">
            <p
              className={cn(
                'font-semibold',
                rsvp && summary.state === 'OPEN'
                  ? 'text-success-soft-foreground'
                  : 'text-foreground',
              )}
            >
              {rsvp ? summary.stateLabel : 'RSVP is off'}
            </p>
            {rsvp && (
              <p className="text-muted-foreground">
                {summary.seatsTaken}
                {summary.capacity != null ? ` of ${summary.capacity}` : ''} seats taken
              </p>
            )}
          </div>
        </div>
      </div>

      <div
        role="tablist"
        aria-label="Event sections"
        className="flex gap-1 overflow-x-auto rounded-control bg-surface-sunken p-1"
      >
        {tabs.map((t) => (
          <button
            key={t.key}
            role="tab"
            type="button"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'min-h-10 shrink-0 cursor-pointer rounded-[10px] px-4 text-sm font-medium transition-colors',
              tab === t.key
                ? 'bg-card text-foreground shadow-e1'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t.label}
            {t.key === 'payments' && summary.paymentsToVerify > 0 && (
              <span
                className="ml-2 rounded-full bg-primary px-1.5 py-0.5 text-xs font-semibold tabular-nums text-primary-foreground"
                aria-label={`${summary.paymentsToVerify} to verify`}
              >
                {summary.paymentsToVerify}
              </span>
            )}
          </button>
        ))}
      </div>

      <div role="tabpanel">
        {tab === 'overview' && <OverviewTab eventId={eventId} summary={summary} />}
        {tab === 'settings' && (
          <SettingsTab eventId={eventId} summary={summary} onSaved={setSummary} />
        )}
        {tab === 'attendees' &&
          (rsvp ? <AttendeesTab eventId={eventId} /> : <TurnOn onGo={() => setTab('settings')} />)}
        {tab === 'payments' &&
          (rsvp ? (
            <PaymentsTab eventId={eventId} summary={summary} onChanged={load} />
          ) : (
            <TurnOn onGo={() => setTab('settings')} />
          ))}
        {tab === 'crew' &&
          (rsvp ? <CrewTab eventId={eventId} /> : <TurnOn onGo={() => setTab('settings')} />)}
      </div>
    </div>
  );
}

function TurnOn({ onGo }: { onGo: () => void }) {
  return (
    <div className="rounded-card border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
      Turn on RSVP first.{' '}
      <button
        type="button"
        onClick={onGo}
        className="cursor-pointer font-medium text-primary hover:underline"
      >
        Go to Settings
      </button>
    </div>
  );
}
