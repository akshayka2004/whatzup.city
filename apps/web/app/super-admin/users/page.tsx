'use client';

import { useState, useEffect, useCallback } from 'react';
import { SuperAdminLayout } from '@/components/layouts/super-admin-layout';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Users, Search, RefreshCw, Pencil, X, Loader2, CheckCircle2, ChevronLeft, ChevronRight, ShieldAlert } from 'lucide-react';
import { apiService } from '@/lib/services/api-service';
import { PROFESSIONS, USER_ROLE_OPTIONS } from '@/lib/constants';

interface U {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  profession?: string | null;
  isActive?: boolean;
  createdAt?: string;
  tenantName?: string;
  businessName?: string;
}

const roleLabel = (r?: string) => USER_ROLE_OPTIONS.find((o) => o.value === r)?.label || r || '—';

export default function SuperAdminUsersPage() {
  const [rows, setRows] = useState<U[]>([]);
  const [meta, setMeta] = useState<any>({ total: 0, totalPages: 1, page: 1, hasPrev: false, hasNext: false });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState<U | null>(null);
  const [form, setForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [okMsg, setOkMsg] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 350);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => { setPage(1); }, [debounced]);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '25' });
    if (debounced) params.set('search', debounced);
    const res = await apiService.get<any>(`/v1/users/admin/all-registrations?${params}`);
    if (res.data && !res.error) {
      const list = res.data.data ?? res.data.items ?? (Array.isArray(res.data) ? res.data : []);
      setRows(
        list.map((u: any) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          phone: u.phone,
          role: u.role || u.rbacRole,
          profession: u.profession,
          isActive: u.isActive !== false,
          createdAt: u.createdAt,
          tenantName: u.tenant?.name,
          businessName: u.businessName || u.entity?.name,
        })),
      );
      setMeta(res.data.meta || { total: list.length, totalPages: 1, page: 1 });
    } else {
      setRows([]);
    }
    setLoading(false);
  }, [page, debounced]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  const openEdit = (u: U) => {
    setErr(''); setOkMsg('');
    setEditing(u);
    setForm({
      name: u.name || '', email: u.email || '', phone: u.phone || '',
      role: u.role || 'USER', profession: u.profession || '', isActive: u.isActive !== false, password: '',
    });
  };

  const save = async () => {
    if (!form || !editing) return;
    setSaving(true); setErr('');
    const payload: any = {
      name: form.name, email: form.email, phone: form.phone || null,
      role: form.role, profession: form.profession || null, isActive: form.isActive,
    };
    if (form.password) payload.password = form.password;
    const res = await apiService.patch<any>(`/v1/users/admin/${editing.id}`, payload);
    setSaving(false);
    if (res.error) { setErr(res.error); return; }
    setEditing(null); setForm(null);
    setOkMsg('User updated');
    setTimeout(() => setOkMsg(''), 2500);
    fetchRows();
  };

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Manage Users</h1>
            <p className="text-muted-foreground text-sm mt-1">Edit any user account across the platform.</p>
          </div>
          <Button onClick={fetchRows} variant="outline" size="sm" className="rounded-xl border-border text-muted-foreground hover:text-foreground gap-2">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>

        {okMsg && (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-success/10 border border-success/20 text-success text-sm font-semibold">
            <CheckCircle2 className="h-4 w-4" /> {okMsg}
          </div>
        )}

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email, phone…" className="pl-9 h-9 rounded-xl border-border bg-card text-sm text-foreground" />
        </div>

        <Card className="rounded-2xl border-border bg-card overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground text-sm gap-2"><Loader2 className="h-5 w-5 animate-spin" /> Loading…</div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground"><Users className="h-8 w-8 opacity-30" /><p className="text-sm">No users found</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/40">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground">User</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground">Role</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground">Profession</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground">Status</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-muted-foreground">Edit</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((u) => (
                    <tr key={u.id} className="border-b border-border last:border-0 hover:bg-secondary/20 transition-colors">
                      <td className="px-5 py-3">
                        <p className="font-semibold text-foreground">{u.name || '—'}</p>
                        {u.email && <p className="text-xs text-muted-foreground">{u.email}</p>}
                      </td>
                      <td className="px-5 py-3 text-xs text-muted-foreground">{roleLabel(u.role)}</td>
                      <td className="px-5 py-3 text-xs text-muted-foreground">{u.profession || '—'}</td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${u.isActive ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive'}`}>
                          {u.isActive ? 'Active' : 'Suspended'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Button onClick={() => openEdit(u)} variant="outline" size="sm" className="rounded-xl border-border text-foreground hover:bg-secondary gap-1.5 cursor-pointer">
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
              <Button onClick={() => setPage((p) => p + 1)} disabled={!meta.hasNext} variant="outline" size="sm" className="rounded-xl border-border text-muted-foreground"><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        )}
      </div>

      {editing && form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card className="w-full max-w-lg p-6 rounded-2xl border-border bg-card shadow-2xl relative max-h-[88vh] overflow-y-auto">
            <button onClick={() => setEditing(null)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer"><X className="h-5 w-5" /></button>
            <h3 className="text-lg font-bold text-foreground mb-4">Edit User</h3>

            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Name"><input className={inp} value={form.name} onChange={(e) => set('name', e.target.value)} /></Field>
              <Field label="Email"><input className={inp} value={form.email} onChange={(e) => set('email', e.target.value)} /></Field>
              <Field label="Phone"><input className={inp} value={form.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
              <Field label="Role">
                <select className={inp} value={form.role} onChange={(e) => set('role', e.target.value)}>
                  {USER_ROLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </Field>
              <Field label="Profession">
                <select className={inp} value={form.profession} onChange={(e) => set('profession', e.target.value)}>
                  <option value="">—</option>
                  {PROFESSIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </Field>
              <Field label="Reset Password (optional)">
                <input className={inp} type="text" value={form.password} onChange={(e) => set('password', e.target.value)} placeholder="Leave blank to keep" />
              </Field>
            </div>

            <label className="flex items-center gap-2 mt-3 cursor-pointer">
              <input type="checkbox" checked={!!form.isActive} onChange={(e) => set('isActive', e.target.checked)} className="accent-success" />
              <span className="text-sm text-foreground">Active account</span>
            </label>

            {form.role === 'SUPER_ADMIN' && (
              <p className="mt-3 text-[11px] text-warning flex items-center gap-1.5"><ShieldAlert className="h-3.5 w-3.5" /> Granting Super Admin gives full platform control.</p>
            )}
            {err && <p className="text-xs text-destructive mt-3">{err}</p>}

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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1 mt-2">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
