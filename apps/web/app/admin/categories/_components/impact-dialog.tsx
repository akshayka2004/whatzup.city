'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Modal } from '@/components/system/modal';
import { Button } from '@/components/ui/button';
import { apiService } from '@/lib/services/api-service';
import type { AdminCategory, CategoryAction, CategoryImpact } from './types';

const COPY: Record<CategoryAction, { title: string; verb: string }> = {
  archive: { title: 'Archive category', verb: 'Archive' },
  merge: { title: 'Merge category', verb: 'Merge' },
  delete: { title: 'Delete category', verb: 'Delete' },
};

const n = (v: number, one: string, many = `${one}s`) => `${v} ${v === 1 ? one : many}`;

/** Shows what an archive / merge / delete would touch, then performs it. */
export function ImpactDialog({
  action,
  category,
  all,
  onClose,
  onDone,
}: {
  action: CategoryAction;
  category: AdminCategory;
  all: AdminCategory[];
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const [impact, setImpact] = useState<CategoryImpact | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [targetId, setTargetId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    apiService.get<any>(`/v1/categories/${category.id}/impact`).then((res) => {
      if (!live) return;
      if (res.error) setLoadError(res.error);
      else setImpact((res.data?.data ?? res.data) as CategoryImpact);
    });
    return () => {
      live = false;
    };
  }, [category.id]);

  // Same level, active, and not itself.
  const targets = useMemo(
    () =>
      all.filter(
        (c) =>
          c.id !== category.id &&
          c.isActive &&
          (c.parentId === null) === (category.parentId === null),
      ),
    [all, category.id, category.parentId],
  );

  const inUse =
    !!impact && (impact.businesses > 0 || impact.asSubcategory > 0 || impact.children > 0);
  const canRun =
    !!impact &&
    !busy &&
    (action === 'archive' || (action === 'merge' && !!targetId) || (action === 'delete' && !inUse));

  const run = async () => {
    setBusy(true);
    setError(null);
    let res;
    if (action === 'archive') {
      res = await apiService.patch<any>(`/v1/categories/${category.id}`, { isActive: false });
    } else if (action === 'merge') {
      res = await apiService.post<any>(`/v1/categories/${category.id}/merge`, { targetId });
    } else {
      res = await apiService.delete<any>(`/v1/categories/${category.id}`);
    }
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    const target = targets.find((t) => t.id === targetId)?.name;
    onDone(
      action === 'archive'
        ? `${category.name} archived.`
        : action === 'merge'
          ? `${category.name} merged into ${target ?? 'the other category'}.`
          : `${category.name} deleted.`,
    );
  };

  return (
    <Modal
      open
      onOpenChange={(o) => !o && onClose()}
      title={`${COPY[action].title}: ${category.name}`}
      footer={
        <>
          <Button variant="outline" className="min-h-11" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className={`min-h-11 ${action === 'delete' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}`}
            disabled={!canRun}
            onClick={run}
          >
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
            {COPY[action].verb}
          </Button>
        </>
      }
    >
      <div className="space-y-4 pb-2 text-sm">
        {!impact && !loadError && (
          <p className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Checking what this affects…
          </p>
        )}
        {loadError && (
          <p role="alert" className="text-danger-soft-foreground">
            {loadError}
          </p>
        )}

        {impact && (
          <>
            <ul className="space-y-1 rounded-xl border border-border bg-secondary/40 p-3">
              <li>
                <strong className="text-foreground">
                  {n(impact.businesses, 'business', 'businesses')}
                </strong>{' '}
                use this as their category
                {impact.pendingVerification > 0 &&
                  ` (${impact.pendingVerification} awaiting verification)`}
                .
              </li>
              {impact.asSubcategory > 0 && (
                <li>
                  {n(impact.asSubcategory, 'business', 'businesses')} list it as a subcategory.
                </li>
              )}
              {impact.children > 0 && (
                <li>{n(impact.children, 'subcategory', 'subcategories')} sit under it.</li>
              )}
              {impact.launchOfferHolders > 0 && (
                <li>
                  {n(impact.launchOfferHolders, 'business', 'businesses')} hold a launch offer here.
                </li>
              )}
              {impact.sample.length > 0 && (
                <li className="text-muted-foreground">
                  e.g. {impact.sample.map((b) => b.name).join(', ')}
                </li>
              )}
            </ul>

            {action === 'archive' && (
              <p className="text-muted-foreground">
                Archiving hides it from the registration form and the category list. Businesses
                already in it keep it and stay listed. You can restore it any time.
              </p>
            )}

            {action === 'merge' && (
              <div className="space-y-2">
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Merge into</span>
                  <select
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                    className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground"
                  >
                    <option value="">Choose a category…</option>
                    {targets.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="text-muted-foreground">
                  All {n(impact.businesses, 'business', 'businesses')}, their subcategory references
                  and any subcategories move to the chosen category, and owners are notified. This
                  cannot be undone; the old link keeps working and points to the target.
                </p>
              </div>
            )}

            {action === 'delete' &&
              (inUse ? (
                <p className="rounded-xl bg-warning-soft px-3 py-2 text-warning-soft-foreground">
                  This category is still in use, so it cannot be deleted. Archive it to hide it, or
                  merge it into another category.
                </p>
              ) : (
                <p className="text-muted-foreground">
                  Nothing uses this category. Deleting it removes it permanently and frees its slug.
                </p>
              ))}
          </>
        )}

        {error && (
          <p
            role="alert"
            className="rounded-xl bg-danger-soft px-3 py-2 text-danger-soft-foreground"
          >
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}
