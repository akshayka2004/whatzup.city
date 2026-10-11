'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRightLeft,
  ArrowUpRight,
  Building2,
  Check,
  CheckCircle2,
  Clock,
  Flag,
  Keyboard,
  ReceiptText,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  X,
  XCircle,
} from 'lucide-react';
import { BusinessLayout } from '@/components/layouts/business-layout';
import { PageHeader } from '@/components/system/page-header';
import { FilterChip, ChipRow } from '@/components/system/filter-chip';
import { SearchInput } from '@/components/system/toolbar';
import { Modal } from '@/components/system/modal';
import { StatusPill, type PillTone } from '@/components/common/status-pill';
import { EmptyState } from '@/components/common/empty-state';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';
import { canAccess, hasRole, getRoleLabel } from '@/lib/rbac';
import { apiService } from '@/lib/services/api-service';
import { useAuth } from '@/hooks/use-auth';

// ── TYPES ─────────────────────────────────────────────────────────────

type BillStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'FLAGGED'
  | 'RE_UPLOAD_REQUESTED'
  | 'ESCALATED';
type TabKey = 'PENDING' | 'APPROVED' | 'REJECTED' | 'FLAGGED' | 'RE_UPLOAD_REQUESTED';
type Action = 'approve' | 'reject' | 'reupload' | 'flag' | 'override';

type BrandInfo = {
  brand: { id: string; name: string; billSeriesMode?: string; billSeriesPrefix?: string | null };
  outlets: {
    id: string;
    name: string;
    outletLabel?: string | null;
    status?: string;
    isBrandHq?: boolean;
  }[];
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
function getSeriesBadge(
  bill: any,
  brand: BrandInfo | null,
): { matched: boolean; label: string } | null {
  if (bill.seriesMatched) {
    return {
      matched: true,
      label: bill.seriesScope === 'SHARED' ? 'Brand series matched' : 'Series matched',
    };
  }
  if (bill.seriesScope === 'SHARED' && brand?.brand.billSeriesPrefix)
    return { matched: false, label: 'Series not matched' };
  if (bill.seriesScope !== 'SHARED' && bill.seriesPrefix)
    return { matched: false, label: 'Series not matched' };
  return null;
}

function mapApiBill(b: any) {
  // API returns BillVerification with nested `bill` containing Bill + User + Business
  const bill = b.bill || {};
  const customerName =
    b.customer?.name || b.user?.name || bill.user?.name || b.customerName || 'Customer';
  const customerEmail =
    b.customer?.email || b.user?.email || bill.user?.email || b.customerEmail || '';
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
    billNumber:
      bill.billNumber ||
      b.billNumber ||
      b.ocrMetadata?.parsed?.invoiceNumber ||
      b.id.substring(0, 8).toUpperCase(),
    seriesMatched: !!b.seriesMatched,
    seriesScope: (b.seriesScope || 'SINGLE') as string,
    seriesPrefix: (b.seriesPrefix ||
      bill.business?.billSeriesPrefix ||
      b.billSeriesPrefix ||
      '') as string,
    rejectionReason: (b.rejectionReason || '') as string,
    status: (b.status || 'PENDING') as BillStatus,
    ocrConfidence: b.ocrConfidence ?? b.ocrMetadata?.confidence ?? 75,
    fraudScore: isNaN(fraudScore) ? 0.1 : fraudScore,
    escalationLevel: b.escalationLevel || 'NONE',
    ocrData: b.ocrData || {
      merchant: businessName,
      total: `₹${amount}`,
      date: billDate,
      items: b.ocrMetadata?.lineItems || [],
    },
    receiptUrl: b.receiptUrl || bill.billImage || '',
    uploadedAt: b.createdAt || new Date().toISOString(),
  };
}

type Bill = ReturnType<typeof mapApiBill>;

const TABS: { key: TabKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'PENDING', label: 'Pending', icon: Clock },
  { key: 'FLAGGED', label: 'Flagged', icon: ShieldAlert },
  { key: 'RE_UPLOAD_REQUESTED', label: 'Re-upload', icon: RefreshCw },
  { key: 'APPROVED', label: 'Approved', icon: CheckCircle2 },
  { key: 'REJECTED', label: 'Rejected', icon: XCircle },
];

