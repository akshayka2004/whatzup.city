'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BadgeCheck,
  Building2,
  MoreHorizontal,
  Pencil,
  QrCode,
  RefreshCw,
  Star,
  Store,
  Trash2,
  X,
} from 'lucide-react';
import { SuperAdminLayout } from '@/components/layouts/super-admin-layout';
import { PageHeader } from '@/components/system/page-header';
import { DataTable, type Column } from '@/components/system/data-table';
import { FilterChip, ChipRow } from '@/components/system/filter-chip';
import { SearchInput } from '@/components/system/toolbar';
import { Modal } from '@/components/system/modal';
import { StatusPill, statusTone, humanizeStatus } from '@/components/common/status-pill';
import { useConfirm } from '@/components/common/confirm-dialog';
import { BusinessQrCard } from '@/components/business/qr-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/components/ui/sonner';
import { apiService } from '@/lib/services/api-service';
import { KERALA_CITIES } from '@/lib/constants';

const STATUS_OPTIONS = ['DRAFT', 'PENDING_VERIFICATION', 'APPROVED', 'REJECTED', 'SUSPENDED'];
const SORTS = [
  { value: 'createdAt:desc', label: 'Newest first' },
  { value: 'name:asc', label: 'Name A–Z' },
  { value: 'city:asc', label: 'City' },
  { value: 'rating:desc', label: 'Top rated' },
];
const PAGE_SIZE = 25;
const ANY = '__any';

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
  averageRating?: number | string | null;
  _count?: { offers?: number; events?: number };
  totalBillAmount?: number;
  brand?: { id: string; name: string } | null;
  outletLabel?: string | null;
  isBrandHq?: boolean;
}

const label = 'mb-1.5 block text-sm font-medium';

