'use client';

/**
 * Renewal payment approvals — live from the DB.
 *
 * A business's first payment is reviewed together with its documents in
 * Approvals, so this queue asks the API for RENEWAL only. Each row carries the
 * proof screenshot plus the full billing details, so the office can raise the
 * invoice without chasing the business.
 */

import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/layouts/admin-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiService } from '@/lib/services/api-service';
import { formatINR, planLabel, TAX_PERCENT } from '@/lib/subscription-plans';
import { cn } from '@/lib/utils';
import {
  Receipt, Loader2, CheckCircle2, XCircle, Building2, ExternalLink,
  FileText, Mail, MapPin, Hash,
} from 'lucide-react';

type Pending = {
  id: string;
  amount: string | number;
  amountBase?: number;
  amountTax?: number;
  amountTotal?: number;
  method: string;
  transactionRef?: string | null;
  createdAt: string;
  cycle?: string;
  proofSignedUrl?: string | null;
  invoiceMetadata?: any;
  business?: {
    id: string; name: string; slug: string; city: string; status: string;
    billingProfile?: {
      billingName: string; hasGst: boolean; gstin?: string | null; pan?: string | null;
      addressLine: string; city?: string | null; state?: string | null;
      pincode: string; invoiceEmail: string;
    } | null;
  } | null;
  subscription?: { id: string; packageName: string; pricing: string | number; endDate?: string; duration?: number } | null;
};

