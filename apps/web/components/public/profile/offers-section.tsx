'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import {
  Check,
  Clock,
  Loader2,
  Lock,
  ShoppingBag,
  Sparkles,
  Ticket,
  UtensilsCrossed,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/common/empty-state';
import { StatusPill } from '@/components/common/status-pill';
import { apiService } from '@/lib/services/api-service';
import { toast } from '@/components/ui/sonner';
import { ModalShell, SectionHeading } from './profile-ui';
import { OfferListSkeleton } from './profile-skeletons';
import { offerExpiry } from './profile-utils';

// The wheel is only for signed-in users, so keep its code out of everyone else's bundle.
const LuckyWheel = dynamic(
  () => import('@/components/business/lucky-wheel').then((m) => m.LuckyWheel),
  {
    ssr: false,
  },
);

function discountLabel(o: any): string {
  return o.discountPercent
    ? `${o.discountPercent}% Off`
    : o.discountAmount
      ? `₹${o.discountAmount} Off`
      : o.title || 'Special Offer';
}

function OfferCard({ offer, index, onClaim }: { offer: any; index: number; onClaim: () => void }) {
  const expiry = offerExpiry(offer);
  return (
    <div
      className="ui-fade-up flex flex-col rounded-2xl border border-border bg-card p-4"
      style={{ animationDelay: `${Math.min(index, 8) * 0.05}s` }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 break-words text-xl font-bold leading-tight text-primary">
          {discountLabel(offer)}
        </p>
        {expiry?.urgency && expiry.tone && (
          <StatusPill tone={expiry.tone} label={expiry.urgency} dot={false} className="shrink-0" />
        )}
      </div>
      {(offer.fulfilment === 'DINE_IN' || offer.fulfilment === 'TAKEAWAY') && (
        <span className="mt-2 inline-flex w-fit items-center gap-1 rounded-full border border-border bg-muted/50 px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {offer.fulfilment === 'DINE_IN' ? (
            <UtensilsCrossed className="h-3 w-3" />
          ) : (
            <ShoppingBag className="h-3 w-3" />
          )}
          {offer.fulfilment === 'DINE_IN' ? 'Dine-in only' : 'Takeaway only'}
        </span>
      )}
      {offer.description && (
        <p className="mt-2 text-sm text-muted-foreground">{offer.description}</p>
      )}
      {expiry && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5 shrink-0" />
          {expiry.label}
        </p>
      )}
      <div className="mt-auto pt-4">
        <Button onClick={onClaim} size="lg" className="ui-press w-full rounded-xl">
          Claim Offer
        </Button>
      </div>
    </div>
  );
}

