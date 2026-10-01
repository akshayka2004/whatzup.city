'use client';

import { useState, useEffect, useCallback } from 'react';
import { BusinessLayout } from '@/components/layouts/business-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';
import { apiService } from '@/lib/services/api-service';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Percent, Plus, Loader2, X, CheckCircle2, ScanLine, Disc3, AlertTriangle, Users, Ticket,
} from 'lucide-react';
import { cn } from '@/lib/utils';

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

interface ProductOpt {
  id: string;
  name: string;
}

export default function DiscountsPage() {
  const { user } = useAuth();
  const businessId = user?.businessId || user?.entity?.id;

  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [products, setProducts] = useState<ProductOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // form
  const [itemName, setItemName] = useState('');
  const [productId, setProductId] = useState('');
  const [description, setDescription] = useState('');
  const [maxDiscountPercent, setMaxDiscountPercent] = useState('');

  // redeem
  const [redeemCode, setRedeemCode] = useState('');
  const [redeemBusy, setRedeemBusy] = useState(false);
  const [redeemMsg, setRedeemMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    const res = await apiService.get<Discount[]>(`/v1/discounts/mine/${businessId}`);
    if (res.data && !res.error) setDiscounts(res.data);
    setLoading(false);
  }, [businessId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!businessId) return;
    apiService.get<any>(`/v1/products/business/${businessId}`).then((res) => {
      const list = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      if (!res.error) setProducts(list.map((p: any) => ({ id: p.id, name: p.name })));
    });
  }, [businessId]);

  const activeDiscount = discounts.find((d) => d.isActive);

  const resetForm = () => {
    setItemName(''); setProductId(''); setDescription(''); setMaxDiscountPercent(''); setError('');
  };

  const submit = async () => {
    if (!businessId) return;
    if (!itemName.trim()) { setError('Enter the item or product this discount applies to.'); return; }
    const max = Number(maxDiscountPercent);
    if (!maxDiscountPercent || max < 1 || max > 90) {
      setError('Enter a maximum discount between 1% and 90%.');
      return;
    }
    setSaving(true); setError('');
    const res = await apiService.post('/v1/discounts', {
      businessId,
      itemName: itemName.trim(),
      productId: productId || undefined,
      description: description.trim() || undefined,
      maxDiscountPercent: max,
    });
    setSaving(false);
    if (res.error) { setError(res.error); return; }
    resetForm();
    setShowForm(false);
    load();
  };

  const deactivate = async (id: string) => {
    await apiService.patch(`/v1/discounts/${id}/deactivate`, {});
    load();
  };

  const doRedeem = async () => {
    if (!businessId || !redeemCode.trim()) return;
    setRedeemBusy(true); setRedeemMsg(null);
    const res = await apiService.post<any>('/v1/discounts/redeem', {
      businessId,
      code: redeemCode.trim(),
    });
    setRedeemBusy(false);
    if (res.error) { setRedeemMsg({ ok: false, text: res.error }); return; }
    setRedeemMsg({ ok: true, text: `Redeemed: ${res.data?.discountPercent}% off ${res.data?.itemName}` });
    setRedeemCode('');
    load();
  };

  return (
    <BusinessLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="disc-glow relative flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary shrink-0">
              <Disc3 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Discounts</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Set a maximum discount on one item — we turn it into a 7-segment lucky wheel customers spin on your
                profile. Only one campaign can be active at a time.
              </p>
            </div>
          </div>
          {!activeDiscount && (
            <Button onClick={() => { resetForm(); setShowForm((s) => !s); }} className="gap-1.5 shrink-0">
              <Plus className="h-4 w-4" /> New discount wheel
            </Button>
          )}
        </div>

        {/* Redeem panel */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <ScanLine className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold">Redeem a customer's ticket</h2>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              value={redeemCode}
              onChange={(e) => setRedeemCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && doRedeem()}
              placeholder="Enter ticket code (e.g. SPIN-A1B2C3)"
              className="flex-1 font-mono uppercase"
            />
            <Button onClick={doRedeem} disabled={redeemBusy || !redeemCode.trim()} className="gap-1.5">
              {redeemBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Mark redeemed
            </Button>
          </div>
          {redeemMsg && (
            <p className={cn('mt-2 text-xs font-medium', redeemMsg.ok ? 'text-success' : 'text-destructive')}>
              {redeemMsg.text}
            </p>
          )}
        </div>

        {/* New discount form */}
        {showForm && (
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold">New discount wheel</h2>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Item / product *</label>
                <Input value={itemName} onChange={(e) => setItemName(e.target.value)} placeholder="e.g. Chicken Biryani" maxLength={255} />
              </div>
              {products.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Link a listed product (optional)</label>
                  <Select value={productId || 'none'} onValueChange={(v) => setProductId(v === 'none' ? '' : v)}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Maximum discount % *</label>
                <Input
                  type="number" min={1} max={90} value={maxDiscountPercent}
                  onChange={(e) => setMaxDiscountPercent(e.target.value)}
                  placeholder="e.g. 10"
                />
                <p className="text-[11px] text-muted-foreground">
                  We generate 7 wheel segments from 1% up to this max — some customers win less, the luckiest win this much.
                </p>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-medium text-muted-foreground">Terms customers see before spinning (optional)</label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Dine-in only, not valid with other offers" maxLength={1000} />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" /> <span className="break-words min-w-0">{error}</span>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={submit} disabled={saving} className="gap-1.5">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />} Publish wheel
              </Button>
            </div>
          </Card>
        )}

        {/* Campaigns */}
        {loading ? (
          <div className="flex items-center justify-center h-32"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : discounts.length === 0 ? (
          <Card className="p-10 rounded-2xl border-dashed border-border bg-secondary text-center">
            <Disc3 className="h-10 w-10 mx-auto text-muted-foreground mb-3 opacity-40" />
            <p className="text-foreground font-semibold mb-1">No discount wheel yet</p>
            <p className="text-sm text-muted-foreground">Publish one so customers can spin for a discount on your profile.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {discounts.map((d, i) => (
              <Card
                key={d.id}
                className={cn('disc-fade-up p-5 transition-shadow', d.isActive ? 'border-primary/30 shadow-sm shadow-primary/5' : 'opacity-70')}
                style={{ animationDelay: `${Math.min(i, 8) * 0.06}s` }}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-foreground">{d.itemName}</h3>
                      <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold', d.isActive ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground')}>
                        {d.isActive ? 'Active' : 'Retired'}
                      </span>
                    </div>
                    {d.description && <p className="text-xs text-muted-foreground mt-1 break-words">{d.description}</p>}
                    <p className="text-xs text-muted-foreground mt-1.5">
                      Wheel: {d.wheelPercentages.join('% · ')}% · max {d.maxDiscountPercent}%
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {d.spunCount} spun</span>
                      <span className="flex items-center gap-1"><Ticket className="h-3.5 w-3.5" /> {d.redeemedCount} redeemed</span>
                    </div>
                  </div>
                  {d.isActive && (
                    <Button size="sm" variant="outline" onClick={() => deactivate(d.id)} className="shrink-0">
                      Retire
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </BusinessLayout>
  );
}
