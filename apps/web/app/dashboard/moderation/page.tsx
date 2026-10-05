'use client';

import { useState, useEffect, useRef } from 'react';
import { BusinessLayout } from '@/components/layouts/business-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  ShieldCheck,
  ShieldAlert,
  FileText,
  Check,
  X,
  Eye,
  AlertTriangle,
  RefreshCw,
  Flag,
  Clock,
  TrendingUp,
  User,
  Building2,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  Filter,
  Search,
  Shield,
  Loader2,
  ArrowRightLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { canAccess, hasRole, getRoleLabel } from '@/lib/rbac';
import { apiService } from '@/lib/services/api-service';
import { useAuth } from '@/hooks/use-auth';

// ── TYPES ─────────────────────────────────────────────────────────────

type BillStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'FLAGGED' | 'RE_UPLOAD_REQUESTED' | 'ESCALATED';
type TabKey = 'PENDING' | 'APPROVED' | 'REJECTED' | 'FLAGGED' | 'RE_UPLOAD_REQUESTED';
type ActionModal = 'approve' | 'reject' | 'reupload' | 'flag' | 'override' | null;

type BrandInfo = {
  brand: { id: string; name: string; billSeriesMode?: string; billSeriesPrefix?: string | null };
  outlets: { id: string; name: string; outletLabel?: string | null; status?: string; isBrandHq?: boolean }[];
};

const UNDECIDED: BillStatus[] = ['PENDING', 'FLAGGED', 'ESCALATED', 'RE_UPLOAD_REQUESTED'];

const outletName = (o: { name: string; outletLabel?: string | null }) => o.outletLabel || o.name;

function extractList(body: any): any[] {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.data)) return body.data;
  if (Array.isArray(body?.data?.data)) return body.data.data;
  return body?.verifications ?? [];
}

// Never nags: "not matched" only shows when we know a series is actually configured.
function getSeriesBadge(bill: any, brand: BrandInfo | null): { matched: boolean; label: string } | null {
  if (bill.seriesMatched) {
    return { matched: true, label: bill.seriesScope === 'SHARED' ? 'Brand series matched' : 'Series matched' };
  }
  if (bill.seriesScope === 'SHARED' && brand?.brand.billSeriesPrefix) return { matched: false, label: 'Series not matched' };
  if (bill.seriesScope !== 'SHARED' && bill.seriesPrefix) return { matched: false, label: 'Series not matched' };
  return null;
}

function mapApiBill(b: any) {
  // API returns BillVerification with nested `bill` containing Bill + User + Business
  const bill = b.bill || {};
  const customerName = b.customer?.name || b.user?.name || bill.user?.name || b.customerName || 'Customer';
  const customerEmail = b.customer?.email || b.user?.email || bill.user?.email || b.customerEmail || '';
  const businessName = b.business?.name || bill.business?.name || b.businessName || '';
  const amount = parseFloat(b.amount ?? bill.amount ?? '0');
  const billDate = b.billDate || bill.billDate || '';
  const fraudScore = parseFloat(String(b.fraudScore ?? '0.1'));

  return {
    id: b.id,
    billId: b.billId || bill.id || b.id,
    customer: {
      name: customerName,
      email: customerEmail,
      avatar: customerName.substring(0, 2).toUpperCase(),
    },
    business: businessName,
    businessId: bill.business?.id || b.businessId || bill.businessId || '',
    amount,
    billDate,
    billNumber: bill.billNumber || b.billNumber || b.ocrMetadata?.parsed?.invoiceNumber || b.id.substring(0, 8).toUpperCase(),
    seriesMatched: !!b.seriesMatched,
    seriesScope: (b.seriesScope || 'SINGLE') as string,
    seriesPrefix: (b.seriesPrefix || bill.business?.billSeriesPrefix || b.billSeriesPrefix || '') as string,
    rejectionReason: (b.rejectionReason || '') as string,
    status: (b.status || 'PENDING') as BillStatus,
    ocrConfidence: b.ocrConfidence ?? (b.ocrMetadata?.confidence ?? 75),
    fraudScore: isNaN(fraudScore) ? 0.1 : fraudScore,
    escalationLevel: b.escalationLevel || 'NONE',
    ocrData: b.ocrData || (b.ocrMetadata ? {
      merchant: businessName,
      total: `₹${amount}`,
      date: billDate,
      items: b.ocrMetadata?.lineItems || [],
    } : {
      merchant: businessName,
      total: `₹${amount}`,
      date: billDate,
      items: [],
    }),
    receiptUrl: b.receiptUrl || bill.billImage || '',
    uploadedAt: b.createdAt || new Date().toISOString(),
  };
}

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'PENDING', label: 'Pending', icon: Clock },
  { key: 'FLAGGED', label: 'Flagged', icon: ShieldAlert },
  { key: 'RE_UPLOAD_REQUESTED', label: 'Re-Upload', icon: RefreshCw },
  { key: 'APPROVED', label: 'Approved', icon: CheckCircle2 },
  { key: 'REJECTED', label: 'Rejected', icon: XCircle },
];

