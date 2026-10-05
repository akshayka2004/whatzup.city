'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { SuperAdminLayout } from '@/components/layouts/super-admin-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Store, ArrowLeft, Loader2, Mail, Phone, User, Hash, Gift, MapPin, CreditCard,
  Ban, RotateCcw, X, AlertTriangle, ExternalLink, Clock, Building2, History,
} from 'lucide-react';
import { apiService } from '@/lib/services/api-service';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import { BrandStatusPill, eventMeta, fullDate, seriesLabel, timeAgo } from '../_shared';

interface Outlet {
  id: string;
  name: string;
  slug?: string;
  outletLabel?: string | null;
  isBrandHq?: boolean;
  status: string;
  city?: string | null;
  billSeriesPrefix?: string | null;
  launchOfferClaimedAt?: string | null;
  createdAt: string;
  category?: { name: string } | null;
  subscription?: { packageName?: string; status?: string; endDate?: string | null } | null;
}

interface BrandEvent {
  id: string;
  type: string;
  summary: string;
  metadata?: any;
  createdAt: string;
  actorId?: string | null;
  businessId?: string | null;
}

interface BrandDetail {
  id: string;
  name: string;
  slug: string;
  status: 'ACTIVE' | 'SUSPENDED';
  billSeriesMode: 'SHARED' | 'PER_OUTLET';
  billSeriesPrefix?: string | null;
  createdAt: string;
  owner?: { id: string; name?: string; email?: string; phone?: string } | null;
  events?: BrandEvent[];
}

const OUTLET_STATUS: Record<string, string> = {
  APPROVED: 'border-success/20 bg-success/10 text-success',
  PENDING_VERIFICATION: 'border-warning/25 bg-warning/10 text-warning',
  REJECTED: 'border-destructive/20 bg-destructive/10 text-destructive',
  SUSPENDED: 'border-destructive/20 bg-destructive/10 text-destructive',
  DRAFT: 'border-border bg-secondary text-muted-foreground',
};

const shortDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

