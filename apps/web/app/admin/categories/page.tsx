'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArchiveRestore,
  Archive,
  ArrowDown,
  ArrowUp,
  CornerDownRight,
  Folder,
  GitMerge,
  History,
  Loader2,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { AdminLayout } from '@/components/layouts/admin-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/components/ui/sonner';
import { useAuth } from '@/hooks/use-auth';
import { useConfirm } from '@/components/common/confirm-dialog';
import { apiService } from '@/lib/services/api-service';
import { categoryIconByName } from '@/lib/category-icons';
import { cn } from '@/lib/utils';
import { CATEGORY_TEMPLATES, type CategoryTemplateKey } from '@saas/types';
import { CategoryForm } from './_components/category-form';
import { ImpactDialog } from './_components/impact-dialog';
import { HistoryDialog } from './_components/history-dialog';
import type { AdminCategory, CategoryAction } from './_components/types';

type Dialog =
  | { kind: 'form'; category: AdminCategory | null }
  | { kind: 'impact'; action: CategoryAction; category: AdminCategory }
  | { kind: 'history'; category: AdminCategory };

function Chip({
  tone,
  children,
}: {
  tone: 'muted' | 'warning' | 'info';
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        tone === 'muted' && 'bg-secondary text-muted-foreground',
        tone === 'warning' && 'bg-warning-soft text-warning-soft-foreground',
        tone === 'info' && 'bg-info-soft text-info-soft-foreground',
      )}
    >
      {children}
    </span>
  );
}

