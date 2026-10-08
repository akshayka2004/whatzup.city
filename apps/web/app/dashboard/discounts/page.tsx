'use client';

import { useCallback, useEffect, useState } from 'react';
import { Archive, Disc3, Plus } from 'lucide-react';
import { BusinessLayout } from '@/components/layouts/business-layout';
import { PageHeader } from '@/components/system/page-header';
import { Modal } from '@/components/system/modal';
import { EmptyState } from '@/components/common/empty-state';
import { useConfirm } from '@/components/common/confirm-dialog';
import { PromoCard, PromoGrid, PromoGridSkeleton } from '@/components/promotions/promo-card';
import { RedeemPanel } from '@/components/promotions/redeem-panel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/sonner';
import { useAuth } from '@/hooks/use-auth';
import { apiService } from '@/lib/services/api-service';

interface Discount {
  id: string;
  itemName: string;
  description?: string | null;
  maxDiscountPercent: number;
  wheelPercentages: number[];
  isActive: boolean;
  createdAt: string;
  spunCount: number;
  redeemedCount: number;
}

const label = 'mb-1.5 block text-sm font-medium';

export default function DiscountsPage() {
  const { user } = useAuth();
  const confirm = useConfirm();
  const businessId = user?.businessId || user?.entity?.id;

  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [itemName, setItemName] = useState('');
  const [productId, setProductId] = useState('');
  const [description, setDescription] = useState('');
  const [maxDiscountPercent, setMaxDiscountPercent] = useState('');

  const load = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    const res = await apiService.get<Discount[]>(`/v1/discounts/mine/${businessId}`);
    if (res.data && !res.error) setDiscounts(Array.isArray(res.data) ? res.data : []);
    setLoading(false);
  }, [businessId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!businessId) return;
    apiService.get<any>(`/v1/products/business/${businessId}`).then((res) => {
      const list = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      if (!res.error) setProducts(list.map((p: any) => ({ id: p.id, name: p.name })));
    });
  }, [businessId]);

  const activeDiscount = discounts.find((d) => d.isActive);

  const openForm = () => {
    setItemName('');
    setProductId('');
    setDescription('');
    setMaxDiscountPercent('');
    setOpen(true);
  };

  const submit = async () => {
    if (!businessId) return;
    if (!itemName.trim()) return toast.error('Enter the item this discount applies to.');
    const max = Number(maxDiscountPercent);
    if (!maxDiscountPercent || max < 1 || max > 90) return toast.error('Enter a maximum discount between 1% and 90%.');
    setSaving(true);
    const res = await apiService.post('/v1/discounts', {
      businessId,
      itemName: itemName.trim(),
      productId: productId || undefined,
      description: description.trim() || undefined,
      maxDiscountPercent: max,
    });
    setSaving(false);
    if (res.error) return toast.error(res.error);
    toast.success('Wheel published — customers can spin on your profile');
    setOpen(false);
    load();
  };

  const retire = async (d: Discount) => {
    const ok = await confirm({ title: `Retire the ${d.itemName} wheel?`, description: 'Tickets already won stay valid. You can then publish a new wheel.', confirmLabel: 'Retire' });
    if (!ok) return;
    const res = await apiService.patch(`/v1/discounts/${d.id}/deactivate`, {});
    if (res.error) return toast.error(res.error);
    toast.success('Wheel retired');
    load();
  };

  return (
    <BusinessLayout>
      <PageHeader
        title="Spin wheel"
        description="Set a maximum discount on one item — we turn it into a 7-segment lucky wheel customers spin on your profile. One wheel runs at a time."
        actions={
          !activeDiscount ? (
            <Button onClick={openForm}>
              <Plus /> New wheel
            </Button>
          ) : undefined
        }
      />

      <RedeemPanel
        className="mb-6"
        title="Redeem a customer’s ticket"
        placeholder="SPIN-A1B2C3"
        onRedeem={async (code) => {
          const res = await apiService.post<any>('/v1/discounts/redeem', { businessId, code });
          if (res.error) return { error: res.error };
          load();
          return { message: `Redeemed: ${res.data?.discountPercent}% off ${res.data?.itemName}` };
        }}
      />

      {loading ? (
        <PromoGridSkeleton count={2} />
      ) : discounts.length === 0 ? (
        <EmptyState icon={Disc3} title="No wheel yet" description="Publish one so customers can spin for a discount on your profile." action={{ label: 'New wheel', onClick: openForm }} />
      ) : (
        <PromoGrid>
          {discounts.map((d) => (
            <PromoCard
              key={d.id}
              icon={Disc3}
              value={`${d.maxDiscountPercent}%`}
              valueCaption="max off"
              title={d.itemName}
              subtitle={d.description || undefined}
              status={d.isActive ? { tone: 'success', label: 'Live', live: true } : { tone: 'neutral', label: 'Retired' }}
              chips={[{ label: `Wheel ${d.wheelPercentages.join(' · ')}%` }]}
              muted={!d.isActive}
              stats={[
                { label: 'Spins', value: d.spunCount },
                { label: 'Redeemed', value: d.redeemedCount },
                { label: 'Redeem rate', value: d.spunCount ? `${Math.round((d.redeemedCount / d.spunCount) * 100)}%` : '—' },
              ]}
              primary={
                d.isActive ? (
                  <Button size="sm" variant="outline" onClick={() => retire(d)}>
                    <Archive /> Retire
                  </Button>
                ) : undefined
              }
            />
          ))}
        </PromoGrid>
      )}

      <Modal
        open={open}
        onOpenChange={setOpen}
        title="New spin wheel"
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button loading={saving} onClick={submit}>
              Publish wheel
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
          <div className={products.length ? undefined : 'sm:col-span-2'}>
            <label htmlFor="d-item" className={label}>
              Item
            </label>
            <Input id="d-item" value={itemName} maxLength={255} onChange={(e) => setItemName(e.target.value)} placeholder="Chicken biryani" />
          </div>
          {products.length > 0 && (
            <div>
              <label htmlFor="d-product" className={label}>
                Link a listed product <span className="font-normal text-muted-foreground">(optional)</span>
              </label>
              <Select
                value={productId || 'none'}
                onValueChange={(v) => {
                  setProductId(v === 'none' ? '' : v);
                  const p = products.find((x) => x.id === v);
                  if (p && !itemName) setItemName(p.name);
                }}
              >
                <SelectTrigger id="d-product" className="w-full">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="sm:col-span-2">
            <label htmlFor="d-max" className={label}>
              Maximum discount (%)
            </label>
            <Input id="d-max" type="number" inputMode="numeric" min={1} max={90} value={maxDiscountPercent} onChange={(e) => setMaxDiscountPercent(e.target.value)} placeholder="10" />
            <p className="mt-1.5 text-caption text-muted-foreground">
              {Number(maxDiscountPercent) >= 1
                ? `One segment is always ${Number(maxDiscountPercent)}%; the other six land randomly between 1% and ${Number(maxDiscountPercent)}%.`
                : 'We build 7 segments: one at this maximum, six smaller wins.'}
            </p>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="d-terms" className={label}>
              Terms shown before spinning <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <Input id="d-terms" value={description} maxLength={1000} onChange={(e) => setDescription(e.target.value)} placeholder="Dine-in only, not valid with other offers" />
          </div>
          <button type="submit" hidden />
        </form>
      </Modal>
    </BusinessLayout>
  );
}