export default function SuperAdminBrandDetailPage() {
  const params = useParams<{ id: string }>();
  const brandId = params?.id;
  const { user } = useAuth();
  const isSuperAdmin = (user as any)?.rbacRole === 'SUPER_ADMIN';

  const [brand, setBrand] = useState<BrandDetail | null>(null);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [confirming, setConfirming] = useState(false);
  const [acting, setActing] = useState(false);
  const [actionErr, setActionErr] = useState('');

  const load = useCallback(async () => {
    if (!brandId) return;
    setLoading(true);
    setError('');
    const res = await apiService.get<any>(`/v1/admin/brands/${brandId}`);
    const d = res.data?.data ?? res.data;
    if (res.error || !d?.brand) {
      setError(res.error || 'Brand not found');
      setBrand(null);
      setOutlets([]);
    } else {
      setBrand(d.brand);
      setOutlets(d.outlets || []);
    }
    setLoading(false);
  }, [brandId]);

  useEffect(() => { load(); }, [load]);

  const toggleStatus = async () => {
    if (!brand) return;
    setActing(true);
    setActionErr('');
    const next = brand.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
    const res = await apiService.patch<any>(`/v1/admin/brands/${brand.id}/status`, { status: next });
    setActing(false);
    if (res.error) { setActionErr(res.error); return; }
    setConfirming(false);
    load();
  };

  const back = (
    <Link href="/super-admin/brands" className="ui-press inline-flex h-10 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
      <ArrowLeft className="h-4 w-4" /> Brand accounts
    </Link>
  );

  if (loading && !brand) {
    return (
      <SuperAdminLayout>
        <div className="space-y-4">
          {back}
          <div className="flex items-center justify-center py-24 text-muted-foreground text-sm gap-2"><Loader2 className="h-5 w-5 animate-spin" /> Loading…</div>
        </div>
      </SuperAdminLayout>
    );
  }

  if (!brand) {
    return (
      <SuperAdminLayout>
        <div className="space-y-4">
          {back}
          <Card className="rounded-2xl border-border bg-card">
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
              <Store className="h-8 w-8 opacity-30" />
              <p className="text-sm">{error || 'Brand not found'}</p>
            </div>
          </Card>
        </div>
      </SuperAdminLayout>
    );
  }

  const suspended = brand.status === 'SUSPENDED';
  const pending = outlets.filter((o) => o.status === 'PENDING_VERIFICATION');
  const outletById = new Map(outlets.map((o) => [o.id, o]));
  const events = [...(brand.events || [])].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        {back}

        {/* Header */}
        <Card className="ui-fade-up rounded-2xl border-border bg-card p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3 min-w-0">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Store className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold text-foreground break-words">{brand.name}</h1>
                  <BrandStatusPill status={brand.status} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">/{brand.slug} · Since {shortDate(brand.createdAt)}</p>
                <div className="mt-3 flex flex-col gap-1.5 text-sm sm:flex-row sm:flex-wrap sm:gap-x-5">
                  <span className="inline-flex items-center gap-1.5 text-foreground"><User className="h-3.5 w-3.5 text-muted-foreground" />{brand.owner?.name || '—'}</span>
                  {brand.owner?.email && (
                    <a href={`mailto:${brand.owner.email}`} className="inline-flex min-w-0 items-center gap-1.5 text-muted-foreground hover:text-foreground break-all"><Mail className="h-3.5 w-3.5 shrink-0" />{brand.owner.email}</a>
                  )}
                  {brand.owner?.phone && (
                    <a href={`tel:${brand.owner.phone}`} className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground"><Phone className="h-3.5 w-3.5" />{brand.owner.phone}</a>
                  )}
                </div>
              </div>
            </div>
            {isSuperAdmin && (
              <Button
                onClick={() => { setActionErr(''); setConfirming(true); }}
                variant="outline"
                className={cn(
                  'ui-press h-11 w-full shrink-0 rounded-xl gap-2 cursor-pointer sm:w-auto',
                  suspended
                    ? 'border-success/30 text-success hover:bg-success/10 hover:text-success'
                    : 'border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive',
                )}
              >
                {suspended ? <><RotateCcw className="h-4 w-4" /> Reactivate brand</> : <><Ban className="h-4 w-4" /> Suspend brand</>}
              </Button>
            )}
          </div>
          {suspended && (
            <p className="mt-4 flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              This brand is suspended. It cannot add new outlets until reactivated.
            </p>
          )}
        </Card>

        {/* Summary + series */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Card className="ui-fade-up rounded-2xl border-border bg-card p-4">
            <p className="text-xs text-muted-foreground mb-1">Outlets</p>
            <p className="text-2xl font-bold text-foreground">{outlets.length}</p>
          </Card>
          <Card className={cn('ui-fade-up rounded-2xl border-border bg-card p-4', pending.length > 0 && 'border-warning/40')} style={{ animationDelay: '0.05s' }}>
            <p className="text-xs text-muted-foreground mb-1">Pending approval</p>
            <p className={cn('text-2xl font-bold', pending.length > 0 ? 'text-warning' : 'text-foreground')}>{pending.length}</p>
          </Card>
          <Card className="ui-fade-up col-span-2 rounded-2xl border-border bg-card p-4" style={{ animationDelay: '0.1s' }}>
            <p className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground"><Hash className="h-3 w-3" /> Bill numbering</p>
            {brand.billSeriesMode === 'PER_OUTLET' ? (
              <>
                <p className="text-sm font-semibold text-foreground">{seriesLabel('PER_OUTLET')}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Each outlet runs its own series and prefix (shown on the outlet below).</p>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-foreground">Shared series{brand.billSeriesPrefix ? <span className="ml-2 rounded-md bg-secondary px-1.5 py-0.5 font-mono text-xs">{brand.billSeriesPrefix}</span> : null}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">All outlets continue one bill sequence under the brand prefix.</p>
              </>
            )}
          </Card>
        </div>

        {/* Pending banner */}
        {pending.length > 0 && (
          <div className="flex flex-col gap-3 rounded-2xl border border-warning/30 bg-warning/10 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-start gap-2 text-sm text-foreground">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              <span>
                <strong>{pending.length}</strong> outlet{pending.length === 1 ? '' : 's'} waiting for verification
                <span className="text-muted-foreground"> ({pending.map((o) => o.name).join(', ')})</span>
              </span>
            </p>
            <Link href="/super-admin/approvals" className="shrink-0">
              <Button size="sm" className="ui-press h-10 w-full rounded-xl bg-warning text-primary-foreground hover:bg-warning/90 gap-1.5 cursor-pointer sm:w-auto">
                Open approvals <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        )}

        {/* Outlets */}
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground"><Building2 className="h-4 w-4 text-primary" /> Outlets</h2>
            <Link href={`/super-admin/businesses?brandId=${brand.id}`}>
              <Button variant="outline" size="sm" className="ui-press h-10 rounded-xl border-border text-foreground hover:bg-secondary gap-1.5 cursor-pointer">
                View in Businesses <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>

          {outlets.length === 0 ? (
            <Card className="rounded-2xl border-border bg-card">
              <p className="py-10 text-center text-sm text-muted-foreground">No outlets yet.</p>
            </Card>
          ) : (
            <div className="grid gap-3">
              {outlets.map((o, i) => {
                const isPending = o.status === 'PENDING_VERIFICATION';
                const sub = o.subscription;
                return (
                  <Card
                    key={o.id}
                    className={cn('ui-fade-up rounded-2xl border-border bg-card p-4', isPending && 'border-warning/50 bg-warning/5')}
                    style={{ animationDelay: `${Math.min(i, 8) * 0.04}s` }}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-foreground">{o.name}</p>
                          {o.outletLabel && <span className="text-xs text-muted-foreground">· {o.outletLabel}</span>}
                          {o.isBrandHq && <span className="rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">HQ</span>}
                          <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-bold', OUTLET_STATUS[o.status] || OUTLET_STATUS.DRAFT)}>
                            {o.status.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          {o.city && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{o.city}</span>}
                          {o.category?.name && <span>{o.category.name}</span>}
                          <span className="inline-flex items-center gap-1">
                            <CreditCard className="h-3 w-3" />
                            {sub ? `${sub.packageName || 'Plan'}${sub.status ? ` (${sub.status})` : ''}${sub.endDate ? ` · ends ${shortDate(sub.endDate)}` : ''}` : 'No plan'}
                          </span>
                          {brand.billSeriesMode === 'PER_OUTLET' && o.billSeriesPrefix && (
                            <span className="inline-flex items-center gap-1"><Hash className="h-3 w-3" /><span className="font-mono">{o.billSeriesPrefix}</span></span>
                          )}
                        </div>
                        {o.launchOfferClaimedAt && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-success/20 bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success" title={fullDate(o.launchOfferClaimedAt)}>
                            <Gift className="h-3 w-3" /> Launch offer claimed {shortDate(o.launchOfferClaimedAt)}
                          </span>
                        )}
                      </div>
                      {isPending && (
                        <Link href="/super-admin/approvals" className="shrink-0">
                          <Button size="sm" variant="outline" className="ui-press h-10 w-full rounded-xl border-warning/40 text-warning hover:bg-warning/10 hover:text-warning gap-1.5 cursor-pointer sm:w-auto">
                            Review <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        {/* Timeline */}
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground"><History className="h-4 w-4 text-primary" /> Activity timeline</h2>
          <Card className="rounded-2xl border-border bg-card p-4 sm:p-5">
            {events.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No activity recorded yet.</p>
            ) : (
              <ol className="relative">
                {events.map((ev, i) => {
                  const m = eventMeta(ev.type);
                  const Icon = m.icon;
                  const outlet = ev.businessId ? outletById.get(ev.businessId) : undefined;
                  const last = i === events.length - 1;
                  return (
                    <li key={ev.id} className="ui-fade-up relative flex gap-3 pb-5 last:pb-0" style={{ animationDelay: `${Math.min(i, 8) * 0.03}s` }}>
                      {!last && <span aria-hidden className="absolute left-4 top-9 bottom-0 w-px -translate-x-1/2 bg-border" />}
                      <span className={cn('relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border', m.bg, m.color, m.border)}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1 pt-0.5">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <span className={cn('text-xs font-semibold', m.color)}>{m.label}</span>
                          {outlet && (
                            <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">{outlet.name}</span>
                          )}
                          <span className="text-[11px] text-muted-foreground" title={fullDate(ev.createdAt)}>{timeAgo(ev.createdAt)}</span>
                        </div>
                        <p className="mt-0.5 text-sm text-foreground break-words">{ev.summary}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </Card>
        </section>
      </div>

      {/* Suspend / reactivate confirm */}
      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card className="ui-pop relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border-border bg-card p-6 shadow-2xl">
            <button onClick={() => setConfirming(false)} aria-label="Close" className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"><X className="h-5 w-5" /></button>
            <div className="mb-3 flex items-center gap-3 pr-8">
              <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', suspended ? 'bg-success/10' : 'bg-destructive/10')}>
                {suspended ? <RotateCcw className="h-5 w-5 text-success" /> : <AlertTriangle className="h-5 w-5 text-destructive" />}
              </div>
              <h3 className="text-lg font-bold text-foreground">{suspended ? 'Reactivate brand' : 'Suspend brand'}</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              {suspended
                ? <>Reactivate <strong className="text-foreground">{brand.name}</strong>? The owner will be able to add outlets again.</>
                : <>Suspend <strong className="text-foreground">{brand.name}</strong>? The brand will not be able to add new outlets. Existing outlets and their listings are not changed.</>}
            </p>
            {actionErr && <p className="mt-3 text-xs text-destructive">{actionErr}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <Button onClick={() => setConfirming(false)} variant="outline" className="h-10 rounded-xl border-border text-muted-foreground hover:bg-secondary cursor-pointer">Cancel</Button>
              <Button
                onClick={toggleStatus}
                disabled={acting}
                className={cn(
                  'h-10 rounded-xl gap-1.5 font-semibold cursor-pointer',
                  suspended ? 'bg-success text-primary-foreground hover:bg-success/90' : 'bg-destructive text-white hover:bg-destructive/90',
                )}
              >
                {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : suspended ? <RotateCcw className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                {suspended ? 'Reactivate' : 'Suspend'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </SuperAdminLayout>
  );
}
