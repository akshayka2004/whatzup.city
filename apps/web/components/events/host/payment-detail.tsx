'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, ExternalLink, Loader2, XCircle } from 'lucide-react';
import { PAYMENT_STATUS_LABEL, rupees, type PaymentStatus } from '@saas/types';
import { ModalSurface } from '@/components/system/modal-surface';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';
import { apiService } from '@/lib/services/api-service';
import { fmtWhen } from '@/lib/event-booking';
import { PAYMENT_ACTION_LABEL, type PaymentDetail } from '@/lib/event-host';
import { cn } from '@/lib/utils';

/** "1 payment", "3 payments". */
export const payments = (n: number) => `${n} ${n === 1 ? 'payment' : 'payments'}`;

export const STATUS_TONE: Record<PaymentStatus, string> = {
  PENDING: 'bg-muted text-muted-foreground',
  SUBMITTED: 'bg-warning-soft text-warning-soft-foreground',
  APPROVED: 'bg-success-soft text-success-soft-foreground',
  REJECTED: 'bg-danger-soft text-danger-soft-foreground',
  EXPIRED: 'bg-muted text-muted-foreground',
  CANCELLED: 'bg-muted text-muted-foreground',
};

const HOST_STATUS: Record<PaymentStatus, string> = {
  PENDING: 'Waiting for payer',
  SUBMITTED: 'To verify',
  APPROVED: 'Verified',
  REJECTED: 'Rejected',
  EXPIRED: 'Expired',
  CANCELLED: 'Cancelled',
};
export const statusLabel = (s: PaymentStatus) => HOST_STATUS[s] ?? PAYMENT_STATUS_LABEL[s];

export function StatusChip({ status }: { status: PaymentStatus }) {
  return (
    <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold', STATUS_TONE[status])}>
      {statusLabel(status)}
    </span>
  );
}

const ROLE: Record<string, string> = {
  ATTENDEE: 'Attendee',
  HOST: 'Host',
  ADMIN: 'Admin',
  SYSTEM: 'System',
};

/** Extra detail worth showing next to a trail entry. */
function detailText(d: Record<string, unknown> | null): string {
  if (!d) return '';
  const bits: string[] = [];
  if (typeof d.amount === 'number') bits.push(rupees(d.amount));
  if (typeof d.reason === 'string' && d.reason) bits.push(`"${d.reason}"`);
  if (typeof d.utrLast4 === 'string') bits.push(`ref ending ${d.utrLast4}`);
  if (d.hasScreenshot === true) bits.push('with screenshot');
  if (typeof d.tier === 'string') bits.push(d.tier);
  return bits.join(' · ');
}

/**
 * One payment in full: who paid, the proof, the trail of everything that happened, and (for the
 * host) approve or reject. Admins open it read-only from the monitoring page.
 */