function FilterSelect({
  value,
  onChange,
  placeholder,
  options,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
  className?: string;
}) {
  return (
    <Select value={value || ANY} onValueChange={(v) => onChange(v === ANY ? '' : v)}>
      <SelectTrigger
        className={className ?? 'h-11 w-full rounded-full sm:w-44'}
        aria-label={placeholder}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ANY}>{placeholder}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default function SuperAdminBusinessesPage() {
  const confirm = useConfirm();
  const [rows, setRows] = useState<Biz[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

  const [catFilter, setCatFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [verifiedFilter, setVerifiedFilter] = useState('');
  const [halalFilter, setHalalFilter] = useState('');
  const [brandId, setBrandId] = useState('');
  const [brandName, setBrandName] = useState('');
  const [urlReady, setUrlReady] = useState(false);
  const [sort, setSort] = useState(SORTS[0].value);

  const [editing, setEditing] = useState<Biz | null>(null);
  const [form, setForm] = useState<Biz | null>(null);
  const [saving, setSaving] = useState(false);
  const [qrBiz, setQrBiz] = useState<Biz | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  // Seed from ?q= (global search) and ?brandId= (brand detail "view outlets").
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const q = sp.get('q');
    if (q) setSearch(q);
    const b = sp.get('brandId');
    if (b) setBrandId(b);
    setUrlReady(true);
  }, []);
  useEffect(
    () => setPage(1),
    [debounced, catFilter, cityFilter, statusFilter, verifiedFilter, halalFilter, brandId, sort],
  );

  useEffect(() => {
    if (!brandId) {
      setBrandName('');
      return;
    }
    let cancelled = false;
    apiService.get<any>(`/v1/admin/brands/${brandId}`).then((res) => {
      const d = res.data?.data ?? res.data;
      if (!cancelled) setBrandName(d?.brand?.name || '');
    });
    return () => {
      cancelled = true;
    };
  }, [brandId]);

  const clearBrandFilter = () => {
    setBrandId('');
    const sp = new URLSearchParams(window.location.search);
    sp.delete('brandId');
    const qs = sp.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`);
  };

  useEffect(() => {
    apiService.get<any>('/v1/categories').then((res) => {
      const flat: { id: string; name: string }[] = [];
      const walk = (list: any[]) =>
        list?.forEach((c) => {
          flat.push({ id: c.id, name: c.name });
          if (c.children) walk(c.children);
        });
      if (Array.isArray(res.data)) walk(res.data);
      setCategories(flat);
    });
  }, []);

  const fetchRows = useCallback(async () => {
    if (!urlReady) return;
    setLoading(true);
    const [sortBy, sortOrder] = sort.split(':');
    const params = new URLSearchParams({
      page: String(page),
      limit: String(PAGE_SIZE),
      sortBy,
      sortOrder,
    });
    if (debounced) params.set('search', debounced);
    if (catFilter) params.set('categoryId', catFilter);
    if (cityFilter) params.set('city', cityFilter);
    if (statusFilter) params.set('status', statusFilter);
    if (verifiedFilter) params.set('isVerified', verifiedFilter);
    if (halalFilter) params.set('halalStatus', halalFilter);
    if (brandId) params.set('brandId', brandId);
    const res = await apiService.get<any>(`/v1/businesses/admin/all?${params}`);
    if (res.data && !res.error) {
      setRows(res.data.data || []);
      setTotal(Number(res.data.meta?.total ?? 0));
    } else {
      setRows([]);
      setTotal(0);
      if (res.error) toast.error(res.error);
    }
    setLoading(false);
  }, [
    urlReady,
    page,
    debounced,
    catFilter,
    cityFilter,
    statusFilter,
    verifiedFilter,
    halalFilter,
    brandId,
    sort,
  ]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const openEdit = (b: Biz) => {
    setEditing(b);
    setForm({ ...b, categoryId: b.categoryId || b.category?.id });
  };
  const set = (k: keyof Biz, v: any) => setForm((f) => (f ? { ...f, [k]: v } : f));

  const save = async () => {
    if (!form || !editing) return;
    setSaving(true);
    const res = await apiService.patch<any>(`/v1/businesses/admin/${editing.id}`, {
      name: form.name,
      ownerName: form.ownerName,
      description: form.description,
      categoryId: form.categoryId,
      phone: form.phone,
      email: form.email,
      website: form.website,
      address: form.address,
      city: form.city,
      zipCode: form.zipCode,
      status: form.status,
      isVerified: form.isVerified,
      halalStatus: form.halalStatus || null,
      logo: form.logo || null,
    });
    setSaving(false);
    if (res.error) return toast.error(res.error);
    toast.success('Business updated');
    setEditing(null);
    setForm(null);
    fetchRows();
  };

  const remove = async (b: Biz) => {
    const ok = await confirm({
      title: `Delete ${b.name}?`,
      description:
        'It disappears from search and discovery. This is a soft delete and can be recovered from the database.',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) return;
    const res = await apiService.delete<any>(`/v1/businesses/admin/${b.id}`);
    if (res.error) return toast.error(res.error);
    setRows((prev) => prev.filter((x) => x.id !== b.id));
    setTotal((t) => Math.max(0, t - 1));
    toast.success(`${b.name} deleted`);
  };

  const RowMenu = ({ b }: { b: Biz }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Actions for ${b.name}`}
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onSelect={() => openEdit(b)}>
          <Pencil /> Edit
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setQrBiz(b)}>
          <QrCode /> QR code
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/business/${b.id}`} target="_blank">
            <Building2 /> Public page
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={() => remove(b)}>
          <Trash2 /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const columns: Column<Biz>[] = [
    {
      key: 'name',
      header: 'Business',
      cell: (b) => (
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 font-medium">
            <span className="truncate">{b.name}</span>
            {b.isVerified && (
              <BadgeCheck
                className="size-4 shrink-0 text-success-soft-foreground"
                aria-label="Verified"
              />
            )}
          </p>
          <p className="truncate text-caption text-muted-foreground">{b.email || b.phone || '—'}</p>
          {b.brand && (
            <Link
              href={`/super-admin/brands/${b.brand.id}`}
              onClick={(e) => e.stopPropagation()}
              className="mt-1 inline-flex max-w-[15rem] items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-caption font-semibold text-brand-soft-foreground hover:underline"
            >
              <Store className="size-3 shrink-0" aria-hidden />
              <span className="truncate">
                {b.brand.name}
                {b.outletLabel ? ` · ${b.outletLabel}` : ''}
                {b.isBrandHq ? ' · HQ' : ''}
              </span>
            </Link>
          )}
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      cell: (b) => b.category?.name || '—',
      hideOnMobile: true,
    },
    { key: 'city', header: 'City', cell: (b) => b.city || '—', hideOnMobile: true },
    {
      key: 'rating',
      header: 'Rating',
      align: 'right',
      value: (b) => Number(b.averageRating) || 0,
      cell: (b) =>
        Number(b.averageRating) > 0 ? (
          <span className="inline-flex items-center gap-1">
            <Star className="size-3.5 fill-current text-warning-soft-foreground" aria-hidden />
            {Number(b.averageRating).toFixed(1)}
          </span>
        ) : (
          '—'
        ),
      hideOnMobile: true,
    },
    {
      key: 'live',
      header: 'Offers · events',
      align: 'right',
      cell: (b) => `${b._count?.offers ?? 0} · ${b._count?.events ?? 0}`,
      hideOnMobile: true,
    },
    {
      key: 'billed',
      header: 'Verified spend',
      align: 'right',
      value: (b) => Number(b.totalBillAmount || 0),
      cell: (b) => `₹${Number(b.totalBillAmount || 0).toLocaleString('en-IN')}`,
      hideOnMobile: true,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (b) => (
        <StatusPill tone={statusTone(b.status)} label={humanizeStatus(b.status || '—')} />
      ),
    },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      align: 'right',
      cell: (b) => <RowMenu b={b} />,
    },
  ];

  const filtersActive = !!(catFilter || cityFilter || verifiedFilter || halalFilter);

  return (
    <SuperAdminLayout>
      <PageHeader
        title="Businesses"
        description="Every listing on the platform. Select a row to edit."
        actions={
          <Button variant="outline" onClick={fetchRows} disabled={loading}>
            <RefreshCw className={loading ? 'animate-spin' : undefined} /> Refresh
          </Button>
        }
      />

      {brandId && (
        <div className="mb-4 inline-flex max-w-full items-center gap-2 rounded-full bg-brand-soft py-1 pl-3 pr-1 text-sm text-brand-soft-foreground">
          <Store className="size-4 shrink-0" aria-hidden />
          <span className="truncate">
            Outlets of{' '}
            <Link href={`/super-admin/brands/${brandId}`} className="font-semibold hover:underline">
              {brandName || 'this brand'}
            </Link>
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={clearBrandFilter}
            aria-label="Clear brand filter"
            className="rounded-full"
          >
            <X />
          </Button>
        </div>
      )}

      <ChipRow label="Status" className="mb-3">
        {['', ...STATUS_OPTIONS].map((s) => (
          <FilterChip
            key={s || 'all'}
            selected={statusFilter === s}
            onClick={() => setStatusFilter(s)}
          >
            {s ? humanizeStatus(s) : 'All'}
          </FilterChip>
        ))}
      </ChipRow>

      <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search name, email, phone, city"
        />
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <FilterSelect
            value={catFilter}
            onChange={setCatFilter}
            placeholder="All categories"
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
          />
          <FilterSelect
            value={cityFilter}
            onChange={setCityFilter}
            placeholder="All cities"
            options={KERALA_CITIES.map((c) => ({ value: c, label: c }))}
          />
          <FilterSelect
            value={verifiedFilter}
            onChange={setVerifiedFilter}
            placeholder="Any verification"
            options={[
              { value: 'true', label: 'Verified' },
              { value: 'false', label: 'Unverified' },
            ]}
          />
          <FilterSelect
            value={halalFilter}
            onChange={setHalalFilter}
            placeholder="Any halal"
            options={[
              { value: 'HALAL', label: 'Halal' },
              { value: 'NON_HALAL', label: 'Non-halal' },
            ]}
          />
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="h-11 w-full rounded-full sm:w-40" aria-label="Sort">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORTS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {filtersActive && (
            <Button
              variant="ghost"
              onClick={() => {
                setCatFilter('');
                setCityFilter('');
                setVerifiedFilter('');
                setHalalFilter('');
              }}
            >
              Clear filters
            </Button>
          )}
        </div>
      </div>

      <DataTable
        caption="Businesses"
        columns={columns}
        rows={rows}
        rowKey={(b) => b.id}
        loading={loading}
        onRowClick={openEdit}
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        onPageChange={setPage}
        empty={{
          icon: Building2,
          title: 'No businesses match',
          description: 'Try clearing a filter or the search.',
        }}
        mobileCard={(b) => (
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-medium">{b.name}</p>
              <p className="truncate text-caption text-muted-foreground">
                {[b.category?.name, b.city].filter(Boolean).join(' · ') || '—'}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <StatusPill tone={statusTone(b.status)} label={humanizeStatus(b.status || '—')} />
              <RowMenu b={b} />
            </div>
          </div>
        )}
      />

      <Modal
        open={!!editing && !!form}
        onOpenChange={(o) => !o && setEditing(null)}
        title="Edit business"
        description={editing?.name}
        size="xl"
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
            className="grid gap-4 md:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            {(
              [
                ['name', 'Business name'],
                ['ownerName', 'Owner name'],
                ['phone', 'Phone'],
                ['email', 'Email'],
                ['website', 'Website'],
                ['zipCode', 'Postal code'],
                ['logo', 'Logo URL'],
              ] as const
            ).map(([k, l]) => (
              <div key={k}>
                <label htmlFor={`b-${k}`} className={label}>
                  {l}
                </label>
                <Input
                  id={`b-${k}`}
                  value={(form[k] as string) || ''}
                  onChange={(e) => set(k, e.target.value)}
                />
              </div>
            ))}
            <div>
              <span className={label}>Category</span>
              <FilterSelect
                className="w-full"
                value={form.categoryId || ''}
                onChange={(v) => set('categoryId', v)}
                placeholder="—"
                options={categories.map((c) => ({ value: c.id, label: c.name }))}
              />
            </div>
            <div>
              <span className={label}>City</span>
              <FilterSelect
                className="w-full"
                value={form.city || ''}
                onChange={(v) => set('city', v)}
                placeholder="—"
                options={KERALA_CITIES.map((c) => ({ value: c, label: c }))}
              />
            </div>
            <div>
              <span className={label}>Status</span>
              <Select value={form.status || 'DRAFT'} onValueChange={(v) => set('status', v)}>
                <SelectTrigger className="w-full" aria-label="Status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {humanizeStatus(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <span className={label}>Halal status (food)</span>
              <FilterSelect
                className="w-full"
                value={form.halalStatus || ''}
                onChange={(v) => set('halalStatus', v)}
                placeholder="—"
                options={[
                  { value: 'HALAL', label: 'Halal' },
                  { value: 'NON_HALAL', label: 'Non-halal' },
                ]}
              />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="b-address" className={label}>
                Address
              </label>
              <Input
                id="b-address"
                value={form.address || ''}
                onChange={(e) => set('address', e.target.value)}
              />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="b-desc" className={label}>
                Description
              </label>
              <Textarea
                id="b-desc"
                value={form.description || ''}
                onChange={(e) => set('description', e.target.value)}
                className="min-h-24"
              />
            </div>
            <label className="flex items-center justify-between gap-3 rounded-control border border-border p-3 md:col-span-2">
              <span className="text-sm font-medium">Verified merchant</span>
              <Switch checked={!!form.isVerified} onCheckedChange={(v) => set('isVerified', v)} />
            </label>
            <button type="submit" hidden />
          </form>
        )}
      </Modal>

      <Modal
        open={!!qrBiz}
        onOpenChange={(o) => !o && setQrBiz(null)}
        title={qrBiz ? `${qrBiz.name} — QR code` : 'QR code'}
        description="Preview, print or download a replacement for the business."
      >
        {qrBiz && (
          <BusinessQrCard
            businessId={qrBiz.id}
            businessName={qrBiz.name}
            category={qrBiz.category?.name}
            city={qrBiz.city}
          />
        )}
      </Modal>
    </SuperAdminLayout>
  );
}