function fmtDate(v?: string | null) {
  if (!v) return '—';
  return new Date(v).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function AdminPaymentApprovalsPage() {
  const [rows, setRows] = useState<Pending[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [msg, setMsg] = useState('');

  const load = async () => {
    setLoading(true);
    const res = await apiService.get<any>('/v1/payments/admin/pending?cycle=RENEWAL');
    const list = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
    setRows(list);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const verify = async (id: string) => {
    setBusyId(id); setMsg('');
    const res = await apiService.post<any>(`/v1/payments/${id}/verify`, {});
    setBusyId(null);
    if (res.error) { setMsg(res.error); return; }
    setMsg('Payment verified — subscription renewed.');
    setRows((r) => r.filter((x) => x.id !== id));
  };

  const reject = async (id: string) => {
    if (!reason.trim()) return;
    setBusyId(id); setMsg('');
    const res = await apiService.post<any>(`/v1/payments/${id}/reject`, { reason: reason.trim() });
    setBusyId(null);
    if (res.error) { setMsg(res.error); return; }
    setMsg('Payment rejected.');
    setRejectingId(null); setReason('');
    setRows((r) => r.filter((x) => x.id !== id));
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Receipt className="h-6 w-6 text-primary" />
            Payment Approvals
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Renewal payments awaiting verification. First-time payments are reviewed with the
            business documents under Approvals.
          </p>
        </div>

        {msg && <p className="text-sm font-medium text-primary">{msg}</p>}

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading renewal payments…
          </div>
        ) : rows.length === 0 ? (
          <Card className="p-10 text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto mb-3" />
            <p className="text-sm font-semibold text-foreground">No renewal payments pending</p>
            <p className="text-xs text-muted-foreground mt-1">
              Renewals appear here as soon as a business pays again.
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {rows.map((p) => {
              const bp = p.business?.billingProfile;
              const base = p.amountBase ?? 0;
              const tax = p.amountTax ?? 0;
              return (
                <Card key={p.id} className="p-5">
                  <div className="grid lg:grid-cols-[220px_1fr] gap-5">
                    {/* Proof */}
                    <div>
                      {p.proofSignedUrl ? (
                        <a href={p.proofSignedUrl} target="_blank" rel="noopener noreferrer" className="block">
                          <img
                            src={p.proofSignedUrl}
                            alt="Payment screenshot"
                            className="w-full h-48 object-cover rounded-xl border border-border"
                          />
                          <span className="text-[11px] text-primary flex items-center gap-1 mt-1.5">
                            Open full size <ExternalLink className="h-3 w-3" />
                          </span>
                        </a>
                      ) : (
                        <div className="w-full h-48 rounded-xl border border-dashed border-border flex items-center justify-center text-xs text-muted-foreground">
                          No screenshot
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div>
                          <h3 className="text-base font-bold text-foreground flex items-center gap-1.5">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            {p.business?.name || 'Unknown business'}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {p.business?.city} · submitted {fmtDate(p.createdAt)}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-extrabold text-foreground">
                            {formatINR(Number(p.amountTotal ?? p.amount))}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {formatINR(base)} + {formatINR(tax)} GST ({TAX_PERCENT}%)
                          </div>
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-3 gap-2 text-xs">
                        <div className="text-muted-foreground">
                          Plan:{' '}
                          <span className="text-foreground font-medium">
                            {planLabel(p.subscription?.packageName || p.invoiceMetadata?.packageName)}
                          </span>
                        </div>
                        <div className="text-muted-foreground">
                          Method: <span className="text-foreground font-medium">{p.method}</span>
                        </div>
                        <div className="text-muted-foreground">
                          UPI ref: <span className="text-foreground font-medium">{p.transactionRef || '—'}</span>
                        </div>
                      </div>

                      {/* Billing details for invoice generation */}
                      <div className="rounded-xl border border-border bg-muted/30 p-4">
                        <h4 className="text-xs font-bold text-foreground mb-2 flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5" /> Invoice details
                        </h4>
                        {bp ? (
                          <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
                            <div className="text-muted-foreground">
                              Billing name: <span className="text-foreground font-medium">{bp.billingName}</span>
                            </div>
                            <div className="text-muted-foreground">
                              GST:{' '}
                              <span className="text-foreground font-medium">
                                {bp.hasGst ? bp.gstin || 'Yes (no GSTIN)' : 'Not registered'}
                              </span>
                            </div>
                            <div className="text-muted-foreground flex items-center gap-1">
                              <Hash className="h-3 w-3" /> PAN:{' '}
                              <span className="text-foreground font-medium">{bp.pan || '—'}</span>
                            </div>
                            <div className="text-muted-foreground flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              <span className="text-foreground font-medium break-all">{bp.invoiceEmail}</span>
                            </div>
                            <div className="text-muted-foreground sm:col-span-2 flex items-start gap-1">
                              <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                              <span className="text-foreground">
                                {bp.addressLine}
                                {bp.city ? `, ${bp.city}` : ''}
                                {bp.state ? `, ${bp.state}` : ''} — {bp.pincode}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-warning">
                            No billing details on file — the business has not completed the invoice step.
                          </p>
                        )}
                      </div>

                      {rejectingId === p.id ? (
                        <div className="space-y-2">
                          <Input
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Reason for rejection (shown to the business)"
                            className="h-10 rounded-xl"
                          />
                          <div className="flex gap-2">
                            <Button
                              onClick={() => reject(p.id)}
                              disabled={busyId === p.id || !reason.trim()}
                              className="h-10 rounded-xl bg-destructive text-destructive-foreground cursor-pointer"
                            >
                              {busyId === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm rejection'}
                            </Button>
                            <Button
                              onClick={() => { setRejectingId(null); setReason(''); }}
                              className="h-10 rounded-xl bg-muted text-foreground cursor-pointer"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-2 flex-wrap">
                          <Button
                            onClick={() => verify(p.id)}
                            disabled={busyId === p.id}
                            className="h-10 rounded-xl gap-1.5 cursor-pointer"
                          >
                            {busyId === p.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4" />
                            )}
                            Approve payment
                          </Button>
                          <Button
                            onClick={() => setRejectingId(p.id)}
                            className={cn(
                              'h-10 rounded-xl gap-1.5 bg-background border border-input text-muted-foreground cursor-pointer',
                            )}
                          >
                            <XCircle className="h-4 w-4" />
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
