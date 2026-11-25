'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { BusinessLayout } from '@/components/layouts/business-layout';
import { PageHeader } from '@/components/system/page-header';
import { SectionCard } from '@/components/system/section-card';
import { useConfirm } from '@/components/common/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';
import { useAuth } from '@/hooks/use-auth';
import { apiService } from '@/lib/services/api-service';
import { cn } from '@/lib/utils';

type Sent = { id: string; status: string; amount: number | null };
type Recent = {
  id: string;
  billId: string;
  at: string;
  amount: number;
  customer: string;
  staff: string | null;
  voided: boolean;
  canVoid: boolean;
};

const when = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  });

/** The counter screen: the customer reads out a 6-digit code, the cashier types it with the bill amount. */
export default function CounterPage() {
  const { user } = useAuth();
  const confirm = useConfirm();
  const businessId = user?.businessId || user?.entity?.id;

  const [code, setCode] = useState('');
  const [amount, setAmount] = useState('');
  const [billNumber, setBillNumber] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState<Sent | null>(null);
  const [recent, setRecent] = useState<Recent[] | null>(null);

  const loadRecent = useCallback(async () => {
    if (!businessId) return;
    const res = await apiService.get<Recent[]>(`/v1/quick-bills/recent/${businessId}`, {
      fresh: true,
    });
    // Only owners and moderators may see the list; for anyone else this stays hidden.
    if (!res.error && Array.isArray(res.data)) setRecent(res.data);
  }, [businessId]);
  useEffect(() => {
    loadRecent();
  }, [loadRecent]);

  // After sending, watch for the customer's answer.
  useEffect(() => {
    if (!sent || sent.status !== 'AWAITING' || !businessId) return;
    const t = setInterval(async () => {
      const res = await apiService.get<Sent>(`/v1/quick-bills/staff/${businessId}/${sent.id}`, {
        fresh: true,
      });
      if (!res.error && res.data && res.data.status !== 'AWAITING') {
        setSent(res.data);
        if (res.data.status === 'CONFIRMED') loadRecent();
      }
    }, 3000);
    return () => clearInterval(t);
  }, [sent, businessId, loadRecent]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId || busy) return;
    setBusy(true);
    setError('');
    const res = await apiService.post<Sent>('/v1/quick-bills/enter', {
      businessId,
      code: code.replace(/\D/g, ''),
      amount: Number(amount),
      billNumber: billNumber.trim() || undefined,
    });
    setBusy(false);
    if (res.error || !res.data) {
      setError(res.error || 'Could not send that.');
      return;
    }
    setSent(res.data);
    setCode('');
    setAmount('');
    setBillNumber('');
  };

  const voidBill = async (r: Recent) => {
    const ok = await confirm({
      title: `Cancel the ₹${r.amount.toLocaleString('en-IN')} bill?`,
      description:
        'The spend and points are taken back from the customer and they are told. Rewards they already claimed are not taken back.',
      confirmLabel: 'Cancel the bill',
      tone: 'danger',
    });
    if (!ok) return;
    const res = await apiService.post(`/v1/quick-bills/void/${r.billId}`, {});
    if (res.error) return toast.error(res.error);
    toast.success('Bill cancelled');
    loadRecent();
  };

  return (
    <BusinessLayout>
      <PageHeader
        title="Counter bill (Quick pay)"
        description="Ask the customer to open Quick pay on their phone. Type the 6-digit code and the bill amount. They confirm on their phone, and their progress and rewards update at once. No photo, no approval."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard
          title="Enter a bill"
          description="Bills up to ₹25,000. For larger bills the customer can upload a photo."
        >
          <form onSubmit={send} className="space-y-3">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Customer code (6 digits)</span>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric"
                autoComplete="off"
                placeholder="123456"
                className="h-12 font-mono text-xl tracking-[0.3em]"
                aria-label="Customer code"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Bill amount (₹)</span>
              <Input
                type="number"
                inputMode="decimal"
                min={1}
                max={25000}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-12 text-xl"
                aria-label="Bill amount"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">
                Bill number <span className="font-normal text-muted-foreground">(optional)</span>
              </span>
              <Input
                value={billNumber}
                onChange={(e) => setBillNumber(e.target.value)}
                maxLength={60}
                className="h-11"
              />
            </label>
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            <Button
              type="submit"
              className="min-h-12 w-full"
              loading={busy}
              disabled={code.length !== 6 || !amount}
            >
              Send to customer
            </Button>
          </form>

          {sent && (
            <div
              className={cn(
                'mt-4 flex items-start gap-3 rounded-xl border p-3 text-sm',
                sent.status === 'CONFIRMED'
                  ? 'border-success/30 bg-success-soft'
                  : sent.status === 'AWAITING'
                    ? 'border-border bg-secondary'
                    : 'border-destructive/30 bg-destructive/5',
              )}
              role="status"
              aria-live="polite"
              data-testid="counter-status"
            >
              {sent.status === 'AWAITING' ? (
                <Loader2
                  className="mt-0.5 size-5 shrink-0 animate-spin text-muted-foreground"
                  aria-hidden
                />
              ) : sent.status === 'CONFIRMED' ? (
                <CheckCircle2
                  className="mt-0.5 size-5 shrink-0 text-success-soft-foreground"
                  aria-hidden
                />
              ) : (
                <XCircle className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden />
              )}
              <p>
                {sent.status === 'AWAITING' &&
                  `Waiting for the customer to confirm ₹${Number(sent.amount).toLocaleString('en-IN')}…`}
                {sent.status === 'CONFIRMED' &&
                  `Confirmed: ₹${Number(sent.amount).toLocaleString('en-IN')} added.`}
                {sent.status === 'DECLINED' &&
                  'The customer said the amount was wrong. Enter it again.'}
                {sent.status === 'EXPIRED' && 'That timed out. Ask the customer for a new code.'}
              </p>
            </div>
          )}
        </SectionCard>

        {recent && (
          <SectionCard
            title="Recent Quick pay bills"
            description="So you can spot a mistake. You can cancel a bill within 7 days."
          >
            {recent.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">None yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {recent.slice(0, 20).map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p
                        className={cn('text-sm font-medium', r.voided && 'line-through opacity-60')}
                      >
                        ₹{r.amount.toLocaleString('en-IN')} · {r.customer}
                      </p>
                      <p className="truncate text-caption text-muted-foreground">
                        {when(r.at)} · entered by {r.staff ?? 'staff'}
                        {r.voided ? ' · cancelled' : ''}
                      </p>
                    </div>
                    {r.canVoid && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="min-h-10 shrink-0"
                        onClick={() => voidBill(r)}
                      >
                        Cancel
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        )}
      </div>
    </BusinessLayout>
  );
}
