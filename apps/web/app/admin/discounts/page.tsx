'use client';

import { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/layouts/admin-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Loader2, Percent, Building2, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { apiService } from '@/lib/services/api-service';

interface DiscountRow {
  id: string;
  itemName: string;
  description?: string | null;
  maxDiscountPercent: number;
  wheelPercentages: number[];
  isActive: boolean;
  createdAt: string;
  business?: { id: string; name: string; city?: string | null } | null;
  _count?: { spins: number };
}

export default function AdminDiscountsPage() {
  const [rows, setRows] = useState<DiscountRow[]>([]);
  const [meta, setMeta] = useState<any>({ total: 0, totalPages: 1, page: 1 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setError('');
    const res = await apiService.get<any>(`/v1/discounts/admin/all?page=${page}&limit=25`);
    if (res.data && !res.error) {
      setRows(res.data.data ?? []);
      setMeta(res.data.meta ?? { total: 0, totalPages: 1, page: 1 });
    } else {
      setError(res.error || "Couldn't load discount campaigns. Refresh the page to try again.");
      setRows([]);
    }
    setLoading(false);
  }, [page]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  const fmtDate = (d?: string) =>
    d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="disc-glow relative flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary shrink-0">
              <Percent className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Discounts</h1>
              <p className="text-muted-foreground text-sm mt-1">
                Every business's lucky-wheel discount campaign — the item, the max %, the generated wheel, and how many
                customers have spun it.
              </p>
            </div>
          </div>
          <Button onClick={fetchRows} variant="outline" size="sm" className="rounded-xl border-border text-muted-foreground hover:text-foreground gap-2">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" /> <span className="break-words min-w-0">{error}</span>
          </div>
        )}

        <Card className="rounded-2xl border-border bg-card overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground text-sm gap-2">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading…
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
              <Percent className="h-8 w-8 opacity-30" /> <p className="text-sm">No discount campaigns yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/40">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground">Business</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground">Item</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground">Max %</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground">Wheel</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground">Spins</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground">Status</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((d, i) => (
                    <tr
                      key={d.id}
                      className="disc-fade-up border-b border-border last:border-0 hover:bg-secondary/20 transition-colors"
                      style={{ animationDelay: `${Math.min(i, 10) * 0.04}s` }}
                    >
                      <td className="px-5 py-3">
                        <p className="font-semibold text-foreground flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> {d.business?.name || '—'}
                        </p>
                        {d.business?.city && <p className="text-xs text-muted-foreground">{d.business.city}</p>}
                      </td>
                      <td className="px-5 py-3 text-foreground break-words max-w-[220px]">{d.itemName}</td>
                      <td className="px-5 py-3 text-foreground font-semibold">{d.maxDiscountPercent}%</td>
                      <td className="px-5 py-3 text-muted-foreground text-xs">
                        {Array.isArray(d.wheelPercentages) ? d.wheelPercentages.join(', ') : '—'}
                      </td>
                      <td className="px-5 py-3 text-foreground">{d._count?.spins ?? 0}</td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${d.isActive ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground'}`}>
                          {d.isActive ? 'Active' : 'Retired'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground text-xs">{fmtDate(d.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Page {meta.page} of {meta.totalPages} · {meta.total} total</p>
            <div className="flex gap-2">
              <Button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} variant="outline" size="sm" className="rounded-xl border-border text-muted-foreground"><ChevronLeft className="h-4 w-4" /></Button>
              <Button onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))} disabled={page >= meta.totalPages} variant="outline" size="sm" className="rounded-xl border-border text-muted-foreground"><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
