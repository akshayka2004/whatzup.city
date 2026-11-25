'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Gift, Loader2, MapPin, Sparkles, Ticket } from 'lucide-react';
import { PublicLayout } from '@/components/layouts/public-layout';
import { PageHeader } from '@/components/system/page-header';
import { EmptyState } from '@/components/common/empty-state';
import { FilterChip, ChipRow } from '@/components/system/filter-chip';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { CodeQr } from '@/components/rewards/code-qr';
import { useAuth } from '@/hooks/use-auth';
import { apiService } from '@/lib/services/api-service';
import { getViewerCity } from '@/lib/constants';
import { cn } from '@/lib/utils';

type Biz = { id: string; name: string; city?: string | null; category?: string | null };
type Item = {
  voucherId: string;
  title: string;
  rewardType: string;
  rewardValue: number | null;
  rewardLabel: string | null;
  threshold: number;
  spendInWindow: number;
  progress: number;
  remaining: number;
  claimable: number;
  repeatable: boolean;
  endDate: string;
  picked?: boolean;
  business: Biz;
};
type Code = {
  id: string;
  code: string;
  status: 'UNLOCKED' | 'REDEEMED' | 'EXPIRED';
  title: string;
  rewardType: string;
  rewardValue: number | null;
  rewardLabel: string | null;
  terms: string | null;
  expiresAt: string;
  redeemedAt: string | null;
  business: Biz;
};
type Wallet = { ready: Item[]; near: Item[]; codes: Code[] };

const rewardText = (r: {
  rewardType: string;
  rewardValue: number | null;
  rewardLabel: string | null;
}) =>
  r.rewardType === 'PERCENT'
    ? `${r.rewardValue}% off`
    : r.rewardType === 'AMOUNT'
      ? `₹${Number(r.rewardValue || 0).toLocaleString('en-IN')} off`
      : r.rewardLabel || 'Gift';
const day = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    timeZone: 'Asia/Kolkata',
  });
const daysLeft = (iso: string) =>
  Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000));

function Bar({ value }: { value: number }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full bg-muted"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      aria-label="Progress to the reward"
    >
      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}

