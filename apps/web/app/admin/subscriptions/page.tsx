'use client';

/**
 * Admin subscriptions — live data only.
 *
 * Subscribers come straight from the Subscription table via
 * GET /v1/subscriptions/admin/all (cross-tenant, includes the latest payment).
 * Plan definitions come from lib/subscription-plans so this page can never
 * drift from what registration actually sells.
 */

import { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from '@/components/layouts/admin-layout';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { apiService } from '@/lib/services/api-service';
import {
  SUBSCRIPTION_PLANS, PLAN_DURATION_DAYS, formatINR, planLabel,
} from '@/lib/subscription-plans';
import { cn } from '@/lib/utils';
import {
  CreditCard, Search, Loader2, Building2, IndianRupee,
  CheckCircle2, Clock, XCircle, Hotel,
} from 'lucide-react';

type Row = {
  id: string;
  packageName: string;
  pricing: string | number;
  duration: number;
  status: string;
  startDate: string;
  endDate: string;
  createdAt: string;
  business?: {
    id: string; name: string; slug: string; city: string; status: string;
    category?: { name: string; slug: string } | null;
  } | null;
  latestPayment?: {
    id: string; amount: string | number; status: string; method: string;
    transactionRef?: string | null; createdAt: string; verifiedAt?: string | null;
  } | null;
};

const STATUS_STYLE: Record<string, string> = {
  ACTIVE: 'bg-success/10 text-success border-success/20',
  PENDING_PAYMENT: 'bg-warning/10 text-warning border-warning/20',
  EXPIRED: 'bg-destructive/10 text-destructive border-destructive/20',
  CANCELLED: 'bg-destructive/10 text-destructive border-destructive/20',
};

function fmtDate(v?: string | null) {
  if (!v) return '—';
  return new Date(v).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function AdminSubscriptionsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await apiService.get<any>('/v1/subscriptions/admin/all');
      if (res.error) setError(res.error);
      const list = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      setRows(list);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        const q = search.trim().toLowerCase();
        if (q && !(r.business?.name || '').toLowerCase().includes(q)) return false;
        if (planFilter !== 'all' && r.packageName !== planFilter) return false;
        if (statusFilter !== 'all' && r.status !== statusFilter) return false;
        return true;
      }),
    [rows, search, planFilter, statusFilter],
  );

  const revenue = rows
    .filter((r) => r.status === 'ACTIVE')
    .reduce((sum, r) => sum + Number(r.pricing || 0), 0);
  const activeCount = rows.filter((r) => r.status === 'ACTIVE').length;
  const pendingCount = rows.filter((r) => r.status === 'PENDING_PAYMENT').length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-primary" />
            Subscriptions
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Live from the database. Plans run for {PLAN_DURATION_DAYS} days.
          </p>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {/* Plan catalogue — single source of truth */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {SUBSCRIPTION_PLANS.map((p) => {
            const count = rows.filter((r) => r.packageName === p.code && r.status === 'ACTIVE').length;
            return (
              <Card key={p.code} className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-primary">{p.name}</span>
                  {p.highlight && (
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
                      Popular
                    </span>
                  )}
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-extrabold text-foreground">{formatINR(p.offerPrice)}</span>
                  <span className="text-[11px] text-muted-foreground line-through">{formatINR(p.mrp)}</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {p.offers} offers · {p.vouchers} vouchers
                </p>
                <p className="text-xs font-semibold text-foreground mt-2">
                  {count} active subscriber{count === 1 ? '' : 's'}
                </p>
              </Card>
            );
          })}
        </div>

        {/* Totals */}
        <div className="grid sm:grid-cols-3 gap-3">
          <Card className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <IndianRupee className="h-3.5 w-3.5" /> Active revenue
            </div>
            <div className="text-2xl font-extrabold text-foreground mt-1">{formatINR(revenue)}</div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5" /> Active
            </div>
            <div className="text-2xl font-extrabold text-foreground mt-1">{activeCount}</div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" /> Awaiting payment
            </div>
            <div className="text-2xl font-extrabold text-foreground mt-1">{pendingCount}</div>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search business…"
              className="h-10 pl-9 rounded-xl"
            />
          </div>
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="h-10 px-3 rounded-xl border border-input bg-background text-sm text-foreground cursor-pointer"
          >
            <option value="all">All plans</option>
            {SUBSCRIPTION_PLANS.map((p) => (
              <option key={p.code} value={p.code}>{p.name}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 px-3 rounded-xl border border-input bg-background text-sm text-foreground cursor-pointer"
          >
            <option value="all">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="PENDING_PAYMENT">Pending payment</option>
            <option value="EXPIRED">Expired</option>
          </select>
        </div>

        {/* Subscriber table */}
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading subscriptions…
          </div>
        ) : filtered.length === 0 ? (
          <Card className="p-10 text-center">
            <Building2 className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-semibold text-foreground">No subscriptions found</p>
            <p className="text-xs text-muted-foreground mt-1">
              They appear here as soon as a business picks a plan.
            </p>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs text-muted-foreground">
                  <tr>
                    <th className="text-left font-medium px-4 py-3">Business</th>
                    <th className="text-left font-medium px-4 py-3">Plan</th>
                    <th className="text-left font-medium px-4 py-3">Amount</th>
                    <th className="text-left font-medium px-4 py-3">Status</th>
                    <th className="text-left font-medium px-4 py-3">Payment</th>
                    <th className="text-left font-medium px-4 py-3">Expires</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id} className="border-t border-border">
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{r.business?.name || '—'}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {r.business?.city}
                          {r.business?.category?.name ? ` · ${r.business.category.name}` : ''}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-foreground">
                          {r.packageName?.startsWith('HOTEL_') && <Hotel className="h-3.5 w-3.5 text-muted-foreground" />}
                          {planLabel(r.packageName)}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-foreground">
                        {formatINR(Number(r.pricing || 0))}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded-full text-[10px] font-bold border',
                            STATUS_STYLE[r.status] || 'bg-muted text-muted-foreground border-border',
                          )}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {r.latestPayment ? (
                          <div className="flex items-center gap-1.5">
                            {r.latestPayment.status === 'SUCCESS' ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                            ) : r.latestPayment.status === 'FAILED' ? (
                              <XCircle className="h-3.5 w-3.5 text-destructive" />
                            ) : (
                              <Clock className="h-3.5 w-3.5 text-warning" />
                            )}
                            <div>
                              <div className="text-xs text-foreground">
                                {formatINR(Number(r.latestPayment.amount))} · {r.latestPayment.method}
                              </div>
                              <div className="text-[10px] text-muted-foreground">
                                {r.latestPayment.transactionRef || fmtDate(r.latestPayment.createdAt)}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">No payment</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{fmtDate(r.endDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
