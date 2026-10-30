'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import QRCode from 'qrcode';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock,
  Copy,
  ImagePlus,
  Loader2,
  MapPin,
  Phone,
  Smartphone,
  XCircle,
} from 'lucide-react';
import { PAYMENT_STATUS_LABEL, rupees, upiPayUri, type PaymentStatus } from '@saas/types';
import { PublicLayout } from '@/components/layouts/public-layout';
import { PageHeader } from '@/components/system/page-header';
import { EmptyState } from '@/components/common/empty-state';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';
import { useConfirm } from '@/components/common/confirm-dialog';
import { useAuth } from '@/hooks/use-auth';
import { apiService } from '@/lib/services/api-service';
import { fmtWhen } from '@/lib/event-booking';
import { uploadImage } from '@/lib/storage-upload';

interface Pay {
  id: string;
  status: PaymentStatus;
  amount: number;
  unitPrice: number;
  seats: number;
  tier: string | null;
  expiresAt: string;
  submittedAt: string | null;
  utr: string | null;
  hasScreenshot: boolean;
  note: string | null;
  resubmitCount: number;
  maxResubmits: number;
  event: {
    id: string;
    title: string;
    startDate: string;
    venue: string | null;
    city: string | null;
  };
  payTo: {
    upiId: string | null;
    payeeName: string | null;
    phone: string | null;
    qrImage: string | null;
  } | null;
  tickets: { id: string; holderName: string; isGuest: boolean; code: string; status: string }[];
}

