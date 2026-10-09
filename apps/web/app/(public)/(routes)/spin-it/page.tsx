'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { PublicLayout } from '@/components/layouts/public-layout';
import { DiscountTicket } from '@/components/business/discount-ticket';
import { apiService } from '@/lib/services/api-service';
import { Sparkles, MapPin, Disc3, Ticket, ArrowRight } from 'lucide-react';
import { EmptyState } from '@/components/common/empty-state';
import { ProgressRing } from '@/components/common/progress-ring';
import { ResponsiveImage } from '@/components/common/responsive-image';
import { StaggerGrid } from '@/components/public/offers/stagger-grid';
import { TicketGridSkeleton, WheelGridSkeleton } from '@/components/public/offers/skeletons';
import { cn } from '@/lib/utils';

interface ActiveWheel {
  id: string;
  businessId: string;
  businessName: string;
  businessCity?: string | null;
  businessLogo?: string | null;
  categoryName?: string | null;
  itemName: string;
  description?: string | null;
  maxDiscountPercent: number;
  wheelPercentages: number[];
}

interface MyTicket {
  id: string;
  discountPercent: number;
  code: string;
  status: string;
  itemName: string;
  expiresAt?: string | null;
  business?: { id: string; name: string; logo?: string | null } | null;
}

function WheelCard({ wheel }: { wheel: ActiveWheel }) {
  return (
    // The wrapper is what the stagger animates and what skips off-screen work;
    // the card inside keeps its own hover/press feedback.
    <div className="ui-cv-auto">
      <Link
        href={`/business/${wheel.businessId}`}
        className="ui-press group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm transition-colors duration-200 ease-out hover:border-primary/30"
      >
        <div className="flex items-center gap-3 mb-3">
          <ResponsiveImage
            src={wheel.businessLogo}
            alt={wheel.businessName}
            ratio="1"
            sizes="44px"
            className="h-11 w-11 shrink-0 rounded-xl border border-border"
            fallback={
              <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/15 to-primary/5 text-lg font-black text-primary">
                {wheel.businessName.charAt(0).toUpperCase()}
              </span>
            }
          />
          <div className="min-w-0">
            <p className="font-semibold text-foreground truncate">{wheel.businessName}</p>
            {wheel.businessCity && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                <MapPin className="h-3 w-3 shrink-0" /> {wheel.businessCity}
              </p>
            )}
          </div>
        </div>

        <p className="text-sm text-foreground break-words">
          Win up to <span className="font-bold text-primary">{wheel.maxDiscountPercent}%</span> off{' '}
          <span className="font-semibold">{wheel.itemName}</span>
        </p>
        {wheel.description && (
          <p className="mt-1 text-xs text-muted-foreground line-clamp-2 break-words">{wheel.description}</p>
        )}

        <div className="mt-3 flex flex-wrap gap-1">
          {wheel.wheelPercentages.slice(0, 7).map((p, i) => (
            <span key={i} className="px-1.5 py-0.5 rounded-md bg-secondary text-xs font-bold text-muted-foreground">
              {p}%
            </span>
          ))}
        </div>

        <div className="mt-auto flex min-h-11 items-end gap-1.5 pt-4 text-sm font-semibold text-primary">
          <Sparkles className="h-4 w-4 transition-transform group-hover:rotate-12" />
          Spin now
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </div>
      </Link>
    </div>
  );
}

