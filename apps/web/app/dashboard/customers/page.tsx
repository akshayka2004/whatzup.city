'use client';

import { useState, useEffect } from 'react';
import { BusinessLayout } from '@/components/layouts/business-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Search,
  Users,
  UserCheck,
  TrendingUp,
  Tag,
  BadgeCheck,
  RefreshCw,
  Star,
  GitBranch,
  UserPlus,
  Loader2,
  Mail,
  Phone,
  Calendar,
  Activity,
  X,
  Download,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { apiService } from '@/lib/services/api-service';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';

const FILTERS = [
  { key: 'all', label: 'All Customers', icon: Users },
  { key: 'claimed', label: 'Claimed Offer', icon: Tag },
  { key: 'redeemed', label: 'Redeemed Offer', icon: BadgeCheck },
  { key: 'active_month', label: 'Active This Month', icon: Activity },
  { key: 'new_month', label: 'New This Month', icon: UserPlus },
  { key: 'repeat', label: 'Repeat Customers', icon: RefreshCw },
  { key: 'high_engagement', label: 'High Engagement', icon: Star },
  { key: 'branch', label: 'Branch Customers', icon: GitBranch },
  { key: 'referral', label: 'Referral Customers', icon: UserCheck },
];

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
}

interface CustomerStats {
  totalCustomers: number;
  newThisMonth: number;
  activeThisMonth: number;
  returningCustomers: number;
  conversionRate: number;
  offerClaimRate: number;
  offerRedemptionRate: number;
  monthlyGrowth: number;
  customerRetention: number;
}

function formatDate(d: string) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
}