export function OffersSection({
  biz,
  businessId,
  offers,
  loading,
  user,
  authLoading = false,
  fromQr,
}: {
  biz: any;
  businessId: string;
  offers: any[];
  loading: boolean;
  user: any;
  /** While the session is still resolving, a QR visitor is neither gated nor shown offers yet. */
  authLoading?: boolean;
  /** null until the URL has been read on the client. */
  fromQr: boolean | null;
}) {
  const router = useRouter();

  // ── Guest teaser for the spin wheel (public, no personal data)
  const [wheelPreview, setWheelPreview] = useState<{
    itemName: string;
    maxPercent: number | null;
  } | null>(null);
  useEffect(() => {
    if (user || !businessId) return;
    apiService
      .get<any>(`/v1/discounts/business/${businessId}/preview`)
      .then((r) => !r.error && r.data && setWheelPreview(r.data));
  }, [user, businessId]);

  // ── Vouchers (spend-gated) — needs a logged-in user for spend + unlock state
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [voucherSpend, setVoucherSpend] = useState(0);
  const [unlockingId, setUnlockingId] = useState<string | null>(null);

  const loadVouchers = async () => {
    if (!businessId || !user) return;
    const res = await apiService.get<any>(`/v1/vouchers/available/${businessId}`);
    if (res.data && !res.error) {
      setVouchers(res.data.vouchers ?? []);
      setVoucherSpend(res.data.spend ?? 0);
    }
  };
  useEffect(() => {
    loadVouchers(); /* eslint-disable-next-line */
  }, [businessId, user]);

  const unlockVoucher = async (id: string) => {
    setUnlockingId(id);
    const res = await apiService.post<any>(`/v1/vouchers/${id}/unlock`, {});
    setUnlockingId(null);
    if (!res.error && res.data?.code) {
      setVouchers((list) =>
        list.map((v) =>
          v.id === id ? { ...v, unlocked: true, code: res.data.code, status: res.data.status } : v,
        ),
      );
    }
  };

  // ── Offer claim state
  const [claimingOffer, setClaimingOffer] = useState<any>(null);
  const [claimedCode, setClaimedCode] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);

  // Only logged-in users may claim. Guests sign in and come straight back here.
  const handleClaimClick = (offer: any) => {
    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent(`/business/${businessId}`)}`);
      return;
    }
    setClaimingOffer(offer);
  };

  const handleConfirmClaim = async () => {
    if (!claimingOffer) return;
    if (!user) {
      setClaimingOffer(null);
      router.push(`/login?redirect=${encodeURIComponent(`/business/${businessId}`)}`);
      return;
    }
    setClaiming(true);
    // Server-side redemption (JWT-guarded) — records the claim + returns a code.
    const res = await apiService.post<any>(`/v1/offers/${claimingOffer.id}/redeem`, {});
    setClaiming(false);
    if (res.status === 401) {
      setClaimingOffer(null);
      router.push(`/login?redirect=${encodeURIComponent(`/business/${businessId}`)}`);
      return;
    }
    if (res.error) {
      // Never invent a code: a failed claim must look failed.
      toast.error(res.error || 'Could not claim this offer. Please try again.');
      return;
    }
    setClaimedCode(res.data?.code || claimingOffer.code || 'CLAIMED');
    setClaimingOffer(null);
  };

  const gated = fromQr === true && !user && !authLoading;
  const resolvingAuth = fromQr === true && !user && authLoading;

  return (
    <section id="offers-section" aria-label="Offers" className="mb-6 scroll-mt-16 lg:col-start-1">
      <SectionHeading
        icon={Ticket}
        title="Offers"
        hint={!gated && offers.length > 0 ? `${offers.length} active` : undefined}
      />

      {gated ? (
        <div className="rounded-2xl border border-border bg-card p-6 text-center">
          <Lock className="mx-auto mb-3 h-8 w-8 text-muted-foreground opacity-60" />
          <p className="mb-4 text-sm text-muted-foreground">
            Sign in to view {biz.name}&apos;s current offers.
          </p>
          <Button
            onClick={() =>
              router.push(
                `/login?redirect=${encodeURIComponent(`/business/${businessId}?src=qr#offers-section`)}`,
              )
            }
            size="lg"
            className="ui-press w-full rounded-xl font-semibold sm:w-auto sm:px-10"
          >
            Sign in
          </Button>
        </div>
      ) : loading || fromQr === null || resolvingAuth ? (
        <OfferListSkeleton />
      ) : offers.length === 0 ? (
        <EmptyState
          compact
          icon={Ticket}
          title="No active offers right now"
          description="New deals from this business will show up here."
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {offers.map((o, i) => (
            <OfferCard key={o.id || i} offer={o} index={i} onClaim={() => handleClaimClick(o)} />
          ))}
        </div>
      )}

      {/* ── Lucky wheel: guests see what they could win and sign in to spin */}
      {!user && !authLoading && wheelPreview && (
        <div className="mt-6 flex flex-col gap-4 rounded-card border border-primary/15 bg-brand-soft p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-card text-primary shadow-e1">
              <Sparkles className="size-5" aria-hidden />
            </span>
            <div>
              <p className="font-semibold text-foreground">
                Spin to win
                {wheelPreview.maxPercent ? ` up to ${wheelPreview.maxPercent}% off` : ' a discount'}
              </p>
              <p className="text-caption text-muted-foreground">
                On {wheelPreview.itemName}. One spin per customer.
              </p>
            </div>
          </div>
          <Button
            onClick={() =>
              router.push(`/login?redirect=${encodeURIComponent(`/business/${businessId}`)}`)
            }
            className="shrink-0"
          >
            Sign in to spin
          </Button>
        </div>
      )}

      {/* ── Lucky wheel discount */}
      {user && !gated && (
        <div className="mt-6 empty:hidden">
          <LuckyWheel businessId={businessId} enabled={!!user} />
        </div>
      )}

      {/* ── Vouchers (spend-gated) */}
      {user && vouchers.length > 0 && (
        <div className="ui-fade-up mt-6 rounded-2xl border border-border bg-card p-4 sm:p-6">
          <div className="mb-1 flex items-center gap-2">
            <Ticket className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold text-foreground sm:text-2xl">Vouchers</h2>
          </div>
          <p className="mb-4 text-sm text-muted-foreground">
            Your verified spend here:{' '}
            <span className="font-semibold text-foreground">
              ₹{voucherSpend.toLocaleString('en-IN')}
            </span>
            . Cross a threshold to unlock the code, then show it in-store.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {vouchers.map((v: any, i: number) => (
              <div
                key={v.id}
                className="ui-fade-up rounded-xl border border-border bg-secondary/50 p-4"
                style={{ animationDelay: `${Math.min(i, 8) * 0.05}s` }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold text-foreground">{v.title}</h3>
                    <p className="text-xs text-muted-foreground">
                      Unlocks at ₹{v.thresholdAmount.toLocaleString('en-IN')} spend
                    </p>
                  </div>
                  <span className="shrink-0 rounded-lg bg-brand-soft px-2 py-1 text-sm font-bold text-brand-soft-foreground">
                    {v.rewardType === 'PERCENT'
                      ? `${v.rewardValue}% off`
                      : v.rewardType === 'AMOUNT'
                        ? `₹${Number(v.rewardValue || 0).toLocaleString('en-IN')} off`
                        : v.rewardLabel || 'Reward'}
                  </span>
                </div>

                {/* Progress */}
                <div
                  className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round((v.progress ?? 0) * 100)}
                  aria-label="Progress towards unlocking"
                >
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${Math.round((v.progress ?? 0) * 100)}%` }}
                  />
                </div>

                {v.unlocked ? (
                  <div className="mt-3 flex items-center justify-between rounded-lg border border-success/25 bg-success/12 px-3 py-2">
                    <span className="font-mono text-sm font-bold tracking-wider text-success-soft-foreground">
                      {v.code}
                    </span>
                    <span className="text-xs font-semibold uppercase text-success-soft-foreground">
                      {v.status === 'REDEEMED' ? 'Redeemed' : 'Show in-store'}
                    </span>
                  </div>
                ) : v.qualified ? (
                  <Button
                    onClick={() => unlockVoucher(v.id)}
                    disabled={unlockingId === v.id}
                    size="lg"
                    className="ui-press mt-3 w-full gap-1.5"
                  >
                    {unlockingId === v.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Ticket className="h-4 w-4" />
                    )}
                    Unlock code
                  </Button>
                ) : (
                  <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Lock className="h-3.5 w-3.5" />
                    Spend ₹{v.remainingToUnlock.toLocaleString('en-IN')} more to unlock
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── CLAIM CONFIRMATION MODAL */}
      {claimingOffer && (
        <ModalShell
          label="Claim promotional offer"
          onClose={() => setClaimingOffer(null)}
          className="text-center sm:max-w-sm"
        >
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-brand-soft-foreground">
            <Ticket className="h-6 w-6" />
          </div>
          <h3 className="mb-2 text-lg font-bold text-foreground">Claim Promotional Offer</h3>
          <p className="mb-6 text-sm text-muted-foreground">
            Are you sure you want to claim the{' '}
            <span className="font-semibold text-foreground">
              {claimingOffer.discountPercent
                ? `${claimingOffer.discountPercent}% Off`
                : claimingOffer.title || 'this offer'}
            </span>
            ? This will generate a unique redemption code valid at {biz.name}.
          </p>
          <div className="flex justify-center gap-3">
            <Button
              onClick={() => setClaimingOffer(null)}
              variant="outline"
              size="lg"
              className="flex-1 rounded-xl sm:flex-none sm:px-6"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmClaim}
              disabled={claiming}
              size="lg"
              className="flex-1 rounded-xl font-semibold disabled:opacity-60 sm:flex-none sm:px-6"
            >
              {claiming ? 'Claiming…' : 'Confirm Claim'}
            </Button>
          </div>
        </ModalShell>
      )}

      {/* ── CLAIM SUCCESS MODAL */}
      {claimedCode && (
        <ModalShell
          label="Offer claimed"
          onClose={() => setClaimedCode(null)}
          className="text-center sm:max-w-sm"
        >
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success-soft text-success-soft-foreground">
            <Check className="ui-check h-6 w-6" />
          </div>
          <h3 className="mb-2 text-lg font-bold text-foreground">Offer Claimed!</h3>
          <p className="mb-4 text-xs text-muted-foreground">
            Present this code at the business counter to redeem your discount.
          </p>
          <div className="mb-6 rounded-xl border border-border bg-muted/50 p-4">
            <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
              Redemption Code
            </p>
            <p className="font-mono text-2xl font-extrabold tracking-wider text-success-soft-foreground">
              {claimedCode}
            </p>
          </div>
          <Button
            onClick={() => setClaimedCode(null)}
            size="lg"
            className="ui-press w-full rounded-xl font-semibold"
          >
            Done
          </Button>
        </ModalShell>
      )}
    </section>
  );
}