export default function SpinItPage() {
  const [wheels, setWheels] = useState<ActiveWheel[]>([]);
  const [tickets, setTickets] = useState<MyTicket[]>([]);
  const [tab, setTab] = useState<'wheels' | 'mine'>('wheels');
  const [loadingWheels, setLoadingWheels] = useState(true);
  const [loadingTickets, setLoadingTickets] = useState(true);

  useEffect(() => {
    apiService.get<ActiveWheel[]>('/v1/discounts/active/all').then((res) => {
      if (!res.error && res.data) setWheels(res.data);
      setLoadingWheels(false);
    });
    apiService.get<MyTicket[]>('/v1/discounts/my').then((res) => {
      if (!res.error && res.data) setTickets(res.data);
      setLoadingTickets(false);
    });
  }, []);

  // Tickets only exist client-side (fetched after mount), so reading the clock here is hydration-safe.
  const summary = useMemo(() => {
    const now = Date.now();
    let redeemed = 0;
    let expired = 0;
    let ready = 0;
    for (const t of tickets) {
      if (t.status === 'REDEEMED') redeemed++;
      else if (t.expiresAt && Date.parse(t.expiresAt) < now) expired++;
      else ready++;
    }
    return { total: tickets.length, redeemed, expired, ready };
  }, [tickets]);

  const redeemedPct = summary.total > 0 ? (summary.redeemed / summary.total) * 100 : 0;

  const tabClass = (active: boolean) =>
    cn(
      'ui-press flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-xl px-4 text-sm font-semibold transition-colors',
      active ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground',
    );

  return (
    <PublicLayout>
      <div>
        <section className="relative isolate mb-5 overflow-hidden rounded-3xl border border-border bg-card p-5 sm:p-7">
          {/* Decorative drifting blobs — transform-only CSS animation, ignored by assistive tech */}
          <span aria-hidden className="ui-drift pointer-events-none absolute -right-10 -top-12 -z-10 h-44 w-44 rounded-full bg-primary/15 blur-3xl" />
          <span aria-hidden className="ui-drift-slow pointer-events-none absolute -bottom-14 -left-10 -z-10 h-40 w-40 rounded-full bg-accent/20 blur-3xl" />

          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="disc-glow relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand-soft-foreground">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Spin it</h1>
                <p className="text-muted-foreground text-sm">
                  Businesses running a lucky wheel right now, and every discount voucher you've won.
                </p>
              </div>
            </div>

            {/* Tickets summary */}
            <div className="flex items-center gap-4 rounded-2xl border border-border bg-background/70 p-3 sm:min-w-[17rem]">
              <ProgressRing
                value={loadingTickets ? 0 : redeemedPct}
                size={64}
                stroke={6}
                label={loadingTickets ? '–' : summary.total}
              />
              <div className="min-w-0 text-sm">
                <p className="font-semibold text-foreground">
                  {loadingTickets ? 'Checking your vouchers…' : summary.total === 1 ? '1 voucher won' : `${summary.total} vouchers won`}
                </p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {loadingTickets
                    ? 'Just a moment'
                    : summary.total === 0
                      ? 'Spin a wheel to win your first one'
                      : `${summary.ready} ready to use · ${summary.redeemed} redeemed`}
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="mb-5 grid grid-cols-2 gap-2 sm:flex">
          <button
            type="button"
            aria-pressed={tab === 'wheels'}
            onClick={() => setTab('wheels')}
            className={tabClass(tab === 'wheels')}
          >
            <Disc3 className="h-4 w-4" /> Active wheels
            {wheels.length > 0 && <span className="ml-0.5 opacity-80">({wheels.length})</span>}
          </button>
          <button
            type="button"
            aria-pressed={tab === 'mine'}
            onClick={() => setTab('mine')}
            className={tabClass(tab === 'mine')}
          >
            <Ticket className="h-4 w-4" /> My vouchers
            {tickets.length > 0 && <span className="ml-0.5 opacity-80">({tickets.length})</span>}
          </button>
        </div>

        {tab === 'wheels' ? (
          loadingWheels ? (
            <WheelGridSkeleton />
          ) : wheels.length === 0 ? (
            <EmptyState
              icon={Disc3}
              title="No wheels spinning right now"
              description="Check back soon — businesses add new discount wheels often."
              action={{ label: 'Browse businesses', href: '/search' }}
            />
          ) : (
            <StaggerGrid className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" gap={5}>
              {wheels.map((w) => <WheelCard key={w.id} wheel={w} />)}
            </StaggerGrid>
          )
        ) : loadingTickets ? (
          <TicketGridSkeleton />
        ) : tickets.length === 0 ? (
          <EmptyState
            icon={Ticket}
            title="No vouchers yet"
            description="Spin a wheel on a business profile to win one."
            action={{ label: 'See active wheels', onClick: () => setTab('wheels') }}
          />
        ) : (
          <StaggerGrid className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" gap={6}>
            {tickets.map((t) => (
              <div key={t.id} className="ui-cv-auto">
                <DiscountTicket
                  businessName={t.business?.name || ''}
                  itemName={t.itemName}
                  discountPercent={t.discountPercent}
                  code={t.code}
                  status={t.status}
                  expiresAt={t.expiresAt}
                />
              </div>
            ))}
          </StaggerGrid>
        )}
      </div>
    </PublicLayout>
  );
}
