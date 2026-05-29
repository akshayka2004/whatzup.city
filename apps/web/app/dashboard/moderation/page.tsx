'use client';

import { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { canAccess, hasRole, getRoleLabel } from '@/lib/rbac';
import { apiService } from '@/lib/services/api-service';
import { useAuth } from '@/hooks/use-auth';

// ── TYPES ─────────────────────────────────────────────────────────────

type BillStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'FLAGGED' | 'RE_UPLOAD_REQUESTED' | 'ESCALATED';
type TabKey = 'PENDING' | 'APPROVED' | 'REJECTED' | 'FLAGGED' | 'RE_UPLOAD_REQUESTED';
type ActionModal = 'approve' | 'reject' | 'reupload' | 'flag' | 'override' | null;

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
    amount,
    billDate,
    billNumber: b.billNumber || bill.billNumber || b.id.substring(0, 8).toUpperCase(),
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
  PENDING: { label: 'Pending', color: 'text-amber-400', bg: 'bg-amber-500/10' },
  APPROVED: { label: 'Approved', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  REJECTED: { label: 'Rejected', color: 'text-rose-400', bg: 'bg-rose-500/10' },
  FLAGGED: { label: 'Flagged', color: 'text-orange-400', bg: 'bg-orange-500/10' },
  RE_UPLOAD_REQUESTED: { label: 'Re-Upload Requested', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  ESCALATED: { label: 'Escalated', color: 'text-red-400', bg: 'bg-red-500/10' },
};

// ── FRAUD SCORE BADGE ─────────────────────────────────────────────────
// (empty MOCK_BILLS removed — data comes from real API)

function FraudBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  if (pct >= 70) return (
    <span className="flex items-center gap-1 text-rose-400 font-bold text-sm">
      <ShieldAlert className="h-3.5 w-3.5" /> {pct}% HIGH
    </span>
  );
  if (pct >= 40) return (
    <span className="flex items-center gap-1 text-amber-400 font-semibold text-sm">
      <AlertTriangle className="h-3.5 w-3.5" /> {pct}% MED
    </span>
  );
  return (
    <span className="flex items-center gap-1 text-emerald-400 font-semibold text-sm">
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

  const businessId = user?.businessId || user?.entity?.id || '';

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

  const fetchBills = async (status?: string) => {
    if (!businessId) return;
    setLoading(true);
    try {
      const query = status ? `?status=${status}` : '';
      const res = await apiService.get<any>(`/v1/businesses/${businessId}/bill-verifications${query}`);
      if (res.data && !res.error) {
        const list = Array.isArray(res.data) ? res.data : res.data?.data ?? res.data?.verifications ?? [];
        setBills(list.map(mapApiBill));
      }
    } catch (_) {}
    setLoading(false);
  };

  useEffect(() => {
    fetchBills(activeTab !== 'PENDING' ? activeTab : undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId, activeTab]);

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
    if (!selectedBill || !businessId) return;
    setActionLoading(true);
    try {
      const base = `/v1/businesses/${businessId}/bill-verifications/${selectedBill.id}`;
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

  return (
    <BusinessLayout>
      <div className="space-y-6 max-w-7xl mx-auto">

        {/* ── PAGE HEADER ────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-violet-400" />
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
              isOwner ? 'bg-violet-500/15 text-violet-400' : 'bg-amber-500/15 text-amber-400',
            )}>
              <Shield className="h-3 w-3" />
              {getRoleLabel(userRole)}
            </div>
          </div>
        </div>

        {/* ── STATS ROW ──────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Pending Review', value: loading ? '…' : pendingCount, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10' },
            { label: 'Approved', value: loading ? '…' : approvedCount, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
            { label: 'Rejected', value: loading ? '…' : rejectedCount, icon: XCircle, color: 'text-rose-400', bg: 'bg-rose-500/10' },
            { label: 'Fraud Flagged', value: loading ? '…' : flaggedCount, icon: ShieldAlert, color: 'text-orange-400', bg: 'bg-orange-500/10' },
          ].map((stat) => (
            <Card key={stat.label} className="p-4 rounded-2xl border-white/5 bg-card/40 backdrop-blur-xl">
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
          <div className="flex gap-1 bg-card/40 p-1 rounded-xl border border-white/5">
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
                      : 'text-muted-foreground hover:text-foreground hover:bg-white/5',
                  )}
                >
                  <tab.icon className="h-3.5 w-3.5" />
                  {tab.label}
                  {count !== undefined && count > 0 && (
                    <span className="ml-0.5 h-4 min-w-4 rounded-full bg-rose-500 text-[9px] font-bold text-white flex items-center justify-center px-1">
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
              className="pl-8 h-9 rounded-xl border-white/10 bg-card/40 text-sm"
            />
          </div>
        </div>

        {/* ── BILL LIST ──────────────────────────────────────── */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredBills.length === 0 ? (
          <Card className="p-12 rounded-2xl border-dashed border-white/10 bg-white/5 text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto mb-3 opacity-50" />
            <h3 className="text-base font-semibold text-foreground mb-1">Queue Clear</h3>
            <p className="text-sm text-muted-foreground">No bills in this category.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredBills.map((bill) => {
              const statusCfg = STATUS_CONFIG[bill.status as BillStatus];
              return (
                <Card
                  key={bill.id}
                  className={cn(
                    'p-5 rounded-2xl border-white/5 bg-card/40 backdrop-blur-xl hover:bg-card/60 transition-all cursor-pointer',
                    selectedBill?.id === bill.id && 'ring-1 ring-violet-500/50 bg-violet-500/5',
                    bill.fraudScore >= 0.6 && 'border-l-2 border-l-rose-500/50',
                  )}
                  onClick={() => setSelectedBill(selectedBill?.id === bill.id ? null : bill)}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    {/* Left: Bill info */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="h-10 w-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-400 shrink-0 text-xs font-bold">
                        {bill.customer.avatar}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-foreground text-sm">{bill.customer.name}</h3>
                          <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full', statusCfg.bg, statusCfg.color)}>
                            {statusCfg.label}
                          </span>
                          {bill.escalationLevel !== 'NONE' && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-400 flex items-center gap-0.5">
                              <ArrowUpRight className="h-3 w-3" />
                              Escalated to {bill.escalationLevel}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          <Building2 className="h-3 w-3 inline mr-1" />{bill.business}
                          <span className="mx-1.5">·</span>
                          <span className="font-mono">{bill.billNumber}</span>
                          <span className="mx-1.5">·</span>
                          {bill.billDate}
                        </p>
                      </div>
                    </div>

                    {/* Right: Metrics + Actions */}
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6 w-full lg:w-auto">
                      {/* Metrics Group */}
                      <div className="grid grid-cols-3 gap-2 lg:flex lg:items-center lg:gap-6 w-full lg:w-auto border-t border-white/5 pt-3 lg:border-t-0 lg:pt-0">
                        <div className="text-center lg:text-left">
                          <p className="text-[10px] text-muted-foreground mb-0.5">Amount</p>
                          <p className="font-bold text-foreground text-sm">₹{bill.amount.toLocaleString('en-IN')}</p>
                        </div>
                        <div className="text-center lg:text-left">
                          <p className="text-[10px] text-muted-foreground mb-0.5">OCR Conf</p>
                          <p className={cn('font-semibold text-sm', bill.ocrConfidence >= 80 ? 'text-emerald-400' : bill.ocrConfidence >= 60 ? 'text-amber-400' : 'text-rose-400')}>
                            {bill.ocrConfidence}%
                          </p>
                        </div>
                        <div className="text-center lg:text-left">
                          <p className="text-[10px] text-muted-foreground mb-0.5">Risk Score</p>
                          <FraudBadge score={bill.fraudScore} />
                        </div>
                      </div>

                      {/* Action buttons */}
                      {canVerify && bill.status === 'PENDING' && (
                        <div className="flex gap-2 w-full lg:w-auto justify-end border-t border-white/5 pt-3 lg:border-t-0 lg:pt-0" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => { setSelectedBill(bill); setActionModal('reupload'); }}
                            className="h-9 rounded-xl border-blue-500/20 text-blue-400 hover:bg-blue-500/10 text-xs px-3 cursor-pointer flex-1 lg:flex-none"
                          >
                            <RefreshCw className="h-3.5 w-3.5 mr-1" /> Re-upload
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => { setSelectedBill(bill); setActionModal('reject'); }}
                            className="h-9 rounded-xl border-rose-500/20 text-rose-400 hover:bg-rose-500/10 text-xs px-3 cursor-pointer flex-1 lg:flex-none"
                          >
                            <X className="h-3.5 w-3.5 mr-1" /> Reject
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => { setSelectedBill(bill); setActionModal('approve'); }}
                            className="h-9 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3 cursor-pointer flex-1 lg:flex-none"
                          >
                            <Check className="h-3.5 w-3.5 mr-1" /> Approve
                          </Button>
                        </div>
                      )}

                      {canVerify && bill.status === 'FLAGGED' && (
                        <div className="flex gap-2 w-full lg:w-auto justify-end border-t border-white/5 pt-3 lg:border-t-0 lg:pt-0" onClick={(e) => e.stopPropagation()}>
                          {canOverride && (
                            <Button
                              size="sm"
                              onClick={() => { setSelectedBill(bill); setActionModal('override'); }}
                              className="h-9 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs px-3 cursor-pointer flex-1 lg:flex-none"
                            >
                              <Shield className="h-3.5 w-3.5 mr-1" /> Override
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => { setSelectedBill(bill); setActionModal('reject'); }}
                            className="h-9 rounded-xl border-rose-500/20 text-rose-400 hover:bg-rose-500/10 text-xs px-3 cursor-pointer flex-1 lg:flex-none"
                          >
                            <X className="h-3.5 w-3.5 mr-1" /> Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ── EXPANDED DETAIL PANEL ───────────────── */}
                  {selectedBill?.id === bill.id && (
                    <div className="mt-5 pt-5 border-t border-white/5 grid md:grid-cols-2 gap-6">
                      {/* Receipt Image */}
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                          Uploaded Receipt
                        </h4>
                        <div className="h-56 rounded-xl overflow-hidden border border-white/5 bg-black">
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
                          <div className="rounded-xl border border-white/5 bg-white/5 p-3 space-y-1.5">
                            <p className="text-xs"><span className="text-muted-foreground">Merchant: </span><span className="text-foreground font-medium">{bill.ocrData.merchant}</span></p>
                            <p className="text-xs"><span className="text-muted-foreground">Total: </span><span className="text-foreground font-bold">{bill.ocrData.total}</span></p>
                            <p className="text-xs"><span className="text-muted-foreground">Date: </span><span className="text-foreground">{bill.ocrData.date}</span></p>
                            <div className="pt-1.5 border-t border-white/5">
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
                          <div className={cn('rounded-xl border p-3', bill.fraudScore >= 0.7 ? 'border-rose-500/20 bg-rose-500/5' : bill.fraudScore >= 0.4 ? 'border-amber-500/20 bg-amber-500/5' : 'border-emerald-500/20 bg-emerald-500/5')}>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs text-muted-foreground">Overall Risk Score</span>
                              <FraudBadge score={bill.fraudScore} />
                            </div>
                            <div className="w-full bg-white/5 rounded-full h-1.5">
                              <div
                                className={cn('h-1.5 rounded-full transition-all', bill.fraudScore >= 0.7 ? 'bg-rose-500' : bill.fraudScore >= 0.4 ? 'bg-amber-500' : 'bg-emerald-500')}
                                style={{ width: `${bill.fraudScore * 100}%` }}
                              />
                            </div>
                            {bill.fraudScore >= 0.6 && (
                              <p className="text-[10px] text-rose-400 mt-2 flex items-center gap-1">
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
                            <div className="h-8 w-8 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-400 text-xs font-bold">
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

        {/* ── ACTION MODAL ──────────────────────────────────── */}
        {actionModal && selectedBill && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <Card className="w-full max-w-sm p-6 rounded-2xl border-border bg-card shadow-2xl">
              <div className={cn(
                'mx-auto h-12 w-12 rounded-full flex items-center justify-center mb-4',
                actionModal === 'approve' || actionModal === 'override' ? 'bg-emerald-500/10 text-emerald-400'
                  : actionModal === 'reject' ? 'bg-rose-500/10 text-rose-400'
                  : actionModal === 'reupload' ? 'bg-blue-500/10 text-blue-400'
                  : 'bg-orange-500/10 text-orange-400',
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
                    actionModal === 'approve' || actionModal === 'override' ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      : actionModal === 'reject' ? 'bg-rose-600 hover:bg-rose-500 text-white'
                      : actionModal === 'reupload' ? 'bg-blue-600 hover:bg-blue-500 text-white'
                      : 'bg-orange-600 hover:bg-orange-500 text-white',
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
