'use client';

/**
 * Business owner's plan + billing page.
 *
 * Entitlements (what you have, what is live) come from /v1/subscriptions/businesses/:id/entitlements.
 * What can be bought is the shared catalogue in @saas/types: Free, one bundle (Single/Multi, with or
 * without analytics) and stackable add-ons. The cart is priced client-side only for display; the
 * server prices it again on POST /v1/businesses/:id/purchase and the rows stay pending until our
 * office verifies the UPI payment. Payment history, billing details and invoices are unchanged.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Building2, ChevronUp, CreditCard } from 'lucide-react';
import { ADDONS, priceCart, unitPrice, type CartLine } from '@saas/types';
import { BusinessLayout } from '@/components/layouts/business-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { EmptyState } from '@/components/common/empty-state';
import { StatusPill } from '@/components/common/status-pill';
import { Skel, SkeletonRegion } from '@/components/common/skeletons';
import { apiService } from '@/lib/services/api-service';
import { formatINR } from '@/lib/subscription-plans';
import { useOwnerBusiness } from '@/hooks/use-owner-business';
import { invalidateEntitlements, useEntitlements } from '@/hooks/use-entitlements';
import {
  CurrentPlanCard,
  CurrentPlanCardSkeleton,
} from '@/components/business/plans/current-plan-card';
import { PlanPicker } from '@/components/business/plans/plan-picker';
import { CartSummary } from '@/components/business/plans/cart-summary';
import { PayDialog } from '@/components/business/plans/pay-dialog';
import {
  fmtDate,
  previewEntitlements,
  type BundleFamily,
  type PurchasableCycle,
} from '@/components/business/plans/plan-helpers';

type Payment = {
  id: string;
  amount: string | number;
  method: string;
  status: string;
  transactionRef?: string | null;
  createdAt: string;
  verifiedAt?: string | null;
};

function scrollToId(id: string) {
  if (typeof document === 'undefined') return;
  const reduce =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  document
    .getElementById(id)
    ?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
}

export default function BusinessSubscriptionsPage() {
  const { business, loading: bizLoading } = useOwnerBusiness();
  const { ent, loading: entLoading, error: entError, refresh } = useEntitlements();

  const businessId = business?.id ?? '';
  const family: BundleFamily = business?.brandId ? 'MULTI' : 'SINGLE';

  // Payment history + invoice details (unchanged endpoints).
  const [payments, setPayments] = useState<Payment[]>([]);
  const [billing, setBilling] = useState<any>(null);
  const [histLoading, setHistLoading] = useState(true);

  const loadHistory = useCallback(async (id: string) => {
    const [payRes, billRes] = await Promise.allSettled([
      apiService.get<any>(`/v1/payments/businesses/${id}`),
      apiService.get<any>(`/v1/payments/businesses/${id}/billing-profile`),
    ]);
    if (payRes.status === 'fulfilled' && !payRes.value.error) {
      const p = Array.isArray(payRes.value.data)
        ? payRes.value.data
        : (payRes.value.data?.data ?? []);
      setPayments(p);
    }
    if (billRes.status === 'fulfilled' && !billRes.value.error) setBilling(billRes.value.data);
    setHistLoading(false);
  }, []);

  useEffect(() => {
    if (!businessId) {
      if (!bizLoading) setHistLoading(false);
      return;
    }
    void loadHistory(businessId);
  }, [businessId, bizLoading, loadHistory]);

  // Cart state.
  const [cycle, setCycle] = useState<PurchasableCycle>('MONTHLY');
  const [analytics, setAnalytics] = useState(false);
  const [bundleOn, setBundleOn] = useState(false);
  const [addons, setAddons] = useState<Record<string, number>>({});
  const [sheetOpen, setSheetOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);

  // Start the toggles where the business already is (once, when entitlements arrive).
  const seeded = useRef(false);
  useEffect(() => {
    if (!ent || seeded.current) return;
    seeded.current = true;
    if (ent.cycle === 'YEARLY') setCycle('YEARLY');
    if (ent.plan.endsWith('_AN') || ent.analytics) setAnalytics(true);
  }, [ent]);

  const bundleCode = family + (analytics ? '_AN' : '');

  const lines = useMemo<CartLine[]>(() => {
    const out: CartLine[] = [];
    if (bundleOn && unitPrice(bundleCode, cycle) != null) {
      out.push({ code: bundleCode, quantity: 1 });
    }
    for (const a of ADDONS) {
      const q = addons[a.code] ?? 0;
      // Add-ons without a price on this cycle (Extra offer on Yearly) are dropped, not errored.
      if (q > 0 && unitPrice(a.code, cycle) != null) out.push({ code: a.code, quantity: q });
    }
    return out;
  }, [bundleOn, bundleCode, addons, cycle]);

  const priced = useMemo(() => (lines.length ? priceCart(lines, cycle) : null), [lines, cycle]);
  const cart = priced && priced.ok ? priced.cart : null;
  const cartError = priced && !priced.ok ? priced.error : null;
  const preview = useMemo(() => previewEntitlements(ent, lines), [ent, lines]);

  const pendingCount = payments.filter((p) => p.status === 'PENDING').length;

  const setAddon = (code: string, qty: number) => setAddons((prev) => ({ ...prev, [code]: qty }));

  const clearCart = () => {
    setBundleOn(false);
    setAddons({});
  };

  const onRenew = () => {
    if (ent && ent.source === 'PLAN') {
      setAnalytics(ent.plan.endsWith('_AN'));
      if (ent.cycle === 'YEARLY' || ent.cycle === 'MONTHLY') setCycle(ent.cycle);
      setBundleOn(true);
    }
    scrollToId('plan-picker');
  };

  const startPay = () => {
    if (!cart) return;
    setSheetOpen(false);
    setPayOpen(true);
  };

  const onSubmitted = () => {
    if (businessId) invalidateEntitlements(businessId);
    void refresh();
    if (businessId) void loadHistory(businessId);
  };

  const loading = bizLoading || (entLoading && !ent);
  const hasCart = lines.length > 0;

  return (
    <BusinessLayout>
      <div className={hasCart ? 'space-y-6 pb-28 lg:pb-0' : 'space-y-6'}>
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground">
            <CreditCard className="h-6 w-6 text-primary" />
            Subscription
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your plan, what you are using, and the plans you can add. Payments are verified by our
            team.
          </p>
        </div>

        {loading || histLoading ? (
          <div className="space-y-6">
            <CurrentPlanCardSkeleton />
            <SkeletonRegion label="Loading plans" className="grid gap-3 sm:grid-cols-2">
              <Skel className="h-56 rounded-card" />
              <Skel className="h-56 rounded-card" />
            </SkeletonRegion>
          </div>
        ) : !business ? (
          <EmptyState
            icon={Building2}
            title="No business yet"
            description="Plans are tied to a business listing. Create your listing first, then come back here."
          />
        ) : (
          <>
            {ent ? (
              <CurrentPlanCard
                ent={ent}
                pendingCount={pendingCount}
                onRenew={onRenew}
                onAddCapacity={() => scrollToId('plan-addons')}
              />
            ) : (
              <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
                <p className="text-sm text-muted-foreground">
                  {entError
                    ? 'We could not load your plan details just now.'
                    : 'Your plan details are not available yet.'}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11 ui-press"
                  onClick={() => void refresh()}
                >
                  Try again
                </Button>
              </Card>
            )}

            <div className="gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
              <PlanPicker
                ent={ent}
                family={family}
                outletName={business.name}
                cycle={cycle}
                onCycle={setCycle}
                analytics={analytics}
                onAnalytics={setAnalytics}
                bundleOn={bundleOn}
                onBundleOn={setBundleOn}
                addons={addons}
                onAddon={setAddon}
              />

              <aside className="mt-6 hidden lg:sticky lg:top-6 lg:mt-0 lg:block">
                <Card className="p-5">
                  <CartSummary
                    cart={cart}
                    error={cartError}
                    preview={preview}
                    onPay={startPay}
                    onClear={clearCart}
                  />
                </Card>
              </aside>
            </div>

            {/* Invoice / billing details on file */}
            <div>
              <h2 className="mb-2 text-sm font-bold text-foreground">Invoice details</h2>
              {billing ? (
                <Card className="p-5 ui-fade-up">
                  <div className="grid gap-x-6 gap-y-2 text-xs sm:grid-cols-2">
                    <div className="text-muted-foreground">
                      Billing name:{' '}
                      <span className="font-medium text-foreground">{billing.billingName}</span>
                    </div>
                    <div className="text-muted-foreground">
                      GST:{' '}
                      <span className="font-medium text-foreground">
                        {billing.hasGst ? billing.gstin || 'Yes' : 'Not registered'}
                      </span>
                    </div>
                    <div className="text-muted-foreground">
                      PAN: <span className="font-medium text-foreground">{billing.pan || '—'}</span>
                    </div>
                    <div className="text-muted-foreground">
                      Invoice email:{' '}
                      <span className="break-all font-medium text-foreground">
                        {billing.invoiceEmail}
                      </span>
                    </div>
                    <div className="text-muted-foreground sm:col-span-2">
                      Address:{' '}
                      <span className="text-foreground">
                        {billing.addressLine}
                        {billing.city ? `, ${billing.city}` : ''}
                        {billing.state ? `, ${billing.state}` : ''} — {billing.pincode}
                      </span>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Invoices are raised by our office and sent to the email above.
                  </p>
                </Card>
              ) : (
                <Card className="p-5">
                  <p className="text-xs text-muted-foreground">
                    No invoice details on file yet. They're collected with your payment.
                  </p>
                </Card>
              )}
            </div>

            {/* Payment history */}
            <div>
              <h2 className="mb-2 text-sm font-bold text-foreground">Payment history</h2>
              {payments.length === 0 ? (
                <Card className="p-6 text-center">
                  <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
                </Card>
              ) : (
                <Card className="ui-fade-up overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/40 text-xs text-muted-foreground">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium">Date</th>
                          <th className="px-4 py-3 text-left font-medium">Amount</th>
                          <th className="px-4 py-3 text-left font-medium">Method</th>
                          <th className="px-4 py-3 text-left font-medium">Reference</th>
                          <th className="px-4 py-3 text-left font-medium">Status</th>
                          <th className="px-4 py-3 text-left font-medium">Invoice</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payments.map((p) => (
                          <tr key={p.id} className="border-t border-border">
                            <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                              {fmtDate(p.createdAt)}
                            </td>
                            <td className="px-4 py-3 font-semibold text-foreground">
                              {formatINR(Number(p.amount || 0))}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">{p.method}</td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {p.transactionRef || '—'}
                            </td>
                            <td className="px-4 py-3">
                              {p.status === 'SUCCESS' ? (
                                <StatusPill tone="success" label="Verified" />
                              ) : p.status === 'FAILED' ? (
                                <StatusPill tone="danger" label="Rejected" />
                              ) : (
                                <StatusPill tone="warning" label="Awaiting verification" />
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <Link
                                href={`/dashboard/invoice/${p.id}`}
                                className="inline-flex min-h-11 items-center font-medium text-primary hover:underline"
                              >
                                View
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </div>
          </>
        )}
      </div>

      {/* Mobile / tablet: sticky total that opens the cart as a bottom sheet. */}
      {business && hasCart && (
        <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 px-3 md:bottom-4 md:pl-64 lg:hidden">
          <div className="ui-fade-up mx-auto flex w-full max-w-xl items-center gap-3 rounded-2xl border border-border bg-card/95 p-2 pl-4 shadow-e3 backdrop-blur">
            <div className="min-w-0 flex-1">
              <div className="text-xs text-muted-foreground">
                {lines.length} item{lines.length === 1 ? '' : 's'} · incl. GST
              </div>
              <div className="text-base font-extrabold tabular-nums text-foreground">
                {cart ? formatINR(cart.totals.total) : '—'}
              </div>
            </div>
            <Button
              type="button"
              className="ui-press min-h-11"
              onClick={() => setSheetOpen(true)}
              disabled={!cart}
            >
              Review order <ChevronUp className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-base">Your order</SheetTitle>
            <SheetDescription className="sr-only">
              Review the plan and add-ons, then pay with UPI or QR.
            </SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-4">
            <CartSummary
              cart={cart}
              error={cartError}
              preview={preview}
              onPay={startPay}
              onClear={() => {
                clearCart();
                setSheetOpen(false);
              }}
              showHeading={false}
            />
          </div>
        </SheetContent>
      </Sheet>

      <PayDialog
        open={payOpen}
        onOpenChange={setPayOpen}
        businessId={businessId}
        cycle={cycle}
        lines={lines}
        cart={cart}
        onSubmitted={onSubmitted}
        onDone={clearCart}
      />
    </BusinessLayout>
  );
}