export function PaymentDetailModal({
  paymentId,
  eventId,
  load,
  canAct,
  onClose,
  onChanged,
}: {
  paymentId: string;
  /** Needed to approve or reject. */
  eventId?: string;
  /** Where to fetch the detail from (host route or admin route). */
  load: string;
  canAct: boolean;
  onClose: () => void;
  onChanged?: () => void;
}) {
  const [p, setP] = useState<PaymentDetail | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [again, setAgain] = useState(true);
  const [zoom, setZoom] = useState(false);

  const fetchIt = async () => {
    const res = await apiService.get<PaymentDetail>(load, { fresh: true });
    if (res.error) setError(res.error);
    else {
      setError('');
      setP(res.data);
    }
  };
  useEffect(() => {
    fetchIt();
  }, [load]); // eslint-disable-line react-hooks/exhaustive-deps

  const base = `/v1/events/${eventId}/host/payments/${paymentId}`;
  const run = async (path: string, body: object, done: string) => {
    setBusy(true);
    const res = await apiService.post(`${base}/${path}`, body);
    setBusy(false);
    if (res.error) {
      toast.error(res.error);
      await fetchIt();
      return;
    }
    toast.success(done);
    onChanged?.();
    onClose();
  };

  const decidable = canAct && p?.status === 'SUBMITTED';

  return (
    <ModalSurface onClose={onClose} label="Payment" className="sm:max-w-xl">
      {!p ? (
        error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : (
          <Loader2 className="mx-auto my-10 size-6 animate-spin text-muted-foreground" />
        )
      ) : (
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3 pr-8">
            <div className="min-w-0">
              <h3 className="text-lg font-bold text-foreground">{rupees(p.amount)}</h3>
              <p className="text-sm text-muted-foreground">
                {p.seats} {p.seats === 1 ? 'ticket' : 'tickets'}
                {p.tier ? ` · ${p.tier}` : ''} · {p.event.title}
              </p>
            </div>
            <StatusChip status={p.status} />
          </div>

          <dl className="grid gap-x-4 gap-y-2 rounded-xl bg-muted/40 p-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted-foreground">Paid by</dt>
              <dd className="font-medium text-foreground">{p.payer.name}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Contact</dt>
              <dd className="break-all text-foreground">
                {p.payer.email}
                {p.payer.phone ? ` · ${p.payer.phone}` : ''}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">UPI reference (UTR)</dt>
              <dd className="font-mono text-foreground">{p.utr ?? 'Not sent yet'}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Proof sent</dt>
              <dd className="text-foreground">{p.submittedAt ? fmtWhen(p.submittedAt) : 'No'}</dd>
            </div>
          </dl>

          {p.sameReference.length > 0 && (
            <p className="flex items-start gap-2 rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger-soft-foreground">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
              This reference number also appears on {p.sameReference.length} other{' '}
              {p.sameReference.length === 1 ? 'payment' : 'payments'}. Check your bank statement
              carefully before approving.
            </p>
          )}

          {p.payerNote && (
            <p className="rounded-xl border border-border px-3 py-2 text-sm text-foreground">
              <span className="text-xs text-muted-foreground">Note from the payer: </span>
              {p.payerNote}
            </p>
          )}

          {p.proofUrl ? (
            <div>
              <p className="mb-1 text-xs text-muted-foreground">Screenshot</p>
              <button
                type="button"
                onClick={() => setZoom((z) => !z)}
                className="block w-full cursor-zoom-in overflow-hidden rounded-xl border border-border bg-muted/30"
                aria-label={zoom ? 'Shrink the screenshot' : 'Enlarge the screenshot'}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed link */}
                <img
                  src={p.proofUrl}
                  alt="Payment screenshot sent by the attendee"
                  className={cn(
                    'mx-auto w-auto object-contain',
                    zoom ? 'max-h-[80vh]' : 'max-h-48',
                  )}
                />
              </button>
              <a
                href={p.proofUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                Open full size <ExternalLink className="size-3" aria-hidden />
              </a>
            </div>
          ) : (
            p.status === 'SUBMITTED' && (
              <p className="text-sm text-muted-foreground">
                No screenshot. Match the reference number and amount in your UPI app.
              </p>
            )
          )}

          {p.decisionNote && (
            <p className="rounded-xl bg-muted/40 px-3 py-2 text-sm text-foreground">
              <span className="text-xs text-muted-foreground">Reason given: </span>
              {p.decisionNote}
            </p>
          )}

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              What happened
            </p>
            <ol className="space-y-2 border-l border-border pl-4">
              {p.logs.map((l) => (
                <li key={l.id} className="relative text-sm">
                  <span
                    className="absolute -left-[21px] top-1.5 size-2 rounded-full bg-primary"
                    aria-hidden
                  />
                  <p className="font-medium text-foreground">{PAYMENT_ACTION_LABEL[l.action]}</p>
                  <p className="text-xs text-muted-foreground">
                    {ROLE[l.actorRole] ?? l.actorRole} · {fmtWhen(l.createdAt)}
                    {detailText(l.detail) ? ` · ${detailText(l.detail)}` : ''}
                  </p>
                </li>
              ))}
            </ol>
          </div>

          {decidable && !rejecting && (
            <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
              <Button variant="outline" onClick={() => setRejecting(true)} disabled={busy}>
                <XCircle className="size-4" aria-hidden /> Reject
              </Button>
              <Button
                onClick={() => run('approve', {}, 'Payment approved. Ticket issued.')}
                loading={busy}
              >
                <CheckCircle2 className="size-4" aria-hidden /> Approve and issue ticket
              </Button>
            </div>
          )}
          {decidable && rejecting && (
            <div className="space-y-3 border-t border-border pt-4">
              <label htmlFor="reject-reason" className="text-sm font-medium text-foreground">
                Tell the attendee why
              </label>
              <textarea
                id="reject-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={300}
                rows={3}
                placeholder="e.g. The amount is less than the ticket price"
                className="w-full rounded-control border border-input bg-background p-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30"
              />
              <label className="flex cursor-pointer items-start gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={again}
                  onChange={(e) => setAgain(e.target.checked)}
                  className="mt-0.5 size-4 accent-primary"
                />
                <span>
                  Let them send corrected proof and keep their seat
                  <span className="block text-xs text-muted-foreground">
                    Untick to release the seat. They are told to ask you for a refund if they paid.
                  </span>
                </span>
              </label>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setRejecting(false)} disabled={busy}>
                  Back
                </Button>
                <Button
                  variant="destructive"
                  loading={busy}
                  disabled={reason.trim().length < 3}
                  onClick={() =>
                    run(
                      'reject',
                      { reason: reason.trim(), allowResubmit: again },
                      again ? 'Asked for corrected proof.' : 'Payment rejected. Seat released.',
                    )
                  }
                >
                  {again ? 'Ask for corrected proof' : 'Reject and release seat'}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </ModalSurface>
  );
}
