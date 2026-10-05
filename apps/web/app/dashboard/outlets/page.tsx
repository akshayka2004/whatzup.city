'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ArrowRight,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Store,
  Trash2,
} from 'lucide-react';
import { BusinessLayout } from '@/components/layouts/business-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { apiService } from '@/lib/services/api-service';
import { KERALA_CITIES } from '@/lib/constants';
import {
  invalidateActiveBusinessCache,
  useActiveBusiness,
  type BrandOutlet,
} from '@/hooks/use-active-business';
import { BrandConvertForm } from '@/components/business/brand-conversion-prompt';
import { OutletStatusPill, outletDisplayName } from '@/components/business/outlet-switcher';

interface OutletSummary {
  verifiedPurchases: number;
  verifiedSpend: number;
  pendingBills: number;
  activeOffers: number;
}
interface BrandEventRow {
  id: string;
  type: string;
  summary: string;
  createdAt: string;
  businessId?: string | null;
}

const unwrap = <T,>(data: any, key?: string): T | null => {
  if (data == null) return null;
  const body = key ? data[key] ?? data.data?.[key] : data;
  return (body ?? null) as T | null;
};

const sentence = (s: string) => {
  const t = s.replace(/_/g, ' ').toLowerCase();
  return t.charAt(0).toUpperCase() + t.slice(1);
};

const formatDate = (iso?: string | null, withTime = false) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return withTime
    ? d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
    : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

/** A new outlet has no plan until its owner finishes /register?outlet=…; a rejected one is resubmitted there too. */
const needsSetup = (o: BrandOutlet) =>
  o.status === 'DRAFT' || o.status === 'REJECTED' || (o.status === 'PENDING_VERIFICATION' && !o.subscription);

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/50 px-3 py-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-base font-semibold text-foreground tabular-nums">{value}</p>
    </div>
  );
}

