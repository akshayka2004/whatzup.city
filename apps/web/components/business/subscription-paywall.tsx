'use client';

/**
 * Blocking paywall + renewal reminder for business owners.
 *
 * - No ACTIVE subscription  -> blocking modal, must choose a plan and pay.
 * - Expires within RENEWAL_REMINDER_DAYS -> dismissible renewal reminder.
 * - Payment already submitted (PENDING) -> non-blocking "awaiting verification".
 *
 * Hotels don't choose a plan: their amount comes from star classification +
 * priced amenities, matching the onboarding wizard.
 */

import { useEffect, useState } from 'react';
import { apiService } from '@/lib/services/api-service';
import { onboardingService } from '@/lib/services/onboarding-service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  SUBSCRIPTION_PLANS, PLAN_DURATION_DAYS, RENEWAL_REMINDER_DAYS,
  getPlan, formatINR, PAYMENT_QR_SRC,
} from '@/lib/subscription-plans';
import { computeHotelCharge, type HotelAmenities } from '@/lib/hotel-pricing';
import { Loader2, UploadCloud, X, ShieldCheck } from 'lucide-react';

type Biz = {
  id: string;
  category?: { slug?: string } | null;
  hotelStarRating?: number | null;
  hotelAmenities?: HotelAmenities | null;
};

