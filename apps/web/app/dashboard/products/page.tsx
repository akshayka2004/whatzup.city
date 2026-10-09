'use client';

import { useEffect, useMemo, useState } from 'react';
import { Box, LayoutGrid, MoreHorizontal, Pencil, Plus, Rows3, Trash2 } from 'lucide-react';
import { BusinessLayout } from '@/components/layouts/business-layout';
import { PageHeader } from '@/components/system/page-header';
import { DataTable, type Column } from '@/components/system/data-table';
import { FilterChip, ChipRow } from '@/components/system/filter-chip';
import { SearchInput } from '@/components/system/toolbar';
import { Modal } from '@/components/system/modal';
import { EmptyState } from '@/components/common/empty-state';
import { StatusPill } from '@/components/common/status-pill';
import { useConfirm } from '@/components/common/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/components/ui/sonner';
import { apiService } from '@/lib/services/api-service';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  isAvailable: boolean;
}

type Layout = 'table' | 'grid';
const LAYOUT_KEY = 'products:layout';
const label = 'mb-1.5 block text-sm font-medium';
const inr = (n: number) =>
  n > 0 ? `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : '—';

const toProduct = (p: any): Product => ({
  id: p.id,
  name: p.name || '',
  description: p.description || '',
  price: Number(p.price) || 0,
  isAvailable: p.isAvailable !== false,
});

export default function ProductsPage() {
  const { user } = useAuth();
  const confirm = useConfirm();
  const businessId = user?.businessId || user?.entity?.id;
  const tenantId = (user as { tenantId?: string } | null)?.tenantId;

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [layout, setLayout] = useState<Layout>('table');
  const [search, setSearch] = useState('');
  const [avail, setAvail] = useState<'all' | 'on' | 'off'>('all');

  const [editor, setEditor] = useState<{ id?: string } | null>(null);
  const [form, setForm] = useState({ name: '', description: '', price: '', isAvailable: true });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem(LAYOUT_KEY);
      if (v === 'grid' || v === 'table') setLayout(v);
    } catch {}
  }, []);
  const changeLayout = (v: Layout) => {
    setLayout(v);
    try {
      localStorage.setItem(LAYOUT_KEY, v);
    } catch {}
  };

  useEffect(() => {
    if (!businessId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    let alive = true;
    (async () => {
      // The endpoint pages at 20; owners need the whole catalog here.
      const tenant = tenantId ? `tenantId=${tenantId}&` : '';
      const all: any[] = [];
      for (let page = 1; page <= 25; page++) {
        const res = await apiService.get<any>(
          `/v1/products/business/${businessId}?${tenant}page=${page}`,
        );
        if (res.error || !res.data) break;
        const raw = res.data;
        const list: any[] = Array.isArray(raw) ? raw : (raw?.data ?? raw?.items ?? []);
        all.push(...list);
        const total = Number(raw?.meta?.total ?? 0);
        if (Array.isArray(raw) || list.length === 0 || all.length >= total) break;
      }
      if (alive) {
        setProducts(all.map(toProduct));
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [businessId, tenantId]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter(
      (p) =>
        (avail === 'all' || (avail === 'on') === p.isAvailable) &&
        (!q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)),
    );
  }, [products, search, avail]);

  const counts = useMemo(
    () => ({
      on: products.filter((p) => p.isAvailable).length,
      off: products.filter((p) => !p.isAvailable).length,
    }),
    [products],
  );

  const openAdd = () => {
    setForm({ name: '', description: '', price: '', isAvailable: true });
    setEditor({});
  };
  const openEdit = (p: Product) => {
    setForm({
      name: p.name,
      description: p.description,
      price: p.price ? String(p.price) : '',
      isAvailable: p.isAvailable,
    });
    setEditor({ id: p.id });
  };

  const save = async () => {
    if (!editor) return;
    if (!form.name.trim()) return toast.error('Give the product a name.');
    if (!businessId)
      return toast.error('No business found for your account. Refresh and try again.');
    const price = form.price ? Number(form.price) : 0;
    if (!(price >= 0)) return toast.error('Enter a valid price.');
    const body = {
      name: form.name.trim(),
      description: form.description.trim(),
      price,
      isAvailable: form.isAvailable,
    };
    setSaving(true);
    const res = editor.id
      ? await apiService.patch<any>(`/v1/products/${editor.id}`, body)
      : await apiService.post<any>('/v1/products', { ...body, businessId });
    setSaving(false);
    if (res.error) return toast.error(res.error);
    const saved = toProduct({ ...body, ...(res.data ?? {}), id: res.data?.id ?? editor.id });
    setProducts((list) =>
      editor.id ? list.map((p) => (p.id === editor.id ? saved : p)) : [saved, ...list],
    );
    toast.success(editor.id ? 'Product updated' : 'Product added');
    setEditor(null);
  };

  const toggle = async (p: Product) => {
    const next = !p.isAvailable;
    setProducts((list) => list.map((x) => (x.id === p.id ? { ...x, isAvailable: next } : x)));
    const res = await apiService.patch(`/v1/products/${p.id}`, { isAvailable: next });
    if (res.error) {
      setProducts((list) =>
        list.map((x) => (x.id === p.id ? { ...x, isAvailable: p.isAvailable } : x)),
      );
      toast.error(res.error);
    }
  };

  const remove = async (p: Product) => {
    if (
      !(await confirm({
        title: `Delete “${p.name}”?`,
        description: 'It disappears from your public menu right away.',
        confirmLabel: 'Delete',
        tone: 'danger',
      }))
    )
      return;
    const res = await apiService.delete(`/v1/products/${p.id}`);
    if (res.error) return toast.error(res.error);
    setProducts((list) => list.filter((x) => x.id !== p.id));
    toast.success('Product deleted');
  };

  const RowMenu = ({ p }: { p: Product }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Actions for ${p.name}`}
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onSelect={() => openEdit(p)}>
          <Pencil /> Edit
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onSelect={() => remove(p)}>
          <Trash2 /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const AvailSwitch = ({ p }: { p: Product }) => (
    <span onClick={(e) => e.stopPropagation()} className="inline-flex">
      <Switch
        checked={p.isAvailable}
        onCheckedChange={() => toggle(p)}
        aria-label={`${p.name} available`}
      />
    </span>
  );

  const columns: Column<Product>[] = [
    {
      key: 'name',
      header: 'Product',
      sortable: true,
      value: (p) => p.name,
      cell: (p) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{p.name}</p>
          {p.description && (
            <p className="line-clamp-1 text-caption text-muted-foreground">{p.description}</p>
          )}
        </div>
      ),
    },
    {
      key: 'price',
      header: 'Price',
      align: 'right',
      sortable: true,
      value: (p) => p.price,
      cell: (p) => <span className="tabular-nums">{inr(p.price)}</span>,
    },
    { key: 'avail', header: 'Available', align: 'center', cell: (p) => <AvailSwitch p={p} /> },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      align: 'right',
      cell: (p) => <RowMenu p={p} />,
    },
  ];

  return (
    <BusinessLayout>
      <PageHeader
        title="Products"
        description="Items and prices shown on your public profile. Switch one off when it’s sold out."
        actions={
          <Button onClick={openAdd}>
            <Plus /> Add product
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <ChipRow label="Availability">
          <FilterChip
            selected={avail === 'all'}
            count={products.length || undefined}
            onClick={() => setAvail('all')}
          >
            All
          </FilterChip>
          <FilterChip
            selected={avail === 'on'}
            count={counts.on || undefined}
            onClick={() => setAvail('on')}
          >
            Available
          </FilterChip>
          <FilterChip
            selected={avail === 'off'}
            count={counts.off || undefined}
            onClick={() => setAvail('off')}
          >
            Sold out
          </FilterChip>
        </ChipRow>
        <div className="flex items-center gap-2">
          <SearchInput value={search} onChange={setSearch} placeholder="Search products" />
          <div
            role="radiogroup"
            aria-label="Layout"
            className="inline-flex shrink-0 rounded-full border border-border bg-card p-0.5"
          >
            {(
              [
                ['table', 'Table', Rows3],
                ['grid', 'Grid', LayoutGrid],
              ] as const
            ).map(([k, l, Icon]) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={layout === k}
                aria-label={l}
                onClick={() => changeLayout(k)}
                className={cn(
                  'flex size-10 items-center justify-center rounded-full transition-colors',
                  layout === k
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="size-4" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {layout === 'table' || loading ? (
        <DataTable
          caption="Products"
          columns={columns}
          rows={visible}
          rowKey={(p) => p.id}
          loading={loading}
          onRowClick={openEdit}
          pageSize={25}
          empty={{
            icon: Box,
            title: products.length ? 'No matching products' : 'No products yet',
            description: products.length
              ? 'Try another search or filter.'
              : 'Add your first product to build your catalog.',
            action: products.length ? undefined : { label: 'Add product', onClick: openAdd },
          }}
          mobileCard={(p) => (
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{p.name}</p>
                <p className="text-caption tabular-nums text-muted-foreground">{inr(p.price)}</p>
              </div>
              <AvailSwitch p={p} />
            </div>
          )}
        />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={Box}
          title={products.length ? 'No matching products' : 'No products yet'}
          action={products.length ? undefined : { label: 'Add product', onClick: openAdd }}
        />
      ) : (
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {visible.map((p) => (
            <li key={p.id}>
              <article
                className={cn(
                  'flex h-full flex-col rounded-card border border-border bg-card p-4 shadow-e1',
                  !p.isAvailable && 'opacity-70',
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(p)}
                    className="min-w-0 text-left font-semibold leading-snug hover:underline"
                  >
                    <span className="line-clamp-2 break-words">{p.name}</span>
                  </button>
                  <RowMenu p={p} />
                </div>
                {p.description && (
                  <p className="mt-1 line-clamp-2 text-caption text-muted-foreground">
                    {p.description}
                  </p>
                )}
                <div className="mt-auto flex items-center justify-between gap-2 pt-4">
                  <span className="text-heading font-semibold tabular-nums">{inr(p.price)}</span>
                  {p.isAvailable ? (
                    <AvailSwitch p={p} />
                  ) : (
                    <StatusPill tone="neutral" label="Sold out" />
                  )}
                </div>
                {!p.isAvailable && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="mt-2 self-start"
                    onClick={() => toggle(p)}
                  >
                    Mark available
                  </Button>
                )}
              </article>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={!!editor}
        onOpenChange={(o) => !o && setEditor(null)}
        title={editor?.id ? 'Edit product' : 'Add product'}
        footer={
          <>
            <Button variant="outline" onClick={() => setEditor(null)}>
              Cancel
            </Button>
            <Button loading={saving} onClick={save}>
              {editor?.id ? 'Save changes' : 'Add product'}
            </Button>
          </>
        }
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <div>
            <label htmlFor="p-name" className={label}>
              Name
            </label>
            <Input
              id="p-name"
              value={form.name}
              maxLength={255}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Chicken biryani"
            />
          </div>
          <div>
            <label htmlFor="p-price" className={label}>
              Price (₹) <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <Input
              id="p-price"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              placeholder="220"
            />
          </div>
          <div>
            <label htmlFor="p-desc" className={label}>
              Description <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <Textarea
              id="p-desc"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Served with raita and pickle"
              className="h-20 resize-none"
            />
          </div>
          <label className="flex items-center justify-between gap-3 rounded-control border border-border p-3">
            <span className="text-sm font-medium">Available now</span>
            <Switch
              checked={form.isAvailable}
              onCheckedChange={(v) => setForm((f) => ({ ...f, isAvailable: v }))}
            />
          </label>
          <button type="submit" hidden />
        </form>
      </Modal>
    </BusinessLayout>
  );
}
