'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { BusinessLayout } from '@/components/layouts/business-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Plus,
  Trash2,
  Edit,
  Eye,
  TrendingUp,
  Share2,
  ShoppingBag,
  MousePointerClick,
  Users,
  X,
  AlertTriangle,
  Tag,
  Copy,
  Check,
  ShieldCheck,
  Clock,
  FileText,
  Shield,
  ArrowRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { canAccess, hasRole, getRoleLabel } from '@/lib/rbac';
import { cn } from '@/lib/utils';


const performanceData = [
  { day: 'Mon', views: 840, clicks: 120 },
  { day: 'Tue', views: 980, clicks: 180 },
  { day: 'Wed', views: 1200, clicks: 240 },
  { day: 'Thu', views: 1100, clicks: 220 },
  { day: 'Fri', views: 1500, clicks: 390 },
  { day: 'Sat', views: 1300, clicks: 310 },
  { day: 'Sun', views: 1700, clicks: 450 },
];

const initialOffers = [
  { id: 1, title: 'Summer Special', discount: 50, active: true, views: 1234, clicks: 456 },
  { id: 2, title: 'Member Exclusive', discount: 30, active: true, views: 987, clicks: 234 },
  { id: 3, title: 'Bundle Deal', discount: 25, active: false, views: 654, clicks: 123 },
  { id: 4, title: 'Weekend Offer', discount: 40, active: true, views: 2341, clicks: 789 },
];

