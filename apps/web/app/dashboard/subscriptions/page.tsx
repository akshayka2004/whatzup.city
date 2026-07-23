'use client';

import { useState, useEffect } from 'react';
import { BusinessLayout } from '@/components/layouts/business-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  CreditCard, Check, Zap, Star, Rocket,
  AlertCircle, Clock, X, ArrowUpRight, ArrowDownRight, RefreshCw,
  Timer, Gift, Lock,
} from 'lucide-react';
import { apiService } from '@/lib/services/api-service';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';

// ── Plan definitions ──────────────────────────────────────────────────

const PLANS = [
  {
    id: 'basic',
    name: 'Basic',
    priceMonthly: 300,
    priceAnnual: 2500,
    icon: Zap,
    color: 'text-info',
    bg: 'bg-info/10',
    border: 'border-info/20',
    highlight: false,
    features: [
      '30 Offers per month',
      '10 Posts per month',
      'Bill moderation',
      'Basic sales & income overview',
      'Partial profile customization',
      'Email support',
    ],
  },
  {
    id: 'standard',
    name: 'Standard',
    priceMonthly: 600,
    priceAnnual: 5000,
    icon: Star,
    color: 'text-primary',
    bg: 'bg-primary/10',
    border: 'border-primary/30',
    highlight: true,
    features: [
      '50 Offers per month',
      '25 Posts per month',
      'Bill moderation',
      'Dedicated analytics dashboard',
      'Partial profile customization',
      'Priority email support',
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    priceMonthly: 1200,
    priceAnnual: 10000,
    icon: Rocket,
    color: 'text-warning',
    bg: 'bg-warning/10',
    border: 'border-warning/20',
    highlight: false,
    features: [
      '100 Offers per month',
      '50 Posts per month',
      'Bill moderation',
      'Full analytics suite',
      'Complete profile customization',
      'All platform features',
      'Dedicated support',
    ],
  },
] as const;

type PlanId = typeof PLANS[number]['id'];
type BillingPeriod = 'monthly' | 'annual';

interface PendingRequest {
  id: string;
  type: 'upgrade' | 'downgrade';
  fromPlan: PlanId;
  toPlan: PlanId;
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

const STORAGE_KEY = 'business_subscription';
const REQUESTS_KEY = 'subscription_requests';

function loadSubscription(): { plan: PlanId; since: string } {
  if (typeof window === 'undefined') return { plan: 'basic', since: 'Jan 2025' };
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) {
      const parsed = JSON.parse(s);
      // Map legacy plan IDs to new ones
      const id = parsed.plan;
      const mapped =
        id === 'starter' ? 'basic' :
        id === 'growth' ? 'standard' :
        id === 'enterprise' ? 'premium' :
        PLANS.find((p) => p.id === id) ? id : 'basic';
      return { plan: mapped as PlanId, since: parsed.since || 'Jan 2025' };
    }
    return { plan: 'basic', since: 'Jan 2025' };
  } catch { return { plan: 'basic', since: 'Jan 2025' }; }
}

function loadRequests(): PendingRequest[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(REQUESTS_KEY) || '[]'); } catch { return []; }
}

// USAGE — TODO: fetch from subscription/usage endpoint when available
const USAGE = {
  offers: { used: 0, limit: 0 },
  posts: { used: 0, limit: 0 },
  bills: { used: 0, limit: 0 },
};

// ── Component ─────────────────────────────────────────────────────────

