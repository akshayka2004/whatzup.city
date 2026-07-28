'use client';

/**
 * Admin queue for QR/UPI payments. Each row shows the uploaded screenshot;
 * verifying activates the linked subscription, rejecting sends it back to
 * PENDING_PAYMENT with a reason.
 */

import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/layouts/admin-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiService } from '@/lib/services/api-service';
import { formatINR } from '@/lib/subscription-plans';
import { cn } from '@/lib/utils';
import { Loader2, CheckCircle2, XCircle, Receipt, Building2, ExternalLink } from 'lucide-react';

type PendingPayment = {
  id: string;
  amount: string | number;
  method: string;
  transactionRef?: string | null;
  createdAt: string;
  proofSignedUrl?: string | null;
  invoiceMetadata?: any;
  business?: { id: string; name: string; slug: string; city: string } | null;
  subscription?: { id: string; packageName: string; pricing: string | number } | null;
};

export default function AdminPaymentsPage() {
  const [rows, setRows] = useState<PendingPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [msg, setMsg] = useState('');

  const load = async () => {
    setLoading(true);
    const res = await apiService.get<any>('/v1/payments/admin/pending');
    const list = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
    setRows(list);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const verify = async (id: string) => {
    setBusyId(id);
    setMsg('');
    const res = await apiService.post<any>(`/v1/payments/${id}/verify`, {});
    setBusyId(null);
    if (res.error) { setMsg(res.error); return; }
    setMsg('Payment verified — subscription activated.');
    setRows((r) => r.filter((x) => x.id !== id));
  };

  const reject = async (id: string) => {
    if (!reason.trim()) return;
    setBusyId(id);
    setMsg('');
    const res = await apiService.post<any>(`/v1/payments/${id}/reject`, { reason: reason.trim() });
    setBusyId(null);
    if (res.error) { setMsg(res.error); return; }
    setMsg('Payment rejected.');
    setRejectingId(null);
    setReason('');
    setRows((r) => r.filter((x) => x.id !== id));
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Receipt className="h-6 w-6 text-primary" />
            Payment Verification
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review uploaded payment screenshots. Verifying activates the business's subscription.
          </p>
        </div>

        {msg && <p className="text-sm font-medium text-primary">{msg}</p>}

        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading pending payments…
          </div>
        ) : rows.length === 0 ? (
          <Card className="p-10 text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto mb-3" />
            <p className="text-sm font-semibold text-foreground">No payments awaiting verification</p>
            <p className="text-xs text-muted-foreground mt-1">New submissions will appear here.</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {rows.map((p) => (
              <Card key={p.id} className="p-5">
                <div className="grid md:grid-cols-[220px_1fr] gap-5">
                  {/* Proof */}
                  <div>
                    {p.proofSignedUrl ? (
                      <a href={p.proofSignedUrl} target="_blank" rel="noopener noreferrer" className="block group">
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

                  {/* Details */}
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <h3 className="text-base font-bold text-foreground flex items-center gap-1.5">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          {p.business?.name || 'Unknown business'}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {p.business?.city} · submitted {new Date(p.createdAt).toLocaleString('en-IN')}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-extrabold text-foreground">
                          {formatINR(Number(p.amount))}
                        </div>
                        <div className="text-[11px] text-muted-foreground">{p.method}</div>
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-2 text-xs">
                      <div className="text-muted-foreground">
                        Plan:{' '}
                        <span className="text-foreground font-medium">
                          {p.subscription?.packageName || p.invoiceMetadata?.packageName || '—'}
                        </span>
                      </div>
                      <div className="text-muted-foreground">
                        UPI ref:{' '}
                        <span className="text-foreground font-medium">{p.transactionRef || '—'}</span>
                      </div>
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
                          Verify & activate
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
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
