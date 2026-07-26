'use client';

import { useState, useEffect, useCallback } from 'react';
import { BusinessLayout } from '@/components/layouts/business-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';
import { apiService } from '@/lib/services/api-service';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Ticket, Plus, Loader2, Trash2, CheckCircle2, Lock, X, ScanLine,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Voucher = {
  id: string; title: string; description?: string; thresholdAmount: number;
  rewardType: string; rewardValue?: number | null; rewardLabel?: string | null;
  status: string; endDate: string; maxRedemptions?: number | null;
  currentRedemptions: number; unlockedCount?: number; redeemedCount?: number;
};

const REWARD_TYPES = [
  { value: 'AMOUNT', label: '₹ off' },
  { value: 'PERCENT', label: '% off' },
  { value: 'FREEBIE', label: 'Freebie / other' },
];

export default function VouchersPage() {
  const { user } = useAuth();
  const businessId = user?.businessId || user?.entity?.id;

  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // form
  const [title, setTitle] = useState('');
  const [threshold, setThreshold] = useState('');
  const [rewardType, setRewardType] = useState('AMOUNT');
  const [rewardValue, setRewardValue] = useState('');
  const [rewardLabel, setRewardLabel] = useState('');
  const [endDate, setEndDate] = useState('');
  const [maxRedemptions, setMaxRedemptions] = useState('');
  const [description, setDescription] = useState('');

  // redeem
  const [redeemCode, setRedeemCode] = useState('');
  const [redeemBusy, setRedeemBusy] = useState(false);
  const [redeemMsg, setRedeemMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    const res = await apiService.get<Voucher[]>(`/v1/vouchers/mine/${businessId}`);
    if (res.data && !res.error) setVouchers(res.data);
    setLoading(false);
  }, [businessId]);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => {
    setTitle(''); setThreshold(''); setRewardType('AMOUNT'); setRewardValue('');
    setRewardLabel(''); setEndDate(''); setMaxRedemptions(''); setDescription(''); setError('');
  };

  const submit = async () => {
    if (!businessId) return;
    if (!title.trim() || !threshold || !endDate) {
      setError('Title, spend threshold, and end date are required.');
      return;
    }
    if (rewardType !== 'FREEBIE' && !rewardValue) {
      setError('Enter the reward value, or choose Freebie / other.');
      return;
    }
    setSaving(true); setError('');
    const res = await apiService.post('/v1/vouchers', {
      businessId,
      title: title.trim(),
      description: description.trim() || undefined,
      thresholdAmount: Number(threshold),
      rewardType,
      rewardValue: rewardType === 'FREEBIE' ? undefined : Number(rewardValue),
      rewardLabel: rewardLabel.trim() || undefined,
      endDate: new Date(endDate).toISOString(),
      maxRedemptions: maxRedemptions ? Number(maxRedemptions) : undefined,
    });
    setSaving(false);
    if (res.error) { setError(res.error); return; }
    resetForm(); setShowForm(false); load();
  };

  const remove = async (id: string) => {
    await apiService.delete(`/v1/vouchers/${id}`);
    setVouchers((v) => v.filter((x) => x.id !== id));
  };

  const toggleStatus = async (v: Voucher) => {
    const next = v.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    await apiService.patch(`/v1/vouchers/${v.id}`, { status: next });
    setVouchers((list) => list.map((x) => (x.id === v.id ? { ...x, status: next } : x)));
  };

  const doRedeem = async () => {
    if (!businessId || !redeemCode.trim()) return;
    setRedeemBusy(true); setRedeemMsg(null);
    const res = await apiService.post<any>('/v1/vouchers/redeem', {
      businessId,
      code: redeemCode.trim(),
    });
    setRedeemBusy(false);
    if (res.error) { setRedeemMsg({ ok: false, text: res.error }); return; }
    setRedeemMsg({ ok: true, text: `Redeemed: ${res.data?.voucherTitle} — ${res.data?.customer}` });
    setRedeemCode('');
    load();
  };

  const rewardText = (v: Voucher) =>
    v.rewardType === 'PERCENT' ? `${v.rewardValue}% off`
      : v.rewardType === 'AMOUNT' ? `₹${Number(v.rewardValue || 0).toLocaleString('en-IN')} off`
        : v.rewardLabel || 'Reward';

  return (
    <BusinessLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Vouchers</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Reward customers who spend above a threshold. The code unlocks for them only after
              their verified spend crosses the limit — they show it in-store to claim.
            </p>
          </div>
          <Button onClick={() => { resetForm(); setShowForm((s) => !s); }} className="gap-1.5 shrink-0">
            <Plus className="h-4 w-4" /> New voucher
          </Button>
        </div>

        {/* Redeem panel */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <ScanLine className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold">Redeem a customer voucher</h2>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              value={redeemCode}
              onChange={(e) => setRedeemCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && doRedeem()}
              placeholder="Enter voucher code (e.g. VCH-A1B2C3)"
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

        {/* Create form */}
        {showForm && (
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold">New voucher</h2>
              <button onClick={() => setShowForm(false)} aria-label="Close" className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="grid sm:grid-cols-2 gap-4">
              <label className="space-y-1.5 sm:col-span-2">
                <span className="text-xs font-medium text-muted-foreground">Title</span>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. ₹500 off for spending ₹5000" />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Spend threshold (₹)</span>
                <Input type="number" value={threshold} onChange={(e) => setThreshold(e.target.value)} placeholder="5000" />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Reward type</span>
                <Select value={rewardType} onValueChange={setRewardType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {REWARD_TYPES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </label>
              {rewardType !== 'FREEBIE' && (
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">
                    Reward value ({rewardType === 'PERCENT' ? '%' : '₹'})
                  </span>
                  <Input type="number" value={rewardValue} onChange={(e) => setRewardValue(e.target.value)} placeholder={rewardType === 'PERCENT' ? '10' : '500'} />
                </label>
              )}
              <label className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Reward label (shown to customer)</span>
                <Input value={rewardLabel} onChange={(e) => setRewardLabel(e.target.value)} placeholder="e.g. Free dessert / ₹500 off next bill" />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Valid until</span>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Max redemptions (optional)</span>
                <Input type="number" value={maxRedemptions} onChange={(e) => setMaxRedemptions(e.target.value)} placeholder="unlimited" />
              </label>
              <label className="space-y-1.5 sm:col-span-2">
                <span className="text-xs font-medium text-muted-foreground">Description (optional)</span>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short details customers see" />
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={submit} disabled={saving} className="gap-1.5">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Publish voucher
              </Button>
            </div>
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /></div>
        ) : vouchers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-secondary p-12 text-center">
            <Ticket className="h-10 w-10 mx-auto text-muted-foreground mb-3 opacity-50" />
            <h3 className="text-base font-semibold mb-1">No vouchers yet</h3>
            <p className="text-sm text-muted-foreground">Create a spend-gated voucher to reward loyal customers.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {vouchers.map((v) => (
              <div key={v.id} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-foreground truncate">{v.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Unlocks at <span className="font-semibold text-foreground">₹{Number(v.thresholdAmount).toLocaleString('en-IN')}</span> spend
                    </p>
                  </div>
                  <span className={cn(
                    'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                    v.status === 'ACTIVE' ? 'bg-success/12 text-success' : 'bg-muted text-muted-foreground',
                  )}>
                    {v.status}
                  </span>
                </div>
                <div className="mt-3 inline-flex rounded-xl bg-primary/10 px-3 py-1 text-sm font-bold text-primary">
                  {rewardText(v)}
                </div>
                <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Lock className="h-3.5 w-3.5" /> {v.unlockedCount ?? 0} unlocked</span>
                  <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> {v.redeemedCount ?? 0} redeemed</span>
                  <span>ends {new Date(v.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => toggleStatus(v)} className="flex-1">
                    {v.status === 'ACTIVE' ? 'Pause' : 'Activate'}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => remove(v.id)} className="text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </BusinessLayout>
  );
}
