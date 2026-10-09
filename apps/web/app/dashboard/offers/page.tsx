'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import {
  Copy,
  Eye,
  Pause,
  Pencil,
  Play,
  Plus,
  ShoppingBag,
  Store,
  Tag,
  TicketPercent,
  Trash2,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import { BusinessLayout } from '@/components/layouts/business-layout';
import { PageHeader } from '@/components/system/page-header';
import { FilterChip, ChipRow } from '@/components/system/filter-chip';
import { Modal } from '@/components/system/modal';
import { EmptyState } from '@/components/common/empty-state';
import { useConfirm } from '@/components/common/confirm-dialog';
import { PromoCard, PromoGrid, PromoGridSkeleton } from '@/components/promotions/promo-card';
import { OfferCoupon } from '@/components/public/offers/offer-coupon';
import { mapApiOffer } from '@/components/public/offers/offer-model';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/sonner';
import { apiService } from '@/lib/services/api-service';
import { useAuth } from '@/hooks/use-auth';
import { useOwnerBusiness } from '@/hooks/use-owner-business';
import { KERALA_CITIES } from '@/lib/constants';
import { cn } from '@/lib/utils';

type Fulfilment = 'DINE_IN' | 'TAKEAWAY' | 'BOTH';
const FULFILMENT_OPTIONS: { value: Fulfilment; label: string; icon: typeof Store }[] = [
  { value: 'DINE_IN', label: 'Dine-in', icon: UtensilsCrossed },
  { value: 'TAKEAWAY', label: 'Takeaway', icon: ShoppingBag },
  { value: 'BOTH', label: 'Both', icon: Store },
];

interface Offer {
  id: string;
  title: string;
  discount: number;
  discountAmount: number;
  active: boolean;
  tags: string[];
  targetCities: string[];
  startsAt?: string;
  expiresAt?: string;
  fulfilment: Fulfilment;
  claimsTotal: number;
  maxRedemptions: number | null;
}

type OfferStat = { viewers: number; claims: number; conversion: number | null };
type Bucket = 'current' | 'live' | 'scheduled' | 'paused' | 'ended';

const dateOnly = (iso?: string) => (iso ? iso.slice(0, 10) : '');
const todayKey = () => new Date().toISOString().slice(0, 10);
const fmtDay = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        timeZone: 'Asia/Kolkata',
      })
    : '';

function bucketOf(o: Offer, now = Date.now()): Exclude<Bucket, 'current'> {
  if (o.expiresAt && new Date(o.expiresAt).getTime() < now) return 'ended';
  if (!o.active) return 'paused';
  if (o.startsAt && new Date(o.startsAt).getTime() > now) return 'scheduled';
  return 'live';
}

const BUCKET_PILL = {
  live: { tone: 'success', label: 'Live', live: true },
  scheduled: { tone: 'info', label: 'Scheduled' },
  paused: { tone: 'neutral', label: 'Paused' },
  ended: { tone: 'neutral', label: 'Ended' },
} as const;

const valueLabel = (o: { discount: number; discountAmount: number }) =>
  o.discountAmount > 0 && !(o.discount > 0)
    ? `₹${o.discountAmount.toLocaleString('en-IN')}`
    : `${o.discount || 0}%`;

// Tags have no column yet; they ride in the description as "Tags: a, b".
const parseTags = (description?: string | null) => {
  const m = /^Tags:\s*(.+)$/m.exec(description || '');
  return m
    ? m[1]
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
    : [];
};

