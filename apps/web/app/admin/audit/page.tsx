'use client';

import { useState } from 'react';
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
} from 'lucide-react';
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

const ALL_AUDIT_LOGS: AuditLogEntry[] = [
  // Bills
  {
    id: 101,
    action: 'BILL_SUBMITTED',
    category: 'BILL',
    user: 'Priya Sharma (Customer)',
    details: 'Bill INV-88291 submitted for "Gourmet Pizza Co." — ₹2,450',
    date: 'May 21, 2026 06:00:44',
    metadata: { billId: 'bill-001', business: 'Gourmet Pizza Co.', amount: '₹2,450' },
  },
  {
    id: 102,
    action: 'BILL_APPROVED',
    category: 'BILL',
    user: 'Moderator Raj (Business)',
    details: 'Bill INV-88291 approved for Priya Sharma — sale converted',
    date: 'May 21, 2026 09:15:12',
    metadata: { billId: 'bill-001', status: 'APPROVED' },
  },
  {
    id: 103,
    action: 'BILL_SUBMITTED',
    category: 'BILL',
    user: 'Rahul Mehta (Customer)',
    details: 'Bill INV-39201 submitted for "Vanguard Fitness Center" — ₹3,750',
    date: 'May 20, 2026 14:30:00',
    metadata: { billId: 'bill-002', business: 'Vanguard Fitness Center', amount: '₹3,750' },
  },
  {
    id: 104,
    action: 'BILL_FLAGGED',
    category: 'BILL',
    user: 'Auto-Fraud Detector (System)',
    details: 'Bill INV-10293 flagged — OCR confidence 51%, fraud score 72%',
    date: 'May 19, 2026 11:20:00',
    metadata: { billId: 'bill-003', fraudScore: '0.72', ocrConfidence: '51%' },
  },
  {
    id: 105,
    action: 'BILL_REJECTED',
    category: 'BILL',
    user: 'Moderator Sunita (Business)',
    details: 'Bill INV-10293 rejected — duplicate invoice detected, customer notified',
    date: 'May 19, 2026 13:45:00',
    metadata: { billId: 'bill-003', reason: 'Duplicate invoice hash' },
  },
  {
    id: 106,
    action: 'BILL_ESCALATED',
    category: 'BILL',
    user: 'System (Auto)',
    details: 'Bill INV-55932 escalated to platform admin — fraud score 88%, submitted 3× in 48 hours',
    date: 'May 20, 2026 15:45:00',
    metadata: { billId: 'bill-esc-002', fraudScore: '0.88' },
  },
  // Offers
  {
    id: 201,
    action: 'OFFER_CREATED',
    category: 'OFFER',
    user: 'Business Owner (Bella Restaurant)',
    details: 'New offer created: "Summer Special — 50% Off" with tags: seasonal, dine-in',
    date: 'May 20, 2026 10:00:00',
    metadata: { offerId: 'offer-001', discount: '50%' },
  },
  {
    id: 202,
    action: 'OFFER_ACTIVATED',
    category: 'OFFER',
    user: 'Business Owner (Bella Restaurant)',
    details: 'Offer "Member Exclusive — 30% Off" status changed to ACTIVE',
    date: 'May 20, 2026 10:05:00',
    metadata: { offerId: 'offer-002', status: 'ACTIVE' },
  },
  {
    id: 203,
    action: 'OFFER_REDEEMED',
    category: 'OFFER',
    user: 'Priya Sharma (Customer)',
    details: 'Offer code CLAIM-4827 redeemed at Bella Restaurant',
    date: 'May 21, 2026 12:30:00',
    metadata: { code: 'CLAIM-4827', business: 'Bella Restaurant' },
  },
  // Business
  {
    id: 301,
    action: 'BUSINESS_REGISTERED',
    category: 'BUSINESS',
    user: 'John Green',
    details: 'New business registered: "Green & Co. Whole Foods" — Category: Retail',
    date: 'May 19, 2026 08:00:00',
    metadata: { businessId: 'biz-real-1', category: 'Retail & Supermarkets' },
  },
  {
    id: 302,
    action: 'BUSINESS_APPROVED',
    category: 'BUSINESS',
    user: 'Admin Alex',
    details: 'Business "Gourmet Deli" (ID: 104) approved — entity verification completed',
    date: 'May 20, 2026 14:02:10',
    metadata: { businessId: '104' },
  },
  {
    id: 303,
    action: 'BUSINESS_SUSPENDED',
    category: 'BUSINESS',
    user: 'Admin Alex',
    details: 'Business "Shadow Goods" suspended — repeated fraud bill submissions',
    date: 'May 18, 2026 11:30:00',
    metadata: { businessId: 'biz-shadow', reason: 'Fraud policy violation' },
  },
  // User / Moderation
  {
    id: 401,
    action: 'USER_SUSPENDED',
    category: 'USER',
    user: 'Admin Sarah',
    details: 'User account (ID: 981) suspended for fraudulent bill abuse — 5 duplicate bills',
    date: 'May 20, 2026 13:45:00',
    metadata: { userId: '981', reason: 'Fraud abuse' },
  },
  {
    id: 402,
    action: 'USER_APPROVED',
    category: 'USER',
    user: 'Admin Alex',
    details: 'Entity verification approved: "Sarah Style (Fashion)" — Influencer profile unlocked',
    date: 'May 20, 2026 09:00:00',
    metadata: { entityId: 'entity-inf-1', type: 'INFLUENCER' },
  },
  // Moderation
  {
    id: 501,
    action: 'REPORT_RESOLVED',
    category: 'MODERATION',
    user: 'System Worker',
    details: 'Moderation report (ID: 1082) auto-dismissed — low confidence score flag',
    date: 'May 20, 2026 12:12:15',
    metadata: { reportId: '1082' },
  },
  {
    id: 502,
    action: 'FRAUD_FLAGGED',
    category: 'MODERATION',
    user: 'Auto-Fraud Detector',
    details: 'Fraud flag raised for Urban Mart Grocery — duplicate invoice hash pattern',
    date: 'May 20, 2026 15:40:00',
    metadata: { business: 'Urban Mart Grocery', severity: 'HIGH' },
  },
  // Notices
  {
    id: 601,
    action: 'NOTICE_PUBLISHED',
    category: 'NOTICE',
    user: 'Civic Authority Office',
    details: 'Alert published: "Extreme Weather Advisory - City Center" — tags: weather, emergency',
    date: 'May 20, 2026 07:30:00',
    metadata: { noticeId: 'notice-001', tags: 'weather, emergency, flooding' },
  },
  // System
  {
    id: 701,
    action: 'SYSTEM_STARTUP',
    category: 'SYSTEM',
    user: 'System',
    details: 'Platform services started — API, Worker, and OCR queue online',
    date: 'May 20, 2026 00:01:00',
    metadata: {},
  },
];

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
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<EventCategory | 'ALL'>('ALL');
  const [page, setPage] = useState(1);

  const filtered = ALL_AUDIT_LOGS.filter((log) => {
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

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Events', value: ALL_AUDIT_LOGS.length, color: 'text-foreground' },
            { label: 'Bill Events', value: ALL_AUDIT_LOGS.filter((l) => l.category === 'BILL').length, color: 'text-cyan-400' },
            { label: 'Moderation', value: ALL_AUDIT_LOGS.filter((l) => l.category === 'MODERATION').length, color: 'text-rose-400' },
            { label: 'Business Events', value: ALL_AUDIT_LOGS.filter((l) => l.category === 'BUSINESS').length, color: 'text-emerald-400' },
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