/** My rewards: what is ready to claim, what is close, my codes, and rewards near me. */
export default function RewardsPage() {
  const { user, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<'mine' | 'near'>('mine');
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [near, setNear] = useState<{ city: string | null; rewards: Item[] } | null>(null);
  const [error, setError] = useState('');
  const [claiming, setClaiming] = useState<string | null>(null);
  const [city, setCity] = useState('');

  useEffect(() => setCity(getViewerCity()), []);

  const load = useCallback(async () => {
    if (!user) return;
    const res = await apiService.get<Wallet>('/v1/vouchers/wallet', { fresh: true });
    if (res.error || !res.data) {
      setError(res.error || 'Could not load your rewards.');
      return;
    }
    setError('');
    setWallet(res.data);
  }, [user]);
  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!user || tab !== 'near') return;
    apiService
      .get<any>(`/v1/vouchers/near-me${city ? `?city=${encodeURIComponent(city)}` : ''}`, {
        fresh: true,
      })
      .then((res) => {
        if (!res.error && res.data) setNear(res.data);
      });
  }, [user, tab, city]);

  const claim = async (voucherId: string) => {
    setClaiming(voucherId);
    const res = await apiService.post<any>(`/v1/vouchers/${voucherId}/claim`, {});
    setClaiming(null);
    if (res.error) return toast.error(res.error);
    toast.success('Reward claimed. Show the code at the counter.');
    load();
  };

  const open = wallet?.codes.filter((c) => c.status === 'UNLOCKED') ?? [];
  const past = wallet?.codes.filter((c) => c.status !== 'UNLOCKED') ?? [];

  return (
    <PublicLayout>
      <div className="mx-auto max-w-3xl space-y-6 py-2">
        <PageHeader
          title="My rewards"
          description="Spend at the places you love, watch the progress fill, claim the reward and show the code at the counter."
        />

        {authLoading ? (
          <Loader2
            className="mx-auto my-12 size-6 animate-spin text-muted-foreground"
            aria-label="Loading"
          />
        ) : !user ? (
          <EmptyState
            icon={Gift}
            title="Sign in to see your rewards"
            description="Your progress and codes are kept on your account."
            action={{ label: 'Sign in', href: `/login?redirect=${encodeURIComponent('/rewards')}` }}
          />
        ) : (
          <>
            <ChipRow label="Rewards view">
              <FilterChip selected={tab === 'mine'} onClick={() => setTab('mine')}>
                My rewards
              </FilterChip>
              <FilterChip selected={tab === 'near'} onClick={() => setTab('near')}>
                Near me
              </FilterChip>
            </ChipRow>

            {tab === 'mine' && (
              <>
                {error ? (
                  <Card className="rounded-card p-6 text-center">
                    <p className="text-sm text-destructive">{error}</p>
                  </Card>
                ) : !wallet ? (
                  <Loader2
                    className="mx-auto my-12 size-6 animate-spin text-muted-foreground"
                    aria-label="Loading"
                  />
                ) : wallet.ready.length + wallet.near.length + wallet.codes.length === 0 ? (
                  <EmptyState
                    icon={Gift}
                    title="No rewards yet"
                    description="Upload a bill after you shop, or use Quick pay at the counter. Rewards from that business show up here as you spend."
                    action={{ label: 'See rewards near me', onClick: () => setTab('near') }}
                  />
                ) : (
                  <>
                    {wallet.ready.length > 0 && (
                      <section className="space-y-3" aria-label="Ready to claim">
                        <h2 className="flex items-center gap-2 text-lg font-bold">
                          <Sparkles className="size-5 text-primary" aria-hidden /> Ready to claim
                        </h2>
                        {wallet.ready.map((r) => (
                          <Card
                            key={r.voucherId}
                            className="flex-row flex-wrap items-center justify-between gap-3 rounded-2xl border-primary/40 p-4"
                          >
                            <div className="min-w-0">
                              <p className="font-semibold text-foreground">{r.title}</p>
                              <p className="text-sm text-muted-foreground">
                                {rewardText(r)} at{' '}
                                <Link href={`/business/${r.business.id}`} className="underline">
                                  {r.business.name}
                                </Link>
                                {r.claimable > 1 ? ` · ${r.claimable} ready` : ''}
                              </p>
                            </div>
                            <Button
                              className="min-h-11"
                              loading={claiming === r.voucherId}
                              onClick={() => claim(r.voucherId)}
                            >
                              <Ticket className="size-4" aria-hidden /> Claim
                            </Button>
                          </Card>
                        ))}
                      </section>
                    )}

                    {open.length > 0 && (
                      <section className="space-y-3" aria-label="My codes">
                        <h2 className="text-lg font-bold">My codes</h2>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {open.map((c) => {
                            const left = daysLeft(c.expiresAt);
                            return (
                              <Card
                                key={c.id}
                                className="space-y-3 rounded-2xl p-4"
                                data-testid="reward-code"
                              >
                                <div>
                                  <p className="font-semibold text-foreground">{c.title}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {rewardText(c)} at {c.business.name}
                                  </p>
                                </div>
                                <div className="flex items-center gap-3">
                                  <CodeQr value={c.code} size={112} />
                                  <div className="min-w-0">
                                    <p className="font-mono text-lg font-bold tracking-wider text-foreground">
                                      {c.code}
                                    </p>
                                    <p
                                      className={cn(
                                        'text-xs',
                                        left <= 3
                                          ? 'font-semibold text-warning-soft-foreground'
                                          : 'text-muted-foreground',
                                      )}
                                    >
                                      {left === 0
                                        ? 'Ends today'
                                        : `Valid ${left} more day${left === 1 ? '' : 's'}`}{' '}
                                      · until {day(c.expiresAt)}
                                    </p>
                                  </div>
                                </div>
                                {c.terms && (
                                  <p className="text-xs text-muted-foreground">{c.terms}</p>
                                )}
                              </Card>
                            );
                          })}
                        </div>
                      </section>
                    )}

                    {wallet.near.length > 0 && (
                      <section className="space-y-3" aria-label="Almost there">
                        <h2 className="text-lg font-bold">Almost there</h2>
                        {wallet.near.map((r) => (
                          <Card key={r.voucherId} className="space-y-2 rounded-2xl p-4">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="font-semibold text-foreground">{r.title}</p>
                                <p className="text-sm text-muted-foreground">
                                  {rewardText(r)} at{' '}
                                  <Link href={`/business/${r.business.id}`} className="underline">
                                    {r.business.name}
                                  </Link>
                                </p>
                              </div>
                              <span className="text-sm font-semibold tabular-nums text-foreground">
                                ₹{r.remaining.toLocaleString('en-IN')} to go
                              </span>
                            </div>
                            <Bar value={r.progress} />
                            <p className="text-xs text-muted-foreground">
                              ₹{r.spendInWindow.toLocaleString('en-IN')} of ₹
                              {r.threshold.toLocaleString('en-IN')}
                              {r.repeatable ? ' · repeats' : ''}
                            </p>
                          </Card>
                        ))}
                      </section>
                    )}

                    {past.length > 0 && (
                      <section className="space-y-2" aria-label="Used and expired">
                        <h2 className="text-lg font-bold">Used and expired</h2>
                        {past.slice(0, 12).map((c) => (
                          <Card
                            key={c.id}
                            className="flex-row items-center justify-between gap-3 rounded-2xl p-3 text-sm"
                          >
                            <span className="min-w-0 truncate">
                              {c.title} · {c.business.name}
                            </span>
                            <span className="shrink-0 text-xs font-semibold text-muted-foreground">
                              {c.status === 'REDEEMED'
                                ? `Used ${c.redeemedAt ? day(c.redeemedAt) : ''}`
                                : 'Expired'}
                            </span>
                          </Card>
                        ))}
                      </section>
                    )}
                  </>
                )}
              </>
            )}

            {tab === 'near' && (
              <section className="space-y-3" aria-label="Rewards near me">
                {!near ? (
                  <Loader2
                    className="mx-auto my-12 size-6 animate-spin text-muted-foreground"
                    aria-label="Loading"
                  />
                ) : near.rewards.length === 0 ? (
                  <EmptyState
                    icon={MapPin}
                    title={
                      near.city ? `No rewards in ${near.city} yet` : 'Pick a city to see rewards'
                    }
                    description="Businesses add new rewards all the time. Choose your city from the top of the Offers page."
                    action={{ label: 'Open offers', href: '/offers' }}
                  />
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Rewards in {near.city ?? 'your area'}, closest to earning first.
                    </p>
                    {near.rewards.map((r) => (
                      <Card key={r.voucherId} className="space-y-2 rounded-2xl p-4">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground">{r.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {rewardText(r)} at{' '}
                              <Link href={`/business/${r.business.id}`} className="underline">
                                {r.business.name}
                              </Link>
                              {r.business.category ? ` · ${r.business.category}` : ''}
                            </p>
                          </div>
                          {r.picked && (
                            <span className="rounded-full bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand-soft-foreground">
                              Picked for you
                            </span>
                          )}
                        </div>
                        <Bar value={r.progress} />
                        <p className="text-xs text-muted-foreground">
                          {r.claimable > 0
                            ? 'Ready to claim'
                            : `Spend ₹${r.remaining.toLocaleString('en-IN')} more${r.spendInWindow > 0 ? ` (₹${r.spendInWindow.toLocaleString('en-IN')} so far)` : ''}`}{' '}
                          · ends {day(r.endDate)}
                        </p>
                      </Card>
                    ))}
                  </>
                )}
              </section>
            )}
          </>
        )}
      </div>
    </PublicLayout>
  );
}
