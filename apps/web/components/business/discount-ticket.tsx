'use client';

import { PartyPopper, Ticket as TicketIcon, CheckCircle2 } from 'lucide-react';

interface DiscountTicketProps {
  businessName: string;
  itemName: string;
  discountPercent: number;
  code: string;
  status: string;
  expiresAt?: string | null;
}

function fmtDate(iso?: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** A redeemable "ticket" for a won spin — shown in-app and read out/scanned in-store. */
export function DiscountTicket({ businessName, itemName, discountPercent, code, status, expiresAt }: DiscountTicketProps) {
  const redeemed = status === 'REDEEMED';
  const expiry = fmtDate(expiresAt);

  return (
    <div className="mx-auto w-full max-w-sm">
      <div className="relative rounded-2xl border border-dashed border-primary/40 bg-card shadow-md shadow-primary/5 overflow-hidden transition-transform duration-200 hover:-translate-y-0.5">
        {/* Perforation notches */}
        <div className="absolute left-1/2 -translate-x-1/2 top-[108px] -ml-3 h-6 w-6 rounded-full bg-background border border-dashed border-primary/40" style={{ left: -12 }} />
        <div className="absolute top-[108px] h-6 w-6 rounded-full bg-background border border-dashed border-primary/40" style={{ right: -12 }} />

        <div className="relative p-5 text-center bg-gradient-to-b from-primary/10 to-transparent overflow-hidden">
          {!redeemed && <span className="disc-shimmer pointer-events-none absolute inset-0 opacity-60" />}
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary">
            <PartyPopper className="h-5 w-5" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">You won</p>
          <p className="text-4xl font-extrabold text-primary mt-1">{discountPercent}% off</p>
          <p className="text-sm text-foreground mt-1 break-words">{itemName}</p>
          <p className="text-xs text-muted-foreground mt-0.5 break-words">at {businessName}</p>
        </div>

        <div className="border-t border-dashed border-primary/30 px-5 py-4 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
            Show this code in-store
          </p>
          <p className="text-2xl font-mono font-extrabold tracking-wider text-foreground">{code}</p>
          <div className="mt-3 flex items-center justify-center gap-1.5 text-xs">
            {redeemed ? (
              <span className="inline-flex items-center gap-1 font-semibold text-success">
                <CheckCircle2 className="h-3.5 w-3.5" /> Redeemed
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 font-semibold text-muted-foreground">
                <TicketIcon className="h-3.5 w-3.5" /> Not yet redeemed
              </span>
            )}
            {expiry && !redeemed && <span className="text-muted-foreground">· valid until {expiry}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
