'use client';

import { useState, useEffect, useCallback } from 'react';
import { SuperAdminLayout } from '@/components/layouts/super-admin-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { apiService } from '@/lib/services/api-service';
import {
  Ticket, Plus, Loader2, Trash2, CheckCircle2, Lock, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Tier = {
  id: string; title: string; description?: string; thresholdPoints: number;
  rewardType: string; rewardValue?: number | null; rewardLabel?: string | null;
  status: string; endDate: string; maxRedemptions?: number | null;
  currentRedemptions: number; unlockedCount?: number; redeemedCount?: number;
};

const REWARD_TYPES = [
  { value: 'AMOUNT', label: '₹ off' },
  { value: 'PERCENT', label: '% off' },
  { value: 'FREEBIE', label: 'Freebie / other' },
];

export default function SuperAdminPlatformVouchersPage() {
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [title, setTitle] = useState('');
  const [threshold, setThreshold] = useState('');
  const [rewardType, setRewardType] = useState('AMOUNT');
  const [rewardValue, setRewardValue] = useState('');
  const [rewardLabel, setRewardLabel] = useState('');
  const [endDate, setEndDate] = useState('');
  const [maxRedemptions, setMaxRedemptions] = useState('');
  const [description, setDescription] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const res = await apiService.get<Tier[]>('/v1/platform-vouchers/admin');
    if (res.data && !res.error) setTiers(res.data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => {
    setTitle(''); setThreshold(''); setRewardType('AMOUNT'); setRewardValue('');
    setRewardLabel(''); setEndDate(''); setMaxRedemptions(''); setDescription(''); setError('');
  };

  const submit = async () => {
    if (!title.trim() || !threshold || !endDate) {
      setError('Title, points threshold, and end date are required.');
      return;
    }
    if (rewardType !== 'FREEBIE' && !rewardValue) {
      setError('Enter the reward value, or choose Freebie / other.');
      return;
    }
    setSaving(true); setError('');
    const res = await apiService.post('/v1/platform-vouchers', {
      title: title.trim(),
      description: description.trim() || undefined,
      thresholdPoints: Number(threshold),
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
    await apiService.delete(`/v1/platform-vouchers/${id}`);
    setTiers((t) => t.filter((x) => x.id !== id));
  };

  const toggleStatus = async (t: Tier) => {
    const next = t.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    await apiService.patch(`/v1/platform-vouchers/${t.id}`, { status: next });
    setTiers((list) => list.map((x) => (x.id === t.id ? { ...x, status: next } : x)));
  };

  const rewardText = (t: Tier) =>
    t.rewardType === 'PERCENT' ? `${t.rewardValue}% off`
      : t.rewardType === 'AMOUNT' ? `₹${Number(t.rewardValue || 0).toLocaleString('en-IN')} off`
        : t.rewardLabel || 'Reward';

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Platform Vouchers</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Global reward tiers, unlocked by a customer's lifetime points across every
              business (1 point per ₹1 of verified bill spend). Redeemable by any business's staff.
            </p>
          </div>
          <Button onClick={() => { resetForm(); setShowForm((s) => !s); }} className="gap-1.5 shrink-0 cursor-pointer">
            <Plus className="h-4 w-4" /> New tier
          </Button>
        </div>

        {showForm && (
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold">New reward tier</h2>
              <button onClick={() => setShowForm(false)} aria-label="Close" className="text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="grid sm:grid-cols-2 gap-4">
              <label className="space-y-1.5 sm:col-span-2">
                <span className="text-xs font-medium text-muted-foreground">Title</span>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. ₹100 off for 2000 points" />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Points threshold</span>
                <Input type="number" value={threshold} onChange={(e) => setThreshold(e.target.value)} placeholder="2000" />
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
                  <Input type="number" value={rewardValue} onChange={(e) => setRewardValue(e.target.value)} placeholder={rewardType === 'PERCENT' ? '10' : '100'} />
                </label>
              )}
              <label className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Reward label (shown to customer)</span>
                <Input value={rewardLabel} onChange={(e) => setRewardLabel(e.target.value)} placeholder="e.g. ₹100 off your next bill anywhere" />
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
              <Button variant="outline" onClick={() => setShowForm(false)} className="cursor-pointer">Cancel</Button>
              <Button onClick={submit} disabled={saving} className="gap-1.5 cursor-pointer">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Publish tier
              </Button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /></div>
        ) : tiers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-secondary p-12 text-center">
            <Ticket className="h-10 w-10 mx-auto text-muted-foreground mb-3 opacity-50" />
            <h3 className="text-base font-semibold mb-1">No reward tiers yet</h3>
            <p className="text-sm text-muted-foreground">Create a points-gated tier to reward loyal customers platform-wide.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {tiers.map((t) => (
              <div key={t.id} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-foreground truncate">{t.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Unlocks at <span className="font-semibold text-foreground">{Number(t.thresholdPoints).toLocaleString('en-IN')} pts</span>
                    </p>
                  </div>
                  <span className={cn(
                    'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                    t.status === 'ACTIVE' ? 'bg-success/12 text-success' : 'bg-muted text-muted-foreground',
                  )}>
                    {t.status}
                  </span>
                </div>
                <div className="mt-3 inline-flex rounded-xl bg-primary/10 px-3 py-1 text-sm font-bold text-primary">
                  {rewardText(t)}
                </div>
                <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Lock className="h-3.5 w-3.5" /> {t.unlockedCount ?? 0} unlocked</span>
                  <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> {t.redeemedCount ?? 0} redeemed</span>
                  <span>ends {new Date(t.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => toggleStatus(t)} className="flex-1 cursor-pointer">
                    {t.status === 'ACTIVE' ? 'Pause' : 'Activate'}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => remove(t.id)} className="text-destructive hover:bg-destructive/10 cursor-pointer">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </SuperAdminLayout>
  );
}