function TagInput({ tags, onChange }: { tags: string[]; onChange: (tags: string[]) => void }) {
  const [val, setVal] = useState('');
  const ref = useRef<HTMLInputElement>(null);
  const add = (v: string) => {
    const t = v.trim().toLowerCase().replace(/\s+/g, '-');
    if (t && !tags.includes(t) && tags.length < 10) onChange([...tags, t]);
    setVal('');
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      add(val);
    } else if (e.key === 'Backspace' && !val && tags.length) onChange(tags.slice(0, -1));
  };
  return (
    <div
      className="flex min-h-11 cursor-text flex-wrap items-center gap-1.5 rounded-control border border-input bg-card px-3 py-2 focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/40"
      onClick={() => ref.current?.focus()}
    >
      {tags.map((t) => (
        <span
          key={t}
          className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-caption font-medium text-brand-soft-foreground"
        >
          {t}
          <button
            type="button"
            aria-label={`Remove ${t}`}
            onClick={(e) => {
              e.stopPropagation();
              onChange(tags.filter((x) => x !== t));
            }}
          >
            <X className="size-3" />
          </button>
        </span>
      ))}
      <input
        id="offer-tags"
        ref={ref}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={onKey}
        onBlur={() => val.trim() && add(val)}
        placeholder={tags.length ? '' : 'Type and press Enter'}
        className="min-w-[8rem] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}

type Form = {
  title: string;
  discountType: 'PERCENT' | 'AMOUNT';
  discount: string;
  discountAmount: string;
  active: boolean;
  tags: string[];
  startsAt: string;
  expiresAt: string;
  cities: string[];
  fulfilment: Fulfilment;
};

const EMPTY: Form = {
  title: '',
  discountType: 'PERCENT',
  discount: '',
  discountAmount: '',
  active: true,
  tags: [],
  startsAt: '',
  expiresAt: '',
  cities: [],
  fulfilment: 'BOTH',
};

const label = 'mb-1.5 block text-sm font-medium';

export default function OffersPage() {
  const { user } = useAuth();
  const { business, isFood } = useOwnerBusiness();
  const confirm = useConfirm();
  const businessId = user?.businessId || user?.entity?.id;

  const [offers, setOffers] = useState<Offer[]>([]);
  const [stats, setStats] = useState<Record<string, OfferStat>>({});
  const [loading, setLoading] = useState(true);
  const [bucket, setBucket] = useState<Bucket>('current');
  const [editor, setEditor] = useState<{ mode: 'create' | 'edit'; id?: string } | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  const fetchOffers = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    const [res, st] = await Promise.all([
      apiService.get<any>(`/v1/offers/my/${businessId}`),
      apiService.get<any>(`/v1/analytics/v2/business/${businessId}/offers?days=30`),
    ]);
    if (res.data && !res.error) {
      const list = Array.isArray(res.data) ? res.data : (res.data?.data ?? res.data?.items ?? []);
      setOffers(
        list.map((o: any) => ({
          id: o.id,
          title: o.title || o.name || '',
          discount: o.discountPercent ?? o.discount ?? 0,
          discountAmount: o.discountAmount != null ? Number(o.discountAmount) : 0,
          active: o.status === 'ACTIVE',
          tags: Array.isArray(o.tags) ? o.tags : parseTags(o.description),
          targetCities: Array.isArray(o.targetCities) ? o.targetCities : [],
          startsAt: o.startDate || o.startsAt || undefined,
          expiresAt: o.endDate || o.expiresAt || undefined,
          fulfilment:
            o.fulfilment === 'DINE_IN' || o.fulfilment === 'TAKEAWAY' ? o.fulfilment : 'BOTH',
          claimsTotal: Number(o.currentRedemptions ?? 0),
          maxRedemptions: o.maxRedemptions ?? null,
        })),
      );
    }
    const rows = Array.isArray(st.data?.offers) ? st.data.offers : [];
    setStats(
      Object.fromEntries(
        rows.map((r: any) => [
          r.id,
          { viewers: r.viewers ?? 0, claims: r.claims ?? 0, conversion: r.conversion ?? null },
        ]),
      ),
    );
    setLoading(false);
  }, [businessId]);

  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);

  const counts = useMemo(() => {
    const c = { current: 0, live: 0, scheduled: 0, paused: 0, ended: 0 };
    for (const o of offers) {
      const b = bucketOf(o);
      c[b]++;
      if (b !== 'ended') c.current++;
    }
    return c;
  }, [offers]);

  const visible = offers.filter((o) => {
    const b = bucketOf(o);
    return bucket === 'current' ? b !== 'ended' : b === bucket;
  });

  const openCreate = () => {
    setForm(EMPTY);
    setEditor({ mode: 'create' });
  };

  const openEdit = (o: Offer, duplicate = false) => {
    const amount = o.discountAmount > 0 && !(o.discount > 0);
    setForm({
      title: duplicate ? `${o.title} (copy)` : o.title,
      discountType: amount ? 'AMOUNT' : 'PERCENT',
      discount: o.discount ? String(o.discount) : '',
      discountAmount: o.discountAmount ? String(o.discountAmount) : '',
      active: duplicate ? true : o.active,
      tags: [...o.tags],
      startsAt: duplicate ? '' : dateOnly(o.startsAt),
      expiresAt: duplicate ? '' : dateOnly(o.expiresAt),
      cities: [...o.targetCities],
      fulfilment: o.fulfilment,
    });
    setEditor(duplicate ? { mode: 'create' } : { mode: 'edit', id: o.id });
  };

  const save = async () => {
    if (!businessId || !editor) return;
    const pct = Number(form.discount);
    const amt = Number(form.discountAmount);
    if (!form.title.trim()) return toast.error('Give the offer a title.');
    if (form.discountType === 'PERCENT' && !(pct >= 1 && pct <= 100))
      return toast.error('Enter a discount between 1% and 100%.');
    if (form.discountType === 'AMOUNT' && !(amt >= 1))
      return toast.error('Enter the amount off in ₹.');
    if (form.startsAt && form.expiresAt && form.expiresAt < form.startsAt)
      return toast.error('The end date is before the start date.');

    const body: Record<string, unknown> = {
      title: form.title.trim(),
      description: form.tags.length ? `Tags: ${form.tags.join(', ')}` : '',
      discountPercent: form.discountType === 'PERCENT' ? pct : null,
      discountAmount: form.discountType === 'AMOUNT' ? amt : null,
      status: form.active ? 'ACTIVE' : 'PAUSED',
      targetCities: form.cities,
      ...(isFood ? { fulfilment: form.fulfilment } : {}),
    };
    setSaving(true);
    let res;
    if (editor.mode === 'create') {
      res = await apiService.post<any>('/v1/offers', {
        ...body,
        businessId,
        startDate: form.startsAt ? new Date(form.startsAt).toISOString() : new Date().toISOString(),
        endDate: form.expiresAt
          ? new Date(form.expiresAt).toISOString()
          : new Date(Date.now() + 30 * 86_400_000).toISOString(),
      });
    } else {
      if (form.startsAt) body.startDate = new Date(form.startsAt).toISOString();
      if (form.expiresAt) body.endDate = new Date(form.expiresAt).toISOString();
      res = await apiService.patch<any>(`/v1/offers/${editor.id}`, body);
    }
    setSaving(false);
    if (res.error) return toast.error(res.error);
    toast.success(editor.mode === 'create' ? 'Offer published' : 'Offer updated');
    setEditor(null);
    fetchOffers();
  };

  const toggleActive = async (o: Offer) => {
    const next = !o.active;
    setOffers((list) => list.map((x) => (x.id === o.id ? { ...x, active: next } : x)));
    const res = await apiService.patch(`/v1/offers/${o.id}`, {
      status: next ? 'ACTIVE' : 'PAUSED',
    });
    if (res.error) {
      setOffers((list) => list.map((x) => (x.id === o.id ? { ...x, active: o.active } : x)));
      toast.error(res.error);
    } else toast.success(next ? 'Offer is live again' : 'Offer paused');
  };

  const remove = async (o: Offer) => {
    const ok = await confirm({
      title: `Delete “${o.title}”?`,
      description: 'Customers who already claimed it keep their code. This cannot be undone.',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) return;
    const res = await apiService.delete(`/v1/offers/${o.id}`);
    if (res.error) return toast.error(res.error);
    setOffers((list) => list.filter((x) => x.id !== o.id));
    toast.success('Offer deleted');
  };

  // What customers will see, rendered with the real public coupon.
  const preview = mapApiOffer({
    id: 'preview',
    title: form.title || 'Your offer title',
    description: '',
    discountPercent: form.discountType === 'PERCENT' ? Number(form.discount) || 0 : null,
    discountAmount: form.discountType === 'AMOUNT' ? Number(form.discountAmount) || 0 : null,
    endDate: form.expiresAt
      ? new Date(`${form.expiresAt}T23:59:59+05:30`).toISOString()
      : new Date(Date.now() + 30 * 86_400_000).toISOString(),
    fulfilment: isFood ? form.fulfilment : 'BOTH',
    business: {
      name: business?.name || 'Your business',
      city: business?.city ?? null,
      operatingHours: business?.operatingHours ?? undefined,
    },
  });

  return (
    <BusinessLayout>
      <PageHeader
        title="Offers"
        description="Deals customers claim from your profile and the Offers page. Stats cover the last 30 days."
        actions={
          <Button onClick={openCreate}>
            <Plus /> New offer
          </Button>
        }
      />

      <ChipRow label="Status" className="mb-4">
        {(
          [
            ['current', 'All current'],
            ['live', 'Live'],
            ['scheduled', 'Scheduled'],
            ['paused', 'Paused'],
            ['ended', 'Ended'],
          ] as const
        ).map(([k, l]) => (
          <FilterChip
            key={k}
            selected={bucket === k}
            count={counts[k] || undefined}
            onClick={() => setBucket(k)}
          >
            {l}
          </FilterChip>
        ))}
      </ChipRow>

      {loading ? (
        <PromoGridSkeleton />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={TicketPercent}
          title={offers.length ? 'Nothing in this view' : 'No offers yet'}
          description={
            offers.length
              ? 'Try another status.'
              : 'Publish your first offer — it shows on your profile and the Offers page.'
          }
          action={offers.length ? undefined : { label: 'New offer', onClick: openCreate }}
        />
      ) : (
        <PromoGrid>
          {visible.map((o) => {
            const b = bucketOf(o);
            const st = stats[o.id];
            const chips: { label: string; tone?: 'info' | 'warning' | 'neutral' }[] = [];
            if (b === 'scheduled' && o.startsAt)
              chips.push({ label: `Starts ${fmtDay(o.startsAt)}`, tone: 'info' });
            if (b !== 'ended' && o.expiresAt) {
              const days = Math.ceil((new Date(o.expiresAt).getTime() - Date.now()) / 86_400_000);
              chips.push({
                label: days <= 3 ? `Ends in ${Math.max(days, 0)}d` : `Ends ${fmtDay(o.expiresAt)}`,
                tone: days <= 3 ? 'warning' : 'neutral',
              });
            }
            if (o.fulfilment !== 'BOTH')
              chips.push({ label: o.fulfilment === 'DINE_IN' ? 'Dine-in' : 'Takeaway' });
            if (o.targetCities.length)
              chips.push({
                label:
                  o.targetCities.length === 1
                    ? o.targetCities[0]
                    : `${o.targetCities.length} cities`,
              });
            return (
              <PromoCard
                key={o.id}
                icon={Tag}
                value={valueLabel(o)}
                valueCaption="off"
                title={o.title}
                subtitle={o.tags.length ? o.tags.map((t) => `#${t}`).join(' ') : undefined}
                status={BUCKET_PILL[b]}
                chips={chips}
                muted={b === 'ended'}
                onOpen={() => openEdit(o)}
                stats={[
                  {
                    label: 'Viewers',
                    value: st?.viewers ?? 0,
                    hint: 'People who opened this offer in the last 30 days',
                  },
                  { label: 'Claims', value: st?.claims ?? 0, hint: 'Claims in the last 30 days' },
                  {
                    label: 'Conversion',
                    value: st?.conversion != null ? `${st.conversion}%` : '—',
                    hint: 'Claims ÷ viewers',
                  },
                ]}
                primary={
                  b !== 'ended' ? (
                    <Button size="sm" variant="outline" onClick={() => toggleActive(o)}>
                      {o.active ? <Pause /> : <Play />}
                      {o.active ? 'Pause' : 'Resume'}
                    </Button>
                  ) : undefined
                }
                menu={[
                  { label: 'Edit', icon: Pencil, onClick: () => openEdit(o) },
                  { label: 'Duplicate', icon: Copy, onClick: () => openEdit(o, true) },
                  {
                    label: 'View public page',
                    icon: Eye,
                    onClick: () => window.open('/offers', '_blank', 'noopener'),
                  },
                  { label: 'Delete', icon: Trash2, onClick: () => remove(o), danger: true },
                ]}
              />
            );
          })}
        </PromoGrid>
      )}

      <Modal
        open={!!editor}
        onOpenChange={(o) => !o && setEditor(null)}
        title={editor?.mode === 'edit' ? 'Edit offer' : 'New offer'}
        description="The preview shows exactly what customers see."
        size="xl"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditor(null)}>
              Cancel
            </Button>
            <Button loading={saving} onClick={save}>
              {editor?.mode === 'edit'
                ? 'Save changes'
                : form.active
                  ? 'Publish offer'
                  : 'Save as paused'}
            </Button>
          </>
        }
      >
        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_18rem]">
          <form
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <div>
              <label htmlFor="offer-title" className={label}>
                Title
              </label>
              <Input
                id="offer-title"
                value={form.title}
                maxLength={255}
                onChange={(e) => set('title', e.target.value)}
                placeholder="e.g. Weekday lunch special"
              />
            </div>

            <div>
              <span className={label} id="offer-discount-label">
                Discount
              </span>
              <div className="flex gap-2" role="group" aria-labelledby="offer-discount-label">
                <div
                  className="flex shrink-0 overflow-hidden rounded-control border border-input"
                  role="radiogroup"
                  aria-label="Discount type"
                >
                  {(['PERCENT', 'AMOUNT'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      role="radio"
                      aria-checked={form.discountType === t}
                      onClick={() => set('discountType', t)}
                      className={cn(
                        'h-11 w-11 text-sm font-semibold transition-colors',
                        form.discountType === t
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-card text-muted-foreground hover:bg-secondary',
                      )}
                    >
                      {t === 'PERCENT' ? '%' : '₹'}
                    </button>
                  ))}
                </div>
                {form.discountType === 'PERCENT' ? (
                  <Input
                    key="pct"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={100}
                    aria-label="Percent off"
                    value={form.discount}
                    onChange={(e) => set('discount', e.target.value)}
                    placeholder="20"
                  />
                ) : (
                  <Input
                    key="amt"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    aria-label="Rupees off"
                    value={form.discountAmount}
                    onChange={(e) => set('discountAmount', e.target.value)}
                    placeholder="500"
                  />
                )}
              </div>
            </div>

            {isFood && (
              <div>
                <span className={label}>Available for</span>
                <ChipRow label="Available for" wrap>
                  {FULFILMENT_OPTIONS.map(({ value, label: l, icon }) => (
                    <FilterChip
                      key={value}
                      icon={icon}
                      selected={form.fulfilment === value}
                      onClick={() => set('fulfilment', value)}
                    >
                      {l}
                    </FilterChip>
                  ))}
                </ChipRow>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="offer-start" className={label}>
                  Starts
                </label>
                <Input
                  id="offer-start"
                  type="date"
                  value={form.startsAt}
                  min={editor?.mode === 'create' ? todayKey() : undefined}
                  onChange={(e) => set('startsAt', e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="offer-end" className={label}>
                  Ends
                </label>
                <Input
                  id="offer-end"
                  type="date"
                  value={form.expiresAt}
                  min={form.startsAt || todayKey()}
                  onChange={(e) => set('expiresAt', e.target.value)}
                />
              </div>
              <p className="col-span-2 -mt-1 text-caption text-muted-foreground">
                Leave empty to start today and run for 30 days.
              </p>
            </div>

            <div>
              <span className={label}>
                Show in cities{' '}
                <span className="font-normal text-muted-foreground">(none = everywhere)</span>
              </span>
              <div className="max-h-32 overflow-y-auto rounded-control border border-border p-2">
                <ChipRow label="Cities" wrap>
                  {KERALA_CITIES.map((c) => (
                    <FilterChip
                      key={c}
                      selected={form.cities.includes(c)}
                      onClick={() =>
                        set(
                          'cities',
                          form.cities.includes(c)
                            ? form.cities.filter((x) => x !== c)
                            : [...form.cities, c],
                        )
                      }
                    >
                      {c}
                    </FilterChip>
                  ))}
                </ChipRow>
              </div>
            </div>

            <div>
              <label htmlFor="offer-tags" className={label}>
                Tags <span className="font-normal text-muted-foreground">(optional)</span>
              </label>
              <TagInput tags={form.tags} onChange={(t) => set('tags', t)} />
            </div>

            <label className="flex items-center justify-between gap-3 rounded-control border border-border p-3">
              <span>
                <span className="block text-sm font-medium">Live</span>
                <span className="block text-caption text-muted-foreground">
                  Turn off to keep it as a paused draft.
                </span>
              </span>
              <Switch checked={form.active} onCheckedChange={(v) => set('active', v)} />
            </label>
            <button type="submit" hidden />
          </form>

          <aside className="md:sticky md:top-0 md:self-start" aria-label="Customer preview">
            <p className="mb-2 text-overline text-muted-foreground">Customer preview</p>
            <div className="pointer-events-none select-none" aria-hidden>
              <OfferCoupon
                offer={preview}
                claimed={false}
                justClaimed={false}
                onView={() => {}}
                onClaim={() => {}}
              />
            </div>
          </aside>
        </div>
      </Modal>
    </BusinessLayout>
  );
}