function AddOutletDialog({
  open,
  onOpenChange,
  brandId,
  brandName,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  brandId: string;
  brandName: string;
}) {
  const router = useRouter();
  const [label, setLabel] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [categorySlug, setCategorySlug] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [categories, setCategories] = useState<{ slug: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || categories.length) return;
    apiService.get<any>('/v1/categories').then((res) => {
      if (res.error) return;
      const list: any[] = Array.isArray(res.data) ? res.data : res.data?.data ?? res.data?.items ?? [];
      setCategories(list.filter((c) => c?.slug && c?.name).map((c) => ({ slug: c.slug, name: c.name })));
    });
  }, [open, categories.length]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!label.trim()) return setError('Enter the outlet name or area, e.g. Kozhikode - Mavoor Road.');
    if (!/^\d{10}$/.test(phone)) return setError('Phone number must contain exactly 10 digits.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError('Enter a valid email for this outlet.');

    setSaving(true);
    const res = await apiService.post<any>(`/v1/brands/${brandId}/outlets`, {
      outletLabel: label.trim(),
      phone,
      email: email.trim(),
      ...(categorySlug ? { categorySlug } : {}),
      ...(city ? { city, state: 'Kerala' } : {}),
      ...(address.trim() ? { address: address.trim() } : {}),
    });
    if (res.error) {
      setError(res.error);
      setSaving(false);
      return;
    }
    const id: string | undefined = res.data?.business?.id ?? res.data?.data?.business?.id;
    invalidateActiveBusinessCache();
    // The new outlet still needs its details, invoice profile and plan — the register flow handles all three.
    router.push(id ? `/register?outlet=${encodeURIComponent(id)}` : '/dashboard/outlets');
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add an outlet</DialogTitle>
          <DialogDescription>
            Each outlet has its own listing, offers, QR and plan. New outlets are reviewed by our team before they go live.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Outlet name or area <span className="text-destructive">*</span>
            </label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              maxLength={100}
              placeholder="Kozhikode - Mavoor Road"
              className="h-11 rounded-xl bg-background"
            />
            <p className="text-[11px] text-muted-foreground">
              Listed as &ldquo;{brandName} - {label.trim() || 'your label'}&rdquo;
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Outlet phone <span className="text-destructive">*</span>
              </label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                inputMode="numeric"
                maxLength={10}
                placeholder="9876543210"
                className="h-11 rounded-xl bg-background"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Outlet email <span className="text-destructive">*</span>
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={255}
                placeholder="mavoor@yourbrand.com"
                className="h-11 rounded-xl bg-background"
              />
            </div>
          </div>
          <p className="-mt-2 text-[11px] text-muted-foreground">
            Each outlet needs its own phone number and email, not the ones used by another outlet.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Category</label>
              <select
                value={categorySlug}
                onChange={(e) => setCategorySlug(e.target.value)}
                className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground cursor-pointer"
              >
                <option value="">Same as your first outlet</option>
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">City</label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground cursor-pointer"
              >
                <option value="">Choose later</option>
                {KERALA_CITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Address</label>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Street, landmark (optional)"
              className="h-11 rounded-xl bg-background"
            />
          </div>

          {error && (
            <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => onOpenChange(false)}
              className="h-11 rounded-xl cursor-pointer"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="h-11 rounded-xl font-semibold cursor-pointer">
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Adding...
                </>
              ) : (
                <>
                  Add and continue <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function OutletsContent() {
  const router = useRouter();
  const { brand, outlets, activeBusiness, activeBusinessId, isBrand, loading, switchOutlet, refresh } =
    useActiveBusiness();

  const [summary, setSummary] = useState<Record<string, OutletSummary>>({});
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [events, setEvents] = useState<BrandEventRow[]>([]);
  const [reloadKey, setReloadKey] = useState(0);

  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<BrandOutlet | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [removing, setRemoving] = useState<BrandOutlet | null>(null);
  const [busy, setBusy] = useState(false);
  const [dialogError, setDialogError] = useState('');
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [pageError, setPageError] = useState('');

  const brandId = brand?.id;

  useEffect(() => {
    if (!brandId) return;
    let alive = true;
    setSummaryLoading(true);
    Promise.all([
      apiService.get<any>(`/v1/brands/${brandId}/summary`),
      apiService.get<any>(`/v1/brands/${brandId}/events?limit=15`),
    ]).then(([sumRes, evRes]) => {
      if (!alive) return;
      setSummary(sumRes.error ? {} : unwrap<Record<string, OutletSummary>>(sumRes.data, 'outlets') ?? {});
      const evList = evRes.error ? [] : Array.isArray(evRes.data) ? evRes.data : evRes.data?.data ?? [];
      setEvents(evList);
      setSummaryLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [brandId, reloadKey]);

  // The switcher's "Add outlet" lands here with ?add=1.
  useEffect(() => {
    if (loading || !isBrand || typeof window === 'undefined') return;
    if (new URLSearchParams(window.location.search).get('add') === '1') {
      setAddOpen(true);
      window.history.replaceState(null, '', '/dashboard/outlets');
    }
  }, [loading, isBrand]);

  const openOutlet = async (o: BrandOutlet) => {
    setPageError('');
    if (o.id === activeBusinessId) return router.push('/dashboard');
    setSwitchingId(o.id);
    const res = await switchOutlet(o.id, '/dashboard');
    if (!res.ok) {
      setPageError(res.error || 'Could not switch outlet.');
      setSwitchingId(null);
    }
  };

  const saveLabel = async () => {
    if (!brandId || !editing) return;
    if (!editLabel.trim()) return setDialogError('Enter the outlet name or area.');
    setBusy(true);
    setDialogError('');
    const res = await apiService.patch<any>(`/v1/brands/${brandId}/outlets/${editing.id}`, {
      outletLabel: editLabel.trim(),
    });
    setBusy(false);
    if (res.error) return setDialogError(res.error);
    setEditing(null);
    await refresh();
  };

  const removeOutlet = async () => {
    if (!brandId || !removing) return;
    setBusy(true);
    setDialogError('');
    const wasActive = removing.id === activeBusinessId;
    const res = await apiService.delete<any>(`/v1/brands/${brandId}/outlets/${removing.id}`);
    if (res.error) {
      setBusy(false);
      return setDialogError(res.error);
    }
    invalidateActiveBusinessCache();
    if (wasActive) {
      window.location.reload();
      return;
    }
    setBusy(false);
    setRemoving(null);
    await refresh();
    setReloadKey((k) => k + 1);
  };

  if (loading) {
    return (
      <div className="space-y-4" aria-busy>
        <div className="h-8 w-40 animate-pulse rounded-lg bg-muted" />
        <div className="grid gap-3 md:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="h-56 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  // ── Single-business owner: invite them to convert ────────────────────────────────────
  if (!isBrand || !brand) {
    return (
      <div className="mx-auto max-w-lg space-y-5 ui-fade-up">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Outlets</h1>
          <p className="mt-1 text-sm text-muted-foreground">Run more than one outlet?</p>
        </div>
        <Card className="rounded-2xl border-border bg-card p-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Store className="h-5 w-5" />
            </div>
            <p className="text-sm text-muted-foreground">
              Create a brand account to manage all your outlets from one login. Each outlet keeps its own address,
              hours, offers, QR and plan, and they share one invoice profile.
            </p>
          </div>
          {activeBusiness ? (
            <BrandConvertForm businessId={activeBusiness.id} businessName={activeBusiness.name} />
          ) : (
            <p className="text-sm text-muted-foreground">Register your business first, then come back here.</p>
          )}
        </Card>
      </div>
    );
  }

  const suspended = brand.status === 'SUSPENDED';
  const seriesText =
    brand.billSeriesMode === 'SHARED'
      ? `Shared bill series${brand.billSeriesPrefix ? `: ${brand.billSeriesPrefix}` : ''}`
      : 'Each outlet sets its own bill series';
  const outletName = (id?: string | null) => {
    const o = outlets.find((x) => x.id === id);
    return o ? outletDisplayName(o) : '';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between ui-fade-up">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold tracking-tight text-foreground">{brand.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {outlets.length} outlet{outlets.length === 1 ? '' : 's'} · {seriesText}
          </p>
        </div>
        <Button
          onClick={() => setAddOpen(true)}
          disabled={suspended}
          className="h-11 w-full rounded-xl font-semibold cursor-pointer ui-press sm:w-auto"
        >
          <Plus className="h-4 w-4" /> Add outlet
        </Button>
      </div>

      {suspended && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          This brand account is suspended, so new outlets cannot be added. Contact support for help.
        </div>
      )}
      {pageError && (
        <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {pageError}
        </p>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {outlets.map((o) => {
          const s = summary[o.id];
          const isActive = o.id === activeBusinessId;
          const stat = (n?: number, money = false) =>
            summaryLoading || n === undefined ? '–' : money ? `₹${n.toLocaleString('en-IN')}` : n.toLocaleString('en-IN');
          return (
            <Card key={o.id} className="rounded-2xl border-border bg-card p-4 space-y-4 ui-fade-up">
              <div className="flex items-start gap-3">
                {o.logo ? (
                  <img src={o.logo} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover" />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Store className="h-5 w-5" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <h2 className="truncate text-base font-semibold text-foreground">{outletDisplayName(o)}</h2>
                    <OutletStatusPill status={o.status} />
                    {o.isBrandHq && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">HQ</span>
                    )}
                    {isActive && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                        Current
                      </span>
                    )}
                  </div>
                  {o.outletLabel && <p className="truncate text-xs text-muted-foreground">{o.name}</p>}
                  {o.city && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" /> {o.city}
                    </p>
                  )}
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                {o.subscription ? (
                  <>
                    <span className="font-medium text-foreground">{sentence(o.subscription.packageName)}</span>
                    {' · '}
                    {sentence(o.subscription.status)}
                    {o.subscription.endDate ? ` · ends ${formatDate(o.subscription.endDate)}` : ''}
                  </>
                ) : (
                  'No plan yet'
                )}
              </p>

              <div className="grid grid-cols-2 gap-2">
                <Stat label="Verified purchases" value={stat(s?.verifiedPurchases)} />
                <Stat label="Verified spend" value={stat(s?.verifiedSpend, true)} />
                <Stat label="Pending bills" value={stat(s?.pendingBills)} />
                <Stat label="Active offers" value={stat(s?.activeOffers)} />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {needsSetup(o) && (
                  <Button asChild variant="outline" className="h-11 flex-1 rounded-xl cursor-pointer ui-press">
                    <Link href={`/register?outlet=${encodeURIComponent(o.id)}`}>
                      {o.status === 'REJECTED' ? 'Fix and resubmit' : 'Continue setup'}
                    </Link>
                  </Button>
                )}
                <Button
                  onClick={() => openOutlet(o)}
                  disabled={switchingId !== null}
                  className="h-11 flex-1 rounded-xl font-semibold cursor-pointer ui-press"
                >
                  {switchingId === o.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Open'}
                </Button>
                <Button
                  variant="outline"
                  aria-label={`Edit label for ${outletDisplayName(o)}`}
                  onClick={() => {
                    setEditing(o);
                    setEditLabel(o.outletLabel ?? '');
                    setDialogError('');
                  }}
                  className="h-11 w-11 rounded-xl px-0 cursor-pointer"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                {!o.isBrandHq && (
                  <Button
                    variant="outline"
                    aria-label={`Remove ${outletDisplayName(o)}`}
                    onClick={() => {
                      setRemoving(o);
                      setDialogError('');
                    }}
                    className="h-11 w-11 rounded-xl px-0 text-destructive cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <section className="space-y-3">
        <h2 className="text-base font-bold text-foreground">Recent activity</h2>
        <Card className="rounded-2xl border-border bg-card divide-y divide-border">
          {events.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No activity yet.</p>
          ) : (
            events.map((ev) => (
              <div key={ev.id} className="flex items-start justify-between gap-3 p-3.5">
                <div className="min-w-0">
                  <p className="text-sm text-foreground">{ev.summary}</p>
                  {outletName(ev.businessId) && (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{outletName(ev.businessId)}</p>
                  )}
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">{formatDate(ev.createdAt, true)}</span>
              </div>
            ))
          )}
        </Card>
      </section>

      <AddOutletDialog open={addOpen} onOpenChange={setAddOpen} brandId={brand.id} brandName={brand.name} />

      <Dialog open={!!editing} onOpenChange={(o) => !busy && !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit outlet label</DialogTitle>
            <DialogDescription>Shown in the outlet switcher and on the outlet&apos;s listing name.</DialogDescription>
          </DialogHeader>
          <Input
            value={editLabel}
            onChange={(e) => setEditLabel(e.target.value)}
            maxLength={100}
            placeholder="Kozhikode - Mavoor Road"
            className="h-11 rounded-xl bg-background"
          />
          {dialogError && <p role="alert" className="text-xs text-destructive">{dialogError}</p>}
          <DialogFooter>
            <Button variant="outline" disabled={busy} onClick={() => setEditing(null)} className="h-11 rounded-xl cursor-pointer">
              Cancel
            </Button>
            <Button onClick={saveLabel} disabled={busy} className="h-11 rounded-xl cursor-pointer">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save label'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!removing} onOpenChange={(o) => !busy && !o && setRemoving(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove this outlet?</DialogTitle>
            <DialogDescription>
              {removing ? `${outletDisplayName(removing)} will be removed from ${brand.name}. ` : ''}
              Your other outlets are not affected. If you remove it by mistake, contact support.
            </DialogDescription>
          </DialogHeader>
          {dialogError && <p role="alert" className="text-xs text-destructive">{dialogError}</p>}
          <DialogFooter>
            <Button variant="outline" disabled={busy} onClick={() => setRemoving(null)} className="h-11 rounded-xl cursor-pointer">
              Keep outlet
            </Button>
            <Button
              onClick={removeOutlet}
              disabled={busy}
              className="h-11 rounded-xl bg-destructive text-white hover:bg-destructive/90 cursor-pointer"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Remove outlet'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function OutletsPage() {
  return (
    <BusinessLayout>
      <OutletsContent />
    </BusinessLayout>
  );
}