export default function CustomersPage() {
  const { user } = useAuth();
  const businessId = user?.businessId || user?.entity?.id;

  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [stats, setStats] = useState<CustomerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [viewing, setViewing] = useState<CustomerRecord | null>(null);

  const LIMIT = 20;

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Reset page on filter/search change
  useEffect(() => {
    setPage(1);
  }, [activeFilter, debouncedSearch]);

  // Fetch stats
  useEffect(() => {
    if (!businessId) return;
    setStatsLoading(true);
    apiService
      .get<any>(`/v1/businesses/${businessId}/customers/stats`)
      .then((res) => {
        if (res.data && !res.error) setStats(res.data);
      })
      .finally(() => setStatsLoading(false));
  }, [businessId]);

  // Fetch customers
  useEffect(() => {
    if (!businessId) return;
    setLoading(true);
    const params = new URLSearchParams({
      filter: activeFilter === 'all' ? '' : activeFilter,
      page: String(page),
      limit: String(LIMIT),
    });
    if (debouncedSearch) params.set('search', debouncedSearch);

    apiService
      .get<any>(`/v1/businesses/${businessId}/customers?${params.toString()}`)
      .then((res) => {
        if (res.data && !res.error) {
          setCustomers(res.data.customers ?? []);
          setTotal(res.data.total ?? 0);
        }
      })
      .finally(() => setLoading(false));
  }, [businessId, activeFilter, debouncedSearch, page]);

  const handleExport = () => {
    const header = 'Name,Email,Phone,Offers Claimed,Offers Redeemed,Verified Purchases,First Interaction,Last Interaction';
    const rows = customers.map(
      (c) =>
        `"${c.name}","${c.email}","${c.phone}",${c.offersClaimedCount},${c.offersRedeemedCount},${c.totalVerifiedPurchases},"${formatDate(c.firstInteractionDate)}","${formatDate(c.lastInteractionDate)}"`,
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customers-${activeFilter}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalPages = Math.ceil(total / LIMIT);

  const STAT_CARDS = stats
    ? [
        {
          label: 'Total Customers',
          value: stats.totalCustomers,
          sub: `+${stats.newThisMonth} this month`,
          icon: Users,
          color: 'text-primary bg-primary/10',
          trend: stats.monthlyGrowth,
        },
        {
          label: 'Active This Month',
          value: stats.activeThisMonth,
          sub: `${stats.customerRetention}% retention`,
          icon: Activity,
          color: 'text-success bg-success/10',
          trend: null,
        },
        {
          label: 'Claim Rate',
          value: `${stats.offerClaimRate}%`,
          sub: 'Offers claimed',
          icon: Tag,
          color: 'text-info bg-info/10',
          trend: null,
        },
        {
          label: 'Redemption Rate',
          value: `${stats.offerRedemptionRate}%`,
          sub: 'Of claimed offers',
          icon: BadgeCheck,
          color: 'text-warning bg-warning/10',
          trend: null,
        },
      ]
    : [];

  return (
    <BusinessLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              Customers
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Track and manage your customer relationships
            </p>
          </div>
          <Button
            onClick={handleExport}
            variant="outline"
            className="rounded-xl border-border text-foreground gap-2 hover:bg-secondary cursor-pointer"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>

        {/* Stats grid */}
        {statsLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map((i) => (
              <Card key={i} className="p-5 rounded-2xl border-border bg-card/40 animate-pulse h-24" />
            ))}
          </div>
        ) : stats ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {STAT_CARDS.map((s) => {
              const Icon = s.icon;
              return (
                <Card key={s.label} className="p-5 rounded-2xl border-border bg-card/40 backdrop-blur-xl">
                  <div className={cn('p-2 rounded-xl inline-flex mb-3', s.color)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <div className="flex items-end gap-2 mt-1">
                    <h3 className="text-2xl font-extrabold text-foreground">{s.value}</h3>
                    {s.trend !== null && s.trend !== undefined && (
                      <span
                        className={cn(
                          'text-xs font-semibold flex items-center gap-0.5 mb-0.5',
                          s.trend >= 0 ? 'text-success' : 'text-destructive',
                        )}
                      >
                        {s.trend >= 0 ? (
                          <ArrowUpRight className="h-3 w-3" />
                        ) : (
                          <ArrowDownRight className="h-3 w-3" />
                        )}
                        {Math.abs(s.trend)}%
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{s.sub}</p>
                </Card>
              );
            })}
          </div>
        ) : null}

        {/* Filter chips + Search */}
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            {FILTERS.map((f) => {
              const Icon = f.icon;
              return (
                <button
                  key={f.key}
                  onClick={() => setActiveFilter(f.key)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer',
                    activeFilter === f.key
                      ? 'bg-primary text-white'
                      : 'bg-secondary text-muted-foreground hover:bg-secondary border border-border',
                  )}
                >
                  <Icon className="h-3 w-3" />
                  {f.label}
                </button>
              );
            })}
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 rounded-xl border-border bg-secondary"
            />
          </div>
        </div>

        {/* Customer list */}
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : customers.length === 0 ? (
          <Card className="p-10 rounded-2xl border-dashed border-border bg-secondary text-center">
            <Users className="h-10 w-10 mx-auto text-muted-foreground mb-3 opacity-40" />
            <p className="text-foreground font-semibold mb-1">No customers found</p>
            <p className="text-xs text-muted-foreground">
              {activeFilter !== 'all' || search
                ? 'Try changing your filters or search term.'
                : 'Customers appear here when they claim offers, upload bills, or interact with your business.'}
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {customers.map((c) => (
              <Card
                key={c.id}
                className="p-4 rounded-2xl border-border bg-card/40 backdrop-blur-xl hover:bg-card/60 transition-all cursor-pointer"
                onClick={() => setViewing(c)}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-primary/20 to-info/20 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                      {(c.name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{c.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{c.email}</p>
                    </div>
                  </div>

                  <div className="hidden sm:flex items-center gap-6 shrink-0 text-xs text-muted-foreground">
                    <div className="text-center">
                      <p className="text-foreground font-bold text-sm">{c.offersClaimedCount}</p>
                      <p>Claimed</p>
                    </div>
                    <div className="text-center">
                      <p className="text-foreground font-bold text-sm">{c.offersRedeemedCount}</p>
                      <p>Redeemed</p>
                    </div>
                    <div className="text-center">
                      <p className="text-foreground font-bold text-sm">{c.totalVerifiedPurchases}</p>
                      <p>Purchases</p>
                    </div>
                    <div className="text-center">
                      <p className="text-foreground font-semibold text-xs">
                        {formatDate(c.lastInteractionDate)}
                      </p>
                      <p>Last Active</p>
                    </div>
                  </div>

                  <span
                    className={cn(
                      'text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0',
                      c.customerStatus === 'ACTIVE'
                        ? 'bg-success/10 text-success'
                        : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {c.customerStatus}
                  </span>
                </div>
              </Card>
            ))}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2 text-xs text-muted-foreground">
                <p>
                  Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="rounded-xl border-border text-xs cursor-pointer"
                  >
                    Prev
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="rounded-xl border-border text-xs cursor-pointer"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Customer detail modal */}
        {viewing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <Card className="w-full max-w-lg p-6 rounded-2xl border-border bg-card shadow-2xl relative overflow-y-auto max-h-[90vh]">
              <button
                onClick={() => setViewing(null)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-4 mb-6">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-primary to-info flex items-center justify-center text-xl font-extrabold text-white">
                  {viewing.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">{viewing.name}</h3>
                  <span
                    className={cn(
                      'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                      viewing.customerStatus === 'ACTIVE'
                        ? 'bg-success/10 text-success'
                        : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {viewing.customerStatus}
                  </span>
                </div>
              </div>

              {/* Contact info */}
              <div className="space-y-2 mb-5">
                {viewing.email && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4 shrink-0" />
                    <a href={`mailto:${viewing.email}`} className="hover:text-foreground">{viewing.email}</a>
                  </div>
                )}
                {viewing.phone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4 shrink-0" />
                    <span>{viewing.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4 shrink-0" />
                  <span>Customer since {formatDate(viewing.firstInteractionDate)}</span>
                </div>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-3 gap-3 mb-5">
                <div className="bg-secondary border border-border rounded-xl p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Claimed</p>
                  <p className="text-xl font-extrabold text-foreground">{viewing.offersClaimedCount}</p>
                </div>
                <div className="bg-secondary border border-border rounded-xl p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Redeemed</p>
                  <p className="text-xl font-extrabold text-foreground">{viewing.offersRedeemedCount}</p>
                </div>
                <div className="bg-secondary border border-border rounded-xl p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Purchases</p>
                  <p className="text-xl font-extrabold text-foreground">{viewing.totalVerifiedPurchases}</p>
                </div>
              </div>

              {/* Extra info */}
              <div className="space-y-1.5 text-xs text-muted-foreground mb-5">
                <div className="flex justify-between">
                  <span>Last interaction</span>
                  <span className="text-foreground font-medium">{formatDate(viewing.lastInteractionDate)}</span>
                </div>
                {viewing.referralSource && (
                  <div className="flex justify-between">
                    <span>Referral source</span>
                    <span className="text-foreground font-medium">{viewing.referralSource}</span>
                  </div>
                )}
                {viewing.branchBusinessId && (
                  <div className="flex justify-between">
                    <span>Branch customer</span>
                    <span className="text-success font-medium">Yes</span>
                  </div>
                )}
              </div>

              <Button
                onClick={() => setViewing(null)}
                className="w-full rounded-xl bg-primary hover:bg-primary text-white cursor-pointer"
              >
                Close
              </Button>
            </Card>
          </div>
        )}
      </div>
    </BusinessLayout>
  );
}
