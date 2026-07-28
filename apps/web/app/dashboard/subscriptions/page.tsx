'use client';

/**
 * Business owner's subscription view — live from the DB.
 *
 * Reads the active subscription via GET /v1/subscriptions/businesses/:id/active
 * and the payment history via GET /v1/payments/businesses/:id. Plan definitions
 * come from lib/subscription-plans, so this always matches what registration
 * sells. Changing plans goes through the same QR + proof flow as registration,
 * which the paywall component already renders.
 */

import { useEffect, useState } from 'react';
import { BusinessLayout } from '@/components/layouts/business-layout';
import { Card } from '@/components/ui/card';
import { apiService } from '@/lib/services/api-service';
import {
  SUBSCRIPTION_PLANS, PLAN_DURATION_DAYS, RENEWAL_REMINDER_DAYS,
  formatINR, planLabel,
} from '@/lib/subscription-plans';
import { cn } from '@/lib/utils';
import {
  CreditCard, Check, Loader2, Clock, CheckCircle2, XCircle, AlertCircle,
} from 'lucide-react';

type Sub = {
  id?: string;
  packageName?: string;
  pricing?: string | number;
  duration?: number;
  status?: string;
  startDate?: string;
  endDate?: string;
};

type Payment = {
  id: string;
  amount: string | number;
  method: string;
  status: string;
  transactionRef?: string | null;
  createdAt: string;
  verifiedAt?: string | null;
};

