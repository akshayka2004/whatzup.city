'use client';

import { useEffect, useState } from 'react';
import {
  Activity,
  BadgeCheck,
  Calendar,
  Download,
  Mail,
  Moon,
  Phone,
  RefreshCw,
  Sparkles,
  Star,
  Tag,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import { BusinessLayout } from '@/components/layouts/business-layout';
import { PageHeader } from '@/components/system/page-header';
import { DataTable, type Column } from '@/components/system/data-table';
import { FilterChip, ChipRow } from '@/components/system/filter-chip';
import { SearchInput } from '@/components/system/toolbar';
import { Modal } from '@/components/system/modal';
import { StatusPill, type PillTone } from '@/components/common/status-pill';
import { KpiCard } from '@/components/analytics/kpi-card';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';
import { apiService } from '@/lib/services/api-service';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';

type Segment = 'new' | 'returning' | 'lapsed' | 'one-time';

interface CustomerRecord {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  offersClaimedCount: number;
  offersRedeemedCount: number;
  totalVerifiedPurchases: number;
  firstInteractionDate: string;
  lastInteractionDate: string;
  referralSource?: string;
  customerStatus: string;
  branchBusinessId?: string;
  segment?: Segment;
}

interface CustomerStats {
  totalCustomers: number;
  newThisMonth: number;
  activeThisMonth: number;
  returningCustomers: number;
  offerClaimRate: number;
  offerRedemptionRate: number;
  monthlyGrowth: number;
  customerRetention: number;
  segments?: {
    new: number;
    returning: number;
    lapsed: number;
    newDays: number;
    lapsedDays: number;
  };
}

const SEGMENT_PILL: Record<Segment, { tone: PillTone; label: string }> = {
  new: { tone: 'info', label: 'New' },
  returning: { tone: 'success', label: 'Returning' },
  lapsed: { tone: 'warning', label: 'Lapsed' },
  'one-time': { tone: 'neutral', label: 'One-time' },
};

const MORE_FILTERS = [
  { key: 'claimed', label: 'Claimed an offer', icon: Tag },
  { key: 'redeemed', label: 'Redeemed', icon: BadgeCheck },
  { key: 'active_month', label: 'Active this month', icon: Activity },
  { key: 'high_engagement', label: 'Most engaged', icon: Star },
  { key: 'referral', label: 'Referred', icon: UserCheck },
];

const LIMIT = 20;
const fmt = (d?: string) =>
  d
    ? new Date(d).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'Asia/Kolkata',
      })
    : '—';
const ago = (d?: string) => {
  if (!d) return '—';
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000);
  return days <= 0 ? 'Today' : days === 1 ? 'Yesterday' : days < 30 ? `${days} days ago` : fmt(d);
};