function daysUntil(iso?: string | null) {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export function SubscriptionPaywall() {
  const [biz, setBiz] = useState<Biz | null>(null);
  const [sub, setSub] = useState<any>(null);
  const [pendingPayment, setPendingPayment] = useState(false);
  const [ready, setReady] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const [selectedPlan, setSelectedPlan] = useState<string>('WHTZUP_X');
  const [proof, setProof] = useState<File | null>(null);
  const [payerRef, setPayerRef] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await apiService.get<any>('/v1/businesses/owner/mine');
      const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      const b: Biz | null = list.length ? list[0] : null;
      if (cancelled) return;
      setBiz(b);

      if (b?.id) {
        const [subRes, payRes] = await Promise.allSettled([
          apiService.get<any>(`/v1/subscriptions/businesses/${b.id}/active`),
          apiService.get<any>(`/v1/payments/businesses/${b.id}`),
        ]);
        if (cancelled) return;
        if (subRes.status === 'fulfilled' && !subRes.value.error) setSub(subRes.value.data);
        if (payRes.status === 'fulfilled' && !payRes.value.error) {
          const pays = Array.isArray(payRes.value.data) ? payRes.value.data : payRes.value.data?.data ?? [];
          setPendingPayment(pays.some((p: any) => p.status === 'PENDING'));
        }
      }
      setReady(true);
    })();
    return () => { cancelled = true; };
  }, []);

  const isHotel = biz?.category?.slug === 'hotel';
  const hotelCharge = computeHotelCharge(biz?.hotelStarRating, biz?.hotelAmenities);
  const plan = getPlan(selectedPlan);
  const amount = isHotel ? hotelCharge.total : plan?.offerPrice || 0;

  // `getActive` returns a synthetic FREE tier when nothing is active.
  const hasPaidActive = !!sub && sub.status === 'ACTIVE' && Number(sub.pricing ?? 0) > 0;
  const remaining = daysUntil(sub?.endDate);
  const expiringSoon =
    hasPaidActive && remaining !== null && remaining <= RENEWAL_REMINDER_DAYS && remaining >= 0;

  const mustPay = ready && !!biz && !hasPaidActive && !pendingPayment;
  const show = ready && !!biz && !done && !dismissed && (mustPay || expiringSoon || (pendingPayment && !hasPaidActive));

  if (!show) return null;

  const awaiting = pendingPayment && !hasPaidActive;

  const submit = async () => {
    if (!biz?.id || !proof) return;
    setSubmitting(true);
    setError('');
    try {
      const signed = await onboardingService.getSignedUrl(biz.id, proof.name, proof.type, 'payment');
      if (!signed.data || signed.error) throw new Error(signed.error || 'Failed to get upload URL.');
      const ok = await onboardingService.uploadFile(signed.data.uploadUrl, proof);
      if (!ok) throw new Error('Failed to upload the screenshot.');

      const res = await onboardingService.submitPayment(biz.id, {
        amount,
        method: 'UPI_QR',
        proofUrl: JSON.stringify({ bucket: 'verification-documents', path: signed.data.fileKey }),
        transactionRef: payerRef || undefined,
        packageName: isHotel ? `HOTEL_${biz.hotelStarRating}STAR` : selectedPlan,
      });
      if (res.error) throw new Error(res.error);
      setDone(true);
    } catch (e: any) {
      setError(e.message || 'Could not submit the payment.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-start justify-center overflow-y-auto p-4 sm:p-8">
      <div className="w-full max-w-3xl rounded-2xl border border-border bg-card shadow-2xl my-auto">
        <div className="flex items-start justify-between gap-4 p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-bold text-foreground">
              {awaiting
                ? 'Payment awaiting verification'
                : expiringSoon
                  ? 'Your plan is expiring soon'
                  : 'Choose a plan to continue'}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {awaiting
                ? 'We have your payment screenshot. Our team will verify it and activate your listing shortly.'
                : expiringSoon
                  ? `Your plan expires in ${remaining} day${remaining === 1 ? '' : 's'}. Renew now to stay listed.`
                  : 'An active plan is required to keep your business listed on Whtzup.city.'}
            </p>
          </div>
          {(expiringSoon || awaiting) && (
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
              aria-label="Dismiss"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {awaiting ? (
          <div className="p-6 flex items-center gap-3 text-sm text-muted-foreground">
            <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0" />
            Nothing more to do right now — you'll be notified once it's approved.
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Plan choice — hotels are priced by classification instead */}
            {isHotel ? (
              <div className="rounded-xl border border-border p-4 space-y-1.5 text-sm">
                <h3 className="text-sm font-bold text-foreground mb-2">Your hotel listing</h3>
                <div className="flex justify-between text-muted-foreground">
                  <span>{biz?.hotelStarRating}★ classification</span>
                  <span>{formatINR(hotelCharge.base)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>{hotelCharge.selectedCount} service{hotelCharge.selectedCount === 1 ? '' : 's'}</span>
                  <span>{formatINR(hotelCharge.addons)}</span>
                </div>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {SUBSCRIPTION_PLANS.map((p) => (
                  <button
                    key={p.code}
                    type="button"
                    onClick={() => setSelectedPlan(p.code)}
                    className={cn(
                      'p-4 rounded-xl border text-left transition cursor-pointer',
                      selectedPlan === p.code
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-slate-500',
                    )}
                  >
                    <div className="text-xs font-bold text-primary mb-1">{p.name}</div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-lg font-extrabold text-foreground">{formatINR(p.offerPrice)}</span>
                      <span className="text-[11px] text-muted-foreground line-through">{formatINR(p.mrp)}</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-1">
                      {p.offers} offers · {p.vouchers} vouchers
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div className="flex justify-between items-baseline rounded-xl border border-border p-4">
              <span className="text-sm font-bold text-foreground">Amount payable</span>
              <span className="text-2xl font-extrabold text-foreground">{formatINR(amount)}</span>
            </div>
            <p className="text-[11px] text-muted-foreground -mt-4">
              Valid for {PLAN_DURATION_DAYS} days from activation.
            </p>

            <div className="flex flex-col items-center gap-3 rounded-xl border border-border p-5">
              <h3 className="text-sm font-bold text-foreground">Scan to pay</h3>
              <img
                src={PAYMENT_QR_SRC}
                alt="Payment QR code"
                className="w-48 h-48 object-contain rounded-xl bg-white p-2"
              />
              <p className="text-[11px] text-muted-foreground">Pay the exact amount using any UPI app.</p>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium text-muted-foreground">
                Payment screenshot <span className="text-destructive">*</span>
              </label>
              <label className="flex flex-col items-center justify-center gap-2 p-5 rounded-xl border border-dashed border-input cursor-pointer hover:bg-muted/40 transition">
                <UploadCloud className="h-5 w-5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {proof ? proof.name : 'Click to upload your payment screenshot'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setProof(e.target.files?.[0] || null)}
                />
              </label>
              <Input
                value={payerRef}
                onChange={(e) => setPayerRef(e.target.value)}
                placeholder="UPI transaction reference (optional)"
                className="h-11 rounded-xl"
              />
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}

            <Button
              type="button"
              onClick={submit}
              disabled={submitting || !proof}
              className="w-full h-11 rounded-xl font-semibold cursor-pointer"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit payment for verification'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
