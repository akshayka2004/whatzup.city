'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { BusinessLayout } from '@/components/layouts/business-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiService } from '@/lib/services/api-service';
import { useAuth } from '@/hooks/use-auth';
import {
  Plus,
  Trash2,
  Edit,
  Eye,
  Share2,
  ShoppingBag,
  Star,
  Users,
  X,
  AlertTriangle,
  Tag,
  Copy,
  Check,
  ShieldCheck,
  Clock,
  FileText,
  ArrowRight,
  Loader2,
  RefreshCw,
  MapPin,
  Phone,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { cn } from '@/lib/utils';

const ResponsiveContainer = dynamic(() => import('recharts').then(m => m.ResponsiveContainer), { ssr: false });
const BarChart = dynamic(() => import('recharts').then(m => m.BarChart), { ssr: false });
const Bar = dynamic(() => import('recharts').then(m => m.Bar), { ssr: false });
const XAxis = dynamic(() => import('recharts').then(m => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(m => m.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then(m => m.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(m => m.Tooltip), { ssr: false });

export default function BusinessDashboardPage() {
  const { user } = useAuth();

  // State
  const [loading, setLoading] = useState(true);
  const [offers, setOffers] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [business, setBusiness] = useState<any>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [editingOffer, setEditingOffer] = useState<any>(null);
  const [deletingOffer, setDeletingOffer] = useState<any>(null);
  const [viewingOffer, setViewingOffer] = useState<any>(null);
  const [title, setTitle] = useState('');
  const [discount, setDiscount] = useState(0);
  const [active, setActive] = useState(true);

  const userRole = user?.rbacRole || (user?.role === 'business' ? 'BUSINESS_OWNER' : user?.role) || 'BUSINESS_OWNER';
  const businessId = user?.businessId || user?.entity?.id || '';
  const businessSlug = business?.slug || '';

  const isModerator = userRole === 'BUSINESS_MODERATOR';
  const isStaff = userRole === 'BUSINESS_STAFF';

  const fetchData = useCallback(async () => {
    if (!businessId) { setLoading(false); return; }
    setLoading(true);
    try {
      const [bizRes, offersRes, eventsRes] = await Promise.allSettled([
        apiService.get<any>('/v1/businesses/owner/mine'),
        apiService.get<any>(`/v1/offers/my/${businessId}`),
        apiService.get<any>(`/v1/events/mine/${businessId}`),
      ]);

      // Business: owner/mine works for OWNER; staff need a direct ID lookup
      let resolvedBusiness: any = null;
      if (bizRes.status === 'fulfilled' && bizRes.value.data) {
        const bizData: any = bizRes.value.data;
        const list = Array.isArray(bizData)
          ? bizData
          : bizData?.data ?? bizData?.items ?? [];
        resolvedBusiness = Array.isArray(list) && list.length > 0 ? list[0] : null;
      }
      // Fallback for staff / moderator: fetch by known businessId
      if (!resolvedBusiness && businessId) {
        const fallback = await apiService.get<any>(`/v1/businesses/${businessId}`);
        if (fallback.data && !fallback.error) resolvedBusiness = fallback.data;
      }
      setBusiness(resolvedBusiness);

      if (offersRes.status === 'fulfilled' && offersRes.value.data) {
        const d: any = offersRes.value.data;
        const list = Array.isArray(d) ? d : d?.data ?? d?.items ?? [];
        setOffers(list);
      } else {
        setOffers([]);
      }

      if (eventsRes.status === 'fulfilled' && eventsRes.value.data) {
        const d: any = eventsRes.value.data;
        const list = Array.isArray(d) ? d : d?.data ?? d?.items ?? [];
        setEvents(list);
      } else {
        setEvents([]);
      }
    } catch (_) {}
    setLoading(false);
  }, [businessId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Real DB-sourced stats (no analytics events needed) ───────────────
  const activeOffers   = offers.filter((o: any) => o.status === 'ACTIVE').length;
  const pausedOffers   = offers.filter((o: any) => o.status === 'PAUSED' || o.status === 'DRAFT').length;
  const totalClaims    = offers.reduce((sum: number, o: any) => sum + (Number(o.currentRedemptions) || 0), 0);
  const avgRating      = business?.averageRating ? Number(business.averageRating).toFixed(1) : null;
  const totalReviews   = business?.totalReviews ? Number(business.totalReviews) : 0;

  const stats = [
    {
      label: 'Active Offers',
      value: loading ? '…' : activeOffers.toString(),
      sub: loading ? '' : `${offers.length} total · ${pausedOffers} paused`,
      icon: Tag,
      color: 'text-success bg-success/10',
    },
    {
      label: 'Total Redemptions',
      value: loading ? '…' : totalClaims.toLocaleString(),
      sub: loading ? '' : 'across all offers',
      icon: ShoppingBag,
      color: 'text-primary bg-primary/10',
    },
    {
      label: 'Avg Rating',
      value: loading ? '…' : avgRating ? `${avgRating} ★` : '—',
      sub: loading ? '' : totalReviews > 0 ? `${totalReviews} reviews` : 'No reviews yet',
      icon: Star,
      color: 'text-warning bg-warning/10',
    },
    {
      label: 'Total Reviews',
      value: loading ? '…' : totalReviews.toLocaleString(),
      sub: loading ? '' : avgRating ? `${avgRating} avg rating` : 'Awaiting reviews',
      icon: Users,
      color: 'text-info bg-info/10',
    },
  ];

  // Chart: offer performance — redemptions per offer
  const chartData = offers
    .slice(0, 10)
    .map((o: any) => ({
      name: (o.title as string).length > 10
        ? (o.title as string).slice(0, 10) + '…'
        : o.title,
      Claims: Number(o.currentRedemptions) || 0,
      'Discount %': o.discountPercent || o.discountPercentage || 0,
    }))
    .filter((d: any) => d.Claims > 0 || d['Discount %'] > 0);

  const storefrontUrl = businessSlug
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/business/${businessSlug}`
    : '';

  // ── Offer handlers ───────────────────────────────────────────────────
  const handleOpenCreate = () => {
    setTitle(''); setDiscount(0); setActive(true); setIsCreateOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !businessId) return;
    try {
      const res = await apiService.post<any>('/v1/offers', {
        businessId,
        title,
        discountPercent: Number(discount),
        status: active ? 'ACTIVE' : 'PAUSED',
      });
      if (res.data && !res.error) {
        setOffers((prev) => [res.data, ...prev]);
      }
    } catch (_) {}
    setIsCreateOpen(false);
  };

  const handleOpenEdit = (offer: any) => {
    setEditingOffer(offer);
    setTitle(offer.title || '');
    setDiscount(offer.discountPercent || offer.discountPercentage || offer.discount || 0);
    setActive(offer.status === 'ACTIVE');
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !editingOffer) return;
    try {
      const res = await apiService.patch<any>(`/v1/offers/${editingOffer.id}`, {
        title,
        discountPercent: Number(discount),
        status: active ? 'ACTIVE' : 'PAUSED',
      });
      const updated = res.data && !res.error
        ? res.data
        : { ...editingOffer, title, discountPercent: Number(discount), status: active ? 'ACTIVE' : 'PAUSED' };
      setOffers((prev) => prev.map((o) => (o.id === editingOffer.id ? updated : o)));
    } catch (_) {
      setOffers((prev) =>
        prev.map((o) =>
          o.id === editingOffer.id
            ? { ...o, title, discountPercent: Number(discount), status: active ? 'ACTIVE' : 'PAUSED' }
            : o,
        ),
      );
    }
    setEditingOffer(null);
  };

  const handleDelete = async () => {
    if (!deletingOffer) return;
    try { await apiService.delete<any>(`/v1/offers/${deletingOffer.id}`); } catch (_) {}
    setOffers((prev) => prev.filter((o) => o.id !== deletingOffer.id));
    setDeletingOffer(null);
  };

  const toggleActive = async (offer: any) => {
    const newStatus = offer.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    try { await apiService.patch<any>(`/v1/offers/${offer.id}`, { status: newStatus }); } catch (_) {}
    setOffers((prev) => prev.map((o) => (o.id === offer.id ? { ...o, status: newStatus } : o)));
  };

  return (
    <BusinessLayout>
      <div className="space-y-6">

        {/* ── Header ── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              {isModerator ? 'Moderation Hub' : isStaff ? 'Operations Hub' : (business?.name || 'Business Hub')}
            </h1>
            <p className="text-muted-foreground text-sm">
              {isModerator
                ? 'Review bills, moderate content, and flag fraud'
                : isStaff
                  ? 'Manage listings, offers, and media'
                  : 'Listings, promotions, and performance — all in one place.'}
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={fetchData}
              disabled={loading}
              className="rounded-xl border-border text-foreground hover:bg-muted/40 gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            {storefrontUrl && (
              <Button
                variant="outline"
                onClick={() => { setIsShareOpen(true); setIsCopied(false); }}
                className="rounded-xl border-border text-foreground hover:bg-muted/40 gap-2"
              >
                <Share2 className="h-4 w-4" />
                Share
              </Button>
            )}
            <Button
              onClick={handleOpenCreate}
              className="rounded-xl gap-2 font-medium bg-primary text-primary-foreground"
            >
              <Plus className="h-4 w-4" />
              New Offer
            </Button>
          </div>
        </div>

        {/* ── Moderator quick widget ── */}
        {isModerator && (
          <Card className="p-5 rounded-2xl border-warning/20 bg-warning/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-warning/15 flex items-center justify-center">
                  <ShieldCheck className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Bill Moderation Queue</h3>
                  <p className="text-xs text-muted-foreground">Review pending bill verifications</p>
                </div>
              </div>
              <Link href="/dashboard/moderation">
                <Button size="sm" className="rounded-xl bg-warning hover:bg-warning text-white gap-1.5 text-xs">
                  Review Queue <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </Card>
        )}

        {/* ── Business info strip ── */}
        {business && (
          <Card className="p-4 rounded-2xl border-border bg-card/40 backdrop-blur-xl">
            <div className="flex flex-wrap items-center gap-4 text-sm">
              {/* Status badge */}
              <span className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border',
                business.status === 'APPROVED'
                  ? 'bg-success/10 text-success border-success/20'
                  : business.status === 'PENDING_VERIFICATION' || business.status === 'UNDER_REVIEW'
                    ? 'bg-warning/10 text-warning border-warning/20'
                    : 'bg-muted/40 text-muted-foreground border-border',
              )}>
                {business.status === 'APPROVED'
                  ? <><CheckCircle className="h-3 w-3" /> Approved</>
                  : business.status === 'PENDING_VERIFICATION'
                    ? <><Clock className="h-3 w-3" /> Pending Verification</>
                    : business.status === 'UNDER_REVIEW'
                      ? <><Clock className="h-3 w-3" /> Under Review</>
                      : <><XCircle className="h-3 w-3" /> {business.status}</>}
              </span>
              {business.city && (
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  {[business.city, business.state].filter(Boolean).join(', ')}
                </span>
              )}
              {business.phone && (
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Phone className="h-3.5 w-3.5" />
                  {business.phone}
                </span>
              )}
              {business.category?.name && (
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <FileText className="h-3.5 w-3.5" />
                  {business.category.name}
                </span>
              )}
            </div>
          </Card>
        )}

        {/* ── Stats Grid — real DB data ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card
                key={stat.label}
                className="p-4 md:p-6 rounded-2xl border-border bg-card/60 backdrop-blur-xl hover:shadow-lg transition-all duration-300 relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors pointer-events-none" />
                <div className="flex items-center justify-between mb-3 md:mb-4">
                  <div className={`p-2 md:p-3 rounded-xl ${stat.color}`}>
                    <Icon className="h-4 w-4 md:h-5 md:w-5" />
                  </div>
                </div>
                <p className="text-xs md:text-sm font-medium text-muted-foreground">{stat.label}</p>
                <h3 className="text-xl md:text-3xl font-extrabold text-foreground mt-1 tracking-tight">
                  {loading
                    ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    : stat.value}
                </h3>
                {!loading && stat.sub && (
                  <p className="text-[10px] md:text-xs text-muted-foreground mt-1 truncate">{stat.sub}</p>
                )}
              </Card>
            );
          })}
        </div>

        {/* ── Published content counts (per-company) ── */}
        {!isModerator && !isStaff && (
          <Card className="p-4 md:p-5 rounded-2xl border-border bg-card/40 backdrop-blur-xl">
            <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Published content</span>
              <Link href="/dashboard/offers" className="flex items-center gap-2 group">
                <span className="p-1.5 rounded-lg bg-success/10 text-success"><Tag className="h-4 w-4" /></span>
                <span className="text-lg font-extrabold text-foreground group-hover:text-primary transition-colors">
                  {loading ? '…' : offers.length}
                </span>
                <span className="text-xs text-muted-foreground">Offers</span>
              </Link>
              <Link href="/dashboard/events" className="flex items-center gap-2 group">
                <span className="p-1.5 rounded-lg bg-info/10 text-info"><Clock className="h-4 w-4" /></span>
                <span className="text-lg font-extrabold text-foreground group-hover:text-primary transition-colors">
                  {loading ? '…' : events.length}
                </span>
                <span className="text-xs text-muted-foreground">Events</span>
              </Link>
            </div>
          </Card>
        )}

        {/* ── Staff quick-access ── */}
        {isStaff && (
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { label: 'Active Offers', value: activeOffers.toString(), icon: Tag, href: '/dashboard/offers', color: 'text-success', bg: 'bg-success/10' },
              { label: 'Listed Products', value: '—', icon: FileText, href: '/dashboard/products', color: 'text-primary', bg: 'bg-primary/10' },
              { label: 'Pending Media', value: '—', icon: Clock, href: '/dashboard/media', color: 'text-warning', bg: 'bg-warning/10' },
            ].map((s) => (
              <Link key={s.label} href={s.href}>
                <Card className="p-4 rounded-2xl border-border bg-card/40 hover:bg-card/60 transition-all cursor-pointer">
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

        {/* ── Offer Performance Chart ── */}
        <Card className="p-6 rounded-2xl border-border bg-card/40 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-foreground">Offer Performance</h3>
              <p className="text-xs text-muted-foreground">Redemptions and discount % per offer.</p>
            </div>
          </div>
          <div className="h-64 w-full">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
              </div>
            ) : chartData.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-sm gap-2">
                <Tag className="h-8 w-8 opacity-30" />
                <span>No active offers yet. Create one to see performance data here.</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(0.25 0 0)" />
                  <XAxis dataKey="name" stroke="oklch(0.65 0 0)" fontSize={10} tickLine={false} />
                  <YAxis stroke="oklch(0.65 0 0)" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#121212', borderColor: 'oklch(0.25 0 0)', borderRadius: '12px' }}
                    labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                  />
                  <Bar dataKey="Claims" fill="oklch(0.630 0.045 15)" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="Discount %" fill="oklch(0.55 0.12 270)" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* ── Offers List ── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-foreground">Promotions & Active Offers</h2>
            {offers.length > 0 && (
              <span className="text-xs text-muted-foreground">{offers.length} total</span>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
            </div>
          ) : offers.length === 0 ? (
            <Card className="p-10 rounded-2xl border-dashed border-border bg-card/20 text-center">
              <Tag className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-muted-foreground text-sm">No offers created yet.</p>
              <Button onClick={handleOpenCreate} className="mt-4 rounded-xl bg-primary text-primary-foreground gap-2">
                <Plus className="h-4 w-4" /> Create First Offer
              </Button>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {offers.map((offer) => (
                <Card
                  key={offer.id}
                  className="p-6 rounded-2xl hover:shadow-md transition-all duration-300 border-border bg-card/40 backdrop-blur-xl relative overflow-hidden group"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h3 className="font-semibold text-foreground text-base truncate">{offer.title}</h3>
                        <button
                          onClick={() => toggleActive(offer)}
                          className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold hover:opacity-85 transition-opacity ${
                            offer.status === 'ACTIVE'
                              ? 'bg-success/10 text-success border border-success/20'
                              : 'bg-muted/40 text-muted-foreground border border-border'
                          }`}
                        >
                          {offer.status === 'ACTIVE' ? 'Active' : offer.status === 'PAUSED' ? 'Paused' : offer.status}
                        </button>
                      </div>
                      <div className="flex items-center gap-6 text-sm mt-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Discount</p>
                          <p className="font-bold text-foreground text-base">
                            {offer.discountPercent || offer.discountPercentage || offer.discount || 0}%
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Claims</p>
                          <p className="font-bold text-foreground text-base">
                            {Number(offer.currentRedemptions) || 0}
                          </p>
                        </div>
                        {offer.maxRedemptions && (
                          <div>
                            <p className="text-xs text-muted-foreground">Max</p>
                            <p className="font-bold text-foreground text-base">{offer.maxRedemptions}</p>
                          </div>
                        )}
                        {offer.endDate && (
                          <div>
                            <p className="text-xs text-muted-foreground">Expires</p>
                            <p className="font-bold text-foreground text-sm">
                              {new Date(offer.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 ml-2 shrink-0">
                      <Button
                        onClick={() => setViewingOffer(offer)}
                        size="icon"
                        variant="outline"
                        className="rounded-xl border-border hover:bg-muted/40 text-muted-foreground h-9 w-9"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={() => handleOpenEdit(offer)}
                        size="icon"
                        variant="outline"
                        className="rounded-xl border-border hover:bg-muted/40 text-muted-foreground h-9 w-9"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={() => setDeletingOffer(offer)}
                        size="icon"
                        variant="outline"
                        className="rounded-xl border-border hover:bg-destructive/10 text-destructive border-destructive/20 h-9 w-9"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* ── CREATE MODAL ── */}
        {isCreateOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <Card className="w-full max-w-md p-6 rounded-2xl border-border bg-card shadow-2xl relative">
              <button
                onClick={() => setIsCreateOpen(false)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
              <h3 className="text-xl font-bold text-foreground mb-4">Create Promotional Offer</h3>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-2">Offer Title</label>
                  <Input
                    placeholder="e.g. Summer Special"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    className="rounded-xl border-input bg-background focus:border-primary text-foreground"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-2">Discount Percentage</label>
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    value={discount || ''}
                    onChange={(e) => setDiscount(Number(e.target.value))}
                    required
                    className="rounded-xl border-input bg-background focus:border-primary text-foreground"
                  />
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="create-active"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                    className="rounded bg-background border-input h-4 w-4"
                  />
                  <label htmlFor="create-active" className="text-sm text-muted-foreground">Activate immediately</label>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateOpen(false)}
                    className="rounded-xl border-border hover:bg-muted text-foreground"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="rounded-xl bg-primary text-primary-foreground font-semibold">
                    Create Offer
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}

        {/* ── EDIT MODAL ── */}
        {editingOffer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <Card className="w-full max-w-md p-6 rounded-2xl border-border bg-card shadow-2xl relative">
              <button
                onClick={() => setEditingOffer(null)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
              <h3 className="text-xl font-bold text-foreground mb-4">Edit Offer</h3>
              <form onSubmit={handleEdit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-2">Offer Title</label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    className="rounded-xl border-input bg-background focus:border-primary text-foreground"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-2">Discount %</label>
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    value={discount || ''}
                    onChange={(e) => setDiscount(Number(e.target.value))}
                    required
                    className="rounded-xl border-input bg-background focus:border-primary text-foreground"
                  />
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="edit-active"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                    className="rounded bg-background border-input h-4 w-4"
                  />
                  <label htmlFor="edit-active" className="text-sm text-muted-foreground">Active</label>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditingOffer(null)}
                    className="rounded-xl border-border hover:bg-muted text-foreground"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="rounded-xl bg-primary text-primary-foreground font-semibold">
                    Save Changes
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}

        {/* ── DELETE MODAL ── */}
        {deletingOffer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <Card className="w-full max-w-sm p-6 rounded-2xl border-border bg-card shadow-2xl relative text-center">
              <button
                onClick={() => setDeletingOffer(null)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center text-destructive mb-4">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">Delete Offer</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Delete <span className="font-semibold text-foreground">"{deletingOffer.title}"</span>? This is permanent.
              </p>
              <div className="flex justify-center gap-3">
                <Button
                  onClick={() => setDeletingOffer(null)}
                  variant="outline"
                  className="rounded-xl border-border hover:bg-muted text-foreground px-4"
                >
                  Cancel
                </Button>
                <Button onClick={handleDelete} className="rounded-xl bg-destructive hover:bg-destructive text-white px-4">
                  Delete
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* ── VIEW MODAL ── */}
        {viewingOffer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <Card className="w-full max-w-md p-6 rounded-2xl border-border bg-card shadow-2xl relative">
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
                  <span className={`inline-block px-2 py-0.5 mt-1 rounded-full text-xs font-semibold ${
                    viewingOffer.status === 'ACTIVE'
                      ? 'bg-success/10 text-success border border-success/20'
                      : 'bg-secondary/40 text-muted-foreground border border-border'
                  }`}>
                    {viewingOffer.status === 'ACTIVE' ? 'Active' : viewingOffer.status}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                {[
                  { label: 'Discount', value: `${viewingOffer.discountPercent || viewingOffer.discountPercentage || 0}%` },
                  { label: 'Claims', value: Number(viewingOffer.currentRedemptions) || 0 },
                  { label: 'Max Redemptions', value: viewingOffer.maxRedemptions ?? 'Unlimited' },
                  { label: 'Expires', value: viewingOffer.endDate ? new Date(viewingOffer.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—' },
                ].map((s) => (
                  <div key={s.label} className="bg-secondary/50 p-4 rounded-xl border border-border">
                    <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
                    <p className="text-xl font-extrabold text-foreground">{s.value}</p>
                  </div>
                ))}
              </div>
              {viewingOffer.description && (
                <p className="text-sm text-muted-foreground mb-4">{viewingOffer.description}</p>
              )}
              {viewingOffer.code && (
                <div className="bg-primary/10 border border-primary/20 rounded-xl px-4 py-3 mb-4 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Promo Code</span>
                  <span className="font-mono font-bold text-primary">{viewingOffer.code}</span>
                </div>
              )}
              <div className="flex justify-end">
                <Button
                  onClick={() => setViewingOffer(null)}
                  className="rounded-xl bg-primary text-primary-foreground font-semibold"
                >
                  Close
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* ── SHARE MODAL ── */}
        {isShareOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <Card className="w-full max-w-md p-6 rounded-2xl border-border bg-card shadow-2xl relative">
              <button
                onClick={() => setIsShareOpen(false)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
              <h3 className="text-xl font-bold text-foreground mb-4">Share Storefront</h3>
              <p className="text-sm text-muted-foreground mb-4">Share your public listing with customers.</p>
              <div className="flex gap-2 mb-4">
                <Input
                  readOnly
                  value={storefrontUrl || 'Storefront URL not available'}
                  className="rounded-xl border-input bg-background text-foreground"
                />
                <Button
                  onClick={() => {
                    navigator.clipboard.writeText(storefrontUrl);
                    setIsCopied(true);
                    setTimeout(() => setIsCopied(false), 2000);
                  }}
                  disabled={!storefrontUrl}
                  className="rounded-xl gap-2 font-medium bg-primary text-primary-foreground"
                >
                  {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {isCopied ? 'Copied' : 'Copy'}
                </Button>
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={() => setIsShareOpen(false)}
                  variant="outline"
                  className="rounded-xl border-border text-foreground hover:bg-muted"
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
