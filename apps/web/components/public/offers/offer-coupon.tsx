'use client';

import { useI18n } from '@/lib/i18n/provider';

import { useEffect, useState } from 'react';
import { getOpenStatus } from '@saas/types';
import {
  Clock,
  Eye,
  MapPin,
  Phone,
  ShoppingBag,
  Sparkles,
  Tag,
  UtensilsCrossed,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ReportButton } from '@/components/report-button';
import { StatusPill } from '@/components/common/status-pill';
import { ResponsiveImage } from '@/components/common/responsive-image';
import { cn } from '@/lib/utils';
import type { Offer } from './offer-model';
import { useSecondTick } from './offer-clock';

/** SVG tick that draws itself (`ui-check`) when `animate`; static otherwise. */
export function TickIcon({
  className,
  animate = false,
}: {
  className?: string;
  animate?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={cn(animate && 'ui-check', className)}
    >
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

/* ── Perforation ────────────────────────────────────────────────────────
   The coupon is two stacked boxes (details above, actions below) joined by a
   dashed line. Each box masks out a quarter-circle at the corners that meet, so
   together they read as a half-circle bite on both edges — and because it is a
   mask the page background shows through, whatever it is. */
const NOTCH = '#0000 97%, #000';
const topMask = [
  `radial-gradient(circle 9px at 0 100%, ${NOTCH}) left / 51% 100% no-repeat`,
  `radial-gradient(circle 9px at 100% 100%, ${NOTCH}) right / 51% 100% no-repeat`,
].join(', ');
const bottomMask = [
  `radial-gradient(circle 9px at 0 0, ${NOTCH}) left / 51% 100% no-repeat`,
  `radial-gradient(circle 9px at 100% 0, ${NOTCH}) right / 51% 100% no-repeat`,
].join(', ');
const TOP_STYLE = { WebkitMask: topMask, mask: topMask } as const;
const BOTTOM_STYLE = { WebkitMask: bottomMask, mask: bottomMask } as const;

/* ── Validity ─────────────────────────────────────────────────────────── */
const DAY = 86_400_000;

function formatCountdown(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}h ${pad(m)}m ${pad(sec)}s` : `${m}m ${pad(sec)}s`;
}

/**
 * "Ends in 2 days" — or, inside the last 24 hours, a live h/m/s countdown on the
 * page's single shared 1s ticker. Anything further out never ticks. Before mount
 * the label is a fixed IST date so server HTML and hydration agree exactly.
 */
function ExpiryLine({ expiresAt }: { expiresAt: string }) {
  const { t } = useI18n();
  const [base, setBase] = useState<number | null>(null);
  useEffect(() => setBase(Date.now()), []);

  const end = Date.parse(expiresAt);
  const valid = Number.isFinite(end);
  const live = base != null && valid && end - base > 0 && end - base < DAY;
  const tick = useSecondTick(live);
  if (!valid) return null;

  const now = base == null ? null : Math.max(base, tick);
  let label: string;
  let urgent = false;
  if (now == null) {
    label = t('offer.endsOn', {
      date: new Date(end).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        timeZone: 'Asia/Kolkata',
      }),
    });
  } else {
    const ms = end - now;
    urgent = ms < 3 * DAY;
    if (ms <= 0) label = 'Ending now';
    else if (ms < DAY) label = t('offer.endsIn', { time: formatCountdown(ms) });
    else label = t('offer.endsInDays', { n: Math.ceil(ms / DAY) });
  }

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 text-xs',
        urgent ? 'font-medium text-warning-soft-foreground' : 'text-muted-foreground',
      )}
    >
      <Clock className="h-3.5 w-3.5 shrink-0" />
      <span suppressHydrationWarning className="tabular-nums">
        {label}
      </span>
    </div>
  );
}

/** Open/closed for the offering business, only when its opening hours came with the offer. Computed after mount (viewer's clock). */
function OpenPill({ hours }: { hours: unknown }) {
  const [open, setOpen] = useState<boolean | null>(null);
  useEffect(() => {
    const s = getOpenStatus(hours);
    setOpen(s ? s.isOpen : null);
  }, [hours]);
  if (open == null) return null;
  return open ? (
    <StatusPill live tone="success" label="Open now" className="px-2 py-0.5 text-xs leading-4" />
  ) : (
    <StatusPill tone="neutral" label="Closed" className="px-2 py-0.5 text-xs leading-4" />
  );
}

export function OfferCoupon({
  offer,
  claimed,
  justClaimed,
  onView,
  onClaim,
}: {
  offer: Offer;
  claimed: boolean;
  justClaimed: boolean;
  onView: (offer: Offer) => void;
  onClaim: (offer: Offer) => void;
}) {
  const { t } = useI18n();
  const showBadge = claimed || !!offer.discountLabel;
  const showImage = !!offer.imageUrl || !!offer.imagePending;

  // Platform offers have nothing to redeem — the customer contacts the vendor
  // directly — so they get a Call button (when there is a number), never Claim.
  let primary: React.ReactNode = null;
  if (offer.isPlatform) {
    if (offer.phone) {
      primary = (
        <a href={`tel:${offer.phone}`} className="block">
          <Button variant="secondary" className="ui-press h-11 w-full gap-1.5 rounded-xl">
            <Phone className="h-4 w-4" /> {t('offer.call')}
          </Button>
        </a>
      );
    }
  } else if (claimed) {
    primary = (
      <div
        className={cn(
          'flex h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-success/25 bg-success-soft text-sm font-semibold text-success-soft-foreground',
          justClaimed && 'ui-pop',
        )}
      >
        <TickIcon animate={justClaimed} className="h-4 w-4" /> {t('offer.claimed')}
      </div>
    );
  } else {
    primary = (
      <Button onClick={() => onClaim(offer)} className="ui-press h-11 w-full gap-1.5 rounded-xl">
        <Sparkles className="h-4 w-4" /> {t('offer.claim')}
      </Button>
    );
  }

  return (
    // ui-cv-auto skips layout/paint work for cards that are far off-screen.
    <div className="ui-cv-auto group">
      <article className={cn('transition-opacity', claimed && 'opacity-80')}>
        <div
          className="overflow-hidden rounded-t-2xl border border-b-0 border-border bg-card transition-colors group-hover:border-primary/30"
          style={TOP_STYLE}
        >
          {showImage && (
            <ResponsiveImage
              // A new signed URL must retry from scratch, not inherit a failed state.
              key={offer.imageUrl ?? 'pending'}
              src={offer.imageUrl}
              alt=""
              ratio="4 / 3"
              fit="contain"
              quality={70}
              sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, (max-width: 1600px) 33vw, 25vw"
              className="border-b border-border"
              fallback={
                offer.imagePending && !offer.imageUrl ? (
                  <span className="ui-skeleton absolute inset-0 rounded-none" aria-hidden />
                ) : (
                  <Tag className="h-8 w-8 opacity-40" />
                )
              }
            />
          )}

          <div className="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="line-clamp-2 break-words font-semibold leading-snug text-foreground">
                  {offer.title}
                </h3>
                {offer.business && (
                  <p className="mt-0.5 flex min-w-0 items-center gap-1 text-sm text-muted-foreground">
                    {offer.isPlatform && <MapPin className="h-3.5 w-3.5 shrink-0" />}
                    <span className="truncate">{offer.business}</span>
                    {!offer.isPlatform && offer.city && (
                      <span className="shrink-0">· {offer.city}</span>
                    )}
                  </p>
                )}
              </div>
              {showBadge && (
                <div
                  // key restarts the pop when the badge flips to the claimed tick
                  key={claimed ? 'claimed' : 'discount'}
                  className={cn(
                    'max-w-[45%] shrink-0 break-words rounded-xl px-3 py-1 text-right font-bold leading-tight',
                    // Admin-written price notes can be a sentence; keep them to two lines.
                    !claimed && (offer.discountLabel?.length ?? 0) > 14
                      ? 'line-clamp-2 text-sm'
                      : 'text-base',
                    claimed
                      ? 'bg-success-soft text-success-soft-foreground'
                      : 'bg-highlight-soft text-highlight-soft-foreground',
                    justClaimed && 'ui-pop',
                  )}
                >
                  {claimed ? (
                    <TickIcon animate={justClaimed} className="my-0.5 h-5 w-5" />
                  ) : (
                    <>
                      {offer.discountLabel}
                      {!offer.isPlatform && (
                        <span className="block text-xs font-semibold uppercase leading-3 tracking-wide opacity-80">
                          off
                        </span>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              {offer.businessType && (
                <span className="inline-block rounded-full border border-primary/20 bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand-soft-foreground">
                  {offer.businessType}
                </span>
              )}
              {offer.isPlatform && (
                <span className="inline-block rounded-full border border-warning/25 bg-warning-soft px-2 py-0.5 text-xs font-semibold text-warning-soft-foreground">
                  Platform exclusive
                </span>
              )}
              {(offer.fulfilment === 'DINE_IN' || offer.fulfilment === 'TAKEAWAY') && (
                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {offer.fulfilment === 'DINE_IN' ? (
                    <UtensilsCrossed className="h-3 w-3" />
                  ) : (
                    <ShoppingBag className="h-3 w-3" />
                  )}
                  {offer.fulfilment === 'DINE_IN' ? 'Dine-in only' : 'Takeaway only'}
                </span>
              )}
              {!offer.isPlatform && !!offer.operatingHours && (
                <OpenPill hours={offer.operatingHours} />
              )}
            </div>

            {offer.description && (
              <p className="mt-3 line-clamp-2 break-words text-sm text-muted-foreground">
                {offer.description}
              </p>
            )}
            {offer.expiresAt && (
              <div className="mt-3">
                <ExpiryLine expiresAt={offer.expiresAt} />
              </div>
            )}
          </div>
        </div>

        {/* Tear-off stub */}
        <div
          className="rounded-b-2xl border border-t-0 border-border bg-card transition-colors group-hover:border-primary/30"
          style={BOTTOM_STYLE}
        >
          <div aria-hidden className="mx-3 border-t border-dashed border-border" />
          <div className="flex items-center gap-2 px-4 pb-4 pt-3 sm:px-5">
            {primary ? (
              <>
                <div className="min-w-0 flex-1">{primary}</div>
                <Button
                  onClick={() => onView(offer)}
                  variant="outline"
                  size="icon"
                  aria-label="View details"
                  title="View details"
                  className="ui-press h-11 w-11 shrink-0 rounded-xl"
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <Button
                onClick={() => onView(offer)}
                variant="outline"
                className="ui-press h-11 flex-1 gap-1.5 rounded-xl"
              >
                <Eye className="h-4 w-4" /> View details
              </Button>
            )}
            <ReportButton
              kind="offer"
              targetId={offer.id}
              targetName={offer.title}
              className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:border-destructive/30 hover:text-destructive"
            />
          </div>
        </div>
      </article>
    </div>
  );
}