export default function BusinessSubscriptionsPage() {
  const { user } = useAuth();
  const [currentPlan, setCurrentPlan] = useState<PlanId>('basic');
  const [since, setSince] = useState('—');
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [confirmTarget, setConfirmTarget] = useState<PlanId | null>(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');

  // Trial & intro offer state
  const [trialStatus, setTrialStatus] = useState<string>('NOT_STARTED');
  const [trialDaysRemaining, setTrialDaysRemaining] = useState<number>(0);
  const [trialEndDate, setTrialEndDate] = useState<string>('');
  const [hasIntroOffer, setHasIntroOffer] = useState(false);
  const [introOfferDiscountPct, setIntroOfferDiscountPct] = useState(20);
  const [claimingOffer, setClaimingOffer] = useState(false);
  const [offerMsg, setOfferMsg] = useState('');

  const businessId = user?.businessId || user?.entity?.id;

  useEffect(() => {
    if (!businessId) return;

    // Fetch subscription
    apiService
      .get<any>(`/v1/subscriptions/businesses/${businessId}/active`)
      .then((res) => {
        if (res.data && !res.error) {
          const raw = (res.data.packageId || res.data.planId || res.data.plan || 'basic').toLowerCase();
          const mapped =
            raw === 'starter' ? 'basic' :
            raw === 'growth' ? 'standard' :
            raw === 'enterprise' ? 'premium' :
            PLANS.find((p) => p.id === raw)?.id ?? 'basic';
          setCurrentPlan(mapped as PlanId);
          if (res.data.createdAt) {
            setSince(new Date(res.data.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }));
          }
        } else {
          const sub = loadSubscription();
          setCurrentPlan(sub.plan);
          setSince(sub.since);
        }
      })
      .catch(() => {
        const sub = loadSubscription();
        setCurrentPlan(sub.plan);
        setSince(sub.since);
      });

    // Fetch trial status
    apiService.get<any>(`/v1/trials/status/${businessId}`).then((res) => {
      if (res.data) {
        setTrialStatus(res.data.trialStatus ?? 'NOT_STARTED');
        setTrialDaysRemaining(res.data.daysRemaining ?? 0);
        setTrialEndDate(res.data.trialEndDate ?? '');
        setHasIntroOffer(res.data.hasIntroOffer ?? false);
        setIntroOfferDiscountPct(res.data.introOfferDiscountPct ?? 20);
      }
    }).catch(() => {});

    setRequests(loadRequests());
  }, [businessId]);

  const handleClaimIntroOffer = async () => {
    if (!businessId || claimingOffer) return;
    setClaimingOffer(true);
    try {
      const res = await apiService.post<any>(`/v1/trials/claim-intro-offer/${businessId}`, {});
      if (!res.error) {
        setHasIntroOffer(true);
        setOfferMsg('Introductory offer claimed! 20% discount will apply to your first subscription.');
        setTimeout(() => setOfferMsg(''), 5000);
      } else {
        setOfferMsg(res.error || 'Failed to claim offer');
        setTimeout(() => setOfferMsg(''), 4000);
      }
    } catch {
      setOfferMsg('Failed to claim offer. Try again.');
      setTimeout(() => setOfferMsg(''), 4000);
    } finally {
      setClaimingOffer(false);
    }
  };

  const discountedPrice = (price: number) => Math.round(price * (1 - introOfferDiscountPct / 100));

  const currentPlanDef = PLANS.find((p) => p.id === currentPlan)!;
  const pendingRequest = requests.find((r) => r.status === 'pending');

  const getPrice = (plan: typeof PLANS[number]) =>
    billingPeriod === 'monthly' ? plan.priceMonthly : plan.priceAnnual;

  const handleRequest = (targetId: PlanId) => {
    if (targetId === currentPlan) return;
    const currentIdx = PLANS.findIndex((p) => p.id === currentPlan);
    const targetIdx = PLANS.findIndex((p) => p.id === targetId);
    const type: 'upgrade' | 'downgrade' = targetIdx > currentIdx ? 'upgrade' : 'downgrade';
    const newReq: PendingRequest = {
      id: Date.now().toString(),
      type,
      fromPlan: currentPlan,
      toPlan: targetId,
      requestedAt: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      status: 'pending',
    };
    const updated = [...requests, newReq];
    setRequests(updated);
    localStorage.setItem(REQUESTS_KEY, JSON.stringify(updated));
    setConfirmTarget(null);
    setSuccessMsg(`${type === 'upgrade' ? 'Upgrade' : 'Downgrade'} request submitted! Awaiting admin approval.`);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleCancelRequest = (id: string) => {
    const updated = requests.filter((r) => r.id !== id);
    setRequests(updated);
    localStorage.setItem(REQUESTS_KEY, JSON.stringify(updated));
  };

  const getPlanName = (id: PlanId) => PLANS.find((p) => p.id === id)?.name ?? id;

  const confirmPlanDef = confirmTarget ? PLANS.find((p) => p.id === confirmTarget) : null;

  return (
    <BusinessLayout>
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Subscription</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Manage your plan and usage.</p>
        </div>

        {successMsg && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-success/10 border border-success/20 text-success text-sm font-semibold">
            <Check className="h-4 w-4" />
            {successMsg}
          </div>
        )}

        {/* ── Trial Status Card ───────────────────────────────── */}
        {trialStatus !== 'NOT_STARTED' && (
          <Card className={cn(
            'p-5 rounded-2xl border flex items-center justify-between gap-4',
            trialStatus === 'ACTIVE'
              ? 'bg-info/5 border-info/20'
              : trialStatus === 'EXPIRED'
              ? 'bg-destructive/5 border-destructive/20'
              : 'bg-success/5 border-success/20',
          )}>
            <div className="flex items-center gap-3">
              <div className={cn(
                'p-2.5 rounded-xl',
                trialStatus === 'ACTIVE' ? 'bg-info/10' : trialStatus === 'EXPIRED' ? 'bg-destructive/10' : 'bg-success/10',
              )}>
                <Timer className={cn('h-5 w-5', trialStatus === 'ACTIVE' ? 'text-info' : trialStatus === 'EXPIRED' ? 'text-destructive' : 'text-success')} />
              </div>
              <div>
                <p className="font-bold text-foreground text-sm">
                  {trialStatus === 'ACTIVE' && `Free Trial — ${trialDaysRemaining} day${trialDaysRemaining !== 1 ? 's' : ''} remaining`}
                  {trialStatus === 'EXPIRED' && 'Free Trial Expired'}
                  {trialStatus === 'CONVERTED' && 'Trial Converted to Subscription'}
                </p>
                {trialEndDate && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {trialStatus === 'ACTIVE' ? 'Expires' : 'Expired'}{' '}
                    {new Date(trialEndDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                )}
              </div>
            </div>
            <span className={cn(
              'text-[11px] font-bold px-3 py-1 rounded-full',
              trialStatus === 'ACTIVE' && 'bg-info/15 text-info',
              trialStatus === 'EXPIRED' && 'bg-destructive/15 text-destructive',
              trialStatus === 'CONVERTED' && 'bg-success/15 text-success',
            )}>
              {trialStatus === 'ACTIVE' ? 'Active' : trialStatus === 'EXPIRED' ? 'Expired' : 'Converted'}
            </span>
          </Card>
        )}

        {/* ── Introductory Offer Banner ───────────────────────── */}
        {offerMsg && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-primary/10 border border-primary/20 text-primary text-sm font-semibold">
            <Gift className="h-4 w-4 shrink-0" />
            {offerMsg}
          </div>
        )}
        {!hasIntroOffer && trialStatus !== 'NOT_STARTED' && (
          <Card className="p-5 rounded-2xl border border-primary/20 bg-primary/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <Gift className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-bold text-foreground text-sm">Claim Your Introductory Offer</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Get <span className="text-primary font-bold">20% off</span> your first subscription purchase. One-time offer — applies when billing activates.
                </p>
              </div>
            </div>
            <Button
              onClick={handleClaimIntroOffer}
              disabled={claimingOffer}
              className="shrink-0 rounded-xl bg-primary hover:bg-primary text-white text-xs font-bold px-4 cursor-pointer"
            >
              {claimingOffer ? 'Claiming…' : 'Claim 20% Off'}
            </Button>
          </Card>
        )}
        {hasIntroOffer && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-primary/10 border border-primary/20">
            <Gift className="h-4 w-4 text-primary shrink-0" />
            <p className="text-sm text-primary font-semibold">
              🎉 <strong>20% Introductory Discount Available</strong> — applies to your first subscription when billing activates.
            </p>
          </div>
        )}

        {/* ── Coming Soon Notice ──────────────────────────────── */}
        <Card className="p-5 rounded-2xl border border-warning/20 bg-warning/5 flex items-center gap-4">
          <div className="p-2.5 rounded-xl bg-warning/10 shrink-0">
            <Lock className="h-5 w-5 text-warning" />
          </div>
          <div>
            <p className="font-bold text-foreground text-sm">Coming Soon</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Subscription Activation Available Soon — payment processing will be enabled in the next release.
            </p>
          </div>
        </Card>

        {/* ── Current Plan Card ────────────────────────────────── */}
        <Card className="p-6 rounded-2xl border-border bg-card/60 backdrop-blur-xl">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-2xl ${currentPlanDef.bg}`}>
                <currentPlanDef.icon className={`h-6 w-6 ${currentPlanDef.color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Current Plan</p>
                <p className="text-2xl font-extrabold text-foreground">{currentPlanDef.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Active since {since}</p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <p className="text-3xl font-extrabold text-foreground">
                ₹{currentPlanDef.priceMonthly.toLocaleString()}
                <span className="text-sm font-normal text-muted-foreground">/mo</span>
              </p>
              <p className="text-xs text-muted-foreground">
                ₹{currentPlanDef.priceAnnual.toLocaleString()}/yr
              </p>
              <span className="text-[10px] font-bold text-success bg-success/10 px-2 py-0.5 rounded-full">
                ● Active
              </span>
            </div>
          </div>

          {/* Usage meters */}
          <div className="mt-6 grid sm:grid-cols-3 gap-4">
            {Object.entries(USAGE).map(([key, { used, limit }]) => {
              const pct = limit > 0 ? Math.round((used / limit) * 100) : 0;
              const overLimit = limit > 0 && used >= limit;
              return (
                <div key={key}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs text-muted-foreground capitalize">{key}</span>
                    <span className={cn('text-xs font-semibold', overLimit ? 'text-destructive' : 'text-foreground')}>
                      {used}/{limit || '—'}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all', overLimit ? 'bg-destructive' : 'bg-primary')}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* ── Pending Request Banner ───────────────────────────── */}
        {pendingRequest && (
          <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-warning/10 border border-warning/20">
            <div className="flex items-center gap-2 text-warning text-sm font-semibold">
              <Clock className="h-4 w-4" />
              {pendingRequest.type === 'upgrade' ? 'Upgrade' : 'Downgrade'} to{' '}
              <strong>{getPlanName(pendingRequest.toPlan)}</strong> pending admin approval
              <span className="text-xs font-normal text-muted-foreground ml-1">
                · Requested {pendingRequest.requestedAt}
              </span>
            </div>
            <button
              onClick={() => handleCancelRequest(pendingRequest.id)}
              className="text-destructive hover:text-destructive cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* ── Plan Cards ───────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-base font-bold text-foreground">Available Plans</h2>
            {/* Billing toggle */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-secondary border border-border">
              <button
                onClick={() => setBillingPeriod('monthly')}
                className={cn(
                  'px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                  billingPeriod === 'monthly'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingPeriod('annual')}
                className={cn(
                  'px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5',
                  billingPeriod === 'annual'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                Annual
                <span className={cn(
                  'text-[9px] font-bold px-1.5 py-0.5 rounded-full',
                  billingPeriod === 'annual' ? 'bg-success text-white' : 'bg-success/20 text-success',
                )}>
                  Save
                </span>
              </button>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            {PLANS.map((plan) => {
              const isCurrent = plan.id === currentPlan;
              const hasPending = !!pendingRequest;
              const Icon = plan.icon;
              const currentIdx = PLANS.findIndex((p) => p.id === currentPlan);
              const planIdx = PLANS.findIndex((p) => p.id === plan.id);
              const isUpgrade = planIdx > currentIdx;
              const price = getPrice(plan);

              return (
                <Card
                  key={plan.id}
                  className={cn(
                    'p-5 rounded-2xl flex flex-col gap-4 transition-all relative',
                    isCurrent
                      ? 'border-primary/40 bg-primary/5'
                      : plan.highlight
                      ? `border ${plan.border} ${plan.bg}`
                      : 'border-border bg-card/40',
                  )}
                >
                  {plan.highlight && !isCurrent && (
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                      <span className="text-[10px] font-bold bg-primary text-white px-2.5 py-0.5 rounded-full">
                        Most Popular
                      </span>
                    </div>
                  )}
                  {isCurrent && (
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                      <span className="text-[10px] font-bold bg-primary text-primary-foreground px-2.5 py-0.5 rounded-full">
                        Current Plan
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 mt-2">
                    <div className={`p-2 rounded-xl ${plan.bg}`}>
                      <Icon className={`h-4 w-4 ${plan.color}`} />
                    </div>
                    <span className="font-bold text-foreground">{plan.name}</span>
                  </div>

                  <div>
                    {hasIntroOffer ? (
                      <>
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-extrabold text-foreground">
                            ₹{discountedPrice(price).toLocaleString()}
                          </span>
                          <span className="text-sm text-muted-foreground line-through">
                            ₹{price.toLocaleString()}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                          {introOfferDiscountPct}% intro discount
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-2xl font-extrabold text-foreground">
                          ₹{price.toLocaleString()}
                        </span>
                        <span className="text-xs text-muted-foreground ml-1">
                          {billingPeriod === 'monthly' ? '/mo' : '/yr'}
                        </span>
                      </>
                    )}
                    {billingPeriod === 'annual' && !hasIntroOffer && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        ₹{Math.round(plan.priceAnnual / 12).toLocaleString()}/mo billed annually
                      </p>
                    )}
                  </div>

                  <ul className="space-y-1.5 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Check className="h-3 w-3 text-success shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  {/* Release 1: Payment disabled — show Coming Soon */}
                  <Button
                    size="sm"
                    variant="outline"
                    disabled
                    className="w-full rounded-xl text-xs border-border text-muted-foreground cursor-not-allowed opacity-60"
                  >
                    <Lock className="h-3.5 w-3.5 mr-1" />
                    Coming Soon
                  </Button>
                </Card>
              );
            })}
          </div>
        </div>

        {/* ── Request History ──────────────────────────────────── */}
        {requests.length > 0 && (
          <Card className="p-6 rounded-2xl border-border bg-card/60 backdrop-blur-xl">
            <h2 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-primary" />
              Request History
            </h2>
            <div className="space-y-2">
              {[...requests].reverse().map((req) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-secondary border border-border"
                >
                  <div className="flex items-center gap-3">
                    {req.type === 'upgrade' ? (
                      <ArrowUpRight className="h-4 w-4 text-success" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4 text-warning" />
                    )}
                    <div>
                      <p className="text-sm font-semibold text-foreground capitalize">
                        {req.type} to {getPlanName(req.toPlan)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        From {getPlanName(req.fromPlan)} · {req.requestedAt}
                      </p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      'text-[10px] font-bold px-2 py-0.5 rounded-full',
                      req.status === 'pending' && 'bg-warning/15 text-warning',
                      req.status === 'approved' && 'bg-success/15 text-success',
                      req.status === 'rejected' && 'bg-destructive/15 text-destructive',
                    )}
                  >
                    {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* ── Confirm Modal ─────────────────────────────────────── */}
      {confirmTarget && confirmPlanDef && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <Card className="w-full max-w-sm p-6 rounded-2xl border-border bg-card space-y-4 mx-4">
            <h3 className="text-lg font-bold text-foreground">Confirm Request</h3>
            <p className="text-sm text-muted-foreground">
              Request a plan change from{' '}
              <strong className="text-foreground">{getPlanName(currentPlan)}</strong> to{' '}
              <strong className="text-foreground">{getPlanName(confirmTarget)}</strong>?
            </p>
            <div className="px-3 py-2.5 rounded-xl bg-secondary border border-border">
              <p className="text-xs text-muted-foreground mb-0.5">New plan pricing</p>
              <p className="text-lg font-extrabold text-foreground">
                ₹{confirmPlanDef.priceMonthly.toLocaleString()}<span className="text-sm font-normal text-muted-foreground">/mo</span>
                <span className="text-muted-foreground font-normal text-sm mx-2">·</span>
                ₹{confirmPlanDef.priceAnnual.toLocaleString()}<span className="text-sm font-normal text-muted-foreground">/yr</span>
              </p>
            </div>
            <p className="text-xs text-muted-foreground">An admin will review and approve your request shortly.</p>
            <div className="flex gap-2">
              <Button
                onClick={() => setConfirmTarget(null)}
                variant="outline"
                className="flex-1 rounded-xl border-border text-foreground hover:bg-secondary cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleRequest(confirmTarget)}
                className="flex-1 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold cursor-pointer"
              >
                Submit Request
              </Button>
            </div>
          </Card>
        </div>
      )}
    </BusinessLayout>
  );
}