export default function AdminCategoriesPage() {
  const { user } = useAuth();
  // Master admins can look; only a super admin may change the list.
  const canWrite = user?.rbacRole === 'SUPER_ADMIN' || user?.role === 'super-admin';
  const confirm = useConfirm();

  const [rows, setRows] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await apiService.get<any>('/v1/categories/admin/list');
    setLoading(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setError(null);
    const body = res.data;
    setRows(Array.isArray(body) ? body : (body?.data ?? []));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const roots = useMemo(() => rows.filter((r) => !r.parentId), [rows]);
  const childrenOf = useMemo(() => {
    const m = new Map<string, AdminCategory[]>();
    for (const r of rows) {
      if (!r.parentId) continue;
      const list = m.get(r.parentId) ?? [];
      list.push(r);
      m.set(r.parentId, list);
    }
    return m;
  }, [rows]);
  const parents = useMemo(() => roots.filter((r) => r.isActive), [roots]);

  const done = (message: string) => {
    setDialog(null);
    toast.success(message);
    load();
  };

  const move = async (siblings: AdminCategory[], index: number, dir: -1 | 1) => {
    const next = siblings.slice();
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j], next[index]];
    // Optimistic: renumber locally, roll back by reloading on failure.
    setRows((prev) =>
      prev.map((r) => {
        const at = next.findIndex((s) => s.id === r.id);
        return at === -1 ? r : { ...r, sortOrder: (at + 1) * 10 };
      }),
    );
    const res = await apiService.post<any>('/v1/categories/reorder', {
      ids: next.map((c) => c.id),
    });
    if (res.error) {
      toast.error(res.error);
      load();
    }
  };

  const restore = async (c: AdminCategory) => {
    const ok = await confirm({
      title: `Restore ${c.name}?`,
      description: 'It will appear again on the registration form and in the category list.',
      confirmLabel: 'Restore',
    });
    if (!ok) return;
    setBusyId(c.id);
    const res = await apiService.patch<any>(`/v1/categories/${c.id}`, { isActive: true });
    setBusyId(null);
    if (res.error) toast.error(res.error);
    else done(`${c.name} restored.`);
  };

  const renderRow = (
    c: AdminCategory,
    siblings: AdminCategory[],
    index: number,
    isChild: boolean,
  ) => {
    const Icon = categoryIconByName(c.icon) ?? Folder;
    const tpl = CATEGORY_TEMPLATES[(c.template as CategoryTemplateKey) ?? 'GENERIC'];
    return (
      <Card
        key={c.id}
        className={cn(
          'rounded-2xl border-border p-3 sm:p-4',
          isChild && 'ml-5 sm:ml-8',
          !c.isActive && 'opacity-75',
        )}
      >
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-soft-foreground">
            <Icon className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-semibold text-foreground">
              {isChild && (
                <CornerDownRight className="size-3.5 text-muted-foreground" aria-hidden />
              )}
              <span className="break-words">{c.name}</span>
              {c.nameMl && (
                <span lang="ml" className="text-sm font-normal text-muted-foreground">
                  {c.nameMl}
                </span>
              )}
            </p>
            <p className="mt-0.5 break-all text-xs text-muted-foreground">
              /{c.slug} · {c.listingsCount} {c.listingsCount === 1 ? 'listing' : 'listings'}
              {c.childCount > 0 && ` · ${c.childCount} sub`}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {c.isSystem && <Chip tone="info">Built-in</Chip>}
              {!c.isActive && <Chip tone="warning">Archived</Chip>}
              {c.isActive && !c.showInSignup && <Chip tone="muted">Not on sign-up</Chip>}
              <Chip tone="muted">{tpl.label}</Chip>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {canWrite && (
              <>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-11 sm:size-9"
                  aria-label={`Move ${c.name} up`}
                  disabled={index === 0}
                  onClick={() => move(siblings, index, -1)}
                >
                  <ArrowUp className="size-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-11 sm:size-9"
                  aria-label={`Move ${c.name} down`}
                  disabled={index === siblings.length - 1}
                  onClick={() => move(siblings, index, 1)}
                >
                  <ArrowDown className="size-4" />
                </Button>
              </>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-11 sm:size-9"
                  aria-label={`Actions for ${c.name}`}
                  disabled={busyId === c.id}
                >
                  {busyId === c.id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <MoreVertical className="size-4" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onSelect={() => setDialog({ kind: 'history', category: c })}>
                  <History className="mr-2 size-4" /> History
                </DropdownMenuItem>
                {canWrite && (
                  <>
                    <DropdownMenuItem onSelect={() => setDialog({ kind: 'form', category: c })}>
                      <Pencil className="mr-2 size-4" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {c.isActive ? (
                      !c.isSystem && (
                        <DropdownMenuItem
                          onSelect={() =>
                            setDialog({ kind: 'impact', action: 'archive', category: c })
                          }
                        >
                          <Archive className="mr-2 size-4" /> Archive
                        </DropdownMenuItem>
                      )
                    ) : (
                      <DropdownMenuItem onSelect={() => restore(c)}>
                        <ArchiveRestore className="mr-2 size-4" /> Restore
                      </DropdownMenuItem>
                    )}
                    {!c.isSystem && (
                      <DropdownMenuItem
                        onSelect={() => setDialog({ kind: 'impact', action: 'merge', category: c })}
                      >
                        <GitMerge className="mr-2 size-4" /> Merge into…
                      </DropdownMenuItem>
                    )}
                    {!c.isSystem && (
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onSelect={() =>
                          setDialog({ kind: 'impact', action: 'delete', category: c })
                        }
                      >
                        <Trash2 className="mr-2 size-4" /> Delete
                      </DropdownMenuItem>
                    )}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand-soft-foreground">
              <Folder className="size-5" aria-hidden />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Categories</h1>
              <p className="text-sm text-muted-foreground">
                One list for the whole platform. Changes show up on sign-up and in search straight
                away.
              </p>
            </div>
          </div>
          {canWrite && (
            <Button
              className="min-h-11 shrink-0 gap-2 rounded-xl"
              onClick={() => setDialog({ kind: 'form', category: null })}
            >
              <Plus className="size-4" aria-hidden /> Add category
            </Button>
          )}
        </div>

        {!canWrite && !loading && (
          <p className="rounded-xl bg-info-soft px-3 py-2 text-sm text-info-soft-foreground">
            You can view categories and their history. Only a super admin can change them.
          </p>
        )}

        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="size-6 animate-spin text-muted-foreground" aria-label="Loading" />
          </div>
        ) : error ? (
          <Card className="rounded-2xl p-6 text-center">
            <p className="text-sm text-danger-soft-foreground">{error}</p>
            <Button variant="outline" className="mt-3 min-h-11" onClick={() => load()}>
              Try again
            </Button>
          </Card>
        ) : roots.length === 0 ? (
          <Card className="rounded-2xl border-dashed p-10 text-center">
            <Folder className="mx-auto mb-3 size-10 text-muted-foreground opacity-40" aria-hidden />
            <p className="font-semibold text-foreground">No categories yet</p>
            {canWrite && (
              <p className="text-sm text-muted-foreground">Add the first one to get started.</p>
            )}
          </Card>
        ) : (
          <div className="space-y-2">
            {roots.map((root, i) => {
              const kids = childrenOf.get(root.id) ?? [];
              return (
                <div key={root.id} className="space-y-2">
                  {renderRow(root, roots, i, false)}
                  {kids.map((k, j) => renderRow(k, kids, j, true))}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {dialog?.kind === 'form' && (
        <CategoryForm
          category={dialog.category}
          parents={parents}
          onClose={() => setDialog(null)}
          onSaved={() => done(dialog.category ? 'Category saved.' : 'Category added.')}
        />
      )}
      {dialog?.kind === 'impact' && (
        <ImpactDialog
          action={dialog.action}
          category={dialog.category}
          all={rows}
          onClose={() => setDialog(null)}
          onDone={done}
        />
      )}
      {dialog?.kind === 'history' && (
        <HistoryDialog category={dialog.category} onClose={() => setDialog(null)} />
      )}
    </AdminLayout>
  );
}
