'use client';

import { useState, useEffect, useCallback } from 'react';
import { StaffLayout } from '@/components/layouts/staff-layout';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Building2, Loader2, Search, MapPin, Phone } from 'lucide-react';
import { apiService } from '@/lib/services/api-service';

interface Row {
  id: string;
  name: string;
  city?: string | null;
  phone?: string | null;
  email?: string | null;
  status: string;
  category?: { name: string } | null;
}

export default function StaffBusinessesPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback((q: string) => {
    setLoading(true);
    const params = new URLSearchParams({ limit: '50' });
    if (q) params.set('search', q);
    apiService.get<any>(`/v1/businesses/admin/all?${params.toString()}`).then((res) => {
      setRows(res.data?.data ?? []);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(search), 300);
    return () => clearTimeout(t);
  }, [search, load]);

  return (
    <StaffLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Businesses</h1>
          <p className="text-muted-foreground text-sm mt-1">Read-only lookup — for reference while publishing content.</p>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, city, phone…"
            className="pl-9 h-10 bg-background border-input rounded-xl text-foreground"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : rows.length === 0 ? (
          <Card className="p-10 rounded-2xl border-dashed border-border bg-secondary text-center">
            <Building2 className="h-10 w-10 mx-auto text-muted-foreground mb-3 opacity-40" />
            <p className="text-sm text-muted-foreground">No businesses found.</p>
          </Card>
        ) : (
          <Card className="rounded-2xl border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/40">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground">Business</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground">Category</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground">City</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground">Contact</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((b) => (
                    <tr key={b.id} className="border-b border-border last:border-0 hover:bg-secondary/20">
                      <td className="px-5 py-3 font-semibold text-foreground">{b.name}</td>
                      <td className="px-5 py-3 text-muted-foreground text-xs">{b.category?.name || '—'}</td>
                      <td className="px-5 py-3 text-muted-foreground text-xs">
                        {b.city ? <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {b.city}</span> : '—'}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground text-xs">
                        {b.phone ? <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" /> {b.phone}</span> : (b.email || '—')}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${b.status === 'APPROVED' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </StaffLayout>
  );
}
