'use client';

import { useCallback, useEffect, useState } from 'react';
import { Gift, Pause, Play, Plus, Ticket, Trash2 } from 'lucide-react';
import { BusinessLayout } from '@/components/layouts/business-layout';
import { PageHeader } from '@/components/system/page-header';
import { SectionCard } from '@/components/system/section-card';
import { Modal } from '@/components/system/modal';
import { FilterChip, ChipRow } from '@/components/system/filter-chip';
import { EmptyState } from '@/components/common/empty-state';
import { useConfirm } from '@/components/common/confirm-dialog';
import { PromoCard, PromoGrid, PromoGridSkeleton } from '@/components/promotions/promo-card';
import { RedeemPanel } from '@/components/promotions/redeem-panel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';
import { useAuth } from '@/hooks/use-auth';
import { apiService } from '@/lib/services/api-service';

type Voucher = {
  id: string;
  title: string;
  description?: string;
  thresholdAmount: number;
  rewardType: string;
  rewardValue?: number | null;
  rewardLabel?: string | null;
  status: string;
  endDate: string;
  maxRedemptions?: number | null;
  currentRedemptions: number;
  unlockedCount?: number;
  redeemedCount?: number;
};

type PlatformRedemption = {
  id: string;
  code: string;
  customerName: string;
  tierTitle: string;
  rewardType: string;
  rewardValue: number | null;
  rewardLabel: string | null;
  redeemedAt: string;
};

const REWARD_TYPES = [
  { value: 'AMOUNT', label: '₹ off' },
  { value: 'PERCENT', label: '% off' },
  { value: 'FREEBIE', label: 'Freebie' },
] as const;

const rewardText = (v: {
  rewardType: string;
  rewardValue?: number | null;
  rewardLabel?: string | null;
}) =>
  v.rewardType === 'PERCENT'
    ? `${v.rewardValue}%`
    : v.rewardType === 'AMOUNT'
      ? `₹${Number(v.rewardValue || 0).toLocaleString('en-IN')}`
      : v.rewardLabel || 'Gift';

const fmtDay = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
const label = 'mb-1.5 block text-sm font-medium';

type Form = {
  title: string;
  threshold: string;
  rewardType: string;
  rewardValue: string;
  rewardLabel: string;
  endDate: string;
  maxRedemptions: string;
  description: string;
};
const EMPTY: Form = {
  title: '',
  threshold: '',
  rewardType: 'AMOUNT',
  rewardValue: '',
  rewardLabel: '',
  endDate: '',
  maxRedemptions: '',
  description: '',
};

