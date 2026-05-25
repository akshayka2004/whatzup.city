'use client';

import { useState, useEffect } from 'react';
import { BusinessLayout } from '@/components/layouts/business-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  CreditCard, Check, ChevronUp, Zap, Star, Shield, Rocket,
  AlertCircle, Clock, X, ArrowUpRight, ArrowDownRight, RefreshCw,
} from 'lucide-react';
import { apiService } from '@/lib/services/api-service';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';

// ── Plan definitions ──────────────────────────────────────────────────

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    period: '/mo',
    icon: Shield,
    color: 'text-slate-400',
    bg: 'bg-slate-500/10',
    border: 'border-slate-500/20',
    features: [
      '1 Branch',
      '50 Bills/month',
      'Basic analytics',
      '5 Offers',
      'Community support',
    ],
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 499,
    period: '/mo',
    icon: Zap,
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/20',
    features: [
      '3 Branches',
      '300 Bills/month',
      'Standard analytics',
      '20 Offers',
      'Email support',
      'Team (2 members)',
    ],
  },
  {
    id: 'growth',
    name: 'Growth',
    price: 1299,
    period: '/mo',
    icon: Star,
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/30',
    highlight: true,
    features: [
      '10 Branches',
      'Unlimited bills',
      'Advanced analytics',
      'Unlimited offers',
      'Priority support',
      'Team (10 members)',
      'Campaign tools',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 3999,
    period: '/mo',
    icon: Rocket,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    features: [
      'Unlimited branches',
      'Unlimited bills',
      'Full analytics suite',
      'Unlimited offers',
      'Dedicated support',
      'Unlimited team',
      'Custom integrations',
      'SLA guarantee',
    ],
  },
] as const;

type PlanId = typeof PLANS[number]['id'];

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
  if (typeof window === 'undefined') return { plan: 'starter', since: 'Jan 2025' };
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    return s ? JSON.parse(s) : { plan: 'starter', since: 'Jan 2025' };
  } catch { return { plan: 'starter', since: 'Jan 2025' }; }
}

function loadRequests(): PendingRequest[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(REQUESTS_KEY) || '[]'); } catch { return []; }
}

// USAGE — TODO: fetch from subscription/usage endpoint when available
const USAGE = {
  bills: { used: 0, limit: 0 },
  branches: { used: 0, limit: 0 },
  offers: { used: 0, limit: 0 },
  team: { used: 0, limit: 0 },
};

// ── Component ─────────────────────────────────────────────────────────