const STATUS_PILL: Record<BillStatus, { label: string; tone: PillTone }> = {
  PENDING: { label: 'Pending', tone: 'warning' },
  APPROVED: { label: 'Approved', tone: 'success' },
  REJECTED: { label: 'Rejected', tone: 'danger' },
  FLAGGED: { label: 'Flagged', tone: 'warning' },
  RE_UPLOAD_REQUESTED: { label: 'Re-upload requested', tone: 'info' },
  ESCALATED: { label: 'Escalated', tone: 'danger' },
};

const ACTION_META: Record<
  Action,
  {
    title: string;
    icon: React.ComponentType<{ className?: string }>;
    tone: string;
    button: 'primary' | 'destructive' | 'outline';
    placeholder?: string;
    templates?: string[];
    needsReason?: boolean;
  }
> = {
  approve: {
    title: 'Approve bill',
    icon: Check,
    tone: 'bg-success-soft text-success-soft-foreground',
    button: 'primary',
    placeholder: 'Note (optional)',
  },
  override: {
    title: 'Owner override — approve',
    icon: Shield,
    tone: 'bg-success-soft text-success-soft-foreground',
    button: 'primary',
    placeholder: 'Override reason (optional)',
  },
  reject: {
    title: 'Reject bill',
    icon: X,
    tone: 'bg-danger-soft text-danger-soft-foreground',
    button: 'destructive',
    placeholder: 'Reason for rejection…',
    needsReason: true,
    templates: [
      'Bill is from another business',
      "Amount doesn't match the bill",
      'Duplicate submission',
      'Bill is older than allowed',
    ],
  },
  reupload: {
    title: 'Request re-upload',
    icon: RefreshCw,
    tone: 'bg-info-soft text-info-soft-foreground',
    button: 'outline',
    placeholder: 'What needs to be corrected?',
    needsReason: true,
    templates: [
      'Photo is blurry — please retake',
      'Total amount is not visible',
      'Bill number is cut off',
      'Please upload the full bill',
    ],
  },
  flag: {
    title: 'Flag for escalation',
    icon: Flag,
    tone: 'bg-warning-soft text-warning-soft-foreground',
    button: 'outline',
    placeholder: 'Escalation reason…',
    needsReason: true,
  },
};

const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;

function riskTone(score: number): PillTone {
  return score >= 0.7 ? 'danger' : score >= 0.4 ? 'warning' : 'success';
}

