'use client';

import { useI18n } from '@/lib/i18n/provider';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Calendar, CalendarDays, ExternalLink, MapPin, Store, Ticket } from 'lucide-react';
import { PublicLayout } from '@/components/layouts/public-layout';
import { PageHeader } from '@/components/system/page-header';
import { SectionCard } from '@/components/system/section-card';
import { StatusPill } from '@/components/common/status-pill';
import { ResponsiveImage } from '@/components/common/responsive-image';
import { Button } from '@/components/ui/button';
import { AddToCalendarButton, ShareButton } from '@/components/public/media/event-actions';
import { isHappeningNow, type Ev } from '@/components/public/media/event-card';
import { fmtDateIST } from '@/components/public/media/format';
import { EVENT_CATEGORIES } from '@/lib/constants';
import { apiService } from '@/lib/services/api-service';
import { track } from '@/lib/analytics/track';

export function EventDetailClient({
  ev,
}: {
  ev: Ev & {
    businessId?: string | null;
    business?: { id?: string; name?: string; logo?: string | null } | null;
  };
}) {
  const { t } = useI18n();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => setNow(Date.now()), []);

  const live = isHappeningNow(ev, now);
  const ended = now != null && new Date(ev.endDate || ev.startDate).getTime() < now - 86400000;
  const where = [ev.venue, ev.city].filter(Boolean).join(', ');
  const tiers = Array.isArray(ev.ticketTiers) ? ev.ticketTiers : [];
  const category = ev.category
    ? (EVENT_CATEGORIES.find((c) => c.value === ev.category)?.label ?? ev.category)
    : null;
  const host = ev.business?.name || ev.hostLabel;
  const hostId = ev.business?.id || ev.businessId;

  const go = async (type: 'REGISTER' | 'TICKET') => {
    const res = await apiService.post<any>(`/v1/events/${ev.id}/click`, { type });
    const url = res.data?.url;
    if (url)
      window.open(url.startsWith('http') ? url : `https://${url}`, '_blank', 'noopener,noreferrer');
  };

  useEffect(() => {
    track('EVENT_VIEW', { metadata: { eventId: ev.id } });
  }, [ev.id]);

  return (
    <PublicLayout>
      <PageHeader
        back={{ href: '/events', label: t('events.when.all') }}
        eyebrow={category ?? t('events.event')}
        title={ev.title}
        meta={
          live ? (
            <StatusPill tone="success" live label={t('events.happeningNow')} />
          ) : ended ? (
            <StatusPill tone="neutral" label={t('events.ended')} />
          ) : null
        }
        description={host ? t('events.hostedBy', { host }) : undefined}
      />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <div className="overflow-hidden rounded-card border border-border/70 bg-card shadow-e1">
            <ResponsiveImage
              src={ev.posterImage ?? undefined}
              alt={ev.title}
              ratio="16 / 9"
              priority
              sizes="(max-width: 1024px) 100vw, 60vw"
              fallback={<CalendarDays className="size-12 opacity-40" />}
            />
          </div>
          {ev.description && (
            <SectionCard title={t('events.about')}>
              <p className="whitespace-pre-line break-words text-body text-foreground">
                {ev.description}
              </p>
            </SectionCard>
          )}
        </div>

        <div className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          <SectionCard>
            <dl className="space-y-4 text-sm">
              <div className="flex gap-3">
                <Calendar className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                <div>
                  <dt className="sr-only">When</dt>
                  <dd className="font-medium">
                    {fmtDateIST(ev.startDate)}
                    {ev.endDate && ev.endDate !== ev.startDate
                      ? ` – ${fmtDateIST(ev.endDate)}`
                      : ''}
                  </dd>
                </div>
              </div>
              {where && (
                <div className="flex gap-3">
                  <MapPin className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                  <div>
                    <dt className="sr-only">Where</dt>
                    <dd className="font-medium">{where}</dd>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(where)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-caption text-primary hover:underline"
                    >
                      {t('events.openInMaps')}
                    </a>
                  </div>
                </div>
              )}
              <div className="flex gap-3">
                <Ticket className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                <div>
                  <dt className="sr-only">{t('events.price')}</dt>
                  <dd className="font-medium">
                    {ev.ticketType !== 'PAID'
                      ? t('events.freeEntry')
                      : tiers.length
                        ? t('events.tickets')
                        : `₹${Number(ev.ticketPrice || 0).toLocaleString('en-IN')}`}
                  </dd>
                  {tiers.length > 0 && (
                    <ul className="mt-1 space-y-0.5 text-caption text-muted-foreground">
                      {tiers.map((t, i) => (
                        <li key={i}>
                          {t.name}: ₹{Number(t.price).toLocaleString('en-IN')}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              {host && (
                <div className="flex gap-3">
                  <Store className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                  <div>
                    <dt className="sr-only">Host</dt>
                    <dd className="font-medium">
                      {hostId ? (
                        <Link href={`/business/${hostId}`} className="hover:underline">
                          {host}
                        </Link>
                      ) : (
                        host
                      )}
                    </dd>
                  </div>
                </div>
              )}
            </dl>

            {!ended && (ev.registrationUrl || ev.ticketUrl) && (
              <div className="mt-5 grid gap-2">
                {ev.registrationUrl && (
                  <Button size="lg" onClick={() => go('REGISTER')}>
                    <ExternalLink /> Register
                  </Button>
                )}
                {ev.ticketUrl && (
                  <Button size="lg" variant="outline" onClick={() => go('TICKET')}>
                    <Ticket /> Get tickets
                  </Button>
                )}
              </div>
            )}
            <div className="mt-3 flex gap-2">
              <AddToCalendarButton event={ev} />
              <ShareButton
                title={ev.title}
                text={`${ev.title}${where ? ` — ${where}` : ''} on Whtzup.city`}
              />
            </div>
          </SectionCard>
        </div>
      </div>
    </PublicLayout>
  );
}