export default function VouchersPage() {
  const { user } = useAuth();
  const confirm = useConfirm();
  const businessId = user?.businessId || user?.entity?.id;

  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Form>(EMPTY);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  const [platformRedemptions, setPlatformRedemptions] = useState<PlatformRedemption[]>([]);
  const [platformTotalReward, setPlatformTotalReward] = useState(0);
  const [redemptionsLoading, setRedemptionsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    const res = await apiService.get<Voucher[]>(`/v1/vouchers/mine/${businessId}`);
    if (res.data && !res.error) setVouchers(Array.isArray(res.data) ? res.data : []);
    setLoading(false);
  }, [businessId]);

  const loadPlatformRedemptions = useCallback(async () => {
    setRedemptionsLoading(true);
    const res = await apiService.get<any>('/v1/platform-vouchers/business/redemptions');
    if (res.data && !res.error) {
      setPlatformRedemptions(res.data.redemptions ?? []);
      setPlatformTotalReward(res.data.totalRewardValue ?? 0);
    }
    setRedemptionsLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    loadPlatformRedemptions();
  }, [loadPlatformRedemptions]);

  const submit = async () => {
    if (!businessId) return;
    if (!form.title.trim() || !form.threshold || !form.endDate)
      return toast.error('Title, spend threshold and end date are required.');
    if (form.rewardType !== 'FREEBIE' && !form.rewardValue)
      return toast.error('Enter the reward value, or choose Freebie.');
    if (form.rewardType === 'FREEBIE' && !form.rewardLabel.trim())
      return toast.error('Describe the freebie, e.g. “Free dessert”.');
    setSaving(true);
    const res = await apiService.post('/v1/vouchers', {
      businessId,
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      thresholdAmount: Number(form.threshold),
      rewardType: form.rewardType,
      rewardValue: form.rewardType === 'FREEBIE' ? undefined : Number(form.rewardValue),
      rewardLabel: form.rewardLabel.trim() || undefined,
      endDate: new Date(form.endDate).toISOString(),
      maxRedemptions: form.maxRedemptions ? Number(form.maxRedemptions) : undefined,
    });
    setSaving(false);
    if (res.error) return toast.error(res.error);
    toast.success('Voucher published');
    setOpen(false);
    setForm(EMPTY);
    load();
  };

  const remove = async (v: Voucher) => {
    const ok = await confirm({
      title: `Delete “${v.title}”?`,
      description: 'Customers who unlocked it lose the code.',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) return;
    const res = await apiService.delete(`/v1/vouchers/${v.id}`);
    if (res.error) return toast.error(res.error);
    setVouchers((list) => list.filter((x) => x.id !== v.id));
    toast.success('Voucher deleted');
  };

  const toggleStatus = async (v: Voucher) => {
    const next = v.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    const res = await apiService.patch(`/v1/vouchers/${v.id}`, { status: next });
    if (res.error) return toast.error(res.error);
    setVouchers((list) => list.map((x) => (x.id === v.id ? { ...x, status: next } : x)));
    toast.success(next === 'ACTIVE' ? 'Voucher is live again' : 'Voucher paused');
  };

  const redeem = (path: string, extra: Record<string, unknown>) => async (code: string) => {
    const res = await apiService.post<any>(path, { ...extra, code });
    if (res.error) return { error: res.error };
    return {
      message: `Redeemed: ${res.data?.voucherTitle ?? 'voucher'} — ${res.data?.customer ?? 'customer'}`,
    };
  };

  return (
    <BusinessLayout>
      <PageHeader
        title="Vouchers"
        description="Reward customers whose verified spend crosses a threshold. The code unlocks for them only then — they show it in-store."
        actions={
          <Button
            onClick={() => {
              setForm(EMPTY);
              setOpen(true);
            }}
          >
            <Plus /> New voucher
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <RedeemPanel
          title="Redeem your voucher"
          placeholder="VCH-A1B2C3"
          onRedeem={async (c) => {
            const r = await redeem('/v1/vouchers/redeem', { businessId })(c);
            if (!r.error) load();
            return r;
          }}
        />
        <RedeemPanel
          title="Redeem a platform voucher"
          description="Earned from a customer’s Whtzup.city points; any business can accept it."
          placeholder="PTS-A1B2C3"
          onRedeem={async (c) => {
            const r = await redeem('/v1/platform-vouchers/redeem', {})(c);
            if (!r.error) loadPlatformRedemptions();
            return r;
          }}
        />
      </div>

      {loading ? (
        <PromoGridSkeleton count={2} />
      ) : vouchers.length === 0 ? (
        <EmptyState
          icon={Ticket}
          title="No vouchers yet"
          description="Create a spend-gated voucher to reward loyal customers."
          action={{ label: 'New voucher', onClick: () => setOpen(true) }}
        />
      ) : (
        <PromoGrid>
          {vouchers.map((v) => {
            const ended = new Date(v.endDate).getTime() < Date.now();
            const live = v.status === 'ACTIVE' && !ended;
            return (
              <PromoCard
                key={v.id}
                icon={Gift}
                value={rewardText(v)}
                valueCaption={v.rewardType === 'FREEBIE' ? undefined : 'off'}
                title={v.title}
                subtitle={`Unlocks at ₹${Number(v.thresholdAmount).toLocaleString('en-IN')} verified spend`}
                status={
                  ended
                    ? { tone: 'neutral', label: 'Ended' }
                    : live
                      ? { tone: 'success', label: 'Live', live: true }
                      : { tone: 'neutral', label: 'Paused' }
                }
                chips={[
                  { label: `Ends ${fmtDay(v.endDate)}` },
                  ...(v.maxRedemptions
                    ? [
                        {
                          label: `${v.currentRedemptions}/${v.maxRedemptions} used`,
                          tone:
                            v.currentRedemptions >= v.maxRedemptions
                              ? ('warning' as const)
                              : ('neutral' as const),
                        },
                      ]
                    : []),
                ]}
                muted={ended}
                stats={[
                  {
                    label: 'Unlocked',
                    value: v.unlockedCount ?? 0,
                    hint: 'Customers who crossed the spend threshold',
                  },
                  { label: 'Redeemed', value: v.redeemedCount ?? 0 },
                  {
                    label: 'Redeem rate',
                    value: v.unlockedCount
                      ? `${Math.round(((v.redeemedCount ?? 0) / v.unlockedCount) * 100)}%`
                      : '—',
                  },
                ]}
                primary={
                  !ended ? (
                    <Button size="sm" variant="outline" onClick={() => toggleStatus(v)}>
                      {v.status === 'ACTIVE' ? <Pause /> : <Play />}
                      {v.status === 'ACTIVE' ? 'Pause' : 'Resume'}
                    </Button>
                  ) : undefined
                }
                menu={[{ label: 'Delete', icon: Trash2, onClick: () => remove(v), danger: true }]}
              />
            );
          })}
        </PromoGrid>
      )}

      <SectionCard
        className="mt-6"
        title="Platform vouchers redeemed here"
        description="Customers who used a Whtzup.city points reward at your business."
        action={
          <span className="text-sm font-semibold tabular-nums">
            {platformRedemptions.length}
            {platformTotalReward > 0
              ? ` · ₹${platformTotalReward.toLocaleString('en-IN')} given`
              : ''}
          </span>
        }
      >
        {redemptionsLoading ? (
          <div className="space-y-2">
            {[0, 1].map((i) => (
              <div key={i} className="ui-skeleton h-14 rounded-control" />
            ))}
          </div>
        ) : platformRedemptions.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">None yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {platformRedemptions.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{r.customerName}</p>
                  <p className="truncate text-caption text-muted-foreground">{r.tierTitle}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold text-primary">
                    {rewardText(r)}
                    {r.rewardType === 'FREEBIE' ? '' : ' off'}
                  </p>
                  <p className="text-caption text-muted-foreground">{fmtDay(r.redeemedAt)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <Modal
        open={open}
        onOpenChange={setOpen}
        title="New voucher"
        description="Customers see the reward once their verified spend crosses the threshold."
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button loading={saving} onClick={submit}>
              Publish voucher
            </Button>
          </>
        }
      >
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div className="sm:col-span-2">
            <label htmlFor="v-title" className={label}>
              Title
            </label>
            <Input
              id="v-title"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="₹500 off when you spend ₹5,000"
            />
          </div>
          <div>
            <label htmlFor="v-threshold" className={label}>
              Spend threshold (₹)
            </label>
            <Input
              id="v-threshold"
              type="number"
              inputMode="numeric"
              value={form.threshold}
              onChange={(e) => set('threshold', e.target.value)}
              placeholder="5000"
            />
          </div>
          <div>
            <span className={label}>Reward</span>
            <ChipRow label="Reward type" wrap>
              {REWARD_TYPES.map((r) => (
                <FilterChip
                  key={r.value}
                  selected={form.rewardType === r.value}
                  onClick={() => set('rewardType', r.value)}
                >
                  {r.label}
                </FilterChip>
              ))}
            </ChipRow>
          </div>
          {form.rewardType !== 'FREEBIE' && (
            <div>
              <label htmlFor="v-value" className={label}>
                Reward value ({form.rewardType === 'PERCENT' ? '%' : '₹'})
              </label>
              <Input
                id="v-value"
                type="number"
                inputMode="numeric"
                value={form.rewardValue}
                onChange={(e) => set('rewardValue', e.target.value)}
                placeholder={form.rewardType === 'PERCENT' ? '10' : '500'}
              />
            </div>
          )}
          <div className={form.rewardType === 'FREEBIE' ? 'sm:col-span-2' : undefined}>
            <label htmlFor="v-label" className={label}>
              {form.rewardType === 'FREEBIE'
                ? 'What they get'
                : 'Label shown to customers (optional)'}
            </label>
            <Input
              id="v-label"
              value={form.rewardLabel}
              onChange={(e) => set('rewardLabel', e.target.value)}
              placeholder="Free dessert"
            />
          </div>
          <div>
            <label htmlFor="v-end" className={label}>
              Valid until
            </label>
            <Input
              id="v-end"
              type="date"
              value={form.endDate}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => set('endDate', e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="v-max" className={label}>
              Max redemptions <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <Input
              id="v-max"
              type="number"
              inputMode="numeric"
              value={form.maxRedemptions}
              onChange={(e) => set('maxRedemptions', e.target.value)}
              placeholder="Unlimited"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="v-desc" className={label}>
              Details <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <Input
              id="v-desc"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Dine-in only, one per customer"
            />
          </div>
          <button type="submit" hidden />
        </form>
      </Modal>
    </BusinessLayout>
  );
}