function RiskPill({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const tone = riskTone(score);
  return (
    <StatusPill
      tone={tone}
      label={`${pct}% ${tone === 'danger' ? 'high' : tone === 'warning' ? 'medium' : 'low'} risk`}
    />
  );
}

function useMinWidth(px: number) {
  const [match, setMatch] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${px}px)`);
    const on = () => setMatch(mql.matches);
    on();
    mql.addEventListener('change', on);
    return () => mql.removeEventListener('change', on);
  }, [px]);
  return match;
}

const isTyping = (el: EventTarget | null) => {
  const t = el as HTMLElement | null;
  if (!t) return false;
  return (
    t.isContentEditable ||
    ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName) ||
    !!t.closest('[role="dialog"]')
  );
};

// ── BILL PREVIEW ──────────────────────────────────────────────────────

function BillPreview({
  bill,
  brandInfo,
  canVerify,
  canOverride,
  showMove,
  onAction,
  onMove,
}: {
  bill: Bill;
  brandInfo: BrandInfo | null;
  canVerify: boolean;
  canOverride: boolean;
  showMove: boolean;
  onAction: (a: Action) => void;
  onMove: () => void;
}) {
  const seriesBadge = getSeriesBadge(bill, brandInfo);
  const isDuplicate = bill.status === 'FLAGGED' && /duplicate/i.test(bill.rejectionReason);
  const items = (bill.ocrData.items ?? []) as string[];

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-title font-semibold tabular-nums">{inr(bill.amount)}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {bill.customer.name}
            {bill.customer.email ? ` · ${bill.customer.email}` : ''}
          </p>
        </div>
        <StatusPill tone={STATUS_PILL[bill.status].tone} label={STATUS_PILL[bill.status].label} />
      </div>

      <div className="flex flex-wrap gap-1.5">
        <StatusPill tone="neutral" label={`Bill # ${bill.billNumber}`} />
        {bill.billDate && <StatusPill tone="neutral" label={bill.billDate} />}
        <StatusPill tone={brandInfo ? 'primary' : 'neutral'} label={bill.business || 'Business'} />
        {seriesBadge && (
          <StatusPill
            tone={seriesBadge.matched ? 'success' : 'neutral'}
            label={seriesBadge.label}
          />
        )}
        {bill.escalationLevel !== 'NONE' && (
          <StatusPill tone="danger" label={`Escalated to ${bill.escalationLevel}`} />
        )}
      </div>

      {isDuplicate && (
        <div className="flex items-start gap-2 rounded-xl bg-warning-soft p-3 text-sm text-warning-soft-foreground">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            <span className="font-semibold">Possible duplicate</span>
            {bill.rejectionReason ? ` — ${bill.rejectionReason}` : ''}
          </span>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-surface-sunken">
        {bill.receiptUrl ? (
          <a href={bill.receiptUrl} target="_blank" rel="noreferrer" title="Open full size">
            {/* eslint-disable-next-line @next/next/no-img-element -- receipts come from arbitrary upload hosts */}
            <img
              src={bill.receiptUrl}
              alt={`Receipt ${bill.billNumber}`}
              className="h-72 w-full object-contain"
            />
          </a>
        ) : (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
            No receipt image
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <h4 className="text-overline text-muted-foreground">Read from the bill</h4>
          <dl className="mt-2 space-y-1.5 rounded-xl border border-border p-3 text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Merchant</dt>
              <dd className="truncate font-medium">{bill.ocrData.merchant || '—'}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Total</dt>
              <dd className="font-semibold tabular-nums">{bill.ocrData.total || '—'}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Date</dt>
              <dd>{bill.ocrData.date || '—'}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Read confidence</dt>
              <dd
                className={cn(
                  'font-semibold',
                  bill.ocrConfidence >= 80
                    ? 'text-success-soft-foreground'
                    : bill.ocrConfidence >= 60
                      ? 'text-warning-soft-foreground'
                      : 'text-destructive',
                )}
              >
                {bill.ocrConfidence}%
              </dd>
            </div>
            {items.length > 0 && (
              <ul className="space-y-0.5 border-t border-border pt-2 text-caption text-muted-foreground">
                {items.slice(0, 8).map((it, i) => (
                  <li key={i} className="truncate">
                    {String(it)}
                  </li>
                ))}
              </ul>
            )}
          </dl>
        </div>
        <div>
          <h4 className="text-overline text-muted-foreground">Fraud check</h4>
          <div className="mt-2 space-y-2 rounded-xl border border-border p-3">
            <RiskPill score={bill.fraudScore} />
            <div className="h-1.5 w-full rounded-full bg-secondary" role="presentation">
              <div
                className={cn(
                  'h-1.5 rounded-full',
                  bill.fraudScore >= 0.7
                    ? 'bg-destructive'
                    : bill.fraudScore >= 0.4
                      ? 'bg-warning'
                      : 'bg-success',
                )}
                style={{ width: `${Math.min(100, bill.fraudScore * 100)}%` }}
              />
            </div>
            {bill.fraudScore >= 0.6 && (
              <p className="text-caption text-destructive">
                High risk — check the photo carefully.
              </p>
            )}
          </div>
        </div>
      </div>

      {(showMove ||
        (canVerify &&
          (bill.status === 'PENDING' ||
            bill.status === 'FLAGGED' ||
            bill.status === 'ESCALATED'))) && (
        <div className="flex flex-wrap gap-2 border-t border-border pt-4">
          {canVerify && bill.status === 'PENDING' && (
            <>
              <Button
                onClick={() => onAction('approve')}
                className="bg-success text-success-foreground hover:bg-success/90"
              >
                <Check /> Approve{' '}
                <kbd className="ml-1 hidden rounded bg-white/20 px-1 text-caption lg:inline">A</kbd>
              </Button>
              <Button variant="danger" onClick={() => onAction('reject')}>
                <X /> Reject{' '}
                <kbd className="ml-1 hidden rounded bg-black/5 px-1 text-caption lg:inline">R</kbd>
              </Button>
              <Button variant="outline" onClick={() => onAction('reupload')}>
                <RefreshCw /> Ask to re-upload{' '}
                <kbd className="ml-1 hidden rounded bg-secondary px-1 text-caption lg:inline">
                  U
                </kbd>
              </Button>
              <Button variant="ghost" onClick={() => onAction('flag')}>
                <Flag /> Flag
              </Button>
            </>
          )}
          {canVerify && (bill.status === 'FLAGGED' || bill.status === 'ESCALATED') && (
            <>
              {canOverride && (
                <Button onClick={() => onAction('override')}>
                  <Shield /> Override &amp; approve
                </Button>
              )}
              <Button variant="danger" onClick={() => onAction('reject')}>
                <X /> Reject
              </Button>
            </>
          )}
          {showMove && (
            <Button variant="outline" onClick={onMove}>
              <ArrowRightLeft /> Move to another outlet
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────

export default function BillModerationPage() {
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<string>('BUSINESS_OWNER');
  const [activeTab, setActiveTab] = useState<TabKey>('PENDING');
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [actionModal, setActionModal] = useState<Action | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isDesktop = useMinWidth(1024);

  // Brand owners: wider view across all outlets
  const [brandInfo, setBrandInfo] = useState<BrandInfo | null>(null);
  const [brandChecked, setBrandChecked] = useState(false);
  const [outletFilter, setOutletFilter] = useState<string>('ALL');
  const [brandPaging, setBrandPaging] = useState({ total: 0, page: 1 });
  const [loadingMore, setLoadingMore] = useState(false);
  const [moveBill, setMoveBill] = useState<Bill | null>(null);
  const [moveTarget, setMoveTarget] = useState('');
  const [moveLoading, setMoveLoading] = useState(false);
  const [moveError, setMoveError] = useState('');
  const requestSeq = useRef(0);
  const rowRefs = useRef(new Map<string, HTMLButtonElement>());

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
    return () => {
      cancelled = true;
    };
  }, []);

  // Permissions follow the signed-in user (a stale localStorage copy once hid every action).
  useEffect(() => {
    if (!user) return;
    const legacy: Record<string, string> = {
      business: 'BUSINESS_OWNER',
      'super-admin': 'SUPER_ADMIN',
      admin: 'MASTER_ADMIN',
    };
    const role = user.rbacRole || legacy[user.role] || user.role;
    if (role) setUserRole(role);
  }, [user]);

  const fetchBills = async (status?: string, page = 1) => {
    if (!isBrandView && !businessId) return;
    const seq = ++requestSeq.current;
    if (page === 1) setLoading(true);
    else setLoadingMore(true);
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
    setChecked(new Set());
    fetchBills(activeTab !== 'PENDING' ? activeTab : undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brandChecked, isBrandView, businessId, activeTab, outletFilter]);

  const canVerify = canAccess(userRole, 'business.bills.verify');
  const canOverride = canAccess(userRole, 'business.bills.override');
  const isOwner = hasRole(userRole, 'BUSINESS_OWNER');

  const filteredBills = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return bills.filter((b) => {
      const matchesTab =
        b.status === activeTab ||
        (activeTab === 'FLAGGED' && (b.status === 'FLAGGED' || b.status === 'ESCALATED'));
      const matchesSearch =
        !q || b.customer.name.toLowerCase().includes(q) || b.billNumber.toLowerCase().includes(q);
      return matchesTab && matchesSearch;
    });
  }, [bills, activeTab, searchQuery]);

  const counts = useMemo(
    () => ({
      PENDING: bills.filter((b) => b.status === 'PENDING').length,
      FLAGGED: bills.filter((b) => b.status === 'FLAGGED' || b.status === 'ESCALATED').length,
    }),
    [bills],
  );

  const selectedBill = filteredBills.find((b) => b.id === selectedId) ?? null;

  // Desktop always has something in the preview pane.
  useEffect(() => {
    if (!isDesktop) return;
    if (!selectedBill && filteredBills.length) setSelectedId(filteredBills[0].id);
  }, [isDesktop, selectedBill, filteredBills]);

  const select = useCallback(
    (id: string) => {
      setSelectedId(id);
      if (!isDesktop) setMobileOpen(true);
      rowRefs.current.get(id)?.scrollIntoView({ block: 'nearest' });
    },
    [isDesktop],
  );

  const showMoveFor = (b: Bill | null) =>
    !!b && isBrandView && brandInfo!.outlets.length > 1 && UNDECIDED.includes(b.status);

  const openAction = (a: Action) => {
    if (!selectedBill || !canVerify) return;
    if (a === 'override' && !canOverride) return;
    setActionReason('');
    setActionModal(a);
  };

  const postAction = async (bill: Bill, action: Action, reason: string) => {
    const actingBusinessId = bill.businessId || businessId;
    if (!actingBusinessId) return 'No business selected';
    const base = `/v1/businesses/${actingBusinessId}/bill-verifications/${bill.id}`;
    const path = {
      approve: 'approve',
      reject: 'reject',
      reupload: 'request-reupload',
      flag: 'flag',
      override: 'owner-override',
    }[action];
    const body = action === 'approve' || action === 'override' ? { notes: reason } : { reason };
    const res = await apiService.post(`${base}/${path}`, body);
    return res.error ? (typeof res.error === 'string' ? res.error : 'Something went wrong') : null;
  };

  const removeAndAdvance = (ids: string[]) => {
    const idx = filteredBills.findIndex((b) => b.id === selectedId);
    const remaining = filteredBills.filter((b) => !ids.includes(b.id));
    setBills((prev) => prev.filter((b) => !ids.includes(b.id)));
    setChecked((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.delete(id));
      return next;
    });
    const next = remaining[Math.min(Math.max(idx, 0), remaining.length - 1)];
    setSelectedId(next?.id ?? null);
    if (!next) setMobileOpen(false);
  };

  const handleAction = async () => {
    if (!selectedBill || !actionModal) return;
    const meta = ACTION_META[actionModal];
    if (meta.needsReason && !actionReason.trim()) {
      toast.error('Add a short reason so the customer knows what to do.');
      return;
    }
    setActionLoading(true);
    const err = await postAction(selectedBill, actionModal, actionReason.trim());
    setActionLoading(false);
    if (err) {
      toast.error(err);
      return;
    }
    const done = {
      approve: 'Bill approved',
      override: 'Bill approved by override',
      reject: 'Bill rejected',
      reupload: 'Re-upload requested',
      flag: 'Bill flagged',
    }[actionModal];
    toast.success(`${done} · ${selectedBill.customer.name}`);
    setActionModal(null);
    setActionReason('');
    removeAndAdvance([selectedBill.id]);
  };

  const bulkApprove = async () => {
    const targets = filteredBills.filter((b) => checked.has(b.id) && b.status === 'PENDING');
    if (!targets.length) return;
    setBulkBusy(true);
    const ok: string[] = [];
    let failed = 0;
    for (const b of targets) {
      const err = await postAction(b, 'approve', '');
      if (err) failed++;
      else ok.push(b.id);
    }
    setBulkBusy(false);
    if (ok.length) removeAndAdvance(ok);
    if (failed)
      toast.error(`${ok.length} approved, ${failed} failed. Try the failed ones one by one.`);
    else toast.success(`${ok.length} bill${ok.length === 1 ? '' : 's'} approved`);
  };

  const handleMove = async () => {
    if (!moveBill || !moveTarget) return;
    setMoveLoading(true);
    setMoveError('');
    try {
      const res = await apiService.post<any>(
        `/v1/bill-verifications/${moveBill.id}/reassign-outlet`,
        { outletId: moveTarget },
      );
      if (res.error) {
        setMoveError(
          typeof res.error === 'string' ? res.error : "Couldn't move this bill. Please try again.",
        );
      } else {
        const target = brandInfo?.outlets.find((o) => o.id === moveTarget);
        toast.success(`Bill moved to ${target ? outletName(target) : 'the selected outlet'}`);
        setMoveBill(null);
        setMoveTarget('');
        setSelectedId(null);
        await fetchBills(activeTab !== 'PENDING' ? activeTab : undefined);
      }
    } catch (err: any) {
      setMoveError(err?.message || "Couldn't move this bill. Please try again.");
    }
    setMoveLoading(false);
  };

  // ── Keyboard: J/K move, A approve, R reject, U re-upload, X tick ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target) || actionModal || moveBill)
        return;
      const k = e.key.toLowerCase();
      const idx = filteredBills.findIndex((b) => b.id === selectedId);
      if (k === 'j' || k === 'arrowdown') {
        const n = filteredBills[Math.min(idx + 1, filteredBills.length - 1)];
        if (n) {
          e.preventDefault();
          select(n.id);
        }
      } else if (k === 'k' || k === 'arrowup') {
        const n = filteredBills[Math.max(idx - 1, 0)];
        if (n) {
          e.preventDefault();
          select(n.id);
        }
      } else if (k === 'x' && selectedBill?.status === 'PENDING') {
        setChecked((prev) => {
          const next = new Set(prev);
          if (next.has(selectedBill.id)) next.delete(selectedBill.id);
          else next.add(selectedBill.id);
          return next;
        });
      } else if (selectedBill?.status === 'PENDING' && (k === 'a' || k === 'r' || k === 'u')) {
        e.preventDefault();
        openAction(k === 'a' ? 'approve' : k === 'r' ? 'reject' : 'reupload');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredBills, selectedId, selectedBill, actionModal, moveBill, select]);

  const pendingVisible = filteredBills.filter((b) => b.status === 'PENDING');
  const allChecked = pendingVisible.length > 0 && pendingVisible.every((b) => checked.has(b.id));
  const checkedCount = pendingVisible.filter((b) => checked.has(b.id)).length;
  const bulkEnabled = canVerify && activeTab === 'PENDING' && pendingVisible.length > 1;

  const preview = selectedBill ? (
    <BillPreview
      bill={selectedBill}
      brandInfo={brandInfo}
      canVerify={canVerify}
      canOverride={canOverride}
      showMove={showMoveFor(selectedBill)}
      onAction={openAction}
      onMove={() => {
        setMoveBill(selectedBill);
        setMoveTarget('');
        setMoveError('');
      }}
    />
  ) : null;

  const meta = actionModal ? ACTION_META[actionModal] : null;

  return (
    <BusinessLayout>
      <div className="mx-auto max-w-7xl">
        <PageHeader
          title="Bill queue"
          description={
            isOwner
              ? 'Check customer bills before they earn rewards.'
              : 'Check customer bills before they earn rewards. Analytics stay with the owner.'
          }
          meta={
            <StatusPill tone={isOwner ? 'primary' : 'warning'} label={getRoleLabel(userRole)} />
          }
          actions={
            <span className="hidden items-center gap-1.5 text-caption text-muted-foreground lg:inline-flex">
              <Keyboard className="size-4" aria-hidden /> J/K move · A approve · R reject · U
              re-upload · X select
            </span>
          }
        />

        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <ChipRow label="Status">
            {TABS.map((t) => (
              <FilterChip
                key={t.key}
                icon={t.icon}
                selected={activeTab === t.key}
                count={
                  t.key === 'PENDING' || t.key === 'FLAGGED'
                    ? counts[t.key] || undefined
                    : undefined
                }
                onClick={() => {
                  setActiveTab(t.key);
                  setSelectedId(null);
                }}
              >
                {t.label}
              </FilterChip>
            ))}
          </ChipRow>
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search customer or bill #"
          />
        </div>

        {isBrandView && (
          <ChipRow label="Outlet" className="mb-4">
            {[
              { id: 'ALL', label: 'All outlets' },
              ...brandInfo!.outlets.map((o) => ({ id: o.id, label: outletName(o) })),
            ].map((chip) => (
              <FilterChip
                key={chip.id}
                icon={chip.id === 'ALL' ? undefined : Building2}
                selected={outletFilter === chip.id}
                onClick={() => setOutletFilter(chip.id)}
              >
                {chip.label}
              </FilterChip>
            ))}
          </ChipRow>
        )}

        {loading ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="ui-skeleton h-[4.5rem] rounded-card" />
              ))}
            </div>
            <div className="ui-skeleton hidden h-[32rem] rounded-card lg:block" />
          </div>
        ) : filteredBills.length === 0 ? (
          <EmptyState
            icon={activeTab === 'PENDING' ? CheckCircle2 : ReceiptText}
            title={
              searchQuery
                ? 'No matching bills'
                : activeTab === 'PENDING'
                  ? 'Queue clear'
                  : 'Nothing here'
            }
            description={
              searchQuery
                ? 'Try a different name or bill number.'
                : activeTab === 'PENDING'
                  ? 'New bills from customers show up here.'
                  : 'No bills with this status.'
            }
          />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
            {/* ── LIST ── */}
            <div className="min-w-0">
              {bulkEnabled && (
                <div className="mb-2 flex min-h-11 items-center justify-between gap-3 rounded-control border border-border bg-card px-3 py-1.5">
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <Checkbox
                      checked={allChecked ? true : checkedCount ? 'indeterminate' : false}
                      onCheckedChange={(v) =>
                        setChecked(v ? new Set(pendingVisible.map((b) => b.id)) : new Set())
                      }
                      aria-label="Select all pending bills"
                    />
                    {checkedCount ? `${checkedCount} selected` : 'Select all'}
                  </label>
                  {checkedCount > 0 && (
                    <Button
                      size="sm"
                      loading={bulkBusy}
                      onClick={bulkApprove}
                      className="bg-success text-success-foreground hover:bg-success/90"
                    >
                      <Check /> Approve {checkedCount}
                    </Button>
                  )}
                </div>
              )}
              <ul className="space-y-2" aria-label="Bills">
                {filteredBills.map((bill) => {
                  const active = bill.id === selectedId;
                  const pill = STATUS_PILL[bill.status];
                  return (
                    <li key={bill.id} className="flex items-stretch gap-2">
                      {bulkEnabled && (
                        <div className="flex items-center pl-1">
                          <Checkbox
                            checked={checked.has(bill.id)}
                            onCheckedChange={(v) =>
                              setChecked((prev) => {
                                const next = new Set(prev);
                                if (v) next.add(bill.id);
                                else next.delete(bill.id);
                                return next;
                              })
                            }
                            aria-label={`Select bill from ${bill.customer.name}`}
                          />
                        </div>
                      )}
                      <button
                        type="button"
                        ref={(el) => {
                          if (el) rowRefs.current.set(bill.id, el);
                          else rowRefs.current.delete(bill.id);
                        }}
                        onClick={() => select(bill.id)}
                        aria-current={active ? 'true' : undefined}
                        className={cn(
                          'ui-press flex min-w-0 flex-1 items-center gap-3 rounded-card border bg-card p-3 text-left shadow-e1 transition-colors',
                          active
                            ? 'border-primary ring-2 ring-primary/20'
                            : 'border-border hover:bg-secondary',
                          bill.fraudScore >= 0.6 && 'border-l-4 border-l-destructive',
                        )}
                      >
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-caption font-bold text-brand-soft-foreground">
                          {bill.customer.avatar}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="truncate text-sm font-semibold">
                              {bill.customer.name}
                            </span>
                            {bill.escalationLevel !== 'NONE' && (
                              <ArrowUpRight
                                className="size-4 shrink-0 text-destructive"
                                aria-label="Escalated"
                              />
                            )}
                          </span>
                          <span className="block truncate text-caption text-muted-foreground">
                            {isBrandView ? `${bill.business} · ` : ''}#{bill.billNumber}
                            {bill.billDate ? ` · ${bill.billDate}` : ''}
                          </span>
                        </span>
                        <span className="flex shrink-0 flex-col items-end gap-1">
                          <span className="text-sm font-semibold tabular-nums">
                            {inr(bill.amount)}
                          </span>
                          {bill.status === 'PENDING' ? (
                            bill.fraudScore >= 0.4 ? (
                              <StatusPill
                                tone={riskTone(bill.fraudScore)}
                                label={`${Math.round(bill.fraudScore * 100)}% risk`}
                              />
                            ) : (
                              <ShieldCheck
                                className="size-4 text-success-soft-foreground"
                                aria-label="Low risk"
                              />
                            )
                          ) : (
                            <StatusPill tone={pill.tone} label={pill.label} />
                          )}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>

              {isBrandView && bills.length < brandPaging.total && (
                <div className="mt-4 flex justify-center">
                  <Button
                    variant="outline"
                    loading={loadingMore}
                    onClick={() =>
                      fetchBills(
                        activeTab !== 'PENDING' ? activeTab : undefined,
                        brandPaging.page + 1,
                      )
                    }
                  >
                    Load more
                  </Button>
                </div>
              )}
            </div>

            {/* ── PREVIEW (desktop) ── */}
            <aside className="hidden lg:block" aria-label="Selected bill">
              <div className="sticky top-6 max-h-[calc(100dvh-3rem)] overflow-y-auto rounded-card border border-border bg-card p-5 shadow-e1">
                {preview ?? (
                  <p className="text-sm text-muted-foreground">Select a bill to review it.</p>
                )}
              </div>
            </aside>
          </div>
        )}

        {/* ── PREVIEW (phones/tablets) ── */}
        <Modal
          open={!isDesktop && mobileOpen && !!selectedBill && !actionModal && !moveBill}
          onOpenChange={(o) => !o && setMobileOpen(false)}
          title={selectedBill ? `Bill from ${selectedBill.customer.name}` : 'Bill'}
          hideTitle
          size="lg"
        >
          {preview}
        </Modal>

        {/* ── MOVE TO OUTLET ── */}
        <Modal
          open={!!moveBill && !!brandInfo}
          onOpenChange={(o) => {
            if (!o) {
              setMoveBill(null);
              setMoveError('');
            }
          }}
          title="Move to another outlet"
          description={
            moveBill
              ? `${moveBill.customer.name} · #${moveBill.billNumber} · currently at ${moveBill.business}`
              : undefined
          }
          size="sm"
          footer={
            <>
              <Button variant="outline" disabled={moveLoading} onClick={() => setMoveBill(null)}>
                Cancel
              </Button>
              <Button onClick={handleMove} disabled={!moveTarget} loading={moveLoading}>
                Move bill
              </Button>
            </>
          }
        >
          <div className="space-y-2" role="radiogroup" aria-label="Outlet">
            {brandInfo?.outlets
              .filter((o) => o.id !== moveBill?.businessId)
              .map((o) => (
                <button
                  key={o.id}
                  type="button"
                  role="radio"
                  aria-checked={moveTarget === o.id}
                  onClick={() => setMoveTarget(o.id)}
                  className={cn(
                    'ui-press flex min-h-11 w-full items-center justify-between gap-2 rounded-control border px-3 py-2 text-left text-sm transition-colors',
                    moveTarget === o.id
                      ? 'border-primary bg-brand-soft'
                      : 'border-border hover:bg-secondary',
                  )}
                >
                  <span className="min-w-0 truncate">{outletName(o)}</span>
                  {moveTarget === o.id && <Check className="size-4 shrink-0 text-primary" />}
                </button>
              ))}
          </div>
          {moveError && (
            <p
              className="mt-3 flex items-start gap-2 rounded-control bg-danger-soft p-3 text-sm text-danger-soft-foreground"
              role="alert"
            >
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
              {moveError}
            </p>
          )}
        </Modal>

        {/* ── ACTION CONFIRM ── */}
        <Modal
          open={!!actionModal && !!selectedBill}
          onOpenChange={(o) => {
            if (!o) {
              setActionModal(null);
              setActionReason('');
            }
          }}
          title={meta?.title ?? ''}
          description={
            selectedBill
              ? `${selectedBill.customer.name} · #${selectedBill.billNumber} · ${inr(selectedBill.amount)}`
              : undefined
          }
          size="sm"
          footer={
            <>
              <Button variant="outline" onClick={() => setActionModal(null)}>
                Cancel
              </Button>
              <Button
                autoFocus={actionModal === 'approve'}
                loading={actionLoading}
                variant={meta?.button === 'destructive' ? 'destructive' : 'default'}
                className={
                  actionModal === 'approve' || actionModal === 'override'
                    ? 'bg-success text-success-foreground hover:bg-success/90'
                    : undefined
                }
                onClick={handleAction}
              >
                Confirm
              </Button>
            </>
          }
        >
          {meta && (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                handleAction();
              }}
            >
              {meta.templates && (
                <ChipRow label="Common reasons" wrap>
                  {meta.templates.map((t) => (
                    <FilterChip
                      key={t}
                      selected={actionReason === t}
                      onClick={() => setActionReason(t)}
                    >
                      {t}
                    </FilterChip>
                  ))}
                </ChipRow>
              )}
              <label htmlFor="bill-action-reason" className="sr-only">
                {meta.placeholder}
              </label>
              <Textarea
                id="bill-action-reason"
                autoFocus={actionModal !== 'approve'}
                placeholder={meta.placeholder}
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleAction();
                }}
                className="h-20 resize-none"
              />
              {actionModal === 'approve' && (
                <p className="text-caption text-muted-foreground">Press Enter to approve.</p>
              )}
            </form>
          )}
        </Modal>
      </div>
    </BusinessLayout>
  );
}
