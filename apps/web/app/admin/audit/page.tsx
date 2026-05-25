'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layouts/admin-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ArrowUpRight,
  Search,
  Filter,
  Download,
  Receipt,
  CheckCircle2,
  XCircle,
  Tag,
  Building2,
  ShieldAlert,
  UserCheck,
  Settings,
  Bell,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { apiService } from '@/lib/services/api-service';
import { cn } from '@/lib/utils';

// ── Event type definitions ────────────────────────────────────────────────────
type EventCategory =
  | 'BILL'
  | 'OFFER'
  | 'BUSINESS'
  | 'USER'
  | 'MODERATION'
  | 'SYSTEM'
  | 'NOTICE';

const CATEGORY_CONFIG: Record<
  EventCategory,
  { label: string; color: string; bg: string; border: string; icon: React.ElementType }
> = {
  BILL: { label: 'Bill', color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', icon: Receipt },
  OFFER: { label: 'Offer', color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20', icon: Tag },
  BUSINESS: { label: 'Business', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: Building2 },
  USER: { label: 'User', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', icon: UserCheck },
  MODERATION: { label: 'Moderation', color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20', icon: ShieldAlert },
  SYSTEM: { label: 'System', color: 'text-slate-400', bg: 'bg-white/5', border: 'border-white/10', icon: Settings },
  NOTICE: { label: 'Notice', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', icon: Bell },
};

interface AuditLogEntry {
  id: number;
  action: string;
  category: EventCategory;
  user: string;
  details: string;
  date: string;
  metadata?: Record<string, string>;
}


const FILTER_OPTIONS: { label: string; value: EventCategory | 'ALL' }[] = [
  { label: 'All Events', value: 'ALL' },
  { label: 'Bills', value: 'BILL' },
  { label: 'Offers', value: 'OFFER' },
  { label: 'Businesses', value: 'BUSINESS' },
  { label: 'Users', value: 'USER' },
  { label: 'Moderation', value: 'MODERATION' },
  { label: 'Notices', value: 'NOTICE' },
  { label: 'System', value: 'SYSTEM' },
];

const PAGE_SIZE = 10;

export default function AdminAuditPage() {
  const [allLogs, setAllLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<EventCategory | 'ALL'>('ALL');
  const [page, setPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    apiService
      .get<any>('/v1/audit-logs?page=1')
      .then((res) => {
        if (res.data && !res.error) {
          const list = Array.isArray(res.data) ? res.data : res.data?.data ?? res.data?.logs ?? [];
          setAllLogs(
            list.map((l: any, i: number) => ({
              id: l.id ?? i,
              action: l.action || l.eventType || 'UNKNOWN',
              category: (l.category || l.eventCategory || 'SYSTEM') as EventCategory,
              user: l.performedBy || l.user || l.userId || 'System',
              details: l.description || l.details || l.message || '',
              date: l.createdAt
                ? new Date(l.createdAt).toLocaleString('en-IN')
                : l.date || '—',
              metadata: l.metadata || {},
            })),
          );
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = allLogs.filter((log) => {
    const matchCat = filterCategory === 'ALL' || log.category === filterCategory;
    const matchSearch =
      !search ||
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.user.toLowerCase().includes(search.toLowerCase()) ||
      log.details.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleExport = () => {
    const csv = [
      'Timestamp,User,Category,Action,Details',
      ...filtered.map(
        (l) => `"${l.date}","${l.user}","${l.category}","${l.action}","${l.details}"`,
      ),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetFilters = () => {
    setSearch('');
    setFilterCategory('ALL');
    setPage(1);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Platform Audit Trail</h1>
            <p className="text-muted-foreground">
              Chronological log of all platform events — bills, offers, businesses, users, and system actions
            </p>
          </div>
          <Button
            onClick={handleExport}
            variant="outline"
            className="rounded-xl border-white/10 text-foreground hover:bg-white/5 gap-2 cursor-pointer shrink-0"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>

        {loading && (
          <div className="flex items-center justify-center h-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Events', value: allLogs.length, color: 'text-foreground' },
            { label: 'Bill Events', value: allLogs.filter((l) => l.category === 'BILL').length, color: 'text-cyan-400' },
            { label: 'Moderation', value: allLogs.filter((l) => l.category === 'MODERATION').length, color: 'text-rose-400' },
            { label: 'Business Events', value: allLogs.filter((l) => l.category === 'BUSINESS').length, color: 'text-emerald-400' },
          ].map((stat) => (
            <Card key={stat.label} className="p-4 rounded-2xl border-white/5 bg-card/40 backdrop-blur-xl">
              <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
              <p className={cn('text-2xl font-bold', stat.color)}>{stat.value}</p>
            </Card>
          ))}
        </div>

        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search actions, users, details..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-8 h-9 rounded-xl border-white/10 bg-card/40 text-sm"
            />
          </div>

          {/* Category pills */}
          <div className="flex flex-wrap gap-1.5">
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => { setFilterCategory(opt.value); setPage(1); }}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer',
                  filterCategory === opt.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-white/5 text-muted-foreground hover:text-foreground hover:bg-white/10 border border-white/5',
                )}
              >
                {opt.label}
              </button>
            ))}
            {(search || filterCategory !== 'ALL') && (
              <button
                onClick={resetFilters}
                className="px-3 py-1.5 rounded-xl text-xs font-medium text-rose-400 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/15 transition-all cursor-pointer flex items-center gap-1"
              >
                <RefreshCw className="h-3 w-3" /> Reset
              </button>
            )}
          </div>
        </div>

        {/* Results count */}
        <p className="text-xs text-muted-foreground">
          Showing {paginated.length} of {filtered.length} events
        </p>

        {/* Table */}
        <Card className="p-0 rounded-2xl border-white/5 bg-card/40 backdrop-blur-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-muted-foreground bg-white/[0.02]">
                  <th className="px-5 py-3 font-semibold text-xs uppercase tracking-wider">Timestamp</th>
                  <th className="px-5 py-3 font-semibold text-xs uppercase tracking-wider">User / Operator</th>
                  <th className="px-5 py-3 font-semibold text-xs uppercase tracking-wider">Category</th>
                  <th className="px-5 py-3 font-semibold text-xs uppercase tracking-wider">Action</th>
                  <th className="px-5 py-3 font-semibold text-xs uppercase tracking-wider">Details</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-muted-foreground text-sm">
                      No events found matching your filters.
                    </td>
                  </tr>
                ) : (
                  paginated.map((log) => {
                    const cfg = CATEGORY_CONFIG[log.category];
                    const IconComp = cfg.icon;
                    return (
                      <tr
                        key={log.id}
                        className="border-b border-white/5 last:border-0 hover:bg-white/[0.03] transition-colors"
                      >
                        <td className="px-5 py-3.5 text-muted-foreground font-mono text-xs whitespace-nowrap">
                          {log.date}
                        </td>
                        <td className="px-5 py-3.5 font-medium text-foreground text-xs max-w-[160px]">
                          <span className="truncate block">{log.user}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border',
                              cfg.bg,
                              cfg.color,
                              cfg.border,
                            )}
                          >
                            <IconComp className="h-3 w-3" />
                            {cfg.label}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-mono font-bold text-slate-300 whitespace-nowrap">
                            {log.action}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-slate-300 text-xs max-w-[300px]">
                          <span className="line-clamp-2">{log.details}</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-xl border-white/10 text-slate-300 hover:bg-white/5 text-xs disabled:opacity-40 cursor-pointer"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-xl border-white/10 text-slate-300 hover:bg-white/5 text-xs disabled:opacity-40 cursor-pointer"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
