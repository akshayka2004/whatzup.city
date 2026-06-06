'use client';

import { useState, useEffect, useCallback } from 'react';
import { SuperAdminLayout } from '@/components/layouts/super-admin-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Tag, Trash2, RefreshCw, Loader2, Calendar, Building2, Percent, X, AlertTriangle,
} from 'lucide-react';
import { apiService } from '@/lib/services/api-service';

interface OfferRow {
  id: string;
  title: string;
  description?: string;
  status: string;
  discountPercent?: number | null;
  discountAmount?: number | null;
  code?: string | null;
  startDate?: string;
  endDate?: string;
  maxRedemptions?: number | null;
  business?: { id: string; name?: string; city?: string; tenant?: { name?: string } } | null;
}

export default function SuperAdminOffersPage() {
  const [offers, setOffers] = useState<OfferRow[]>([]);
  const [meta, setMeta] = useState<any>({ total: 0 });
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState<OfferRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const fetchOffers = useCallback(async () => {
    setLoading(true);
    setError('');
    const res = await apiService.get<any>('/v1/offers/admin/all');
    if (res.data && !res.error) {
      const list = res.data.data ?? res.data.items ?? (Array.isArray(res.data) ? res.data : []);
      setOffers(list);
      setMeta(res.data.meta ?? { total: list.length });
    } else {
      setError(res.error || 'Failed to load offers');
      setOffers([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchOffers(); }, [fetchOffers]);

  const handleDelete = async () => {
    if (!confirm) return;
    setDeleting(true);
    const res = await apiService.delete<any>(`/v1/offers/admin/${confirm.id}`);
    setDeleting(false);
    if (!res.error) {
      setOffers((prev) => prev.filter((o) => o.id !== confirm.id));
      setConfirm(null);
    } else {
      setError(res.error || 'Delete failed');
    }
  };

  const fmtDate = (d?: string) =>
    d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  const discountLabel = (o: OfferRow) => {
    if (o.discountPercent) return `${o.discountPercent}% off`;
    if (o.discountAmount) return `₹${o.discountAmount} off`;
    return '—';
  };

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Platform Offers</h1>
            <p className="text-muted-foreground text-sm mt-1">
              All currently-running offers across the platform. Delete any offer to remove it instantly.
            </p>
          </div>
          <Button
            onClick={fetchOffers}
            variant="outline"
            size="sm"
            className="rounded-xl border-border text-muted-foreground hover:text-foreground gap-2"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* KPI */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="p-5 rounded-2xl border-border bg-card flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10 text-primary"><Tag className="h-5 w-5" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Active Offers</p>
              <p className="text-2xl font-extrabold text-foreground">{loading ? '…' : (meta.total ?? offers.length)}</p>
            </div>
          </Card>
        </div>

        {error && (
          <div className="px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm">
            {error}
          </div>
        )}

        <Card className="rounded-2xl border-border bg-card overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground text-sm gap-2">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading offers…
            </div>
          ) : offers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
              <Tag className="h-8 w-8 opacity-30" />
              <p className="text-sm">No running offers on the platform</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/40">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground">Offer</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground">Business</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground">Discount</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground">Valid Till</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-muted-foreground">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {offers.map((o) => (
                    <tr key={o.id} className="border-b border-border last:border-0 hover:bg-secondary/20 transition-colors">
                      <td className="px-5 py-3">
                        <p className="font-semibold text-foreground">{o.title}</p>
                        {o.code && <p className="text-[11px] font-mono text-primary">{o.code}</p>}
                      </td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center gap-1.5 text-foreground">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                          {o.business?.name || '—'}
                        </span>
                        {(o.business?.tenant?.name || o.business?.city) && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {[o.business?.city, o.business?.tenant?.name].filter(Boolean).join(' · ')}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold">
                          <Percent className="h-3 w-3" /> {discountLabel(o)}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" /> {fmtDate(o.endDate)}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Button
                          onClick={() => setConfirm(o)}
                          variant="outline"
                          size="sm"
                          className="rounded-xl border-rose-500/30 text-rose-400 hover:bg-rose-500/10 gap-1.5 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* Delete confirm modal */}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md p-6 rounded-2xl border-border bg-card shadow-2xl relative">
            <button
              onClick={() => setConfirm(null)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-xl bg-rose-500/10 text-rose-400">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Delete offer?</h3>
                <p className="text-xs text-muted-foreground">This removes it from the platform immediately.</p>
              </div>
            </div>
            <div className="bg-secondary/50 border border-border rounded-xl p-3 mb-5">
              <p className="text-sm font-semibold text-foreground">{confirm.title}</p>
              <p className="text-xs text-muted-foreground">{confirm.business?.name}</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                onClick={() => setConfirm(null)}
                variant="outline"
                className="rounded-xl border-border text-muted-foreground hover:bg-secondary"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold gap-1.5"
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Delete
              </Button>
            </div>
          </Card>
        </div>
      )}
    </SuperAdminLayout>
  );
}
