'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Gift, Loader2 } from 'lucide-react';
import { AdminLayout } from '@/components/layouts/admin-layout';
import { PageHeader } from '@/components/system/page-header';
import { FilterChip, ChipRow } from '@/components/system/filter-chip';
import { EmptyState } from '@/components/common/empty-state';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';
import { apiService } from '@/lib/services/api-service';
import { cn } from '@/lib/utils';

type Row = {
  id: string;
  title: string;
  status: string;
  endDate: string;
  business: { id: string; name: string; city: string | null };
  threshold: number;
  rewardType: string;
  rewardValue: number | null;
  rewardLabel: string | null;
  repeatable: boolean;
  targeted: boolean;
  claimed: number;
  redeemed: number;
  open: number;
  slotsLeft: number | null;
  owed: number | null;
  given: number | null;
};
type Flag = {
  kind: string;
  severity: 'LOOK' | 'CHECK';
  text: string;
  businessId: string;
  business: { id: string; name: string; city: string | null } | null;
};
type Listing = {
  data: Row[];
  meta: { total: number; page: number; limit: number };
  summary: { live: number; owed: number; openCodes: number };
  watch: Flag[];
};

const STATUS = [
  { value: '', label: 'All' },
  { value: 'LIVE', label: 'Live' },
  { value: 'PAUSED', label: 'Paused' },
  { value: 'ENDED', label: 'Ended' },
];
const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
const rewardText = (r: Row) =>
  r.rewardType === 'PERCENT'
    ? `${r.rewardValue}% off`
    : r.rewardType === 'AMOUNT'
      ? `${inr(r.rewardValue ?? 0)} off`
      : r.rewardLabel || 'Gift';
const day = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });

/** Every business reward on the platform, what each has handed out and owes, and patterns worth a look. */
export default function AdminRewardsPage() {
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Listing | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setQ(search.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    const qs = new URLSearchParams({ page: String(page) });
    if (status) qs.set('status', status);
    if (q) qs.set('search', q);
    const res = await apiService.get<Listing>(`/v1/vouchers/admin/overview?${qs}`, { fresh: true });
    if (res.error || !res.data) {
      setError(res.error || 'Could not load rewards.');
      return;
    }
    setError('');
    setData(res.data);
  }, [page, status, q]);
  useEffect(() => {
    load();
  }, [load]);

  const toggle = async (r: Row) => {
    const next = r.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    setBusy(r.id);
    const res = await apiService.patch<any>(`/v1/vouchers/admin/${r.id}/status`, { status: next });
    setBusy(null);
    if (res.error) return toast.error(res.error);
    toast.success(next === 'PAUSED' ? 'Reward paused' : 'Reward resumed');
    load();
  };

  const pages = data ? Math.max(1, Math.ceil(data.meta.total / data.meta.limit)) : 1;

  return (
    <AdminLayout>
      <div className="space-y-5">
        <PageHeader
          title="Business rewards"
          description="Every reward businesses have set, what customers hold and what is still owed. Pause one if there is a complaint."
        />

        {data && (
          <div className="grid grid-cols-3 gap-3">
            <Card className="rounded-2xl p-4">
              <p className="text-xs text-muted-foreground">Live rewards</p>
              <p className="text-2xl font-extrabold tabular-nums">{data.summary.live}</p>
            </Card>
            <Card className="rounded-2xl p-4">
              <p className="text-xs text-muted-foreground">Unused codes</p>
              <p className="text-2xl font-extrabold tabular-nums">{data.summary.openCodes}</p>
            </Card>
            <Card className="rounded-2xl p-4">
              <p className="text-xs text-muted-foreground">Owed on this page (₹ rewards)</p>
              <p className="text-2xl font-extrabold tabular-nums">{inr(data.summary.owed)}</p>
            </Card>
          </div>
        )}

        {data && data.watch.length > 0 && (
          <Card
            className="space-y-2 rounded-2xl border-warning/40 bg-warning-soft p-4"
            role="region"
            aria-label="Worth a look"
          >
            <p className="flex items-center gap-2 text-sm font-semibold text-warning-soft-foreground">
              <AlertTriangle className="size-4" aria-hidden /> Worth a look (last 30 days of Quick
              pay)
            </p>
            <ul className="space-y-1 text-sm text-warning-soft-foreground">
              {data.watch.map((f, i) => (
                <li key={i}>
                  <span className="font-semibold">{f.business?.name ?? 'A business'}</span>
                  {f.business?.city ? ` (${f.business.city})` : ''}: {f.text}
                  {f.severity === 'CHECK' ? ' Check this one first.' : ''}
                </li>
              ))}
            </ul>
            <p className="text-xs text-warning-soft-foreground/80">
              These only point at patterns. Nothing is blocked. A friendly regular or a busy cashier
              can look the same.
            </p>
          </Card>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <ChipRow wrap label="Status">
            {STATUS.map((s) => (
              <FilterChip
                key={s.value}
                selected={status === s.value}
                onClick={() => {
                  setStatus(s.value);
                  setPage(1);
                }}
              >
                {s.label}
              </FilterChip>
            ))}
          </ChipRow>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search a reward or business"
            aria-label="Search rewards"
            className="h-11 sm:max-w-xs"
          />
        </div>

        {error ? (
          <Card className="rounded-2xl p-6 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" className="mt-3 min-h-11" onClick={load}>
              Try again
            </Button>
          </Card>
        ) : !data ? (
          <Loader2
            className="mx-auto my-12 size-6 animate-spin text-muted-foreground"
            aria-label="Loading"
          />
        ) : data.data.length === 0 ? (
          <EmptyState
            icon={Gift}
            title="No rewards found"
            description="Try another status or search."
          />
        ) : (
          <div className="space-y-3">
            {data.data.map((r) => (
              <Card key={r.id} className="space-y-2 rounded-2xl p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">{r.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.business.name}
                      {r.business.city ? ` · ${r.business.city}` : ''} · {rewardText(r)} at{' '}
                      {inr(r.threshold)}
                      {r.repeatable ? ' · repeats' : ''}
                      {r.targeted ? ' · targeted' : ''} · ends {day(r.endDate)}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-xs font-semibold',
                      r.status === 'ACTIVE'
                        ? 'bg-success-soft text-success-soft-foreground'
                        : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {r.status === 'ACTIVE' ? 'Live' : r.status.toLowerCase()}
                  </span>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <p className="text-muted-foreground">
                    {r.claimed} claimed · {r.redeemed} used · {r.open} unused
                    {r.slotsLeft != null ? ` · ${r.slotsLeft} slots left` : ''}
                    {r.owed != null ? ` · owes ${inr(r.owed)}` : ''}
                    {r.given != null && r.given > 0 ? ` · gave ${inr(r.given)}` : ''}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="min-h-10"
                    loading={busy === r.id}
                    onClick={() => toggle(r)}
                  >
                    {r.status === 'ACTIVE' ? 'Pause' : 'Resume'}
                  </Button>
                </div>
              </Card>
            ))}
            {pages > 1 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {data.meta.total} rewards · page {page} of {pages}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= pages}
                    onClick={() => setPage(page + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
