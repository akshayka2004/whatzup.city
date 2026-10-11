'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BadgeIndianRupee,
  BarChart3,
  CheckCircle2,
  Circle,
  Clock,
  ExternalLink,
  MousePointerClick,
  Plus,
  QrCode,
  ReceiptText,
  Sparkles,
  Star,
  TicketPercent,
  Users,
  Utensils,
} from 'lucide-react';
import { BusinessLayout } from '@/components/layouts/business-layout';
import { PageHeader } from '@/components/system/page-header';
import { SectionCard } from '@/components/system/section-card';
import { StatusPill } from '@/components/common/status-pill';
import { ProgressRing } from '@/components/common/progress-ring';
import { Button } from '@/components/ui/button';
import { KpiCard } from '@/components/analytics/kpi-card';
import { useAuth } from '@/hooks/use-auth';
import { useActiveBusiness } from '@/hooks/use-active-business';
import { useOwnerBusiness } from '@/hooks/use-owner-business';
import { apiService } from '@/lib/services/api-service';
import { analyticsV2, type BusinessReport } from '@/lib/services/analytics-v2';
import { cn } from '@/lib/utils';

const list = (d: any): any[] =>
  Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : Array.isArray(d?.items) ? d.items : [];

const MISSING_LABEL: Record<string, { label: string; href: string }> = {
  name: { label: 'Add your business name', href: '/dashboard/settings#profile' },
  description: { label: 'Write a short description', href: '/dashboard/settings#profile' },
  logo: { label: 'Upload your logo', href: '/dashboard/settings#profile' },
  address: { label: 'Add your address', href: '/dashboard/settings#details' },
  contact_info: { label: 'Add a phone number or email', href: '/dashboard/settings#details' },
  operating_hours: { label: 'Set your opening hours', href: '/dashboard/settings#details' },
  media: { label: 'Add photos of your place', href: '/dashboard/menu' },
  first_offer: { label: 'Publish your first offer', href: '/dashboard/offers' },
};

