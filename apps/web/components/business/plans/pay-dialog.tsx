'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, UploadCloud } from 'lucide-react';
import { GST_PERCENT, type BillingCycle, type CartLine, type PricedCart } from '@saas/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiService } from '@/lib/services/api-service';
import { onboardingService } from '@/lib/services/onboarding-service';
import {
  formatINR,
  PAYMENT_PAYEE_NAME,
  PAYMENT_QR_SRC,
  PAYMENT_UPI_ID,
} from '@/lib/subscription-plans';

const MAX_PROOF_BYTES = 10 * 1024 * 1024;

/**
 * The payment step: QR + UPI id, screenshot proof via signed upload, then POST the cart. The server
 * prices it again and leaves the rows PENDING_PAYMENT until our office verifies the payment.
 */
export function PayDialog({
  open,
  onOpenChange,
  businessId,
  cycle,
  lines,
  cart,
  onSubmitted,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
  cycle: BillingCycle;
  lines: CartLine[];
  cart: PricedCart | null;
  /** Called once the purchase is accepted (use it to refresh entitlements and payments). */
  onSubmitted: (paymentId: string | null) => void;
  /** Called when the owner closes the success state. */
  onDone: () => void;
}) {
  const [proof, setProof] = useState<File | null>(null);
  const [payerRef, setPayerRef] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ paymentId: string | null; amount: number } | null>(null);

  // A fresh attempt every time the dialog opens (the success state must not stick).
  useEffect(() => {
    if (open) {
      setProof(null);
      setPayerRef('');
      setError('');
      setResult(null);
    }
  }, [open]);

  const submit = async () => {
    if (!cart || !proof || submitting) return;
    if (proof.size > MAX_PROOF_BYTES) {
      setError('That screenshot is over 10 MB. Please upload a smaller image.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const signed = await onboardingService.getSignedUrl(
        businessId,
        proof.name,
        proof.type,
        'payment',
      );
      if (!signed.data || signed.error) {
        throw new Error(signed.error || 'Could not get an upload link. Please try again.');
      }
      const uploaded = await onboardingService.uploadFile(signed.data.uploadUrl, proof);
      if (!uploaded) throw new Error('Could not upload the screenshot. Please try again.');

      const res = await apiService.post<any>(`/v1/businesses/${businessId}/purchase`, {
        cycle,
        lines: lines.map((l) => ({ code: l.code, quantity: l.quantity })),
        method: 'UPI_QR',
        transactionRef: payerRef.trim() || undefined,
        proofUrl: JSON.stringify({ bucket: 'verification-documents', path: signed.data.fileKey }),
      });
      if (res.error) throw new Error(res.error);

      const body = res.data;
      const payment = body?.payment ?? body?.data?.payment;
      const amount = Number(payment?.amount ?? cart.totals.total);
      const paymentId: string | null = payment?.id ?? null;
      setResult({ paymentId, amount });
      onSubmitted(paymentId);
    } catch (e: any) {
      setError(e?.message || 'Could not submit the payment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (submitting) return;
    onOpenChange(next);
    if (!next && result) onDone();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto p-5 sm:max-w-md sm:p-6">
        {result ? (
          <div className="ui-pop space-y-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-success-soft text-success-soft-foreground">
              <CheckCircle2 className="h-7 w-7" aria-hidden />
            </div>
            <DialogHeader className="text-center sm:text-center">
              <DialogTitle className="text-xl">Submitted for verification</DialogTitle>
              <DialogDescription>
                We received your payment of{' '}
                <span className="font-semibold text-foreground">{formatINR(result.amount)}</span>.
                Your plan changes as soon as our team verifies it, and you will be notified.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2">
              {result.paymentId && (
                <Button asChild size="lg" variant="outline" className="min-h-12">
                  <Link href={`/dashboard/invoice/${result.paymentId}`}>View invoice</Link>
                </Button>
              )}
              <Button
                type="button"
                size="lg"
                className="ui-press min-h-12"
                onClick={() => handleOpenChange(false)}
              >
                Done
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <DialogHeader>
              <DialogTitle>Pay with UPI / QR</DialogTitle>
              <DialogDescription>
                Pay the exact amount, then upload a screenshot of the payment.
              </DialogDescription>
            </DialogHeader>

            {cart && (
              <div className="flex items-baseline justify-between rounded-card border border-border p-4">
                <div>
                  <div className="text-sm font-bold text-foreground">Amount payable</div>
                  <div className="text-xs text-muted-foreground">
                    Includes {formatINR(cart.totals.tax)} GST ({GST_PERCENT}%)
                  </div>
                </div>
                <span className="text-2xl font-extrabold tabular-nums text-foreground">
                  {formatINR(cart.totals.total)}
                </span>
              </div>
            )}

            <div className="flex flex-col items-center gap-3 rounded-card border border-border p-4">
              <h3 className="text-sm font-bold text-foreground">Scan to pay</h3>
              {/* eslint-disable-next-line @next/next/no-img-element -- payment QR must stay pixel-exact, no lossy re-encode */}
              <img
                src={PAYMENT_QR_SRC}
                alt="UPI payment QR code"
                width={280}
                height={280}
                className="aspect-square w-full max-w-[280px] rounded-xl bg-white object-contain p-3"
              />
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Or pay to UPI ID</p>
                <p className="select-all text-sm font-bold tracking-wide text-foreground">
                  {PAYMENT_UPI_ID}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {PAYMENT_PAYEE_NAME} · pay the exact amount shown above
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <span className="text-sm font-medium text-muted-foreground">
                Payment screenshot <span className="text-destructive">*</span>
              </span>
              <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-card border border-dashed border-input p-4 transition-colors hover:bg-muted/40">
                <UploadCloud className="h-5 w-5 text-muted-foreground" aria-hidden />
                <span className="break-all text-center text-xs text-muted-foreground">
                  {proof ? proof.name : 'Tap to upload your payment screenshot'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => setProof(e.target.files?.[0] || null)}
                />
              </label>
              <Input
                value={payerRef}
                onChange={(e) => setPayerRef(e.target.value)}
                placeholder="UPI transaction reference (optional)"
                aria-label="UPI transaction reference"
                maxLength={255}
                className="h-11 rounded-xl"
              />
            </div>

            {error && (
              <p role="alert" className="text-xs font-medium text-destructive">
                {error}
              </p>
            )}

            <Button
              type="button"
              size="lg"
              onClick={submit}
              disabled={!cart || !proof}
              loading={submitting}
              className="ui-press min-h-12 w-full"
            >
              Submit payment for verification
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
