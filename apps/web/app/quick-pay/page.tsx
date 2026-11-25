'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Loader2, QrCode, XCircle } from 'lucide-react';
import { PublicLayout } from '@/components/layouts/public-layout';
import { PageHeader } from '@/components/system/page-header';
import { EmptyState } from '@/components/common/empty-state';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { apiService } from '@/lib/services/api-service';

type Req = {
  id: string;
  code: string;
  status: 'OPEN' | 'AWAITING' | 'CONFIRMED' | 'DECLINED' | 'EXPIRED';
  expiresAt: string;
  amount: number | null;
  business: { id: string; name: string } | null;
};

const POLL_MS = 3000;

/** Quick pay: read this code to the cashier, then confirm the amount they enter. No photo, no waiting for approval. */
export default function QuickPayPage() {
  const { user, loading: authLoading } = useAuth();
  const [req, setReq] = useState<Req | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const open = useCallback(async () => {
    setError('');
    setBusy(true);
    const res = await apiService.post<Req>('/v1/quick-bills/open', {});
    setBusy(false);
    if (res.error || !res.data) {
      setError(res.error || 'Could not start Quick pay.');
      return;
    }
    setReq(res.data);
  }, []);

  useEffect(() => {
    if (user) open();
  }, [user, open]);

  // Watch for the cashier entering the amount, and for the answer to be recorded.
  useEffect(() => {
    if (!req || !['OPEN', 'AWAITING'].includes(req.status)) return;
    timer.current = setInterval(async () => {
      setNow(Date.now());
      const res = await apiService.get<Req>(`/v1/quick-bills/${req.id}/status`, { fresh: true });
      if (!res.error && res.data) setReq(res.data);
    }, POLL_MS);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [req]);

  const decide = async (accept: boolean) => {
    if (!req) return;
    setBusy(true);
    setError('');
    const res = await apiService.post<{ status: Req['status'] }>(
      `/v1/quick-bills/${req.id}/confirm`,
      { accept },
    );
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setReq({ ...req, status: res.data.status });
  };

  const secondsLeft = req
    ? Math.max(0, Math.floor((new Date(req.expiresAt).getTime() - now) / 1000))
    : 0;
  const mm = String(Math.floor(secondsLeft / 60)).padStart(1, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');

  return (
    <PublicLayout>
      <div className="mx-auto max-w-md space-y-6 py-2">
        <PageHeader
          title="Quick pay"
          description="Pay as usual, then read this code to the cashier. They enter your bill amount and you confirm it here. Your progress and rewards update straight away."
        />

        {authLoading ? (
          <Loader2
            className="mx-auto my-12 size-6 animate-spin text-muted-foreground"
            aria-label="Loading"
          />
        ) : !user ? (
          <EmptyState
            icon={QrCode}
            title="Sign in to use Quick pay"
            description="So your bill is added to your own rewards."
            action={{
              label: 'Sign in',
              href: `/login?redirect=${encodeURIComponent('/quick-pay')}`,
            }}
          />
        ) : !req ? (
          error ? (
            <Card className="space-y-3 rounded-card p-6 text-center">
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
              <Button className="min-h-11" onClick={open}>
                Try again
              </Button>
            </Card>
          ) : (
            <Loader2
              className="mx-auto my-12 size-6 animate-spin text-muted-foreground"
              aria-label="Loading"
            />
          )
        ) : req.status === 'OPEN' ? (
          <Card className="space-y-4 rounded-card p-6 text-center" data-testid="quick-pay-code">
            <p className="text-sm text-muted-foreground">Your code</p>
            <p
              className="font-mono text-5xl font-extrabold tracking-[0.2em] text-foreground"
              aria-label={`Code ${req.code.split('').join(' ')}`}
            >
              {req.code.slice(0, 3)} {req.code.slice(3)}
            </p>
            <p className="text-sm text-muted-foreground">
              Waiting for the cashier · expires in {mm}:{ss}
            </p>
            {secondsLeft === 0 && (
              <Button className="min-h-11" onClick={open} loading={busy}>
                Get a new code
              </Button>
            )}
          </Card>
        ) : req.status === 'AWAITING' ? (
          <Card
            className="space-y-4 rounded-card border-primary/40 p-6 text-center"
            role="alert"
            data-testid="quick-pay-confirm"
          >
            <p className="text-sm text-muted-foreground">
              {req.business?.name ?? 'The shop'} entered
            </p>
            <p className="text-4xl font-extrabold tabular-nums text-foreground">
              ₹{Number(req.amount).toLocaleString('en-IN')}
            </p>
            <p className="text-sm text-muted-foreground">Is that the amount you paid?</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button className="min-h-12 flex-1" loading={busy} onClick={() => decide(true)}>
                Yes, confirm
              </Button>
              <Button
                className="min-h-12 flex-1"
                variant="outline"
                disabled={busy}
                onClick={() => decide(false)}
              >
                No, that is wrong
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Only confirm if it matches your bill.</p>
          </Card>
        ) : req.status === 'CONFIRMED' ? (
          <Card
            className="space-y-4 rounded-card p-8 text-center"
            role="status"
            data-testid="quick-pay-done"
          >
            <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-success-soft text-success-soft-foreground">
              <CheckCircle2 className="size-7" aria-hidden />
            </span>
            <h2 className="text-xl font-bold">Added to your rewards</h2>
            <p className="text-sm text-muted-foreground">
              ₹{Number(req.amount).toLocaleString('en-IN')} at {req.business?.name} now counts
              towards your rewards.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button asChild className="min-h-11">
                <Link href="/rewards">See my rewards</Link>
              </Button>
              <Button variant="outline" className="min-h-11" onClick={open}>
                Another bill
              </Button>
            </div>
          </Card>
        ) : (
          <Card className="space-y-4 rounded-card p-8 text-center" role="status">
            <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <XCircle className="size-7" aria-hidden />
            </span>
            <h2 className="text-xl font-bold">
              {req.status === 'DECLINED' ? 'Not added' : 'That code timed out'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {req.status === 'DECLINED'
                ? 'You said the amount was wrong, so nothing was added. Ask the cashier to enter it again.'
                : 'No problem. Get a new code and read it to the cashier.'}
            </p>
            <Button className="min-h-11" onClick={open} loading={busy}>
              Get a new code
            </Button>
          </Card>
        )}

        {error && req && (
          <p className="text-center text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        <p className="text-center text-xs text-muted-foreground">
          Prefer a photo? You can still upload a bill from the business page. Bills over ₹25,000
          need a photo.
        </p>
      </div>
    </PublicLayout>
  );
}
