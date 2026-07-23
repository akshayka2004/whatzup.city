'use client';

import { useState, useEffect, useCallback } from 'react';
import { SuperAdminLayout } from '@/components/layouts/super-admin-layout';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Building2, Search, RefreshCw, Pencil, X, Loader2, CheckCircle2, ChevronLeft, ChevronRight, Tag, CalendarDays, ArrowUpDown, Wallet, Star } from 'lucide-react';
import { apiService } from '@/lib/services/api-service';
import { KERALA_CITIES } from '@/lib/constants';

const STATUS_OPTIONS = ['DRAFT', 'PENDING_VERIFICATION', 'APPROVED', 'REJECTED', 'SUSPENDED'];

interface Biz {
  id: string;
  name: string;
  ownerName?: string;
  description?: string;
  categoryId?: string;
  category?: { id: string; name: string } | null;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  status?: string;
  isVerified?: boolean;
  halalStatus?: string | null;
  logo?: string | null;
  coverImage?: string | null;
  _count?: { offers?: number; events?: number };
  totalBillAmount?: number;
}

export default function SuperAdminBusinessesPage() {
  const [rows, setRows] = useState<Biz[]>([]);
  const [meta, setMeta] = useState<any>({ total: 0, totalPages: 1, page: 1 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

  // Filters + sort
  const [catFilter, setCatFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [verifiedFilter, setVerifiedFilter] = useState('');
  const [halalFilter, setHalalFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const toggleSort = (col: string) => {
    if (sortBy === col) setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(col); setSortOrder(col === 'name' || col === 'city' ? 'asc' : 'desc'); }
    setPage(1);
  };

  const [editing, setEditing] = useState<Biz | null>(null);
  const [form, setForm] = useState<Biz | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 350);
    return () => clearTimeout(t);
  }, [search]);
  // Seed search from header ?q= (role-aware global search lands here).
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('q');
    if (q) setSearch(q);
  }, []);
  useEffect(() => { setPage(1); }, [debounced, catFilter, cityFilter, statusFilter, verifiedFilter, halalFilter]);

  // Flat category list for the edit dropdown
  useEffect(() => {
    apiService.get<any>('/v1/categories').then((res) => {
      const flat: { id: string; name: string }[] = [];
      const walk = (list: any[]) => list?.forEach((c) => { flat.push({ id: c.id, name: c.name }); if (c.children) walk(c.children); });
      if (Array.isArray(res.data)) walk(res.data);
      setCategories(flat);
    });
  }, []);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '25', sortBy, sortOrder });
    if (debounced) params.set('search', debounced);
    if (catFilter) params.set('categoryId', catFilter);
    if (cityFilter) params.set('city', cityFilter);
    if (statusFilter) params.set('status', statusFilter);
    if (verifiedFilter) params.set('isVerified', verifiedFilter);
    if (halalFilter) params.set('halalStatus', halalFilter);
    const res = await apiService.get<any>(`/v1/businesses/admin/all?${params}`);
    if (res.data && !res.error) {
      setRows(res.data.data || []);
      setMeta(res.data.meta || { total: 0, totalPages: 1, page: 1 });
    } else {
      setRows([]);
    }
    setLoading(false);
  }, [page, debounced, catFilter, cityFilter, statusFilter, verifiedFilter, halalFilter, sortBy, sortOrder]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  const openEdit = (b: Biz) => {
    setSaveErr('');
    setEditing(b);
    setForm({ ...b, categoryId: b.categoryId || b.category?.id });
  };

  const save = async () => {
    if (!form || !editing) return;
    setSaving(true);
    setSaveErr('');
    const payload: any = {
      name: form.name, ownerName: form.ownerName, description: form.description,
      categoryId: form.categoryId, phone: form.phone, email: form.email, website: form.website,
      address: form.address, city: form.city, zipCode: form.zipCode,
      status: form.status, isVerified: form.isVerified, halalStatus: form.halalStatus || null,
      logo: form.logo || null, coverImage: form.coverImage || null,
    };
    const res = await apiService.patch<any>(`/v1/businesses/admin/${editing.id}`, payload);
    setSaving(false);
    if (res.error) { setSaveErr(res.error); return; }
    setEditing(null);
    setForm(null);
    fetchRows();
  };

  const set = (k: keyof Biz, v: any) => setForm((f) => (f ? { ...f, [k]: v } : f));

  const SortTh = ({ label, col }: { label: string; col: string }) => (
    <th className="px-5 py-3 text-left">
      <button
        onClick={() => toggleSort(col)}
        className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
      >
        {label}
        <ArrowUpDown className={`h-3 w-3 ${sortBy === col ? 'text-primary' : 'opacity-40'}`} />
      </button>
    </th>
  );

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Businesses</h1>
            <p className="text-muted-foreground text-sm mt-1">Edit any business profile across the platform.</p>
          </div>
          <Button onClick={fetchRows} variant="outline" size="sm" className="rounded-xl border-border text-muted-foreground hover:text-foreground gap-2">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email, phone, city…" className="pl-9 h-9 rounded-xl border-border bg-card text-sm text-foreground" />
          </div>
          <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className={selCls}>
            <option value="">All categories</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} className={selCls}>
            <option value="">All cities</option>
            {KERALA_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={selCls}>
            <option value="">Any status</option>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={verifiedFilter} onChange={(e) => setVerifiedFilter(e.target.value)} className={selCls}>
            <option value="">Any verification</option>
            <option value="true">Verified</option>
            <option value="false">Unverified</option>
          </select>
          <select value={halalFilter} onChange={(e) => setHalalFilter(e.target.value)} className={selCls}>
            <option value="">Any halal</option>
            <option value="HALAL">Halal</option>
            <option value="NON_HALAL">Non-Halal</option>
          </select>
        </div>

        <Card className="rounded-2xl border-border bg-card overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground text-sm gap-2"><Loader2 className="h-5 w-5 animate-spin" /> Loading…</div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground"><Building2 className="h-8 w-8 opacity-30" /><p className="text-sm">No businesses found</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/40">
                    <SortTh label="Business" col="name" />
                    <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground">Category</th>
                    <SortTh label="City" col="city" />
                    <SortTh label="Rating" col="rating" />
                    <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground">Published</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground">Total Received</th>
                    <SortTh label="Status" col="status" />
                    <th className="px-5 py-3 text-right text-xs font-semibold text-muted-foreground">Edit</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((b) => (
                    <tr key={b.id} className="border-b border-border last:border-0 hover:bg-secondary/20 transition-colors">
                      <td className="px-5 py-3">
                        <p className="font-semibold text-foreground flex items-center gap-1.5">{b.name}{b.isVerified && <CheckCircle2 className="h-3.5 w-3.5 text-success" />}</p>
                        {b.email && <p className="text-xs text-muted-foreground">{b.email}</p>}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground text-xs">{b.category?.name || '—'}</td>
                      <td className="px-5 py-3 text-muted-foreground text-xs">{b.city || '—'}</td>
                      <td className="px-5 py-3 text-xs">
                        <span className="inline-flex items-center gap-1 text-warning"><Star className="h-3 w-3 fill-warning" />{(b as any).averageRating != null ? Number((b as any).averageRating).toFixed(1) : '—'}</span>
                      </td>
                      <td className="px-5 py-3 text-xs">
                        <span className="inline-flex items-center gap-1 mr-2 text-success"><Tag className="h-3 w-3" />{b._count?.offers ?? 0}</span>
                        <span className="inline-flex items-center gap-1 text-info"><CalendarDays className="h-3 w-3" />{b._count?.events ?? 0}</span>
                      </td>
                      <td className="px-5 py-3 text-xs font-semibold text-foreground">
                        <span className="inline-flex items-center gap-1"><Wallet className="h-3 w-3 text-primary" />₹{Number(b.totalBillAmount || 0).toLocaleString('en-IN')}</span>
                      </td>
                      <td className="px-5 py-3"><span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-muted text-foreground">{b.status}</span></td>
                      <td className="px-5 py-3 text-right">
                        <Button onClick={() => openEdit(b)} variant="outline" size="sm" className="rounded-xl border-border text-foreground hover:bg-secondary gap-1.5 cursor-pointer">
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </Button>
                      </td>
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
              <Button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={!meta.hasPrev} variant="outline" size="sm" className="rounded-xl border-border text-muted-foreground"><ChevronLeft className="h-4 w-4" /></Button>
              <Button onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))} disabled={!meta.hasNext} variant="outline" size="sm" className="rounded-xl border-border text-muted-foreground"><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        )}
      </div>

      {/* Edit modal */}
      {editing && form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card className="w-full max-w-2xl p-6 rounded-2xl border-border bg-card shadow-2xl relative max-h-[88vh] overflow-y-auto">
            <button onClick={() => setEditing(null)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer"><X className="h-5 w-5" /></button>
            <h3 className="text-lg font-bold text-foreground mb-4">Edit Business</h3>

            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Business Name"><input className={inp} value={form.name || ''} onChange={(e) => set('name', e.target.value)} /></Field>
              <Field label="Owner Name"><input className={inp} value={form.ownerName || ''} onChange={(e) => set('ownerName', e.target.value)} /></Field>
              <Field label="Phone"><input className={inp} value={form.phone || ''} onChange={(e) => set('phone', e.target.value)} /></Field>
              <Field label="Email"><input className={inp} value={form.email || ''} onChange={(e) => set('email', e.target.value)} /></Field>
              <Field label="Website"><input className={inp} value={form.website || ''} onChange={(e) => set('website', e.target.value)} /></Field>
              <Field label="Category">
                <select className={inp} value={form.categoryId || ''} onChange={(e) => set('categoryId', e.target.value)}>
                  <option value="">—</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
              <Field label="City">
                <select className={inp} value={form.city || ''} onChange={(e) => set('city', e.target.value)}>
                  <option value="">—</option>
                  {KERALA_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Postal Code"><input className={inp} value={form.zipCode || ''} onChange={(e) => set('zipCode', e.target.value)} /></Field>
              <Field label="Status">
                <select className={inp} value={form.status || ''} onChange={(e) => set('status', e.target.value)}>
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Halal Status (food)">
                <select className={inp} value={form.halalStatus || ''} onChange={(e) => set('halalStatus', e.target.value)}>
                  <option value="">—</option>
                  <option value="HALAL">Halal</option>
                  <option value="NON_HALAL">Non-Halal</option>
                </select>
              </Field>
              <Field label="Logo URL"><input className={inp} value={form.logo || ''} onChange={(e) => set('logo', e.target.value)} /></Field>
              <Field label="Cover Image URL"><input className={inp} value={form.coverImage || ''} onChange={(e) => set('coverImage', e.target.value)} /></Field>
            </div>
            <Field label="Address"><input className={inp} value={form.address || ''} onChange={(e) => set('address', e.target.value)} /></Field>
            <Field label="Description">
              <textarea className={`${inp} min-h-20`} value={form.description || ''} onChange={(e) => set('description', e.target.value)} />
            </Field>

            <label className="flex items-center gap-2 mt-3 cursor-pointer">
              <input type="checkbox" checked={!!form.isVerified} onChange={(e) => set('isVerified', e.target.checked)} className="accent-success" />
              <span className="text-sm text-foreground">Verified merchant</span>
            </label>

            {saveErr && <p className="text-xs text-destructive mt-3">{saveErr}</p>}

            <div className="flex justify-end gap-2 mt-5">
              <Button onClick={() => setEditing(null)} variant="outline" className="rounded-xl border-border text-muted-foreground hover:bg-secondary">Cancel</Button>
              <Button onClick={save} disabled={saving} className="rounded-xl bg-primary text-primary-foreground font-semibold gap-1.5">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Save
              </Button>
            </div>
          </Card>
        </div>
      )}
    </SuperAdminLayout>
  );
}

const inp = 'w-full h-10 px-3 rounded-xl border border-input bg-background text-foreground text-sm focus:ring-1 focus:outline-none';
const selCls = 'h-9 px-3 rounded-xl border border-border bg-card text-sm text-foreground cursor-pointer';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1 mt-2">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