const STATUS_CONFIG: Record<BillStatus, { label: string; color: string; bg: string }> = {
  PENDING: { label: 'Pending', color: 'text-warning', bg: 'bg-warning/10' },
  APPROVED: { label: 'Approved', color: 'text-success', bg: 'bg-success/10' },
  REJECTED: { label: 'Rejected', color: 'text-destructive', bg: 'bg-destructive/10' },
  FLAGGED: { label: 'Flagged', color: 'text-warning', bg: 'bg-warning/10' },
  RE_UPLOAD_REQUESTED: { label: 'Re-Upload Requested', color: 'text-info', bg: 'bg-info/10' },
  ESCALATED: { label: 'Escalated', color: 'text-destructive', bg: 'bg-destructive/10' },
};

// ── FRAUD SCORE BADGE ─────────────────────────────────────────────────
// (empty MOCK_BILLS removed — data comes from real API)

function FraudBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  if (pct >= 70) return (
    <span className="flex items-center gap-1 text-destructive font-bold text-sm">
      <ShieldAlert className="h-3.5 w-3.5" /> {pct}% HIGH
    </span>
  );
  if (pct >= 40) return (
    <span className="flex items-center gap-1 text-warning font-semibold text-sm">
      <AlertTriangle className="h-3.5 w-3.5" /> {pct}% MED
    </span>
  );
  return (
    <span className="flex items-center gap-1 text-success font-semibold text-sm">
      <ShieldCheck className="h-3.5 w-3.5" /> {pct}% LOW
    </span>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────

export default function BillModerationPage() {
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<string>('BUSINESS_OWNER');
  const [activeTab, setActiveTab] = useState<TabKey>('PENDING');
  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBill, setSelectedBill] = useState<any | null>(null);
  const [actionModal, setActionModal] = useState<ActionModal>(null);
  const [actionReason, setActionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Brand owners: wider view across all outlets
  const [brandInfo, setBrandInfo] = useState<BrandInfo | null>(null);
  const [brandChecked, setBrandChecked] = useState(false);
  const [outletFilter, setOutletFilter] = useState<string>('ALL');
  const [brandPaging, setBrandPaging] = useState({ total: 0, page: 1 });
  const [loadingMore, setLoadingMore] = useState(false);
  const [moveBill, setMoveBill] = useState<any | null>(null);
  const [moveTarget, setMoveTarget] = useState('');
  const [moveLoading, setMoveLoading] = useState(false);
  const [moveError, setMoveError] = useState('');
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const requestSeq = useRef(0);

  const businessId = user?.businessId || user?.entity?.id || '';
  const isBrandView = !!brandInfo;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiService.get<any>('/v1/brands/mine');
        const info = res.data?.data ?? res.data;
        if (!cancelled && !res.error && info?.brand?.id) setBrandInfo(info as BrandInfo);
      } catch (_) {}
      if (!cancelled) setBrandChecked(true);
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(t);
  }, [notice]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('user_session') || localStorage.getItem('user');
        if (stored) {
          const u = JSON.parse(stored);
          const role = u?.rbacRole || (u?.role === 'business' ? 'BUSINESS_OWNER' : u?.role);
          if (role) setUserRole(role);
        }
      } catch (_) {}
    }
  }, []);

  const fetchBills = async (status?: string, page = 1) => {
    if (!isBrandView && !businessId) return;
    const seq = ++requestSeq.current;
    if (page === 1) setLoading(true); else setLoadingMore(true);
    try {
      let url: string;
      if (isBrandView) {
        const params = new URLSearchParams();
        if (outletFilter !== 'ALL') params.set('outletId', outletFilter);
        if (status) params.set('status', status);
        if (page > 1) params.set('page', String(page));
        const qs = params.toString();
        url = `/v1/brands/${brandInfo!.brand.id}/bill-verifications${qs ? `?${qs}` : ''}`;
      } else {
        url = `/v1/businesses/${businessId}/bill-verifications${status ? `?status=${status}` : ''}`;
      }
      const res = await apiService.get<any>(url);
      if (seq !== requestSeq.current) return;
      if (res.data && !res.error) {
        const mapped = extractList(res.data).map(mapApiBill);
        setBills((prev) => (page > 1 ? [...prev, ...mapped] : mapped));
        if (isBrandView) {
          const body = res.data?.data && !Array.isArray(res.data.data) ? res.data.data : res.data;
          setBrandPaging({ total: Number(body?.total ?? 0), page: Number(body?.page ?? page) });
        }
      }
    } catch (_) {}
    if (seq !== requestSeq.current) return;
    setLoading(false);
    setLoadingMore(false);
  };

  useEffect(() => {
    if (!brandChecked) return;
    fetchBills(activeTab !== 'PENDING' ? activeTab : undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brandChecked, isBrandView, businessId, activeTab, outletFilter]);

  const canVerify = canAccess(userRole, 'business.bills.verify');
  const canOverride = canAccess(userRole, 'business.bills.override');
  const isOwner = hasRole(userRole, 'BUSINESS_OWNER');

  const filteredBills = bills.filter((b) => {
    const matchesTab = b.status === activeTab || (activeTab === 'FLAGGED' && (b.status === 'FLAGGED' || b.status === 'ESCALATED'));
    const matchesSearch = !searchQuery || b.customer.name.toLowerCase().includes(searchQuery.toLowerCase()) || b.billNumber.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const pendingCount = bills.filter((b) => b.status === 'PENDING').length;
  const flaggedCount = bills.filter((b) => b.status === 'FLAGGED' || b.status === 'ESCALATED').length;
  const approvedCount = bills.filter((b) => b.status === 'APPROVED').length;
  const rejectedCount = bills.filter((b) => b.status === 'REJECTED').length;

  const handleAction = async (action: ActionModal) => {
    const actingBusinessId = selectedBill?.businessId || businessId;
    if (!selectedBill || !actingBusinessId) return;
    setActionLoading(true);
    try {
      const base = `/v1/businesses/${actingBusinessId}/bill-verifications/${selectedBill.id}`;
      if (action === 'approve') {
        await apiService.post(`${base}/approve`, { notes: actionReason || '' });
      } else if (action === 'reject') {
        await apiService.post(`${base}/reject`, { reason: actionReason });
      } else if (action === 'reupload') {
        await apiService.post(`${base}/request-reupload`, { reason: actionReason });
      } else if (action === 'flag') {
        await apiService.post(`${base}/flag`, { reason: actionReason });
      } else if (action === 'override') {
        await apiService.post(`${base}/owner-override`, { notes: actionReason || '' });
      }
      // Optimistically remove from current tab list
      setBills((prev) => prev.filter((b) => b.id !== selectedBill.id));
    } catch (_) {}
    setActionLoading(false);
    setSelectedBill(null);
    setActionModal(null);
    setActionReason('');
  };

  const handleMove = async () => {
    if (!moveBill || !moveTarget) return;
    setMoveLoading(true);
    setMoveError('');
    try {
      const res = await apiService.post<any>(`/v1/bill-verifications/${moveBill.id}/reassign-outlet`, { outletId: moveTarget });
      if (res.error) {
        setMoveError(typeof res.error === 'string' ? res.error : "Couldn't move this bill. Please try again.");
      } else {
        const target = brandInfo?.outlets.find((o) => o.id === moveTarget);
        setNotice({ type: 'success', text: `Bill moved to ${target ? outletName(target) : 'the selected outlet'}.` });
        setMoveBill(null);
        setMoveTarget('');
        setSelectedBill(null);
        await fetchBills(activeTab !== 'PENDING' ? activeTab : undefined);
      }
    } catch (err: any) {
      setMoveError(err?.message || "Couldn't move this bill. Please try again.");
    }
    setMoveLoading(false);
  };

  const openMove = (bill: any) => {
    setMoveBill(bill);
    setMoveTarget('');
    setMoveError('');
  };

  return (
    <BusinessLayout>
      <div className="space-y-6 max-w-7xl mx-auto">

        {/* ── PAGE HEADER ────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-primary" />
              Bill Moderation
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {isOwner
                ? 'Review, approve, reject, and override customer bill submissions'
                : 'Review and action customer bill submissions — analytics restricted'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold',
              isOwner ? 'bg-primary/15 text-primary' : 'bg-warning/15 text-warning',
            )}>
              <Shield className="h-3 w-3" />
              {getRoleLabel(userRole)}
            </div>
          </div>
        </div>

        {/* ── STATS ROW ──────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Pending Review', value: loading ? '…' : pendingCount, icon: Clock, color: 'text-warning', bg: 'bg-warning/10' },
            { label: 'Approved', value: loading ? '…' : approvedCount, icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10' },
            { label: 'Rejected', value: loading ? '…' : rejectedCount, icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10' },
            { label: 'Fraud Flagged', value: loading ? '…' : flaggedCount, icon: ShieldAlert, color: 'text-warning', bg: 'bg-warning/10' },
          ].map((stat, i) => (
            <Card
              key={stat.label}
              className="p-4 rounded-2xl border-border bg-card/40 backdrop-blur-xl ui-fade-up"
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-muted-foreground">{stat.label}</span>
                <div className={cn('h-7 w-7 rounded-lg flex items-center justify-center', stat.bg)}>
                  <stat.icon className={cn('h-3.5 w-3.5', stat.color)} />
                </div>
              </div>
              <p className={cn('text-2xl font-bold', stat.color)}>{stat.value}</p>
            </Card>
          ))}
        </div>

        {/* ── TABS + SEARCH ──────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex flex-wrap gap-1 bg-card/40 p-1 rounded-xl border border-border">
            {TABS.map((tab) => {
              const count = tab.key === 'PENDING' ? pendingCount : tab.key === 'FLAGGED' ? flaggedCount : undefined;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer',
                    activeTab === tab.key
                      ? 'bg-primary text-primary-foreground shadow'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary',
                  )}
                >
                  <tab.icon className="h-3.5 w-3.5" />
                  {tab.label}
                  {count !== undefined && count > 0 && (
                    <span className="ml-0.5 h-4 min-w-4 rounded-full bg-destructive text-[9px] font-bold text-white flex items-center justify-center px-1">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search customer or bill #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9 rounded-xl border-border bg-card/40 text-sm"
            />
          </div>
        </div>

        {/* ── OUTLET FILTER (brand owners) ───────────────────── */}
        {isBrandView && (
          <div className="ui-scroll-x">
            <div className="flex gap-2 w-max pb-1">
              {[{ id: 'ALL', label: 'All outlets' }, ...brandInfo!.outlets.map((o) => ({ id: o.id, label: outletName(o) }))].map((chip) => (
                <button
                  key={chip.id}
                  onClick={() => setOutletFilter(chip.id)}
                  className={cn(
                    'ui-press h-10 shrink-0 rounded-full border px-4 text-xs font-medium whitespace-nowrap transition-colors cursor-pointer',
                    outletFilter === chip.id
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-card/40 text-muted-foreground hover:text-foreground hover:bg-secondary',
                  )}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {notice && (
          <div
            className={cn(
              'ui-fade-up flex items-start gap-2 rounded-xl border p-3 text-sm',
              notice.type === 'success' ? 'border-success/20 bg-success/10 text-success' : 'border-destructive/20 bg-destructive/10 text-destructive',
            )}
          >
            {notice.type === 'success' ? <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" /> : <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />}
            <span className="flex-1">{notice.text}</span>
            <button onClick={() => setNotice(null)} className="p-1 -m-1 cursor-pointer" aria-label="Dismiss">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* ── BILL LIST ──────────────────────────────────────── */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredBills.length === 0 ? (
          <Card className="p-12 rounded-2xl border-dashed border-border bg-secondary text-center">
            <CheckCircle2 className="h-10 w-10 text-success mx-auto mb-3 opacity-50" />
            <h3 className="text-base font-semibold text-foreground mb-1">Queue Clear</h3>
            <p className="text-sm text-muted-foreground">No bills in this category.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredBills.map((bill, i) => {
              const statusCfg = STATUS_CONFIG[bill.status as BillStatus];
              const seriesBadge = getSeriesBadge(bill, brandInfo);
              const isDuplicate = bill.status === 'FLAGGED' && /duplicate/i.test(bill.rejectionReason);
              const showMove = isBrandView && brandInfo!.outlets.length > 1 && UNDECIDED.includes(bill.status as BillStatus);
              return (
                <Card
                  key={bill.id}
                  className={cn(
                    'p-5 rounded-2xl border-border bg-card/40 backdrop-blur-xl hover:bg-card/60 transition-all duration-200 ease-out cursor-pointer ui-fade-up hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.99] motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100',
                    selectedBill?.id === bill.id && 'ring-1 ring-primary/50 bg-primary/5',
                    bill.fraudScore >= 0.6 && 'border-l-2 border-l-destructive/50',
                  )}
                  style={{ animationDelay: `${Math.min(i, 8) * 0.05}s` }}
                  onClick={() => setSelectedBill(selectedBill?.id === bill.id ? null : bill)}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    {/* Left: Bill info */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 text-xs font-bold">
                        {bill.customer.avatar}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-foreground text-sm">{bill.customer.name}</h3>
                          <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full', statusCfg.bg, statusCfg.color)}>
                            {statusCfg.label}
                          </span>
                          {bill.escalationLevel !== 'NONE' && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive flex items-center gap-0.5">
                              <ArrowUpRight className="h-3 w-3" />
                              Escalated to {bill.escalationLevel}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1">
                          {isBrandView ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                              <Building2 className="h-3 w-3" />{bill.business}
                            </span>
                          ) : (
                            <span className="inline-flex items-center"><Building2 className="h-3 w-3 mr-1" />{bill.business}</span>
                          )}
                          <span>·</span>
                          <span>Bill # <span className="font-mono text-foreground/80 break-all">{bill.billNumber}</span></span>
                          <span>·</span>
                          <span>{bill.billDate}</span>
                          {seriesBadge && (
                            <span
                              className={cn(
                                'inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                                seriesBadge.matched ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground',
                              )}
                            >
                              {seriesBadge.label}
                            </span>
                          )}
                        </div>
                        {isDuplicate && (
                          <div className="mt-2 flex items-start gap-1.5 rounded-lg border border-warning/20 bg-warning/10 px-2.5 py-1.5 text-xs text-warning">
                            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                            <span><span className="font-semibold">Possible duplicate</span>{bill.rejectionReason ? ` — ${bill.rejectionReason}` : ''}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Metrics + Actions */}
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6 w-full lg:w-auto">
                      {/* Metrics Group */}
                      <div className="grid grid-cols-3 gap-2 lg:flex lg:items-center lg:gap-6 w-full lg:w-auto border-t border-border pt-3 lg:border-t-0 lg:pt-0">
                        <div className="text-center lg:text-left">
                          <p className="text-[10px] text-muted-foreground mb-0.5">Amount</p>
                          <p className="font-bold text-foreground text-sm">₹{bill.amount.toLocaleString('en-IN')}</p>
                        </div>
                        <div className="text-center lg:text-left">
                          <p className="text-[10px] text-muted-foreground mb-0.5">OCR Conf</p>
                          <p className={cn('font-semibold text-sm', bill.ocrConfidence >= 80 ? 'text-success' : bill.ocrConfidence >= 60 ? 'text-warning' : 'text-destructive')}>
                            {bill.ocrConfidence}%
                          </p>
                        </div>
                        <div className="text-center lg:text-left">
                          <p className="text-[10px] text-muted-foreground mb-0.5">Risk Score</p>
                          <FraudBadge score={bill.fraudScore} />
                        </div>
                      </div>

                      {/* Action buttons */}
                      {(showMove || (canVerify && (bill.status === 'PENDING' || bill.status === 'FLAGGED'))) && (
                        <div className="flex flex-wrap lg:flex-nowrap gap-2 w-full lg:w-auto justify-end border-t border-border pt-3 lg:border-t-0 lg:pt-0" onClick={(e) => e.stopPropagation()}>
                          {canVerify && bill.status === 'PENDING' && (<>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => { setSelectedBill(bill); setActionModal('reupload'); }}
                            className="h-10 rounded-xl border-info/20 text-info hover:bg-info/10 text-xs px-3 cursor-pointer flex-1 lg:flex-none"
                          >
                            <RefreshCw className="h-3.5 w-3.5 mr-1" /> Re-upload
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => { setSelectedBill(bill); setActionModal('reject'); }}
                            className="h-10 rounded-xl border-destructive/20 text-destructive hover:bg-destructive/10 text-xs px-3 cursor-pointer flex-1 lg:flex-none"
                          >
                            <X className="h-3.5 w-3.5 mr-1" /> Reject
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => { setSelectedBill(bill); setActionModal('approve'); }}
                            className="h-10 rounded-xl bg-success hover:bg-success text-white text-xs px-3 cursor-pointer flex-1 lg:flex-none"
                          >
                            <Check className="h-3.5 w-3.5 mr-1" /> Approve
                          </Button>
                          </>)}
                          {canVerify && bill.status === 'FLAGGED' && (<>
                          {canOverride && (
                            <Button
                              size="sm"
                              onClick={() => { setSelectedBill(bill); setActionModal('override'); }}
                              className="h-10 rounded-xl bg-primary hover:bg-primary text-white text-xs px-3 cursor-pointer flex-1 lg:flex-none"
                            >
                              <Shield className="h-3.5 w-3.5 mr-1" /> Override
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => { setSelectedBill(bill); setActionModal('reject'); }}
                            className="h-10 rounded-xl border-destructive/20 text-destructive hover:bg-destructive/10 text-xs px-3 cursor-pointer flex-1 lg:flex-none"
                          >
                            <X className="h-3.5 w-3.5 mr-1" /> Reject
                          </Button>
                          </>)}
                          {showMove && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openMove(bill)}
                              className="h-10 rounded-xl border-border text-foreground hover:bg-secondary text-xs px-3 cursor-pointer w-full lg:w-auto"
                            >
                              <ArrowRightLeft className="h-3.5 w-3.5 mr-1" /> Move to another outlet
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ── EXPANDED DETAIL PANEL ───────────────── */}
                  {selectedBill?.id === bill.id && (
                    <div className="mt-5 pt-5 border-t border-border grid md:grid-cols-2 gap-6">
                      {/* Receipt Image */}
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                          Uploaded Receipt
                        </h4>
                        <div className="h-56 rounded-xl overflow-hidden border border-border bg-black">
                          <img
                            src={bill.receiptUrl}
                            alt="Receipt"
                            className="w-full h-full object-contain"
                          />
                        </div>
                      </div>

                      {/* OCR & Fraud Data */}
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                            OCR Extraction
                          </h4>
                          <div className="rounded-xl border border-border bg-secondary p-3 space-y-1.5">
                            <p className="text-xs"><span className="text-muted-foreground">Merchant: </span><span className="text-foreground font-medium">{bill.ocrData.merchant}</span></p>
                            <p className="text-xs"><span className="text-muted-foreground">Total: </span><span className="text-foreground font-bold">{bill.ocrData.total}</span></p>
                            <p className="text-xs"><span className="text-muted-foreground">Date: </span><span className="text-foreground">{bill.ocrData.date}</span></p>
                            <div className="pt-1.5 border-t border-border">
                              <p className="text-[10px] text-muted-foreground mb-1">Line Items:</p>
                              {(bill.ocrData.items as string[]).map((item: string, i: number) => (
                                <p key={i} className="text-xs text-foreground/80">• {item}</p>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div>
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                            Fraud Analysis
                          </h4>
                          <div className={cn('rounded-xl border p-3', bill.fraudScore >= 0.7 ? 'border-destructive/20 bg-destructive/5' : bill.fraudScore >= 0.4 ? 'border-warning/20 bg-warning/5' : 'border-success/20 bg-success/5')}>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs text-muted-foreground">Overall Risk Score</span>
                              <FraudBadge score={bill.fraudScore} />
                            </div>
                            <div className="w-full bg-secondary rounded-full h-1.5">
                              <div
                                className={cn('h-1.5 rounded-full transition-all', bill.fraudScore >= 0.7 ? 'bg-destructive' : bill.fraudScore >= 0.4 ? 'bg-warning' : 'bg-success')}
                                style={{ width: `${bill.fraudScore * 100}%` }}
                              />
                            </div>
                            {bill.fraudScore >= 0.6 && (
                              <p className="text-[10px] text-destructive mt-2 flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                High risk — manual review recommended
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Customer info */}
                        <div>
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Customer</h4>
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                              {bill.customer.avatar}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground">{bill.customer.name}</p>
                              <p className="text-xs text-muted-foreground">{bill.customer.email}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        {isBrandView && !loading && bills.length < brandPaging.total && (
          <div className="flex justify-center">
            <Button
              variant="outline"
              disabled={loadingMore}
              onClick={() => fetchBills(activeTab !== 'PENDING' ? activeTab : undefined, brandPaging.page + 1)}
              className="h-10 rounded-xl border-border text-sm cursor-pointer"
            >
              {loadingMore && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Load more
            </Button>
          </div>
        )}

        {/* ── MOVE TO OUTLET MODAL ──────────────────────────── */}
        {moveBill && brandInfo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <Card className="w-full max-w-sm p-6 rounded-2xl border-border bg-card shadow-2xl max-h-[90vh] overflow-y-auto ui-pop">
              <div className="mx-auto h-12 w-12 rounded-full flex items-center justify-center mb-4 bg-primary/10 text-primary">
                <ArrowRightLeft className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-foreground text-center mb-1">Move to another outlet</h3>
              <p className="text-xs text-muted-foreground text-center mb-4">
                {moveBill.customer.name} • {moveBill.billNumber} • currently at {moveBill.business}
              </p>

              <div className="space-y-2 mb-4">
                {brandInfo.outlets.filter((o) => o.id !== moveBill.businessId).map((o) => (
                  <button
                    key={o.id}
                    onClick={() => setMoveTarget(o.id)}
                    className={cn(
                      'ui-press w-full min-h-11 flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-sm transition-colors cursor-pointer',
                      moveTarget === o.id ? 'border-primary bg-primary/10 text-foreground' : 'border-border bg-card/40 text-foreground hover:bg-secondary',
                    )}
                  >
                    <span className="min-w-0 truncate">{outletName(o)}</span>
                    {moveTarget === o.id && <Check className="h-4 w-4 text-primary shrink-0" />}
                  </button>
                ))}
              </div>

              {moveError && (
                <div className="flex items-start gap-2 p-3 mb-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  {moveError}
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  disabled={moveLoading}
                  onClick={() => { setMoveBill(null); setMoveError(''); }}
                  className="h-10 rounded-xl border-border text-foreground hover:bg-muted text-sm cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleMove}
                  disabled={!moveTarget || moveLoading}
                  className="h-10 rounded-xl text-sm font-semibold cursor-pointer"
                >
                  {moveLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Move bill
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* ── ACTION MODAL ──────────────────────────────────── */}
        {actionModal && selectedBill && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <Card className="w-full max-w-sm p-6 rounded-2xl border-border bg-card shadow-2xl max-h-[90vh] overflow-y-auto ui-pop">
              <div className={cn(
                'mx-auto h-12 w-12 rounded-full flex items-center justify-center mb-4',
                actionModal === 'approve' || actionModal === 'override' ? 'bg-success/10 text-success'
                  : actionModal === 'reject' ? 'bg-destructive/10 text-destructive'
                  : actionModal === 'reupload' ? 'bg-info/10 text-info'
                  : 'bg-warning/10 text-warning',
              )}>
                {actionModal === 'approve' && <Check className="h-6 w-6" />}
                {actionModal === 'override' && <Shield className="h-6 w-6" />}
                {actionModal === 'reject' && <X className="h-6 w-6" />}
                {actionModal === 'reupload' && <RefreshCw className="h-6 w-6" />}
                {actionModal === 'flag' && <Flag className="h-6 w-6" />}
              </div>

              <h3 className="text-base font-bold text-foreground text-center mb-1">
                {actionModal === 'approve' && 'Approve Bill'}
                {actionModal === 'override' && 'Owner Override — Approve'}
                {actionModal === 'reject' && 'Reject Bill'}
                {actionModal === 'reupload' && 'Request Re-Upload'}
                {actionModal === 'flag' && 'Flag for Escalation'}
              </h3>
              <p className="text-xs text-muted-foreground text-center mb-4">
                {selectedBill.customer.name} • {selectedBill.billNumber} • ₹{selectedBill.amount.toLocaleString('en-IN')}
              </p>

              {actionModal !== 'approve' && (
                <Textarea
                  placeholder={
                    actionModal === 'reject' ? 'Reason for rejection...'
                      : actionModal === 'reupload' ? 'What needs to be corrected?'
                      : actionModal === 'override' ? 'Override reason (optional)...'
                      : 'Escalation reason...'
                  }
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  className="mb-4 rounded-xl border-input bg-background text-sm resize-none h-20"
                />
              )}

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => { setActionModal(null); setActionReason(''); }}
                  className="rounded-xl border-border text-foreground hover:bg-muted text-sm cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleAction(actionModal)}
                  disabled={actionLoading}
                  className={cn(
                    'rounded-xl text-sm font-semibold cursor-pointer',
                    actionModal === 'approve' || actionModal === 'override' ? 'bg-success hover:bg-success text-white'
                      : actionModal === 'reject' ? 'bg-destructive hover:bg-destructive text-white'
                      : actionModal === 'reupload' ? 'bg-info hover:bg-info text-white'
                      : 'bg-warning hover:bg-warning text-white',
                  )}
                >
                  Confirm
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </BusinessLayout>
  );
}