function timeLeft(iso: string, now: number): string {
  const ms = new Date(iso).getTime() - now;
  if (ms <= 0) return 'now';
  const m = Math.floor(ms / 60_000);
  return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${Math.max(1, m)} min`;
}

export default function PayPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const confirm = useConfirm();
  const [pay, setPay] = useState<Pay | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [utr, setUtr] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const [qrFallback, setQrFallback] = useState('');
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    const res = await apiService.get<Pay>(`/v1/tickets/payments/${id}`, { fresh: true });
    if (res.error) setError(res.error);
    else {
      setError('');
      setPay(res.data);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    load();
  }, [authLoading, user, load]);

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(t);
  }, []);

  // While the host is checking, look again every half minute so approval shows up on its own.
  useEffect(() => {
    if (pay?.status !== 'SUBMITTED') return;
    const t = window.setInterval(() => {
      if (document.visibilityState === 'visible') load();
    }, 30_000);
    return () => window.clearInterval(t);
  }, [pay?.status, load]);

  const upiLink = useMemo(
    () =>
      pay?.payTo?.upiId
        ? upiPayUri({
            upiId: pay.payTo.upiId,
            payeeName: pay.payTo.payeeName || pay.event.title,
            amount: pay.amount,
            note: `Ticket ${pay.event.title}`,
          })
        : '',
    [pay],
  );

  // The host's own QR photo is the main way to pay. If they have none, draw one from their UPI ID.
  useEffect(() => {
    if (!upiLink || pay?.payTo?.qrImage) {
      setQrFallback('');
      return;
    }
    QRCode.toDataURL(upiLink, { width: 240, margin: 2 })
      .then(setQrFallback)
      .catch(() => setQrFallback(''));
  }, [upiLink, pay?.payTo?.qrImage]);

  const copy = (text: string, what: string) => {
    navigator.clipboard?.writeText(text).then(
      () => toast.success(`${what} copied.`),
      () => toast.error('Could not copy. Select and copy it by hand.'),
    );
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pay) return;
    setFormError('');
    const clean = utr.replace(/[\s-]/g, '').toUpperCase();
    if (!/^[A-Z0-9]{10,22}$/.test(clean)) {
      setFormError(
        'Enter the reference number exactly as your payment app shows it: 10 to 22 letters and digits.',
      );
      return;
    }
    setBusy(true);
    try {
      let proof: { proofBucket?: string; proofPath?: string } = {};
      if (file) {
        const up = await uploadImage(file, 'payment', pay.id, { maxSide: 1400 });
        proof = { proofBucket: up.bucket, proofPath: up.fileKey };
      }
      const res = await apiService.post<Pay>(`/v1/tickets/payments/${pay.id}/proof`, {
        utr: clean,
        ...proof,
      });
      if (res.error) {
        setFormError(res.error);
        await load();
        return;
      }
      toast.success('Proof sent. The host will verify it.');
      setPay(res.data);
      setUtr('');
      setFile(null);
    } catch (err: any) {
      setFormError(err?.message || 'Could not send your proof. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const giveUp = async () => {
    if (!pay) return;
    const ok = await confirm({
      title: 'Give up this seat?',
      description:
        pay.status === 'SUBMITTED'
          ? 'You already sent proof. If you paid, ask the host for a refund; the seat goes back to others.'
          : 'The seat goes back to other people. Nothing has been charged by us.',
      confirmLabel: 'Release the seat',
      tone: 'danger',
    });
    if (!ok) return;
    setBusy(true);
    const res = await apiService.post(`/v1/tickets/payments/${pay.id}/cancel`, {});
    setBusy(false);
    if (res.error) toast.error(res.error);
    else toast.success('Seat released.');
    load();
  };

  const open = pay && (pay.status === 'PENDING' || pay.status === 'SUBMITTED');
  const needsProof = pay?.status === 'PENDING';
  const correction = needsProof && pay.resubmitCount > 0 && pay.note;

  return (
    <PublicLayout>
      <PageHeader
        title="Pay for your ticket"
        description="Pay the host directly by UPI, then send the reference number."
      />

      {authLoading || loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden />
        </div>
      ) : !user ? (
        <EmptyState
          icon={Clock}
          title="Sign in to continue"
          description="Your held seat is saved on your account."
          action={{
            label: 'Sign in',
            href: `/login?redirect=${encodeURIComponent(`/tickets/pay/${id}`)}`,
          }}
        />
      ) : error || !pay ? (
        <EmptyState
          icon={XCircle}
          title="We could not open this payment"
          description={error || 'It may belong to another account.'}
          action={{ label: 'My tickets', href: '/tickets' }}
        />
      ) : (
        <div className="mx-auto max-w-xl space-y-5">
          <Card className="rounded-card p-5">
            <Link
              href={`/events/${pay.event.id}`}
              className="text-lg font-semibold text-foreground hover:underline"
            >
              {pay.event.title}
            </Link>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <CalendarDays className="size-4 shrink-0" aria-hidden />{' '}
              {fmtWhen(pay.event.startDate)}
            </p>
            {(pay.event.venue || pay.event.city) && (
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="size-4 shrink-0" aria-hidden />
                {[pay.event.venue, pay.event.city].filter(Boolean).join(', ')}
              </p>
            )}
            <div className="mt-4 flex items-end justify-between gap-3 border-t border-border pt-4">
              <div>
                <p className="text-xs text-muted-foreground">
                  {pay.seats} {pay.seats === 1 ? 'ticket' : 'tickets'}
                  {pay.tier ? ` · ${pay.tier}` : ''} · {rupees(pay.unitPrice)} each
                </p>
                <p className="text-3xl font-bold tabular-nums text-foreground">
                  {rupees(pay.amount)}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  pay.status === 'APPROVED'
                    ? 'bg-success-soft text-success-soft-foreground'
                    : open
                      ? 'bg-warning-soft text-warning-soft-foreground'
                      : 'bg-muted text-muted-foreground'
                }`}
              >
                {PAYMENT_STATUS_LABEL[pay.status]}
              </span>
            </div>
          </Card>

          {pay.status === 'APPROVED' && (
            <Card className="rounded-card border-success/30 bg-success-soft p-5">
              <p className="flex items-center gap-2 font-semibold text-success-soft-foreground">
                <CheckCircle2 className="size-5" aria-hidden /> Payment verified
              </p>
              <p className="mt-1 text-sm text-success-soft-foreground">
                Your {pay.seats === 1 ? 'ticket is' : 'tickets are'} ready. Show the QR at the gate.
              </p>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {pay.tickets.map((t) => (
                  <li key={t.id}>
                    <Link
                      href={`/tickets/${t.id}`}
                      className="flex min-h-12 items-center justify-between rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-muted/40"
                    >
                      {t.holderName}
                      <span className="font-mono text-xs text-muted-foreground">{t.code}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {(pay.status === 'REJECTED' ||
            pay.status === 'EXPIRED' ||
            pay.status === 'CANCELLED') && (
            <Card className="rounded-card border-destructive/30 bg-danger-soft p-5">
              <p className="flex items-center gap-2 font-semibold text-danger-soft-foreground">
                <XCircle className="size-5" aria-hidden />
                {pay.status === 'EXPIRED'
                  ? 'The time to pay ran out'
                  : pay.status === 'REJECTED'
                    ? 'The host could not accept this payment'
                    : 'This seat was released'}
              </p>
              {pay.note && <p className="mt-1 text-sm text-danger-soft-foreground">{pay.note}</p>}
              <p className="mt-2 text-sm text-danger-soft-foreground">
                {pay.status === 'REJECTED'
                  ? 'If you paid, ask the host for a refund. '
                  : 'The seat went back to other people. '}
                You can register again if seats remain.
              </p>
              <Button asChild size="sm" className="mt-3">
                <Link href={`/events/${pay.event.id}`}>Back to the event</Link>
              </Button>
            </Card>
          )}

          {correction && (
            <p className="flex items-start gap-2 rounded-xl bg-warning-soft px-4 py-3 text-sm text-warning-soft-foreground">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>
                <b>The host asked you to check this:</b> {pay.note}
              </span>
            </p>
          )}

          {pay.status === 'SUBMITTED' && (
            <Card className="rounded-card p-5">
              <p className="flex items-center gap-2 font-semibold text-foreground">
                <Clock className="size-5 text-primary" aria-hidden /> Waiting for the host
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                You sent reference <span className="font-mono text-foreground">{pay.utr}</span>
                {pay.hasScreenshot ? ' with a screenshot' : ''}. The host checks their UPI account
                and approves it. Your seat stays held, and we will tell you as soon as it is done.
              </p>
            </Card>
          )}

          {needsProof && pay.payTo && (
            <>
              <Card className="rounded-card p-5">
                <p className="text-sm font-semibold text-foreground">
                  Step 1. Pay {rupees(pay.amount)} to {pay.payTo.payeeName || 'the host'}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Pay the exact amount. Scan the QR with any UPI app, or use the UPI ID.
                </p>
                <div className="mt-4 flex justify-center rounded-2xl border border-border bg-white p-3">
                  {pay.payTo.qrImage ? (
                    // eslint-disable-next-line @next/next/no-img-element -- host-uploaded photo of their own QR
                    <img
                      src={pay.payTo.qrImage}
                      alt={`UPI QR code of ${pay.payTo.payeeName || 'the host'}`}
                      className="max-h-72 w-auto rounded-lg object-contain"
                    />
                  ) : qrFallback ? (
                    // eslint-disable-next-line @next/next/no-img-element -- generated data URL
                    <img
                      src={qrFallback}
                      alt={`UPI payment QR for ${rupees(pay.amount)}`}
                      width={240}
                      height={240}
                    />
                  ) : (
                    <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden />
                  )}
                </div>
                <dl className="mt-4 space-y-2 text-sm">
                  {pay.payTo.upiId && (
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-muted-foreground">UPI ID</dt>
                      <dd className="flex min-w-0 items-center gap-2">
                        <span className="truncate font-mono text-foreground">
                          {pay.payTo.upiId}
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          aria-label="Copy UPI ID"
                          onClick={() => copy(pay.payTo!.upiId!, 'UPI ID')}
                        >
                          <Copy className="size-3.5" aria-hidden /> Copy
                        </Button>
                      </dd>
                    </div>
                  )}
                  {pay.payTo.phone && (
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-muted-foreground">Host phone</dt>
                      <dd>
                        <a
                          href={`tel:+91${pay.payTo.phone}`}
                          className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
                        >
                          <Phone className="size-3.5" aria-hidden /> {pay.payTo.phone}
                        </a>
                      </dd>
                    </div>
                  )}
                </dl>
                {upiLink && (
                  <Button asChild size="lg" className="mt-4 w-full sm:hidden">
                    <a href={upiLink}>
                      <Smartphone className="size-4" aria-hidden /> Open my UPI app
                    </a>
                  </Button>
                )}
              </Card>

              <Card className="rounded-card p-5">
                <form onSubmit={submit} className="space-y-4" noValidate>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Step 2. Send the reference number
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      After paying, your UPI app shows a UTR or transaction ID. Type it here so the
                      host can find your payment.
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="utr" className="text-sm font-medium text-foreground">
                      UPI reference (UTR)
                    </label>
                    <Input
                      id="utr"
                      value={utr}
                      onChange={(e) => setUtr(e.target.value.toUpperCase())}
                      placeholder="e.g. 412345678901"
                      autoComplete="off"
                      inputMode="text"
                      maxLength={30}
                      className="h-11 font-mono"
                      aria-invalid={!!formError}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-sm font-medium text-foreground">
                      Payment screenshot <span className="text-muted-foreground">(optional)</span>
                    </span>
                    <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-control border border-dashed border-input bg-background px-3 text-sm text-muted-foreground hover:border-primary/50">
                      <ImagePlus className="size-4 shrink-0" aria-hidden />
                      <span className="min-w-0 truncate">
                        {file ? file.name : 'Add a screenshot of the payment'}
                      </span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="sr-only"
                        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                      />
                    </label>
                  </div>
                  {formError && (
                    <p role="alert" className="text-sm text-destructive">
                      {formError}
                    </p>
                  )}
                  <Button type="submit" size="lg" className="w-full" loading={busy}>
                    I have paid. Send proof
                  </Button>
                </form>
              </Card>
            </>
          )}

          {open && (
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
              <p className="text-muted-foreground">
                {pay.status === 'PENDING'
                  ? `Seat held for ${timeLeft(pay.expiresAt, now)}. After that it goes back.`
                  : 'Your seat stays held until the host decides.'}
              </p>
              <button
                type="button"
                onClick={giveUp}
                disabled={busy}
                className="cursor-pointer font-medium text-destructive hover:underline disabled:opacity-50"
              >
                Give up this seat
              </button>
            </div>
          )}
        </div>
      )}
    </PublicLayout>
  );
}