export default function BusinessSubscriptionsPage() {
  const { user } = useAuth();
  const [currentPlan, setCurrentPlan] = useState<PlanId>('starter');
  const [since, setSince] = useState('—');
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [confirmTarget, setConfirmTarget] = useState<PlanId | null>(null);
  const [successMsg, setSuccessMsg] = useState('');

  const businessId = user?.businessId || user?.entity?.id;

  useEffect(() => {
    if (!businessId) return;
    // Fetch active subscription from API
    apiService
      .get<any>(`/v1/subscriptions/businesses/${businessId}/active`)
      .then((res) => {
        if (res.data && !res.error) {
          const planId = (res.data.packageId || res.data.planId || res.data.plan || 'free').toLowerCase() as PlanId;
          const validPlanId = PLANS.find((p) => p.id === planId)?.id ?? 'free';
          setCurrentPlan(validPlanId as PlanId);
          if (res.data.createdAt) {
            setSince(new Date(res.data.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }));
          }
        } else {
          // Fallback to localStorage
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
    setRequests(loadRequests());
  }, [businessId]);

  const currentPlanDef = PLANS.find((p) => p.id === currentPlan)!;
  const pendingRequest = requests.find((r) => r.status === 'pending');

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

  return (
    <BusinessLayout>
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Subscription</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Manage your plan and usage.</p>
        </div>

        {successMsg && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-semibold">
            <Check className="h-4 w-4" />
            {successMsg}
          </div>
        )}

        {/* ── Current Plan Card ────────────────────────────────── */}
        <Card className="p-6 rounded-2xl border-white/5 bg-card/60 backdrop-blur-xl">
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
                {currentPlanDef.price === 0 ? 'Free' : `₹${currentPlanDef.price.toLocaleString()}`}
                {currentPlanDef.price > 0 && (
                  <span className="text-sm font-normal text-muted-foreground">/mo</span>
                )}
              </p>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                ● Active
              </span>
            </div>
          </div>

          {/* Usage meters */}
          <div className="mt-6 grid sm:grid-cols-4 gap-4">
            {Object.entries(USAGE).map(([key, { used, limit }]) => {
              const pct = Math.round((used / limit) * 100);
              const overLimit = used >= limit;
              return (
                <div key={key}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs text-muted-foreground capitalize">{key}</span>
                    <span className={cn('text-xs font-semibold', overLimit ? 'text-rose-400' : 'text-foreground')}>
                      {used}/{limit}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all', overLimit ? 'bg-rose-500' : 'bg-primary')}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Team limit warning */}
          {USAGE.team.used >= USAGE.team.limit && (
            <div className="mt-4 flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              Team member limit reached. Upgrade to add more collaborators.
            </div>
          )}
        </Card>

        {/* ── Pending Request Banner ───────────────────────────── */}
        {pendingRequest && (
          <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-amber-500/10 border border-amber-500/20">
            <div className="flex items-center gap-2 text-amber-400 text-sm font-semibold">
              <Clock className="h-4 w-4" />
              {pendingRequest.type === 'upgrade' ? 'Upgrade' : 'Downgrade'} to{' '}
              <strong>{getPlanName(pendingRequest.toPlan)}</strong> pending admin approval
              <span className="text-xs font-normal text-muted-foreground ml-1">
                · Requested {pendingRequest.requestedAt}
              </span>
            </div>
            <button
              onClick={() => handleCancelRequest(pendingRequest.id)}
              className="text-rose-400 hover:text-rose-300 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* ── Plan Cards ───────────────────────────────────────── */}
        <div>
          <h2 className="text-base font-bold text-foreground mb-4">Available Plans</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {PLANS.map((plan) => {
              const isCurrent = plan.id === currentPlan;
              const hasPending = !!pendingRequest;
              const Icon = plan.icon;
              const currentIdx = PLANS.findIndex((p) => p.id === currentPlan);
              const planIdx = PLANS.findIndex((p) => p.id === plan.id);
              const isUpgrade = planIdx > currentIdx;

              return (
                <Card
                  key={plan.id}
                  className={cn(
                    'p-5 rounded-2xl flex flex-col gap-4 transition-all relative',
                    isCurrent
                      ? 'border-primary/40 bg-primary/5'
                      : plan.highlight
                      ? `border ${plan.border} bg-card/60`
                      : 'border-white/5 bg-card/40',
                  )}
                >
                  {plan.highlight && !isCurrent && (
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                      <span className="text-[10px] font-bold bg-violet-600 text-white px-2.5 py-0.5 rounded-full">
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
                    <span className="text-2xl font-extrabold text-foreground">
                      {plan.price === 0 ? 'Free' : `₹${plan.price.toLocaleString()}`}
                    </span>
                    {plan.price > 0 && (
                      <span className="text-xs text-muted-foreground">/mo</span>
                    )}
                  </div>

                  <ul className="space-y-1.5 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Check className="h-3 w-3 text-emerald-400 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  {!isCurrent && (
                    <Button
                      onClick={() => setConfirmTarget(plan.id)}
                      disabled={hasPending}
                      size="sm"
                      variant={isUpgrade ? 'default' : 'outline'}
                      className={cn(
                        'w-full rounded-xl text-xs font-semibold cursor-pointer gap-1.5',
                        isUpgrade
                          ? 'bg-gradient-to-r from-primary to-accent text-primary-foreground'
                          : 'border-white/10 text-slate-300 hover:bg-white/5',
                        hasPending && 'opacity-50 cursor-not-allowed',
                      )}
                    >
                      {isUpgrade ? (
                        <><ArrowUpRight className="h-3.5 w-3.5" />Upgrade</>
                      ) : (
                        <><ArrowDownRight className="h-3.5 w-3.5" />Downgrade</>
                      )}
                    </Button>
                  )}
                  {isCurrent && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled
                      className="w-full rounded-xl text-xs border-primary/30 text-primary cursor-default opacity-70"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Current Plan
                    </Button>
                  )}
                </Card>
              );
            })}
          </div>
        </div>

        {/* ── Request History ──────────────────────────────────── */}
        {requests.length > 0 && (
          <Card className="p-6 rounded-2xl border-white/5 bg-card/60 backdrop-blur-xl">
            <h2 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-primary" />
              Request History
            </h2>
            <div className="space-y-2">
              {[...requests].reverse().map((req) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5"
                >
                  <div className="flex items-center gap-3">
                    {req.type === 'upgrade' ? (
                      <ArrowUpRight className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4 text-amber-400" />
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
                      req.status === 'pending' && 'bg-amber-500/15 text-amber-400',
                      req.status === 'approved' && 'bg-emerald-500/15 text-emerald-400',
                      req.status === 'rejected' && 'bg-rose-500/15 text-rose-400',
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
      {confirmTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <Card className="w-full max-w-sm p-6 rounded-2xl border-white/10 bg-card space-y-4 mx-4">
            <h3 className="text-lg font-bold text-foreground">Confirm Request</h3>
            <p className="text-sm text-muted-foreground">
              Request a plan change from{' '}
              <strong className="text-foreground">{getPlanName(currentPlan)}</strong> to{' '}
              <strong className="text-foreground">{getPlanName(confirmTarget)}</strong>?
              An admin will review and approve it shortly.
            </p>
            <div className="flex gap-2">
              <Button
                onClick={() => setConfirmTarget(null)}
                variant="outline"
                className="flex-1 rounded-xl border-white/10 text-slate-300 hover:bg-white/5 cursor-pointer"
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
