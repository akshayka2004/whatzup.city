'use client';

import { useState, useEffect, useCallback } from 'react';
import { SuperAdminLayout } from '@/components/layouts/super-admin-layout';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Users, Search, ChevronLeft, ChevronRight, RefreshCw,
  ArrowUp, ArrowDown, ArrowUpDown, ShieldCheck, ShieldX,
} from 'lucide-react';
import { apiService } from '@/lib/services/api-service';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface UserRow {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  isActive: boolean;
  emailVerified: boolean;
  referralCode?: string;
  createdAt: string;
  lastLoginAt?: string | null;
  tenant?: { name?: string; slug?: string } | null;
  business?: { name?: string; status?: string } | null;
}

const ROLE_OPTIONS = [
  'ALL', 'USER', 'BUSINESS_ADMIN', 'BUSINESS_OWNER', 'NGO_ADMIN', 'COMMUNITY_ADMIN',
  'NEWS_FORUM_ADMIN', 'GOVERNMENT_ADMIN', 'INFLUENCER', 'PROFESSIONAL',
  'EVENT_ORGANIZER', 'MASTER_ADMIN', 'SUPER_ADMIN',
];

const roleColor = (role: string): string => {
  if (role.includes('SUPER') || role.includes('MASTER')) return 'bg-rose-500/15 text-rose-300';
  if (role.includes('GOVERNMENT')) return 'bg-amber-500/15 text-amber-300';
  if (role.includes('BUSINESS')) return 'bg-cyan-500/15 text-cyan-300';
  if (role.includes('NGO') || role.includes('COMMUNITY') || role.includes('NEWS')) return 'bg-emerald-500/15 text-emerald-300';
  if (role === 'USER') return 'bg-slate-500/15 text-slate-300';
  return 'bg-violet-500/15 text-violet-300';
};

type SortKey = 'name' | 'email' | 'role' | 'createdAt' | 'lastLoginAt' | 'isActive';

export default function SuperAdminUsersPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<SortKey>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<UserRow[]>([]);
  const [meta, setMeta] = useState<any>({ total: 0, totalPages: 1, page: 1 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(1); }, [debouncedSearch, roleFilter, sortBy, sortOrder]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: '25',
      sortBy,
      sortOrder,
    });
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (roleFilter !== 'ALL') params.set('role', roleFilter);
    const res = await apiService.get<any>(`/v1/users/admin/all-registrations?${params}`);
    if (res.data && !res.error) {
      setRows(res.data.data || []);
      setMeta(res.data.meta || { total: 0, totalPages: 1, page: 1 });
    } else {
      setRows([]);
    }
    setLoading(false);
  }, [page, debouncedSearch, roleFilter, sortBy, sortOrder]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortOrder('asc');
    }
  };

  const SortHeader = ({ label, sortKey, align = 'left' }: { label: string; sortKey: SortKey; align?: 'left' | 'right' }) => (
    <th className={cn('px-5 py-3 text-xs font-semibold text-muted-foreground select-none', align === 'right' ? 'text-right' : 'text-left')}>
      <button
        onClick={() => toggleSort(sortKey)}
        className={cn('inline-flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer', align === 'right' && 'flex-row-reverse')}
      >
        {label}
        {sortBy === sortKey ? (
          sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-40" />
        )}
      </button>
    </th>
  );

  const fmtDate = (d?: string | null) =>
    d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-foreground tracking-tight">Users</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              All platform users — search, filter by role, and sort by any column.
            </p>
          </div>
          <Button
            onClick={fetchData}
            variant="outline"
            size="sm"
            className="rounded-xl border-border text-muted-foreground hover:text-foreground gap-2"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
            Refresh
          </Button>
        </div>

        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, phone…"
              className="pl-9 h-9 rounded-xl border-border bg-card text-sm text-foreground"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-52 h-9 rounded-xl border-border bg-card text-sm">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              {ROLE_OPTIONS.map((r) => (
                <SelectItem key={r} value={r}>{r === 'ALL' ? 'All roles' : r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center px-3 h-9 rounded-xl border border-border bg-card text-xs text-muted-foreground">
            {meta.total} total
          </div>
        </div>

        {/* Table */}
        <Card className="rounded-2xl border-border bg-card overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground text-sm gap-2">
              <RefreshCw className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
              <Users className="h-8 w-8 opacity-30" />
              <p className="text-sm">No users found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/40">
                    <SortHeader label="Name" sortKey="name" />
                    <SortHeader label="Email" sortKey="email" />
                    <SortHeader label="Role" sortKey="role" />
                    <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground">Tenant / Business</th>
                    <SortHeader label="Joined" sortKey="createdAt" />
                    <SortHeader label="Last Login" sortKey="lastLoginAt" />
                    <SortHeader label="Status" sortKey="isActive" align="right" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((u) => (
                    <tr key={u.id} className="border-b border-border last:border-0 hover:bg-secondary/20 transition-colors">
                      <td className="px-5 py-3">
                        <p className="font-semibold text-foreground">{u.name || '—'}</p>
                        {u.phone && <p className="text-xs text-muted-foreground">{u.phone}</p>}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          {u.email}
                          {u.emailVerified && <ShieldCheck className="h-3 w-3 text-emerald-400" />}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold', roleColor(u.role))}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">
                        <p className="text-foreground text-xs font-medium">{u.business?.name || u.tenant?.name || '—'}</p>
                        {u.business?.status && (
                          <p className="text-[10px] text-muted-foreground">{u.business.status}</p>
                        )}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">{fmtDate(u.createdAt)}</td>
                      <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">{fmtDate(u.lastLoginAt)}</td>
                      <td className="px-5 py-3 text-right">
                        {u.isActive ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                            <ShieldCheck className="h-3 w-3" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-bold">
                            <ShieldX className="h-3 w-3" /> Inactive
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Pagination */}
        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Page {meta.page} of {meta.totalPages} · {meta.total} total
            </p>
            <div className="flex gap-2">
              <Button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={!meta.hasPrev}
                variant="outline"
                size="sm"
                className="rounded-xl border-border text-muted-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                disabled={!meta.hasNext}
                variant="outline"
                size="sm"
                className="rounded-xl border-border text-muted-foreground"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </SuperAdminLayout>
  );
}
