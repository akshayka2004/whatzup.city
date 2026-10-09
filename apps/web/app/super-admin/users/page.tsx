'use client';

import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, ShieldAlert, Users } from 'lucide-react';
import { SuperAdminLayout } from '@/components/layouts/super-admin-layout';
import { PageHeader } from '@/components/system/page-header';
import { DataTable, type Column } from '@/components/system/data-table';
import { SearchInput } from '@/components/system/toolbar';
import { Modal } from '@/components/system/modal';
import { StatusPill } from '@/components/common/status-pill';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/components/ui/sonner';
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

type Form = {
  name: string;
  email: string;
  phone: string;
  role: string;
  profession: string;
  isActive: boolean;
  password: string;
};

const PAGE_SIZE = 25;
const roleLabel = (r?: string) => USER_ROLE_OPTIONS.find((o) => o.value === r)?.label || r || '—';
const label = 'mb-1.5 block text-sm font-medium';
const fmt = (d?: string) =>
  d
    ? new Date(d).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'Asia/Kolkata',
      })
    : '—';

export default function SuperAdminUsersPage() {
  const [rows, setRows] = useState<U[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState<U | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => setPage(1), [debounced]);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
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
      setTotal(Number(res.data.meta?.total ?? list.length));
    } else {
      setRows([]);
      setTotal(0);
      if (res.error) toast.error(res.error);
    }
    setLoading(false);
  }, [page, debounced]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const openEdit = (u: U) => {
    setEditing(u);
    setForm({
      name: u.name || '',
      email: u.email || '',
      phone: u.phone || '',
      role: u.role || 'USER',
      profession: u.profession || '',
      isActive: u.isActive !== false,
      password: '',
    });
  };
  const set = <K extends keyof Form>(k: K, v: Form[K]) =>
    setForm((f) => (f ? { ...f, [k]: v } : f));

  const save = async () => {
    if (!form || !editing) return;
    setSaving(true);
    const payload: Record<string, unknown> = {
      name: form.name,
      email: form.email,
      phone: form.phone || null,
      role: form.role,
      profession: form.profession || null,
      isActive: form.isActive,
    };
    if (form.password) payload.password = form.password;
    const res = await apiService.patch<any>(`/v1/users/admin/${editing.id}`, payload);
    setSaving(false);
    if (res.error) return toast.error(res.error);
    toast.success('User updated');
    setEditing(null);
    setForm(null);
    fetchRows();
  };

  const columns: Column<U>[] = [
    {
      key: 'name',
      header: 'User',
      cell: (u) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{u.name || '—'}</p>
          <p className="truncate text-caption text-muted-foreground">{u.email || u.phone || '—'}</p>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      cell: (u) => (
        <StatusPill
          tone={u.role === 'SUPER_ADMIN' || u.role === 'MASTER_ADMIN' ? 'primary' : 'neutral'}
          label={roleLabel(u.role)}
        />
      ),
    },
    { key: 'business', header: 'Business', cell: (u) => u.businessName || '—', hideOnMobile: true },
    {
      key: 'profession',
      header: 'Profession',
      cell: (u) => u.profession || '—',
      hideOnMobile: true,
    },
    { key: 'joined', header: 'Joined', cell: (u) => fmt(u.createdAt), hideOnMobile: true },
    {
      key: 'status',
      header: 'Status',
      cell: (u) => (
        <StatusPill
          tone={u.isActive ? 'success' : 'danger'}
          label={u.isActive ? 'Active' : 'Suspended'}
        />
      ),
    },
  ];

  return (
    <SuperAdminLayout>
      <PageHeader
        title="Users"
        description="Every account on the platform. Select a row to edit."
        actions={
          <Button variant="outline" onClick={fetchRows} disabled={loading}>
            <RefreshCw className={loading ? 'animate-spin' : undefined} /> Refresh
          </Button>
        }
      />
      <div className="mb-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search name, email or phone"
        />
      </div>

      <DataTable
        caption="Users"
        columns={columns}
        rows={rows}
        rowKey={(u) => u.id}
        loading={loading}
        onRowClick={openEdit}
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        onPageChange={setPage}
        empty={{ icon: Users, title: debounced ? 'No matching users' : 'No users yet' }}
        mobileCard={(u) => (
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-medium">{u.name || '—'}</p>
              <p className="truncate text-caption text-muted-foreground">
                {roleLabel(u.role)} · {u.email || u.phone || '—'}
              </p>
            </div>
            <StatusPill
              tone={u.isActive ? 'success' : 'danger'}
              label={u.isActive ? 'Active' : 'Suspended'}
            />
          </div>
        )}
      />

      <Modal
        open={!!editing && !!form}
        onOpenChange={(o) => !o && setEditing(null)}
        title="Edit user"
        description={editing?.email}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button loading={saving} onClick={save}>
              Save
            </Button>
          </>
        }
      >
        {form && (
          <form
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <div>
              <label htmlFor="u-name" className={label}>
                Name
              </label>
              <Input id="u-name" value={form.name} onChange={(e) => set('name', e.target.value)} />
            </div>
            <div>
              <label htmlFor="u-email" className={label}>
                Email
              </label>
              <Input
                id="u-email"
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="u-phone" className={label}>
                Phone
              </label>
              <Input
                id="u-phone"
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="u-role" className={label}>
                Role
              </label>
              <Select value={form.role} onValueChange={(v) => set('role', v)}>
                <SelectTrigger id="u-role" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {USER_ROLE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label htmlFor="u-prof" className={label}>
                Profession
              </label>
              <Select
                value={form.profession || 'none'}
                onValueChange={(v) => set('profession', v === 'none' ? '' : v)}
              >
                <SelectTrigger id="u-prof" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {PROFESSIONS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label htmlFor="u-pass" className={label}>
                Reset password <span className="font-normal text-muted-foreground">(optional)</span>
              </label>
              <Input
                id="u-pass"
                type="password"
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => set('password', e.target.value)}
                placeholder="Leave blank to keep"
              />
            </div>
            <label className="flex items-center justify-between gap-3 rounded-control border border-border p-3 sm:col-span-2">
              <span className="text-sm font-medium">Active account</span>
              <Switch checked={form.isActive} onCheckedChange={(v) => set('isActive', v)} />
            </label>
            {form.role === 'SUPER_ADMIN' && (
              <p
                className="flex items-center gap-1.5 text-caption text-warning-soft-foreground sm:col-span-2"
                role="alert"
              >
                <ShieldAlert className="size-4" aria-hidden /> Granting Super Admin gives full
                platform control.
              </p>
            )}
            <button type="submit" hidden />
          </form>
        )}
      </Modal>
    </SuperAdminLayout>
  );
}