function fmtDate(v?: string | null) {
  if (!v) return '—';
  return new Date(v).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function daysUntil(iso?: string | null) {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}

export default function BusinessSubscriptionsPage() {
  const [businessId, setBusinessId] = useState<string>('');
  const [sub, setSub] = useState<Sub | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [billing, setBilling] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const mine = await apiService.get<any>('/v1/businesses/owner/mine');
      const list = mine.data?.data || (Array.isArray(mine.data) ? mine.data : []);
      const biz = list?.[0];
      if (cancelled || !biz?.id) { setLoading(false); return; }
      setBusinessId(biz.id);

      const [subRes, payRes, billRes] = await Promise.allSettled([
        apiService.get<any>(`/v1/subscriptions/businesses/${biz.id}/active`),
        apiService.get<any>(`/v1/payments/businesses/${biz.id}`),
        apiService.get<any>(`/v1/payments/businesses/${biz.id}/billing-profile`),
      ]);
      if (cancelled) return;
      if (subRes.status === 'fulfilled' && !subRes.value.error) setSub(subRes.value.data);
      if (payRes.status === 'fulfilled' && !payRes.value.error) {
        const p = Array.isArray(payRes.value.data) ? payRes.value.data : payRes.value.data?.data ?? [];
        setPayments(p);
      }
      if (billRes.status === 'fulfilled' && !billRes.value.error) setBilling(billRes.value.data);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const isPaid = !!sub && Number(sub.pricing ?? 0) > 0;
  const remaining = daysUntil(sub?.endDate);
  const expiringSoon =
    isPaid && sub?.status === 'ACTIVE' && remaining !== null && remaining <= RENEWAL_REMINDER_DAYS;
  const currentCode = sub?.packageName;

  return (
    <BusinessLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-primary" />
            Subscription
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Your plan and payment history, live from your account.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading your subscription…
          </div>
        ) : (
          <>
            {/* Current plan */}
            <Card className="p-5">
              {isPaid ? (
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground">Current plan</div>
                    <div className="text-xl font-extrabold text-foreground mt-0.5">
                      {planLabel(currentCode)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {sub?.status} · {formatINR(Number(sub?.pricing ?? 0))} · {sub?.duration ?? PLAN_DURATION_DAYS} days
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">Expires</div>
                    <div className="text-sm font-semibold text-foreground">{fmtDate(sub?.endDate)}</div>
                    {remaining !== null && remaining >= 0 && (
                      <div
                        className={cn(
                          'text-xs mt-0.5',
                          expiringSoon ? 'text-warning font-semibold' : 'text-muted-foreground',
                        )}
                      >
                        {remaining} day{remaining === 1 ? '' : 's'} left
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-semibold text-foreground">No active paid plan</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Choose a plan and pay to keep your business listed. The payment prompt appears
                      automatically on your dashboard.
                    </p>
                  </div>
                </div>
              )}
            </Card>

            {/* Plan catalogue */}
            <div>
              <h2 className="text-sm font-bold text-foreground mb-2">Available plans</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {SUBSCRIPTION_PLANS.map((p) => {
                  const current = p.code === currentCode;
                  return (
                    <Card
                      key={p.code}
                      className={cn('p-4 flex flex-col', current && 'border-primary bg-primary/5')}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-primary">{p.name}</span>
                        {current && (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                            Current
                          </span>
                        )}
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-xl font-extrabold text-foreground">
                          {formatINR(p.offerPrice)}
                        </span>
                        <span className="text-[11px] text-muted-foreground line-through">
                          {formatINR(p.mrp)}
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-400 font-semibold mt-0.5">
                        50% launch offer
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {p.offers} offers · {p.vouchers} vouchers
                      </p>
                      <ul className="mt-2 space-y-1">
                        {p.features.map((f, i) => (
                          <li key={i} className="flex items-start gap-1 text-[11px] text-muted-foreground">
                            <Check className="h-3 w-3 text-emerald-400 shrink-0 mt-0.5" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </Card>
                  );
                })}
              </div>
              <p className="text-[11px] text-muted-foreground mt-2">
                Hotels are billed by star classification and selected services instead of these plans.
              </p>
            </div>

            {/* Invoice / billing details on file */}
            <div>
              <h2 className="text-sm font-bold text-foreground mb-2">Invoice details</h2>
              {billing ? (
                <Card className="p-5">
                  <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-xs">
                    <div className="text-muted-foreground">
                      Billing name: <span className="text-foreground font-medium">{billing.billingName}</span>
                    </div>
                    <div className="text-muted-foreground">
                      GST:{' '}
                      <span className="text-foreground font-medium">
                        {billing.hasGst ? billing.gstin || 'Yes' : 'Not registered'}
                      </span>
                    </div>
                    <div className="text-muted-foreground">
                      PAN: <span className="text-foreground font-medium">{billing.pan || '—'}</span>
                    </div>
                    <div className="text-muted-foreground">
                      Invoice email:{' '}
                      <span className="text-foreground font-medium break-all">{billing.invoiceEmail}</span>
                    </div>
                    <div className="text-muted-foreground sm:col-span-2">
                      Address:{' '}
                      <span className="text-foreground">
                        {billing.addressLine}
                        {billing.city ? `, ${billing.city}` : ''}
                        {billing.state ? `, ${billing.state}` : ''} — {billing.pincode}
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-3">
                    Invoices are raised by our office and sent to the email above.
                  </p>
                </Card>
              ) : (
                <Card className="p-5">
                  <p className="text-xs text-muted-foreground">
                    No invoice details on file yet. They're collected with your payment.
                  </p>
                </Card>
              )}
            </div>

            {/* Payment history */}
            <div>
              <h2 className="text-sm font-bold text-foreground mb-2">Payment history</h2>
              {payments.length === 0 ? (
                <Card className="p-6 text-center">
                  <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
                </Card>
              ) : (
                <Card className="overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/40 text-xs text-muted-foreground">
                        <tr>
                          <th className="text-left font-medium px-4 py-3">Date</th>
                          <th className="text-left font-medium px-4 py-3">Amount</th>
                          <th className="text-left font-medium px-4 py-3">Method</th>
                          <th className="text-left font-medium px-4 py-3">Reference</th>
                          <th className="text-left font-medium px-4 py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payments.map((p) => (
                          <tr key={p.id} className="border-t border-border">
                            <td className="px-4 py-3 text-muted-foreground">{fmtDate(p.createdAt)}</td>
                            <td className="px-4 py-3 font-semibold text-foreground">
                              {formatINR(Number(p.amount || 0))}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">{p.method}</td>
                            <td className="px-4 py-3 text-muted-foreground">{p.transactionRef || '—'}</td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center gap-1.5 text-xs">
                                {p.status === 'SUCCESS' ? (
                                  <>
                                    <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                                    <span className="text-success font-semibold">Verified</span>
                                  </>
                                ) : p.status === 'FAILED' ? (
                                  <>
                                    <XCircle className="h-3.5 w-3.5 text-destructive" />
                                    <span className="text-destructive font-semibold">Rejected</span>
                                  </>
                                ) : (
                                  <>
                                    <Clock className="h-3.5 w-3.5 text-warning" />
                                    <span className="text-warning font-semibold">Awaiting verification</span>
                                  </>
                                )}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </div>
          </>
        )}
      </div>
    </BusinessLayout>
  );
}