function greeting() {
  const h = Number(
    new Date().toLocaleString('en-IN', {
      hour: 'numeric',
      hour12: false,
      timeZone: 'Asia/Kolkata',
    }),
  );
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

type Task = {
  key: string;
  icon: typeof Clock;
  title: string;
  detail: string;
  href: string;
  tone: 'warning' | 'info' | 'neutral';
};

export default function BusinessOverviewPage() {
  const { user } = useAuth();
  const role =
    user?.rbacRole ||
    (user?.role === 'business' ? 'BUSINESS_OWNER' : user?.role) ||
    'BUSINESS_OWNER';
  const isModerator = role === 'BUSINESS_MODERATOR';
  const isStaff = role === 'BUSINESS_STAFF';
  const canSeeNumbers = !isModerator && !isStaff;

  const { activeBusinessId, activeBusiness } = useActiveBusiness();
  const { isFood } = useOwnerBusiness(!isModerator);
  const [report, setReport] = useState<BusinessReport | null>(null);
  const [offers, setOffers] = useState<any[] | null>(null);
  const [pendingBills, setPendingBills] = useState<number | null>(null);
  const [completeness, setCompleteness] = useState<{ score: number; missing: string[] } | null>(
    null,
  );

  useEffect(() => {
    if (!activeBusinessId) return;
    let alive = true;
    Promise.all([
      canSeeNumbers ? analyticsV2.business(activeBusinessId, { days: 7 }) : Promise.resolve(null),
      apiService.get<any>(`/v1/offers/my/${activeBusinessId}`),
      apiService.get<any>(`/v1/businesses/${activeBusinessId}/bill-verifications?status=PENDING`),
      canSeeNumbers
        ? apiService.get<any>(`/v1/dashboard/${activeBusinessId}/completeness`)
        : Promise.resolve(null),
    ]).then(([rep, off, bills, comp]) => {
      if (!alive) return;
      if (rep && !rep.error && rep.data?.kpis && rep.data?.series) setReport(rep.data);
      setOffers(off.error ? [] : list(off.data));
      if (!bills.error) {
        const d = bills.data as any;
        setPendingBills(
          typeof d?.total === 'number'
            ? d.total
            : list(d).filter((b) => b.status === 'PENDING').length,
        );
      } else setPendingBills(0);
      if (comp && !comp.error && Array.isArray((comp.data as any)?.missing))
        setCompleteness(comp.data as any);
    });
    return () => {
      alive = false;
    };
  }, [activeBusinessId, canSeeNumbers]);

  const now = Date.now();
  const activeOffers = useMemo(
    () =>
      (offers ?? []).filter(
        (o) => o.status === 'ACTIVE' && (!o.endDate || new Date(o.endDate).getTime() > now),
      ),
    [offers, now],
  );
  const expiringSoon = activeOffers.filter(
    (o) => o.endDate && new Date(o.endDate).getTime() - now < 7 * 86400000,
  );

  const tasks: Task[] = [];
  if (pendingBills) {
    tasks.push({
      key: 'bills',
      icon: ReceiptText,
      title: `${pendingBills} bill${pendingBills === 1 ? '' : 's'} waiting for review`,
      detail: 'Customers are waiting to get points and post verified reviews.',
      href: '/dashboard/moderation',
      tone: 'warning',
    });
  }
  if (!isModerator && expiringSoon.length) {
    tasks.push({
      key: 'expiring',
      icon: Clock,
      title: `${expiringSoon.length} offer${expiringSoon.length === 1 ? '' : 's'} ending this week`,
      detail: expiringSoon
        .map((o) => o.title)
        .slice(0, 2)
        .join(', '),
      href: '/dashboard/offers',
      tone: 'info',
    });
  }
  if (!isModerator && offers && activeOffers.length === 0) {
    tasks.push({
      key: 'no-offers',
      icon: TicketPercent,
      title: 'No live offers',
      detail: 'Businesses with an active offer get more profile visits.',
      href: '/dashboard/offers',
      tone: 'neutral',
    });
  }

  const name = (user?.name || '').split(' ')[0];
  const bizName = activeBusiness?.name;
  const status = activeBusiness?.status;

  const quickActions = [
    { label: 'New offer', href: '/dashboard/offers', icon: Plus, show: !isStaff },
    { label: 'Review bills', href: '/dashboard/moderation', icon: ReceiptText, show: true },
    { label: 'Redeem a code', href: '/dashboard/vouchers', icon: Sparkles, show: !isModerator },
    {
      label: 'Menu photos',
      href: '/dashboard/menu',
      icon: Utensils,
      show: !!isFood && !isModerator,
    },
    { label: 'Storefront QR', href: '/dashboard/qr-code', icon: QrCode, show: !isModerator },
    { label: 'Reviews', href: '/dashboard/reviews', icon: Star, show: true },
  ].filter((a) => a.show);

  return (
    <BusinessLayout>
      <PageHeader
        eyebrow={bizName ?? (isModerator ? 'Moderation' : 'Business')}
        title={`${greeting()}${name ? `, ${name}` : ''}`}
        description={
          isModerator
            ? 'Here is what needs moderating today.'
            : 'Here is how your business is doing this week.'
        }
        meta={status && <StatusPill status={status} />}
        actions={
          activeBusinessId && (
            <>
              <Button asChild variant="outline">
                <Link href={`/business/${activeBusinessId}`} target="_blank">
                  <ExternalLink /> View public page
                </Link>
              </Button>
              {!isStaff && (
                <Button asChild>
                  <Link href="/dashboard/offers">
                    <Plus /> New offer
                  </Link>
                </Button>
              )}
            </>
          )
        }
      />

      <div className="space-y-6">
        {canSeeNumbers && (
          <section aria-labelledby="week-heading">
            <div className="mb-3 flex items-end justify-between">
              <h2 id="week-heading" className="text-heading">
                Last 7 days
              </h2>
              <Link
                href="/dashboard/analytics"
                className="inline-flex items-center gap-1 text-label text-primary hover:underline"
              >
                Full analytics <ArrowRight className="size-4" />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <KpiCard
                label="Visitors"
                icon={Users}
                metric={report?.kpis.visitors}
                loading={!report}
                spark={report?.series.points.map((p) => p.visitors)}
              />
              <KpiCard
                label="Customer actions"
                icon={MousePointerClick}
                metric={report?.kpis.actions}
                loading={!report}
                spark={report?.series.points.map((p) => p.actions)}
              />
              <KpiCard
                label="Offer claims"
                icon={TicketPercent}
                metric={report?.kpis.offerClaims}
                loading={!report}
                spark={report?.series.points.map((p) => p.claims)}
              />
              <KpiCard
                label="Verified spend"
                icon={BadgeIndianRupee}
                format="inr"
                metric={report?.kpis.verifiedSpend}
                loading={!report}
                spark={report?.series.points.map((p) => p.spend)}
              />
            </div>
          </section>
        )}

        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <SectionCard
            title="Needs your attention"
            description={tasks.length ? undefined : 'You are all caught up.'}
            padded={false}
          >
            {pendingBills == null ? (
              <div className="space-y-3 px-6 pb-6">
                <div className="ui-skeleton h-14" />
                <div className="ui-skeleton h-14" />
              </div>
            ) : tasks.length === 0 ? (
              <div className="flex items-center gap-3 px-6 pb-6 text-sm text-muted-foreground">
                <CheckCircle2 className="size-5 text-success-soft-foreground" aria-hidden /> Nothing
                pending. Nice work.
              </div>
            ) : (
              <ul className="divide-y divide-border/60">
                {tasks.map((t) => (
                  <li key={t.key}>
                    <Link
                      href={t.href}
                      className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-secondary/50 sm:px-6"
                    >
                      <span
                        className={cn(
                          'flex size-10 shrink-0 items-center justify-center rounded-xl',
                          t.tone === 'warning'
                            ? 'bg-warning-soft text-warning-soft-foreground'
                            : t.tone === 'info'
                              ? 'bg-info-soft text-info-soft-foreground'
                              : 'bg-surface-sunken text-muted-foreground',
                        )}
                      >
                        <t.icon className="size-5" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">{t.title}</span>
                        <span className="block truncate text-caption text-muted-foreground">
                          {t.detail}
                        </span>
                      </span>
                      <ArrowRight
                        className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                        aria-hidden
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard title="Quick actions">
            <div className="grid grid-cols-2 gap-2.5">
              {quickActions.map((a) => (
                <Link
                  key={a.label}
                  href={a.href}
                  className="flex h-14 items-center gap-2.5 rounded-xl border border-border/70 bg-card px-3 text-sm font-medium transition-colors hover:border-border-strong hover:bg-secondary active:scale-[0.98]"
                >
                  <span className="flex size-8 items-center justify-center rounded-lg bg-brand-soft text-brand-soft-foreground">
                    <a.icon className="size-4" aria-hidden />
                  </span>
                  {a.label}
                </Link>
              ))}
            </div>
          </SectionCard>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          {!isModerator && (
            <SectionCard
              title="Live offers"
              description={offers ? `${activeOffers.length} running` : undefined}
              action={
                <Button asChild variant="ghost" size="sm">
                  <Link href="/dashboard/offers">
                    Manage <ArrowRight />
                  </Link>
                </Button>
              }
              padded={false}
            >
              {offers == null ? (
                <div className="space-y-3 px-6 pb-6">
                  <div className="ui-skeleton h-12" />
                  <div className="ui-skeleton h-12" />
                </div>
              ) : activeOffers.length === 0 ? (
                <p className="px-6 pb-6 text-sm text-muted-foreground">No live offers right now.</p>
              ) : (
                <ul className="divide-y divide-border/60">
                  {activeOffers.slice(0, 5).map((o) => {
                    const stat = report?.offers.find((x) => x.id === o.id);
                    return (
                      <li
                        key={o.id}
                        className="flex items-center justify-between gap-3 px-5 py-3.5 sm:px-6"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium">{o.title}</p>
                          <p className="text-caption text-muted-foreground">
                            {o.endDate
                              ? `Ends ${new Date(o.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
                              : 'No end date'}
                            {stat ? ` · ${stat.claims} claimed this week` : ''}
                          </p>
                        </div>
                        {o.discountPercent ? (
                          <span className="shrink-0 rounded-full bg-brand-soft px-2.5 py-0.5 text-caption font-semibold text-brand-soft-foreground">
                            {o.discountPercent}% off
                          </span>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </SectionCard>
          )}

          {canSeeNumbers && (
            <SectionCard
              title="Profile strength"
              description="Complete profiles get found more often."
            >
              {completeness == null ? (
                <div className="ui-skeleton h-32" />
              ) : (
                <div className="flex gap-5">
                  <ProgressRing value={completeness.score} size={84} />
                  <ul className="min-w-0 flex-1 space-y-1.5">
                    {completeness.missing.length === 0 ? (
                      <li className="flex items-center gap-2 text-sm text-success-soft-foreground">
                        <CheckCircle2 className="size-4" aria-hidden /> Your profile is complete
                      </li>
                    ) : (
                      completeness.missing.slice(0, 4).map((m) => {
                        const item = MISSING_LABEL[m];
                        if (!item) return null;
                        return (
                          <li key={m}>
                            <Link
                              href={item.href}
                              className="flex items-center gap-2 text-sm hover:text-primary"
                            >
                              <Circle
                                className="size-4 shrink-0 text-subtle-foreground"
                                aria-hidden
                              />
                              <span className="truncate">{item.label}</span>
                            </Link>
                          </li>
                        );
                      })
                    )}
                  </ul>
                </div>
              )}
            </SectionCard>
          )}

          {isModerator && (
            <SectionCard title="Your role" icon={BarChart3}>
              <p className="text-body text-muted-foreground">
                As a moderator you review bills, reviews and customer reports. Analytics and billing
                stay with the owner.
              </p>
            </SectionCard>
          )}
        </div>
      </div>
    </BusinessLayout>
  );
}
