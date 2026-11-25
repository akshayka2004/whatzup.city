'use client';

import { useState } from 'react';
import { CheckCircle2, ScanLine, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';
import { QrScanModal } from '@/components/business/qr-scan-modal';
import { apiService } from '@/lib/services/api-service';
import { cn } from '@/lib/utils';

type Lookup = {
  valid: boolean;
  reason: string | null;
  customer: string;
  title: string;
  rewardType: string;
  rewardValue: number | null;
  rewardLabel: string | null;
  terms: string | null;
  expiresAt: string;
};

const rewardText = (l: Lookup) =>
  l.rewardType === 'PERCENT'
    ? `${l.rewardValue}% off`
    : l.rewardType === 'AMOUNT'
      ? `₹${Number(l.rewardValue || 0).toLocaleString('en-IN')} off`
      : l.rewardLabel || 'Gift';

const day = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });

/**
 * The counter box: type or scan the customer's code, check it, then confirm. Checking first shows who it
 * is for, which reward, and whether it still works, so staff never redeem the wrong thing. Any active
 * staff member can use it; every redemption is logged with who did it.
 */
export function RedeemBox({
  businessId,
  onRedeemed,
}: {
  businessId: string;
  onRedeemed?: () => void;
}) {
  const [code, setCode] = useState('');
  const [found, setFound] = useState<Lookup | null>(null);
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState<'check' | 'redeem' | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [scanning, setScanning] = useState(false);

  const reset = () => {
    setCode('');
    setFound(null);
    setAmount('');
  };

  const check = async (raw?: string) => {
    const c = (raw ?? code).trim();
    if (!c || busy) return;
    setBusy('check');
    setMessage(null);
    setFound(null);
    const res = await apiService.post<Lookup>('/v1/vouchers/lookup', { businessId, code: c });
    setBusy(null);
    if (res.error || !res.data) {
      setMessage({ ok: false, text: res.error || 'Could not check that code.' });
      return;
    }
    setCode(c.toUpperCase());
    setFound(res.data);
  };

  const redeem = async () => {
    if (!found?.valid || busy) return;
    setBusy('redeem');
    const res = await apiService.post<any>('/v1/vouchers/redeem', {
      businessId,
      code,
      billAmount: amount ? Number(amount) : undefined,
    });
    setBusy(null);
    if (res.error) {
      setMessage({ ok: false, text: res.error });
      toast.error(res.error);
      return;
    }
    const text = `Redeemed: ${res.data?.voucherTitle ?? 'reward'} for ${res.data?.customer ?? 'customer'}`;
    setMessage({ ok: true, text });
    toast.success(text);
    reset();
    onRedeemed?.();
  };

  return (
    <section
      className="rounded-card border border-border bg-card p-4 shadow-e1 sm:p-5"
      aria-labelledby="redeem-box-title"
    >
      <div className="flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-full bg-brand-soft text-brand-soft-foreground">
          <ScanLine className="size-4" aria-hidden />
        </span>
        <h2 id="redeem-box-title" className="text-sm font-semibold">
          Redeem a customer reward
        </h2>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Type or scan the code the customer shows. Check it first, then confirm.
      </p>

      <form
        className="mt-3 flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          check();
        }}
      >
        <Input
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            setFound(null);
          }}
          placeholder="VCH-A1B2C3"
          aria-label="Reward code"
          autoCapitalize="characters"
          autoComplete="off"
          className="h-11 font-mono tracking-wider"
        />
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            onClick={() => setScanning(true)}
          >
            <ScanLine className="size-4" aria-hidden /> Scan
          </Button>
          <Button
            type="submit"
            className="min-h-11"
            loading={busy === 'check'}
            disabled={!code.trim()}
          >
            Check
          </Button>
        </div>
      </form>

      {found && (
        <div
          className={cn(
            'mt-3 space-y-3 rounded-xl border p-3',
            found.valid
              ? 'border-success/30 bg-success-soft'
              : 'border-destructive/30 bg-destructive/5',
          )}
          role="status"
        >
          <div className="flex items-start gap-2">
            {found.valid ? (
              <CheckCircle2
                className="mt-0.5 size-5 shrink-0 text-success-soft-foreground"
                aria-hidden
              />
            ) : (
              <XCircle className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden />
            )}
            <div className="min-w-0 text-sm">
              <p className="font-semibold text-foreground">{found.title}</p>
              <p className="text-foreground">
                {rewardText(found)} · for {found.customer}
              </p>
              <p className="text-xs text-muted-foreground">
                {found.valid ? `Valid until ${day(found.expiresAt)}` : found.reason}
              </p>
              {found.terms && <p className="mt-1 text-xs text-muted-foreground">{found.terms}</p>}
            </div>
          </div>
          {found.valid && (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <label className="flex-1 space-y-1">
                <span className="text-xs text-muted-foreground">
                  Bill amount (₹), optional, for your records
                </span>
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="h-11"
                />
              </label>
              <Button className="min-h-11" loading={busy === 'redeem'} onClick={redeem}>
                Confirm and redeem
              </Button>
            </div>
          )}
        </div>
      )}

      {message && (
        <p
          className={cn(
            'mt-3 text-sm',
            message.ok ? 'text-success-soft-foreground' : 'text-destructive',
          )}
          role={message.ok ? 'status' : 'alert'}
        >
          {message.text}
        </p>
      )}

      <QrScanModal
        open={scanning}
        onClose={() => setScanning(false)}
        title="Scan the reward QR"
        description="Point your camera at the QR on the customer's phone."
        onScan={(text) => {
          setScanning(false);
          check(text);
        }}
      />
    </section>
  );
}