export default function BusinessDashboardPage() {
  const [offers, setOffers] = useState(initialOffers);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [editingOffer, setEditingOffer] = useState<any>(null);
  const [deletingOffer, setDeletingOffer] = useState<any>(null);
  const [viewingOffer, setViewingOffer] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>('BUSINESS_OWNER');
  const [claimedCount, setClaimedCount] = useState(0);
  const [title, setTitle] = useState('');
  const [discount, setDiscount] = useState(0);
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('user_session') || localStorage.getItem('user');
        if (stored) {
          const u = JSON.parse(stored);
          const role = u?.rbacRole || (u?.role === 'business' ? 'BUSINESS_OWNER' : u?.role);
          if (role) setUserRole(role);
        }
      } catch (_) {}
      // Sync claimed offers count from customer activity
      const syncClaimed = () => {
        try {
          const ids: number[] = JSON.parse(localStorage.getItem('claimed_offers') || '[]');
          setClaimedCount(ids.length);
        } catch (_) {}
      };
      syncClaimed();
      window.addEventListener('claimedOffersUpdated', syncClaimed);
      return () => window.removeEventListener('claimedOffersUpdated', syncClaimed);
    }
  }, []);

  const canViewAnalytics = canAccess(userRole, 'business.analytics.view');
  const canViewCustomers = canAccess(userRole, 'business.customers.view');
  const canVerifyBills = canAccess(userRole, 'business.bills.verify');
  const isModerator = userRole === 'BUSINESS_MODERATOR';
  const isStaff = userRole === 'BUSINESS_STAFF';


  const stats = [
    {
      label: 'Storefront Views',
      value: '8,655',
      change: '+14% WoW',
      icon: Users,
      color: 'text-violet-500 bg-violet-500/10',
    },
    {
      label: 'Offer Claims',
      value: (1209 + claimedCount).toLocaleString(),
      change: claimedCount > 0 ? `+${claimedCount} new` : '+8.4% WoW',
      icon: ShoppingBag,
      color: 'text-emerald-500 bg-emerald-500/10',
    },
    {
      label: 'Interaction Clicks',
      value: '1,919',
      change: '+22% WoW',
      icon: MousePointerClick,
      color: 'text-cyan-500 bg-cyan-500/10',
    },
    {
      label: 'Click-Through Rate',
      value: '22.1%',
      change: '+2.1% growth',
      icon: TrendingUp,
      color: 'text-amber-500 bg-amber-500/10',
    },
  ];

  const handleOpenCreate = () => {
    setTitle('');
    setDiscount(0);
    setActive(true);
    setIsCreateOpen(true);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;
    const newOffer = {
      id: Date.now(),
      title,
      discount: Number(discount),
      active,
      views: 0,
      clicks: 0,
    };
    setOffers([newOffer, ...offers]);
    setIsCreateOpen(false);
  };

  const handleOpenEdit = (offer: any) => {
    setEditingOffer(offer);
    setTitle(offer.title);
    setDiscount(offer.discount);
    setActive(offer.active);
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;
    setOffers(
      offers.map((o) =>
        o.id === editingOffer.id ? { ...o, title, discount: Number(discount), active } : o,
      ),
    );
    setEditingOffer(null);
  };

  const handleDelete = () => {
    setOffers(offers.filter((o) => o.id !== deletingOffer.id));
    setDeletingOffer(null);
  };

  const toggleActive = (id: number) => {
    setOffers(offers.map((o) => (o.id === id ? { ...o, active: !o.active } : o)));
  };

  return (
    <BusinessLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              {isModerator ? 'Moderation Hub' : isStaff ? 'Operations Hub' : 'Business Hub'}
            </h1>
            <p className="text-muted-foreground text-sm">
              {isModerator
                ? 'Review bills, moderate content, and flag fraud'
                : isStaff
                ? 'Manage listings, offers, and media'
                : 'Control listings, manage promotional offers, and review analytics.'}
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsShareOpen(true);
                setIsCopied(false);
              }}
              className="rounded-xl border-white/10 text-foreground hover:bg-white/5 gap-2"
            >
              <Share2 className="h-4 w-4" />
              Share Storefront
            </Button>
            <Button
              onClick={handleOpenCreate}
              className="rounded-xl gap-2 font-medium bg-gradient-to-r from-primary to-accent text-primary-foreground"
            >
              <Plus className="h-4 w-4" />
              New Listing / Offer
            </Button>
          </div>
        </div>

        {/* Role-aware: Moderator/Staff quick widget */}
        {isModerator && (
          <Card className="p-5 rounded-2xl border-amber-500/20 bg-amber-500/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
                  <ShieldCheck className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Bill Moderation Queue</h3>
                  <p className="text-xs text-muted-foreground">3 bills awaiting your review</p>
                </div>
              </div>
              <Link href="/dashboard/moderation">
                <Button size="sm" className="rounded-xl bg-amber-600 hover:bg-amber-500 text-white gap-1.5 text-xs">
                  Review Queue <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </Card>
        )}

        {/* Stats Grid — owners and analytics-enabled roles only */}
        {canViewAnalytics && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card
                key={stat.label}
                className="p-6 rounded-2xl border-white/5 bg-card/60 backdrop-blur-xl hover:shadow-lg transition-all duration-300 relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors pointer-events-none"></div>
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-xl ${stat.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-semibold text-emerald-500">{stat.change}</span>
                </div>
                <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                <h3 className="text-3xl font-extrabold text-foreground mt-1 tracking-tight">
                  {stat.value}
                </h3>
              </Card>
            );
          })}
        </div>
        )}

        {/* Staff quick-access widget */}
        {isStaff && (
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { label: 'Active Offers', value: '4', icon: Tag, href: '/dashboard/offers', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
              { label: 'Listed Products', value: '12', icon: FileText, href: '/dashboard/products', color: 'text-violet-400', bg: 'bg-violet-500/10' },
              { label: 'Pending Media', value: '2', icon: Clock, href: '/dashboard/media', color: 'text-amber-400', bg: 'bg-amber-500/10' },
            ].map((s) => (
              <Link key={s.label} href={s.href}>
                <Card className="p-4 rounded-2xl border-white/5 bg-card/40 hover:bg-card/60 transition-all cursor-pointer">
                  <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center mb-3', s.bg)}>
                    <s.icon className={cn('h-4 w-4', s.color)} />
                  </div>
                  <p className={cn('text-xl font-bold', s.color)}>{s.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {/* Performance Chart — analytics-enabled roles only */}
        {canViewAnalytics && (
        <Card className="p-6 rounded-2xl border-white/5 bg-card/40 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-foreground">Traffic Analysis</h3>
              <p className="text-xs text-muted-foreground">
                Storefront views vs interaction clicks this week.
              </p>
            </div>
            <div className="flex gap-4 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-violet-400">
                <span className="w-2.5 h-2.5 rounded-full bg-violet-500"></span>
                Views
              </span>
              <span className="flex items-center gap-1.5 text-cyan-400">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-500"></span>
                Clicks
              </span>
            </div>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={performanceData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.65 0.15 280)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="oklch(0.65 0.15 280)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.65 0.15 200)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="oklch(0.65 0.15 200)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(0.25 0 0)" />
                <XAxis dataKey="day" stroke="oklch(0.65 0 0)" fontSize={11} tickLine={false} />
                <YAxis stroke="oklch(0.65 0 0)" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: '#121212',
                    borderColor: 'oklch(0.25 0 0)',
                    borderRadius: '12px',
                  }}
                  labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                />
                <Area
                  type="monotone"
                  dataKey="views"
                  stroke="oklch(0.65 0.15 280)"
                  fillOpacity={1}
                  fill="url(#colorViews)"
                />
                <Area
                  type="monotone"
                  dataKey="clicks"
                  stroke="oklch(0.65 0.15 200)"
                  fillOpacity={1}
                  fill="url(#colorClicks)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
        )}

        {/* Offers list section */}
        <div>
          <h2 className="text-xl font-bold text-foreground mb-4">Promotions & Active Offers</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {offers.map((offer) => (
              <Card
                key={offer.id}
                className="p-6 rounded-2xl hover:shadow-md transition-all duration-300 border-white/5 bg-card/40 backdrop-blur-xl relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none"></div>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-foreground text-lg">{offer.title}</h3>
                      <button
                        onClick={() => toggleActive(offer.id)}
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold hover:opacity-85 transition-opacity ${
                          offer.active
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-white/5 text-muted-foreground border border-white/10'
                        }`}
                      >
                        {offer.active ? 'Active' : 'Inactive'}
                      </button>
                    </div>
                    <div className="flex items-center gap-6 text-sm mt-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Discount</p>
                        <p className="font-bold text-foreground text-base">{offer.discount}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Views</p>
                        <p className="font-bold text-foreground text-base">{offer.views}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Clicks</p>
                        <p className="font-bold text-foreground text-base">{offer.clicks}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setViewingOffer(offer)}
                      size="icon"
                      variant="outline"
                      className="rounded-xl border-white/10 hover:bg-white/5 text-slate-300 h-9 w-9"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => handleOpenEdit(offer)}
                      size="icon"
                      variant="outline"
                      className="rounded-xl border-white/10 hover:bg-white/5 text-slate-300 h-9 w-9"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => setDeletingOffer(offer)}
                      size="icon"
                      variant="outline"
                      className="rounded-xl border-white/10 hover:bg-rose-500/10 text-rose-400 hover:text-rose-300 border-rose-500/20 h-9 w-9"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* ── CREATE MODAL ─────────────────────────────────────────── */}
        {isCreateOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <Card className="w-full max-w-md p-6 rounded-2xl border-white/10 bg-zinc-900 shadow-2xl relative">
              <button
                onClick={() => setIsCreateOpen(false)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
              <h3 className="text-xl font-bold text-foreground mb-4">Create Promotional Offer</h3>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-300 block mb-2">
                    Offer Title
                  </label>
                  <Input
                    placeholder="e.g. Summer Special"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    className="rounded-xl border-white/10 bg-white/5 focus:border-primary text-foreground"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-300 block mb-2">
                    Discount Percentage
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    value={discount || ''}
                    onChange={(e) => setDiscount(Number(e.target.value))}
                    required
                    className="rounded-xl border-white/10 bg-white/5 focus:border-primary text-foreground"
                  />
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="dash-active-chk"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                    className="rounded bg-white/5 border-white/10 text-primary focus:ring-primary h-4 w-4"
                  />
                  <label htmlFor="dash-active-chk" className="text-sm text-slate-300">
                    Set active immediately
                  </label>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateOpen(false)}
                    className="rounded-xl border-white/10 hover:bg-white/5 text-slate-300"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold"
                  >
                    Create Offer
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}

        {/* ── EDIT MODAL ───────────────────────────────────────────── */}
        {editingOffer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <Card className="w-full max-w-md p-6 rounded-2xl border-white/10 bg-zinc-900 shadow-2xl relative">
              <button
                onClick={() => setEditingOffer(null)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
              <h3 className="text-xl font-bold text-foreground mb-4">Edit Offer Details</h3>
              <form onSubmit={handleEdit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-300 block mb-2">
                    Offer Title
                  </label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    className="rounded-xl border-white/10 bg-white/5 focus:border-primary text-foreground"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-300 block mb-2">
                    Discount Percentage
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    value={discount || ''}
                    onChange={(e) => setDiscount(Number(e.target.value))}
                    required
                    className="rounded-xl border-white/10 bg-white/5 focus:border-primary text-foreground"
                  />
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="dash-edit-active-chk"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                    className="rounded bg-white/5 border-white/10 text-primary focus:ring-primary h-4 w-4"
                  />
                  <label htmlFor="dash-edit-active-chk" className="text-sm text-slate-300">
                    Active status
                  </label>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditingOffer(null)}
                    className="rounded-xl border-white/10 hover:bg-white/5 text-slate-300"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold"
                  >
                    Save Changes
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}

        {/* ── DELETE MODAL ─────────────────────────────────────────── */}
        {deletingOffer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <Card className="w-full max-w-sm p-6 rounded-2xl border-white/10 bg-zinc-900 shadow-2xl relative text-center">
              <button
                onClick={() => setDeletingOffer(null)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="mx-auto w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 mb-4">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">Delete Promotional Offer</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Are you sure you want to delete{' '}
                <span className="font-semibold text-foreground">"{deletingOffer.title}"</span>? This
                action is permanent.
              </p>
              <div className="flex justify-center gap-3">
                <Button
                  onClick={() => setDeletingOffer(null)}
                  variant="outline"
                  className="rounded-xl border-white/10 hover:bg-white/5 text-slate-300 px-4"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDelete}
                  className="rounded-xl bg-rose-600 hover:bg-rose-500 text-white px-4"
                >
                  Delete
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* ── DETAIL/VIEW MODAL ────────────────────────────────────── */}
        {viewingOffer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <Card className="w-full max-w-md p-6 rounded-2xl border-white/10 bg-zinc-900 shadow-2xl relative">
              <button
                onClick={() => setViewingOffer(null)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-primary/10 text-primary rounded-xl">
                  <Tag className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">{viewingOffer.title}</h3>
                  <span
                    className={`inline-block px-2 py-0.5 mt-1 rounded-full text-xs font-semibold ${
                      viewingOffer.active
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-white/5 text-muted-foreground border border-white/10'
                    }`}
                  >
                    {viewingOffer.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-white/5 p-4 rounded-xl text-center border border-white/5">
                  <p className="text-xs text-muted-foreground mb-1">Discount</p>
                  <p className="text-2xl font-extrabold text-foreground">
                    {viewingOffer.discount}%
                  </p>
                </div>
                <div className="bg-white/5 p-4 rounded-xl text-center border border-white/5">
                  <p className="text-xs text-muted-foreground mb-1">Total Views</p>
                  <p className="text-2xl font-extrabold text-foreground">{viewingOffer.views}</p>
                </div>
                <div className="bg-white/5 p-4 rounded-xl text-center border border-white/5">
                  <p className="text-xs text-muted-foreground mb-1">Total Clicks</p>
                  <p className="text-2xl font-extrabold text-foreground">{viewingOffer.clicks}</p>
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <Button
                  onClick={() => setViewingOffer(null)}
                  className="rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold"
                >
                  Close
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* ── SHARE STOREFRONT MODAL ───────────────────────────────── */}
        {isShareOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <Card className="w-full max-w-md p-6 rounded-2xl border-white/10 bg-zinc-900 shadow-2xl relative">
              <button
                onClick={() => setIsShareOpen(false)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
              <h3 className="text-xl font-bold text-foreground mb-4">Share Storefront</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Copy the link below to share your public business storefront with your customers.
              </p>
              <div className="flex gap-2 mb-4">
                <Input
                  readOnly
                  value="https://platform.com/business/bella-restaurant"
                  className="rounded-xl border-white/10 bg-white/5 text-foreground"
                />
                <Button
                  onClick={() => {
                    navigator.clipboard.writeText('https://platform.com/business/bella-restaurant');
                    setIsCopied(true);
                    setTimeout(() => setIsCopied(false), 2000);
                  }}
                  className="rounded-xl gap-2 font-medium bg-gradient-to-r from-primary to-accent text-primary-foreground"
                >
                  {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {isCopied ? 'Copied' : 'Copy'}
                </Button>
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={() => setIsShareOpen(false)}
                  variant="outline"
                  className="rounded-xl border-white/10 text-slate-300 hover:bg-white/5"
                >
                  Close
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </BusinessLayout>
  );
}
