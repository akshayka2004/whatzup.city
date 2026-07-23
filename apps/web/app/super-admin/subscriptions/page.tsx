'use client';

import { useState, useEffect } from 'react';
import { SuperAdminLayout } from '@/components/layouts/super-admin-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  CreditCard, Search, TrendingUp, Users, Zap, Crown, Sparkles, Building2,
  ArrowUpRight, ArrowDownRight, AlertCircle, X, Check, DollarSign, RefreshCw,
  Bell, Loader2,
} from 'lucide-react';
import { apiService } from '@/lib/services/api-service';

const REQUESTS_KEY = 'subscription_requests';

interface PendingRequest {
  id: string;
  type: 'upgrade' | 'downgrade';
  fromPlan: string;
  toPlan: string;
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  businessName?: string;
}

const PLANS = [
  { id: 'free', name: 'Free', price: 0, color: 'text-muted-foreground', bg: 'bg-muted', border: 'border-border', badge: 'bg-muted text-muted-foreground border-border', features: ['1 listing', '5 offers/mo'], maxListings: 1, maxOffers: 5 },
  { id: 'starter', name: 'Starter', price: 499, color: 'text-info', bg: 'bg-info/10', border: 'border-info/20', badge: 'bg-info/10 text-info border-info/20', features: ['3 listings', '20 offers/mo'], maxListings: 3, maxOffers: 20 },
  { id: 'growth', name: 'Growth', price: 1299, color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20', badge: 'bg-primary/10 text-primary border-primary/20', features: ['10 listings', '100 offers/mo'], maxListings: 10, maxOffers: 100, popular: true },
  { id: 'enterprise', name: 'Enterprise', price: 3999, color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/20', badge: 'bg-warning/10 text-warning border-warning/20', features: ['Unlimited listings', 'Unlimited offers'], maxListings: -1, maxOffers: -1 },
];

const STATUS_STYLE: Record<string, string> = {
  active: 'bg-success/10 text-success border-success/20',
  past_due: 'bg-warning/10 text-warning border-warning/20',
  cancelled: 'bg-destructive/10 text-destructive border-destructive/20',
};
const STATUS_LABEL: Record<string, string> = { active: 'Active', past_due: 'Past Due', cancelled: 'Cancelled' };

type ModalType = 'upgrade' | 'cancel' | null;

export default function SuperAdminSubscriptionsPage() {
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedBiz, setSelectedBiz] = useState<any>(null);
  const [modal, setModal] = useState<ModalType>(null);
  const [targetPlan, setTargetPlan] = useState('');
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(true);
  const [activeTab, setActiveTab] = useState<'subscribers' | 'requests'>('subscribers');
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);

  useEffect(() => {
    setLoadingSubs(true);
    apiService.get<any>('/v1/businesses?page=1').then((res) => {
      if (res.data && !res.error) {
        const list = Array.isArray(res.data) ? res.data : res.data?.data ?? res.data?.businesses ?? [];
        setSubscribers(list.map((b: any) => ({
          id: b.id,
          name: b.name || b.businessName || '',
          plan: (b.subscriptionPlan || b.plan || 'free').toLowerCase(),
          billingDate: b.nextBillingDate ? new Date(b.nextBillingDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—',
          status: b.subscriptionStatus || (b.isActive ? 'active' : 'cancelled'),
          mrr: b.mrr ?? (PLANS.find((p) => p.id === (b.subscriptionPlan || b.plan || 'free').toLowerCase())?.price ?? 0),
          since: b.createdAt ? new Date(b.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '—',
          offers: b._count?.offers ?? b.offersCount ?? 0,
          listings: b._count?.branches ?? b.branchCount ?? 1,
        })));
      }
    }).finally(() => setLoadingSubs(false));
    try {
      const stored = localStorage.getItem(REQUESTS_KEY);
      if (stored) setPendingRequests(JSON.parse(stored));
    } catch (_) {}
  }, []);

  const pendingCount = pendingRequests.filter((r) => r.status === 'pending').length;

  const handleApproveRequest = (req: PendingRequest) => {
    const updated = pendingRequests.map((r) => r.id === req.id ? { ...r, status: 'approved' as const } : r);
    setPendingRequests(updated);
    localStorage.setItem(REQUESTS_KEY, JSON.stringify(updated));
  };

  const handleRejectRequest = (req: PendingRequest) => {
    const updated = pendingRequests.map((r) => r.id === req.id ? { ...r, status: 'rejected' as const } : r);
    setPendingRequests(updated);
    localStorage.setItem(REQUESTS_KEY, JSON.stringify(updated));
  };

  const getPlanName = (id: string) => PLANS.find((p) => p.id === id)?.name ?? id;

  const mrr = subscribers.filter((s) => s.status === 'active').reduce((sum, s) => sum + s.mrr, 0);
  const activeSubs = subscribers.filter((s) => s.status === 'active').length;
  const pastDue = subscribers.filter((s) => s.status === 'past_due').length;
  const paidSubs = subscribers.filter((s) => s.plan !== 'free' && s.status === 'active').length;

  const planBreakdown = PLANS.map((p) => ({
    ...p,
    count: subscribers.filter((s) => s.plan === p.id && s.status !== 'cancelled').length,
  }));

  const filtered = subscribers.filter((s) => {
    if (planFilter !== 'all' && s.plan !== planFilter) return false;
    if (statusFilter !== 'all' && s.status !== statusFilter) return false;
    if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleChangePlan = () => {
    if (!selectedBiz || !targetPlan) return;
    const plan = PLANS.find((p) => p.id === targetPlan)!;
    setSubscribers((prev) => prev.map((s) => s.id === selectedBiz.id ? { ...s, plan: targetPlan, mrr: plan.price, status: 'active' } : s));
    setModal(null); setSelectedBiz(null);
  };

  const handleCancel = () => {
    if (!selectedBiz) return;
    setSubscribers((prev) => prev.map((s) => s.id === selectedBiz.id ? { ...s, status: 'cancelled', mrr: 0 } : s));
    setModal(null); setSelectedBiz(null);
  };

  return (
    <SuperAdminLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Subscriptions</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Manage business plan tiers, billing, and revenue.</p>
          </div>
          <Button className="rounded-xl gap-2 font-semibold bg-gradient-to-r from-primary to-accent text-primary-foreground cursor-pointer">
            <RefreshCw className="h-4 w-4" /> Sync Billing
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl bg-secondary border border-border w-fit">
          {[
            { id: 'subscribers', label: 'Subscribers' },
            { id: 'requests', label: 'Plan Requests', badge: pendingCount },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeTab === tab.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="h-4 w-4 rounded-full bg-warning text-[9px] font-bold text-black flex items-center justify-center">{tab.badge}</span>
              )}
            </button>
          ))}
        </div>

        {/* Plan Requests Tab */}
        {activeTab === 'requests' && (
          <Card className="p-6 rounded-2xl border-border bg-card/40 backdrop-blur-xl">
            <h3 className="text-base font-bold text-foreground mb-5 flex items-center gap-2">
              <Bell className="h-4 w-4 text-warning" /> Plan Change Requests
            </h3>
            {pendingRequests.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">No plan change requests yet.</p>
            ) : (
              <div className="space-y-3">
                {[...pendingRequests].reverse().map((req) => (
                  <div key={req.id} className="flex items-center justify-between p-4 rounded-xl bg-secondary border border-border">
                    <div className="flex items-center gap-3">
                      {req.type === 'upgrade' ? <ArrowUpRight className="h-5 w-5 text-success shrink-0" /> : <ArrowDownRight className="h-5 w-5 text-warning shrink-0" />}
                      <div>
                        <p className="text-sm font-semibold text-foreground capitalize">
                          {req.businessName || 'Business'} — {req.type} to {getPlanName(req.toPlan)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          From <strong className="text-foreground">{getPlanName(req.fromPlan)}</strong> → <strong className="text-foreground">{getPlanName(req.toPlan)}</strong> · Requested {req.requestedAt}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {req.status === 'pending' ? (
                        <>
                          <Button size="sm" onClick={() => handleRejectRequest(req)} variant="outline" className="rounded-lg border-destructive/20 text-destructive hover:bg-destructive/10 cursor-pointer text-xs h-7 px-3">Reject</Button>
                          <Button size="sm" onClick={() => handleApproveRequest(req)} className="rounded-lg bg-success hover:bg-success text-white cursor-pointer text-xs h-7 px-3">Approve</Button>
                        </>
                      ) : (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${req.status === 'approved' ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive'}`}>
                          {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {activeTab === 'subscribers' && loadingSubs && (
          <div className="flex items-center justify-center h-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        )}

        {activeTab === 'subscribers' && (
          <>
            {/* Stats */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                { label: 'Monthly Recurring Revenue', value: `₹${mrr.toLocaleString()}`, icon: DollarSign, color: 'text-success bg-success/10', change: '+12.4% MoM' },
                { label: 'Active Subscribers', value: activeSubs, icon: Users, color: 'text-primary bg-primary/10', change: `${paidSubs} paid plans` },
                { label: 'Past Due Accounts', value: pastDue, icon: AlertCircle, color: 'text-warning bg-warning/10', change: 'Needs attention' },
                { label: 'Avg Revenue / Business', value: `₹${paidSubs > 0 ? Math.round(mrr / paidSubs).toLocaleString() : 0}`, icon: TrendingUp, color: 'text-info bg-info/10', change: 'Paid subs only' },
              ].map((stat) => {
                const Icon = stat.icon;
                return (
                  <Card key={stat.label} className="p-6 rounded-2xl border-border bg-card/60 backdrop-blur-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
                    <div className="flex items-center justify-between mb-3">
                      <div className={`p-2.5 rounded-xl ${stat.color}`}><Icon className="h-4 w-4" /></div>
                      <span className="text-[10px] text-muted-foreground font-medium">{stat.change}</span>
                    </div>
                    <p className="text-xs text-muted-foreground font-medium mb-1">{stat.label}</p>
                    <p className="text-2xl font-extrabold text-foreground">{stat.value}</p>
                  </Card>
                );
              })}
            </div>

            {/* Plan Breakdown */}
            <div className="grid lg:grid-cols-12 gap-6">
              <Card className="lg:col-span-8 p-6 rounded-2xl border-border bg-card/40 backdrop-blur-xl">
                <h3 className="text-base font-bold text-foreground mb-5">Plan Distribution</h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {planBreakdown.map((plan) => {
                    const Icon = plan.id === 'enterprise' ? Crown : plan.id === 'growth' ? Sparkles : plan.id === 'starter' ? Zap : Building2;
                    return (
                      <div key={plan.id} className={`p-4 rounded-2xl border ${plan.border} ${plan.bg} flex flex-col gap-2`}>
                        <div className="flex items-center gap-2">
                          <Icon className={`h-4 w-4 ${plan.color}`} />
                          <span className={`text-xs font-bold ${plan.color}`}>{plan.name}</span>
                          {(plan as any).popular && <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-primary/20 text-primary">HOT</span>}
                        </div>
                        <p className="text-2xl font-extrabold text-foreground">{plan.count}</p>
                        <p className="text-[10px] text-muted-foreground">{plan.price === 0 ? 'Free' : `₹${plan.price}/mo`}</p>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-6">
                  <p className="text-xs text-muted-foreground mb-2">Subscriber distribution</p>
                  <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
                    {planBreakdown.map((plan) => {
                      const pct = subscribers.length > 0 ? (plan.count / subscribers.length) * 100 : 0;
                      if (pct === 0) return null;
                      const barColor = plan.id === 'enterprise' ? 'bg-warning' : plan.id === 'growth' ? 'bg-primary' : plan.id === 'starter' ? 'bg-info' : 'bg-slate-500';
                      return <div key={plan.id} className={`${barColor} rounded-full transition-all`} style={{ width: `${pct}%` }} title={`${plan.name}: ${plan.count}`} />;
                    })}
                  </div>
                </div>
              </Card>
              <Card className="lg:col-span-4 p-6 rounded-2xl border-border bg-card/40 backdrop-blur-xl">
                <h3 className="text-base font-bold text-foreground mb-5">Plan Tiers</h3>
                <div className="space-y-3">
                  {PLANS.map((plan) => {
                    const Icon = plan.id === 'enterprise' ? Crown : plan.id === 'growth' ? Sparkles : plan.id === 'starter' ? Zap : Building2;
                    return (
                      <div key={plan.id} className={`flex items-center gap-3 p-3 rounded-xl border ${plan.border} ${plan.bg}`}>
                        <Icon className={`h-4 w-4 ${plan.color} shrink-0`} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-bold ${plan.color}`}>{plan.name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {plan.maxListings === -1 ? 'Unlimited' : `${plan.maxListings} listing${plan.maxListings !== 1 ? 's' : ''}`} · {plan.maxOffers === -1 ? 'Unlimited' : `${plan.maxOffers} offers`}
                          </p>
                        </div>
                        <p className="text-xs font-bold text-foreground shrink-0">{plan.price === 0 ? 'Free' : `₹${plan.price}`}</p>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>

            {/* Subscriber Table */}
            <Card className="p-6 rounded-2xl border-border bg-card/40 backdrop-blur-xl">
              <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                <h3 className="text-base font-bold text-foreground">All Subscribers</h3>
                <div className="flex gap-2 flex-wrap">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input placeholder="Search business..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-8 w-44 rounded-lg border-border bg-secondary text-sm" />
                  </div>
                  <select value={planFilter} onChange={(e) => setPlanFilter(e.target.value)} className="h-8 rounded-lg border border-border bg-card text-sm text-foreground px-2 cursor-pointer">
                    <option value="all">All Plans</option>
                    {PLANS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-8 rounded-lg border border-border bg-card text-sm text-foreground px-2 cursor-pointer">
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="past_due">Past Due</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground text-xs">
                      <th className="pb-3 text-left font-semibold">Business</th>
                      <th className="pb-3 text-left font-semibold">Plan</th>
                      <th className="pb-3 text-left font-semibold">Status</th>
                      <th className="pb-3 text-left font-semibold">MRR</th>
                      <th className="pb-3 text-left font-semibold">Next Bill</th>
                      <th className="pb-3 text-left font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((biz) => {
                      const plan = PLANS.find((p) => p.id === biz.plan)!;
                      return (
                        <tr key={biz.id} className="border-b border-border hover:bg-foreground/[0.04] transition-colors">
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-2">
                              <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">{biz.name.charAt(0)}</div>
                              <div>
                                <p className="font-semibold text-foreground text-xs">{biz.name}</p>
                                <p className="text-[10px] text-muted-foreground">Since {biz.since}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 pr-4">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${plan?.badge}`}>{plan?.name}</span>
                          </td>
                          <td className="py-3 pr-4">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_STYLE[biz.status]}`}>{STATUS_LABEL[biz.status]}</span>
                          </td>
                          <td className="py-3 pr-4">
                            <p className="font-bold text-foreground text-xs">{biz.mrr > 0 ? `₹${biz.mrr.toLocaleString()}` : '—'}</p>
                          </td>
                          <td className="py-3 pr-4">
                            <p className="text-xs text-muted-foreground">{biz.billingDate}</p>
                          </td>
                          <td className="py-3">
                            <div className="flex gap-1">
                              <Button size="sm" variant="outline" onClick={() => { setSelectedBiz(biz); setTargetPlan(biz.plan); setModal('upgrade'); }} className="h-7 rounded-lg border-border text-xs text-foreground hover:bg-secondary cursor-pointer px-2">
                                <ArrowUpRight className="h-3 w-3 mr-1" /> Change
                              </Button>
                              {biz.status !== 'cancelled' && (
                                <Button size="sm" variant="outline" onClick={() => { setSelectedBiz(biz); setModal('cancel'); }} className="h-7 rounded-lg border-destructive/20 text-destructive hover:bg-destructive/10 cursor-pointer px-2 text-xs">
                                  <X className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {filtered.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No subscribers match your filters.</p>}
              </div>
            </Card>
          </>
        )}
      </div>

      {/* Change Plan Modal */}
      {modal === 'upgrade' && selectedBiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md p-6 rounded-2xl border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-foreground">Change Plan — {selectedBiz.name}</h3>
              <button onClick={() => setModal(null)} className="text-muted-foreground hover:text-foreground cursor-pointer"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-2 mb-6">
              {PLANS.map((plan) => {
                const Icon = plan.id === 'enterprise' ? Crown : plan.id === 'growth' ? Sparkles : plan.id === 'starter' ? Zap : Building2;
                const selected = targetPlan === plan.id;
                return (
                  <button key={plan.id} onClick={() => setTargetPlan(plan.id)} className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer ${selected ? `${plan.border} ${plan.bg}` : 'border-border hover:bg-secondary'}`}>
                    <Icon className={`h-4 w-4 ${plan.color} shrink-0`} />
                    <div className="flex-1">
                      <p className={`text-sm font-bold ${selected ? plan.color : 'text-foreground'}`}>{plan.name}</p>
                      <p className="text-[10px] text-muted-foreground">{plan.features.slice(0, 2).join(' · ')}</p>
                    </div>
                    <p className="text-sm font-bold text-foreground shrink-0">{plan.price === 0 ? 'Free' : `₹${plan.price}/mo`}</p>
                    {selected && <Check className="h-4 w-4 text-success shrink-0" />}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-3">
              <Button onClick={() => setModal(null)} variant="outline" className="flex-1 rounded-xl border-border text-foreground hover:bg-secondary cursor-pointer">Cancel</Button>
              <Button onClick={handleChangePlan} disabled={targetPlan === selectedBiz.plan} className="flex-1 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold cursor-pointer disabled:opacity-40">Apply Change</Button>
            </div>
          </Card>
        </div>
      )}

      {/* Cancel Modal */}
      {modal === 'cancel' && selectedBiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card className="w-full max-w-sm p-6 rounded-2xl border-border bg-card shadow-2xl text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center text-destructive mb-4"><AlertCircle className="h-6 w-6" /></div>
            <h3 className="text-base font-bold text-foreground mb-2">Cancel Subscription?</h3>
            <p className="text-sm text-muted-foreground mb-6">
              This will cancel the subscription for <span className="font-bold text-foreground">"{selectedBiz.name}"</span>.
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => setModal(null)} variant="outline" className="flex-1 rounded-xl border-border text-foreground hover:bg-secondary cursor-pointer">Keep</Button>
              <Button onClick={handleCancel} className="flex-1 rounded-xl bg-destructive hover:bg-destructive text-white cursor-pointer">Cancel Sub</Button>
            </div>
          </Card>
        </div>
      )}
    </SuperAdminLayout>
  );
}