export default function CustomersPage() {
  const { user } = useAuth();
  const canExport = (user?.rbacRole || '') !== 'BUSINESS_STAFF';
  const businessId = user?.businessId || user?.entity?.id;

  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [stats, setStats] = useState<CustomerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [viewing, setViewing] = useState<CustomerRecord | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => setPage(1), [filter, debounced]);

  useEffect(() => {
    if (!businessId) return;
    setStatsLoading(true);
    apiService
      .get<CustomerStats>(`/v1/businesses/${businessId}/customers/stats`)
      .then((res) => {
        if (res.data && !res.error) setStats(res.data);
      })
      .finally(() => setStatsLoading(false));
  }, [businessId]);

  const query = () => {
    const p = new URLSearchParams();
    if (filter !== 'all') p.set('filter', filter);
    if (debounced) p.set('search', debounced);
    return p;
  };

  useEffect(() => {
    if (!businessId) return;
    setLoading(true);
    const p = query();
    p.set('page', String(page));
    p.set('limit', String(LIMIT));
    apiService
      .get<any>(`/v1/businesses/${businessId}/customers?${p}`)
      .then((res) => {
        if (res.data && !res.error) {
          setCustomers(res.data.customers ?? []);
          setTotal(res.data.total ?? 0);
        }
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId, filter, debounced, page]);

  // Server builds the whole filtered list (not just this page); cookies carry the session.
  const exportCsv = async () => {
    if (!businessId) return;
    setExporting(true);
    try {
      const res = await fetch(`/api/v1/businesses/${businessId}/customers/export?${query()}`, {
        credentials: 'include',
      });
      if (!res.ok)
        throw new Error(
          res.status === 403
            ? 'You don’t have access to export these customers.'
            : 'Export failed. Please try again.',
        );
      const blob = await res.blob();
      const name =
        /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') || '')?.[1] ||
        'customers.csv';
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${total.toLocaleString('en-IN')} customer${total === 1 ? '' : 's'}`);
    } catch (e: any) {
      toast.error(e?.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const seg = stats?.segments;
  const segChips = [
    { key: 'all', label: 'Everyone', icon: Users, count: stats?.totalCustomers },
    { key: 'new', label: 'New', icon: UserPlus, count: seg?.new },
    { key: 'returning', label: 'Returning', icon: RefreshCw, count: seg?.returning },
    { key: 'lapsed', label: 'Lapsed', icon: Moon, count: seg?.lapsed },
  ];

  const columns: Column<CustomerRecord>[] = [
    {
      key: 'name',
      header: 'Customer',
      cell: (c) => (
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-caption font-bold text-brand-soft-foreground">
            {c.name.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium">{c.name}</p>
            <p className="truncate text-caption text-muted-foreground">
              {c.email || c.phone || '—'}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'segment',
      header: 'Segment',
      cell: (c) => (c.segment ? <StatusPill {...SEGMENT_PILL[c.segment]} /> : '—'),
    },
    {
      key: 'claims',
      header: 'Claimed',
      align: 'right',
      value: (c) => c.offersClaimedCount,
      cell: (c) => <span className="tabular-nums">{c.offersClaimedCount}</span>,
      hideOnMobile: true,
    },
    {
      key: 'redeemed',
      header: 'Redeemed',
      align: 'right',
      value: (c) => c.offersRedeemedCount,
      cell: (c) => <span className="tabular-nums">{c.offersRedeemedCount}</span>,
      hideOnMobile: true,
    },
    {
      key: 'bills',
      header: 'Verified bills',
      align: 'right',
      value: (c) => c.totalVerifiedPurchases,
      cell: (c) => <span className="tabular-nums">{c.totalVerifiedPurchases}</span>,
      hideOnMobile: true,
    },
    {
      key: 'last',
      header: 'Last seen',
      value: (c) => c.lastInteractionDate,
      cell: (c) => ago(c.lastInteractionDate),
    },
  ];

  const segDesc = seg
    ? `New = first seen in the last ${seg.newDays} days · Returning = came back more than once and seen in the last ${seg.lapsedDays} days · Lapsed = not seen for ${seg.lapsedDays}+ days.`
    : undefined;

  return (
    <BusinessLayout>
      <PageHeader
        title="Customers"
        description="Everyone who claimed an offer, redeemed a reward or had a bill verified with you."
        actions={
          // Bulk customer data is for owners and moderators (the API enforces it too).
          canExport ? (
            <Button variant="outline" loading={exporting} disabled={!total} onClick={exportCsv}>
              <Download /> Export CSV
            </Button>
          ) : undefined
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Customers"
          icon={Users}
          loading={statsLoading}
          metric={
            stats
              ? {
                  value: stats.totalCustomers,
                  previous: stats.totalCustomers - stats.newThisMonth,
                  change: null,
                }
              : undefined
          }
          definition={`${stats?.newThisMonth ?? 0} new this month`}
        />
        <KpiCard
          label="Active this month"
          icon={Activity}
          loading={statsLoading}
          metric={stats ? { value: stats.activeThisMonth, previous: 0, change: null } : undefined}
          definition="Customers who interacted since the 1st of this month"
        />
        <KpiCard
          label="Claim rate"
          icon={Tag}
          format="pct"
          loading={statsLoading}
          metric={stats ? { value: stats.offerClaimRate, previous: 0, change: null } : undefined}
          definition="Share of customers who claimed at least one offer"
        />
        <KpiCard
          label="Redemption rate"
          icon={BadgeCheck}
          format="pct"
          loading={statsLoading}
          metric={
            stats ? { value: stats.offerRedemptionRate, previous: 0, change: null } : undefined
          }
          definition="Share of claimers who went on to redeem"
        />
      </div>

      <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <ChipRow label="Segment">
          {segChips.map((s) => (
            <FilterChip
              key={s.key}
              icon={s.icon}
              selected={filter === s.key}
              count={s.count || undefined}
              onClick={() => setFilter(s.key)}
            >
              {s.label}
            </FilterChip>
          ))}
        </ChipRow>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search name, email or phone"
        />
      </div>
      <ChipRow label="More filters" className="mb-4">
        {MORE_FILTERS.map((f) => (
          <FilterChip
            key={f.key}
            icon={f.icon}
            selected={filter === f.key}
            onClick={() => setFilter(filter === f.key ? 'all' : f.key)}
          >
            {f.label}
          </FilterChip>
        ))}
      </ChipRow>
      {segDesc && <p className="mb-4 text-caption text-muted-foreground">{segDesc}</p>}

      <DataTable
        caption="Customers"
        columns={columns}
        rows={customers}
        rowKey={(c) => c.id}
        loading={loading}
        onRowClick={setViewing}
        page={page}
        pageSize={LIMIT}
        total={total}
        onPageChange={setPage}
        empty={{
          icon: filter === 'lapsed' ? Sparkles : Users,
          title: debounced
            ? 'No matching customers'
            : filter === 'lapsed'
              ? 'No lapsed customers'
              : 'No customers here yet',
          description: debounced
            ? 'Try a different name, email or phone.'
            : 'Customers appear once they claim an offer or a bill is verified.',
        }}
        mobileCard={(c) => (
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-medium">{c.name}</p>
              <p className="truncate text-caption text-muted-foreground">
                Last seen {ago(c.lastInteractionDate).toLowerCase()}
              </p>
            </div>
            {c.segment && <StatusPill {...SEGMENT_PILL[c.segment]} />}
          </div>
        )}
      />

      <Modal
        open={!!viewing}
        onOpenChange={(o) => !o && setViewing(null)}
        title={viewing?.name ?? 'Customer'}
        description={viewing ? `Customer since ${fmt(viewing.firstInteractionDate)}` : undefined}
      >
        {viewing && (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-1.5">
              {viewing.segment && <StatusPill {...SEGMENT_PILL[viewing.segment]} />}
              <StatusPill
                tone={viewing.customerStatus === 'ACTIVE' ? 'success' : 'neutral'}
                label={viewing.customerStatus.toLowerCase()}
              />
              {viewing.referralSource && (
                <StatusPill tone="primary" label={`Referred · ${viewing.referralSource}`} />
              )}
              {viewing.branchBusinessId && <StatusPill tone="neutral" label="Branch customer" />}
            </div>
            <ul className="space-y-2 text-sm">
              {viewing.email && (
                <li className="flex items-center gap-2">
                  <Mail className="size-4 text-muted-foreground" aria-hidden />
                  <a href={`mailto:${viewing.email}`} className="hover:underline">
                    {viewing.email}
                  </a>
                </li>
              )}
              {viewing.phone && (
                <li className="flex items-center gap-2">
                  <Phone className="size-4 text-muted-foreground" aria-hidden />
                  <a href={`tel:${viewing.phone}`} className="hover:underline">
                    {viewing.phone}
                  </a>
                </li>
              )}
              <li className="flex items-center gap-2">
                <Calendar className="size-4 text-muted-foreground" aria-hidden />
                Last seen {ago(viewing.lastInteractionDate).toLowerCase()}
              </li>
            </ul>
            <dl className="grid grid-cols-3 gap-3">
              {[
                ['Claimed', viewing.offersClaimedCount],
                ['Redeemed', viewing.offersRedeemedCount],
                ['Verified bills', viewing.totalVerifiedPurchases],
              ].map(([l, v]) => (
                <div
                  key={l as string}
                  className={cn('rounded-control bg-surface-sunken p-3 text-center')}
                >
                  <dt className="text-caption text-muted-foreground">{l}</dt>
                  <dd className="text-title font-semibold tabular-nums">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </Modal>
    </BusinessLayout>
  );
}
