'use client';

/**
 * Platform-exclusive offers — admin create/manage.
 *
 * These are curated vendor deals with no linked Business, so vendor details are
 * typed in rather than picked from a business list. Each category collects a
 * different field set (see lib/platform-offers.ts); everything shares a common
 * core of title/location/price/phone/poster.
 */

import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/layouts/admin-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiService } from '@/lib/services/api-service';
import { onboardingService } from '@/lib/services/onboarding-service';
import {
  PLATFORM_OFFER_CATEGORIES, STAYCATION_SUBTYPES,
  SADYA_PROVIDER_TYPES, SADYA_DELIVERY_OPTIONS,
  STAYCATION_PROPERTY_TYPES, STAYCATION_VIEWS, AC_OPTIONS,
  DAYOUT_VENUE_TYPES, categoryLabel, subTypeLabel, rateLines,
  type PlatformOfferCategory, type PlatformOfferDetails, type RateLine,
} from '@/lib/platform-offers';
import { cn } from '@/lib/utils';
import {
  Tag, Plus, Loader2, UploadCloud, Eye, EyeOff, Trash2, X, ImageIcon,
} from 'lucide-react';

/** Freeform repeatable {label, rate} rows — used for Payasam types. */
function RateLineEditor({
  lines, onChange, labelPlaceholder,
}: { lines: RateLine[]; onChange: (lines: RateLine[]) => void; labelPlaceholder: string }) {
  const update = (i: number, patch: Partial<RateLine>) =>
    onChange(lines.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const remove = (i: number) => onChange(lines.filter((_, idx) => idx !== i));
  return (
    <div className="space-y-2">
      {lines.map((l, i) => (
        <div key={i} className="flex gap-2">
          <Input
            value={l.label}
            onChange={(e) => update(i, { label: e.target.value })}
            placeholder={labelPlaceholder}
            className="h-10 rounded-lg flex-1"
          />
          <Input
            value={l.rate}
            onChange={(e) => update(i, { rate: e.target.value })}
            placeholder="Rate"
            className="h-10 rounded-lg w-32"
          />
          <button
            type="button"
            onClick={() => remove(i)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive active:scale-95 cursor-pointer"
            aria-label="Remove"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...lines, { label: '', rate: '' }])}
        className="text-xs font-medium text-primary hover:underline cursor-pointer"
      >
        + Add rate
      </button>
    </div>
  );
}

/** Rate input per currently-selected chip — keeps rows in sync with the selection. */
function PerSelectionRates({
  selected, lines, onChange,
}: { selected: string[]; lines: RateLine[]; onChange: (lines: RateLine[]) => void }) {
  if (!selected.length) return null;
  const rateFor = (label: string) => lines.find((l) => l.label === label)?.rate || '';
  const setRate = (label: string, rate: string) => {
    const rest = lines.filter((l) => l.label !== label);
    onChange(rate ? [...rest, { label, rate }] : rest);
  };
  return (
    <div className="space-y-2">
      {selected.map((label) => (
        <div key={label} className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-36 shrink-0 truncate">{label}</span>
          <Input
            value={rateFor(label)}
            onChange={(e) => setRate(label, e.target.value)}
            placeholder="Rate"
            className="h-10 rounded-lg"
          />
        </div>
      ))}
    </div>
  );
}

type Row = {
  id: string;
  category: PlatformOfferCategory;
  subType?: string | null;
  title: string;
  location: string;
  price?: string | null;
  phone?: string | null;
  description?: string | null;
  details: PlatformOfferDetails;
  status: 'PUBLISHED' | 'UNPUBLISHED';
  clickCount?: number;
  imageSignedUrl?: string | null;
  createdAt: string;
};

/** Multi-select chip group — used for the several "pick any" fields. */
function ChipGroup({
  options, selected, onToggle,
}: { options: readonly string[]; selected: string[]; onToggle: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = selected.includes(o);
        return (
          <button
            key={o}
            type="button"
            onClick={() => onToggle(o)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer',
              on
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:text-foreground',
            )}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

function Field({
  label, children, hint,
}: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-muted-foreground">{hint}</span>}
    </label>
  );
}

export default function AdminPlatformOffersPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  // Composer state
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [category, setCategory] = useState<PlatformOfferCategory | ''>('');
  const [subType, setSubType] = useState<string>('');
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [price, setPrice] = useState('');
  const [phone, setPhone] = useState('');
  const [description, setDescription] = useState('');
  const [details, setDetails] = useState<PlatformOfferDetails>({});
  const [poster, setPoster] = useState<File | null>(null);
  const [existingImage, setExistingImage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    const res = await apiService.get<any>('/v1/platform-offers/admin');
    const list = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
    setRows(list);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setEditingId(null);
    setCategory(''); setSubType('');
    setTitle(''); setLocation(''); setPrice(''); setPhone(''); setDescription('');
    setDetails({}); setPoster(null); setExistingImage(null); setError('');
  };

  const openCreate = () => { resetForm(); setOpen(true); };

  const openEdit = (r: Row) => {
    setEditingId(r.id);
    setCategory(r.category);
    setSubType(r.subType || '');
    setTitle(r.title);
    setLocation(r.location);
    setPrice(r.price || '');
    setPhone(r.phone || '');
    setDescription(r.description || '');
    setDetails(r.details || {});
    setPoster(null);
    setExistingImage(r.imageSignedUrl || null);
    setError('');
    setOpen(true);
  };

  const setD = (patch: Partial<PlatformOfferDetails>) =>
    setDetails((d) => ({ ...d, ...patch }));

  const toggleIn = (key: keyof PlatformOfferDetails, value: string) => {
    const cur = (details[key] as string[] | undefined) || [];
    setD({ [key]: cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value] } as any);
  };

  const isStaycation = category === 'STAYCATION';
  const isSadyaLike = category === 'SADYA' || category === 'PAYASAM';
  const canSave =
    !!category && !!title.trim() && !!location.trim() &&
    (!isStaycation || !!subType);

  const save = async (publish: boolean) => {
    if (!canSave) return;
    setSaving(true);
    setError('');
    try {
      let imageUrl: string | undefined;
      if (poster) {
        // Posters go to the private bucket; the API re-verifies the bytes and
        // hands out a signed URL for display.
        const signed = await onboardingService.getSignedUrl(
          // No business to scope by — the API falls back to the admin's own id.
          '', poster.name, poster.type, 'payment',
        );
        if (!signed.data || signed.error) {
          throw new Error(signed.error || 'Could not get an upload URL for the poster.');
        }
        const ok = await onboardingService.uploadFile(signed.data.uploadUrl, poster);
        if (!ok) throw new Error('Poster upload failed.');
        imageUrl = JSON.stringify({ bucket: 'verification-documents', path: signed.data.fileKey });
      }

      const body: any = {
        category,
        subType: isStaycation ? subType : undefined,
        title: title.trim(),
        location: location.trim(),
        price: price.trim() || undefined,
        phone: phone.trim() || undefined,
        description: description.trim() || undefined,
        details,
        status: publish ? 'PUBLISHED' : 'UNPUBLISHED',
        ...(imageUrl ? { imageUrl } : {}),
      };

      const res = editingId
        ? await apiService.patch<any>(`/v1/platform-offers/${editingId}`, body)
        : await apiService.post<any>('/v1/platform-offers', body);
      if (res.error) throw new Error(res.error);

      setMsg(editingId ? 'Offer updated.' : publish ? 'Offer published.' : 'Offer saved as draft.');
      setOpen(false);
      resetForm();
      load();
    } catch (e: any) {
      setError(e.message || 'Could not save the offer.');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (r: Row) => {
    setBusyId(r.id);
    const next = r.status === 'PUBLISHED' ? 'UNPUBLISHED' : 'PUBLISHED';
    const res = await apiService.patch<any>(`/v1/platform-offers/${r.id}/status`, { status: next });
    setBusyId(null);
    if (res.error) { setMsg(res.error); return; }
    setRows((cur) => cur.map((x) => (x.id === r.id ? { ...x, status: next as any } : x)));
  };

  const remove = async (r: Row) => {
    setBusyId(r.id);
    const res = await apiService.delete<any>(`/v1/platform-offers/${r.id}`);
    setBusyId(null);
    if (res.error) { setMsg(res.error); return; }
    setRows((cur) => cur.filter((x) => x.id !== r.id));
    setMsg('Offer deleted.');
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
              <Tag className="h-6 w-6 text-primary" />
              Platform Offers
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Curated deals published by the platform. Not tied to a registered business.
            </p>
          </div>
          <Button onClick={openCreate} className="gap-1.5 cursor-pointer">
            <Plus className="h-4 w-4" /> New offer
          </Button>
        </div>

        {msg && <p className="text-sm font-medium text-primary">{msg}</p>}

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading offers…
          </div>
        ) : rows.length === 0 ? (
          <Card className="p-10 text-center">
            <Tag className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-semibold text-foreground">No platform offers yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Create one to feature it on the public offers page.
            </p>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {rows.map((r) => (
              <Card key={r.id} className="p-4">
                <div className="flex gap-4">
                  {r.imageSignedUrl ? (
                    <img
                      src={r.imageSignedUrl}
                      alt=""
                      className="h-20 w-20 shrink-0 rounded-xl object-cover border border-border"
                    />
                  ) : (
                    <div className="h-20 w-20 shrink-0 rounded-xl border border-dashed border-border flex items-center justify-center">
                      <ImageIcon className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-foreground truncate">{r.title}</h3>
                        <p className="text-xs text-muted-foreground truncate">{r.location}</p>
                      </div>
                      <span
                        className={cn(
                          'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold border',
                          r.status === 'PUBLISHED'
                            ? 'bg-success/10 text-success border-success/20'
                            : 'bg-muted text-muted-foreground border-border',
                        )}
                      >
                        {r.status}
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                      <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 font-medium">
                        {categoryLabel(r.category)}
                      </span>
                      {r.subType && (
                        <span className="rounded-full bg-muted text-muted-foreground px-2 py-0.5">
                          {subTypeLabel(r.subType)}
                        </span>
                      )}
                      {r.price && <span className="text-foreground font-semibold">{r.price}</span>}
                      {rateLines(r.category, r.subType, r.details).map((rl, i) => (
                        <span key={i} className="rounded-full bg-muted px-2 py-0.5 text-foreground">
                          {rl.label}: <span className="font-semibold">{rl.rate}</span>
                        </span>
                      ))}
                      <span className="ml-auto rounded-full bg-secondary px-2 py-0.5 text-muted-foreground">
                        {r.clickCount ?? 0} clicks
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        onClick={() => openEdit(r)}
                        className="h-8 rounded-lg bg-muted text-foreground text-xs cursor-pointer"
                      >
                        Edit
                      </Button>
                      <Button
                        onClick={() => toggleStatus(r)}
                        disabled={busyId === r.id}
                        className="h-8 rounded-lg text-xs gap-1 cursor-pointer"
                      >
                        {busyId === r.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : r.status === 'PUBLISHED' ? (
                          <><EyeOff className="h-3 w-3" /> Unpublish</>
                        ) : (
                          <><Eye className="h-3 w-3" /> Publish</>
                        )}
                      </Button>
                      <Button
                        onClick={() => remove(r)}
                        disabled={busyId === r.id}
                        className="h-8 rounded-lg bg-background border border-input text-muted-foreground text-xs gap-1 cursor-pointer"
                      >
                        <Trash2 className="h-3 w-3" /> Delete
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* ── Composer ─────────────────────────────────────────────── */}
      {open && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-start justify-center overflow-y-auto p-4 sm:p-8">
          <div className="w-full max-w-2xl rounded-2xl border border-border bg-card shadow-2xl my-auto">
            <div className="flex items-start justify-between gap-4 p-5 border-b border-border">
              <div>
                <h2 className="text-lg font-bold text-foreground">
                  {editingId ? 'Edit platform offer' : 'New platform offer'}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Fields change with the category you pick.
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setOpen(false); resetForm(); }}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Category */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Category</p>
                <div className="grid sm:grid-cols-2 gap-2">
                  {PLATFORM_OFFER_CATEGORIES.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => {
                        setCategory(c.value);
                        setSubType('');
                        setDetails({}); // field sets differ per category
                      }}
                      className={cn(
                        'p-3 rounded-xl border text-left transition cursor-pointer',
                        category === c.value
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-slate-500',
                      )}
                    >
                      <div className="text-sm font-semibold text-foreground">{c.label}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">{c.blurb}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Staycation sub-type */}
              {isStaycation && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Staycation type</p>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {STAYCATION_SUBTYPES.map((s) => (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => { setSubType(s.value); setDetails({}); }}
                        className={cn(
                          'p-3 rounded-xl border text-left transition cursor-pointer',
                          subType === s.value
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-slate-500',
                        )}
                      >
                        <div className="text-sm font-semibold text-foreground">{s.label}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">{s.blurb}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {category && (!isStaycation || subType) && (
                <>
                  {/* Common core */}
                  <div className="grid sm:grid-cols-2 gap-3">
                    <Field label="Name of business / property *">
                      <Input value={title} onChange={(e) => setTitle(e.target.value)} className="h-11 rounded-xl" />
                    </Field>
                    <Field label="Location *">
                      <Input value={location} onChange={(e) => setLocation(e.target.value)} className="h-11 rounded-xl" />
                    </Field>
                    {!isSadyaLike && !isStaycation && (
                      <Field label="Price" hint="Free text — e.g. ₹850 per head, or ₹5,000 onwards">
                        <Input value={price} onChange={(e) => setPrice(e.target.value)} className="h-11 rounded-xl" />
                      </Field>
                    )}
                    <Field label="Phone">
                      <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="h-11 rounded-xl" />
                    </Field>
                  </div>

                  {/* ── Sadya / Payasam ───────────────────────────── */}
                  {isSadyaLike && (
                    <div className="space-y-4 rounded-xl border border-border p-4">
                      {category === 'PAYASAM' && (
                        <Field label="Payasam types and rates" hint="e.g. Palada Payasam — ₹80/head">
                          <RateLineEditor
                            lines={details.payasamTypes || []}
                            onChange={(lines) => setD({ payasamTypes: lines })}
                            labelPlaceholder="Payasam type"
                          />
                        </Field>
                      )}
                      <Field label="Provider type">
                        <div className="flex flex-wrap gap-2">
                          {SADYA_PROVIDER_TYPES.map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => setD({ providerType: t })}
                              className={cn(
                                'rounded-full border px-3 py-1.5 text-xs font-medium cursor-pointer transition-colors',
                                details.providerType === t
                                  ? 'border-primary bg-primary/10 text-primary'
                                  : 'border-border text-muted-foreground hover:text-foreground',
                              )}
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                      </Field>

                      <Field label="Available timing">
                        <Input
                          value={details.availableTiming || ''}
                          onChange={(e) => setD({ availableTiming: e.target.value })}
                          placeholder="e.g. 11:30 AM – 3:00 PM"
                          className="h-11 rounded-xl"
                        />
                      </Field>

                      {/* Pre-booking and delivery can both apply to one offer */}
                      <div className="space-y-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!details.hasPreBooking}
                            onChange={(e) => setD({ hasPreBooking: e.target.checked })}
                            className="h-4 w-4 cursor-pointer"
                          />
                          <span className="text-sm font-medium text-foreground">Pre-booking available</span>
                        </label>
                        {details.hasPreBooking && (
                          <div className="grid sm:grid-cols-3 gap-3 pl-6">
                            <Field label="Pricing / package">
                              <Input
                                value={details.preBookingPackage || ''}
                                onChange={(e) => setD({ preBookingPackage: e.target.value })}
                                className="h-11 rounded-xl"
                              />
                            </Field>
                            <Field label="Sadhya available timing">
                              <Input
                                value={details.sadhyaTiming || ''}
                                onChange={(e) => setD({ sadhyaTiming: e.target.value })}
                                className="h-11 rounded-xl"
                              />
                            </Field>
                            <Field label="Pre-booking rate">
                              <Input
                                value={details.preBookingRate || ''}
                                onChange={(e) => setD({ preBookingRate: e.target.value })}
                                className="h-11 rounded-xl"
                              />
                            </Field>
                          </div>
                        )}

                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!details.hasDelivery}
                            onChange={(e) => setD({ hasDelivery: e.target.checked })}
                            className="h-4 w-4 cursor-pointer"
                          />
                          <span className="text-sm font-medium text-foreground">Delivery / serving options</span>
                        </label>
                        {details.hasDelivery && (
                          <div className="pl-6 space-y-2">
                            <p className="text-[11px] text-muted-foreground">
                              Shown to customers for information only — orders are not taken on the platform.
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {SADYA_DELIVERY_OPTIONS.map((o) => {
                                const on = (details.deliveryOptions || []).includes(o.key);
                                return (
                                  <button
                                    key={o.key}
                                    type="button"
                                    onClick={() => toggleIn('deliveryOptions', o.key)}
                                    className={cn(
                                      'rounded-full border px-3 py-1.5 text-xs font-medium cursor-pointer transition-colors',
                                      on
                                        ? 'border-primary bg-primary/10 text-primary'
                                        : 'border-border text-muted-foreground hover:text-foreground',
                                    )}
                                  >
                                    {o.label}
                                  </button>
                                );
                              })}
                            </div>
                            {(details.deliveryOptions || []).includes('freeDelivery') && (
                              <Field label="Free delivery within (km)">
                                <Input
                                  value={details.freeDeliveryKm || ''}
                                  onChange={(e) => setD({ freeDeliveryKm: e.target.value.replace(/\D/g, '') })}
                                  inputMode="numeric"
                                  className="h-11 rounded-xl max-w-[160px]"
                                />
                              </Field>
                            )}
                            <Field label="Delivery rate">
                              <Input
                                value={details.deliveryRate || ''}
                                onChange={(e) => setD({ deliveryRate: e.target.value })}
                                className="h-11 rounded-xl max-w-[200px]"
                              />
                            </Field>
                          </div>
                        )}

                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!details.hasDineIn}
                            onChange={(e) => setD({ hasDineIn: e.target.checked })}
                            className="h-4 w-4 cursor-pointer"
                          />
                          <span className="text-sm font-medium text-foreground">Dine-in available</span>
                        </label>
                        {details.hasDineIn && (
                          <div className="pl-6">
                            <Field label="Dine-in rate">
                              <Input
                                value={details.dineInRate || ''}
                                onChange={(e) => setD({ dineInRate: e.target.value })}
                                className="h-11 rounded-xl max-w-[200px]"
                              />
                            </Field>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ── Staycation: property ──────────────────────── */}
                  {isStaycation && subType === 'PROPERTY' && (
                    <div className="space-y-4 rounded-xl border border-border p-4">
                      <Field label="Property type">
                        <ChipGroup
                          options={STAYCATION_PROPERTY_TYPES}
                          selected={details.propertyTypes || []}
                          onToggle={(v) => toggleIn('propertyTypes', v)}
                        />
                      </Field>
                      {!!(details.propertyTypes || []).length && (
                        <Field label="Rate per property type">
                          <PerSelectionRates
                            selected={details.propertyTypes || []}
                            lines={details.propertyTypeRates || []}
                            onChange={(lines) => setD({ propertyTypeRates: lines })}
                          />
                        </Field>
                      )}
                      <Field label="View / frontage">
                        <ChipGroup
                          options={STAYCATION_VIEWS}
                          selected={details.views || []}
                          onToggle={(v) => toggleIn('views', v)}
                        />
                      </Field>
                      <Field label="Amenities">
                        <textarea
                          value={details.amenities || ''}
                          onChange={(e) => setD({ amenities: e.target.value })}
                          rows={2}
                          placeholder="Pool, Wi-Fi, breakfast included…"
                          className="w-full p-3 border border-input bg-background text-foreground rounded-xl text-sm focus:ring-1 focus:outline-none"
                        />
                      </Field>
                      <div className="grid sm:grid-cols-3 gap-3">
                        <Field label="Min pax">
                          <Input
                            value={details.minPax || ''}
                            onChange={(e) => setD({ minPax: e.target.value.replace(/\D/g, '') })}
                            inputMode="numeric"
                            className="h-11 rounded-xl"
                          />
                        </Field>
                        <Field label="Max pax">
                          <Input
                            value={details.maxPax || ''}
                            onChange={(e) => setD({ maxPax: e.target.value.replace(/\D/g, '') })}
                            inputMode="numeric"
                            className="h-11 rounded-xl"
                          />
                        </Field>
                        <Field label="AC / Non-AC">
                          <div className="flex flex-wrap gap-2">
                            {AC_OPTIONS.map((a) => (
                              <button
                                key={a}
                                type="button"
                                onClick={() => setD({ acStatus: a })}
                                className={cn(
                                  'rounded-full border px-3 py-1.5 text-xs font-medium cursor-pointer transition-colors',
                                  details.acStatus === a
                                    ? 'border-primary bg-primary/10 text-primary'
                                    : 'border-border text-muted-foreground hover:text-foreground',
                                )}
                              >
                                {a}
                              </button>
                            ))}
                          </div>
                        </Field>
                      </div>

                      {(details.acStatus === 'AC' || details.acStatus === 'Both') && (
                        <Field label="AC rate">
                          <Input
                            value={details.acRate || ''}
                            onChange={(e) => setD({ acRate: e.target.value })}
                            className="h-11 rounded-xl max-w-[200px]"
                          />
                        </Field>
                      )}
                      {(details.acStatus === 'Non-AC' || details.acStatus === 'Both') && (
                        <Field label="Non-AC rate">
                          <Input
                            value={details.nonAcRate || ''}
                            onChange={(e) => setD({ nonAcRate: e.target.value })}
                            className="h-11 rounded-xl max-w-[200px]"
                          />
                        </Field>
                      )}

                      <Field label="Rate by group size" hint="Optional — add a rate per pax slab, e.g. 2-4 pax">
                        <div className="space-y-2">
                          {(details.paxSlabRates || []).map((slab, i) => (
                            <div key={i} className="flex gap-2">
                              <Input
                                value={slab.minPax}
                                onChange={(e) => {
                                  const rows = [...(details.paxSlabRates || [])];
                                  rows[i] = { ...rows[i], minPax: e.target.value.replace(/\D/g, '') };
                                  setD({ paxSlabRates: rows });
                                }}
                                placeholder="Min pax"
                                inputMode="numeric"
                                className="h-10 rounded-lg w-24"
                              />
                              <Input
                                value={slab.maxPax}
                                onChange={(e) => {
                                  const rows = [...(details.paxSlabRates || [])];
                                  rows[i] = { ...rows[i], maxPax: e.target.value.replace(/\D/g, '') };
                                  setD({ paxSlabRates: rows });
                                }}
                                placeholder="Max pax"
                                inputMode="numeric"
                                className="h-10 rounded-lg w-24"
                              />
                              <Input
                                value={slab.rate}
                                onChange={(e) => {
                                  const rows = [...(details.paxSlabRates || [])];
                                  rows[i] = { ...rows[i], rate: e.target.value };
                                  setD({ paxSlabRates: rows });
                                }}
                                placeholder="Rate"
                                className="h-10 rounded-lg flex-1"
                              />
                              <button
                                type="button"
                                onClick={() => setD({
                                  paxSlabRates: (details.paxSlabRates || []).filter((_, idx) => idx !== i),
                                })}
                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive active:scale-95 cursor-pointer"
                                aria-label="Remove"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => setD({
                              paxSlabRates: [...(details.paxSlabRates || []), { minPax: '', maxPax: '', rate: '' }],
                            })}
                            className="text-xs font-medium text-primary hover:underline cursor-pointer"
                          >
                            + Add slab
                          </button>
                        </div>
                      </Field>
                    </div>
                  )}

                  {/* ── Staycation: day-out ───────────────────────── */}
                  {isStaycation && subType === 'DAYOUT' && (
                    <div className="space-y-4 rounded-xl border border-border p-4">
                      <Field label="Venue type">
                        <ChipGroup
                          options={DAYOUT_VENUE_TYPES}
                          selected={details.venueTypes || []}
                          onToggle={(v) => toggleIn('venueTypes', v)}
                        />
                      </Field>
                      {!!(details.venueTypes || []).length && (
                        <Field label="Rate per venue type">
                          <PerSelectionRates
                            selected={details.venueTypes || []}
                            lines={details.venueTypeRates || []}
                            onChange={(lines) => setD({ venueTypeRates: lines })}
                          />
                        </Field>
                      )}
                      <div className="grid sm:grid-cols-2 gap-3">
                        <Field label="Minimum team count">
                          <Input
                            value={details.minTeamCount || ''}
                            onChange={(e) => setD({ minTeamCount: e.target.value.replace(/\D/g, '') })}
                            inputMode="numeric"
                            className="h-11 rounded-xl"
                          />
                        </Field>
                        <Field label="Time">
                          <Input
                            value={details.time || ''}
                            onChange={(e) => setD({ time: e.target.value })}
                            placeholder="e.g. 9:00 AM – 6:00 PM"
                            className="h-11 rounded-xl"
                          />
                        </Field>
                      </div>
                      <Field label="Amenities">
                        <textarea
                          value={details.amenities || ''}
                          onChange={(e) => setD({ amenities: e.target.value })}
                          rows={2}
                          className="w-full p-3 border border-input bg-background text-foreground rounded-xl text-sm focus:ring-1 focus:outline-none"
                        />
                      </Field>
                    </div>
                  )}

                  {/* ── Clothing / Electronics ────────────────────── */}
                  {(category === 'CLOTHING' || category === 'ELECTRONICS') && (
                    <div className="space-y-4 rounded-xl border border-border p-4">
                      <Field
                        label="Brand / category"
                        hint="Awaiting a detailed field list — using the generic template for now."
                      >
                        <Input
                          value={details.brandOrCategory || ''}
                          onChange={(e) => setD({ brandOrCategory: e.target.value })}
                          className="h-11 rounded-xl"
                        />
                      </Field>
                    </div>
                  )}

                  {/* Description + poster */}
                  <Field label="Description">
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      placeholder="What the customer gets…"
                      className="w-full p-3 border border-input bg-background text-foreground rounded-xl text-sm focus:ring-1 focus:outline-none"
                    />
                  </Field>

                  <Field label="Poster / image" hint="Optional. JPG, PNG, WEBP or PDF.">
                    <label className="flex flex-col items-center justify-center gap-2 p-5 rounded-xl border border-dashed border-input cursor-pointer hover:bg-muted/40 transition">
                      <UploadCloud className="h-5 w-5 text-muted-foreground" />
                      <span className="text-[11px] text-muted-foreground">
                        {poster ? poster.name : existingImage ? 'Replace current image' : 'Click to upload'}
                      </span>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        className="hidden"
                        onChange={(e) => setPoster(e.target.files?.[0] || null)}
                      />
                    </label>
                    {existingImage && !poster && (
                      <img
                        src={existingImage}
                        alt=""
                        className="mt-2 h-24 w-24 rounded-xl object-cover border border-border"
                      />
                    )}
                  </Field>

                  {error && <p className="text-xs text-destructive">{error}</p>}
                </>
              )}
            </div>

            <div className="flex flex-wrap justify-between gap-3 p-5 border-t border-border">
              <Button
                onClick={() => { setOpen(false); resetForm(); }}
                className="h-11 px-5 bg-background border border-input text-muted-foreground rounded-xl cursor-pointer"
              >
                Cancel
              </Button>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => save(false)}
                  disabled={!canSave || saving}
                  className="h-11 px-5 bg-muted text-foreground rounded-xl cursor-pointer"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save as draft'}
                </Button>
                <Button
                  onClick={() => save(true)}
                  disabled={!canSave || saving}
                  className="h-11 px-5 rounded-xl font-semibold cursor-pointer"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Publish'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
