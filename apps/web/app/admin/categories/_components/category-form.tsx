'use client';

import { useMemo, useState } from 'react';
import { Loader2, Lock } from 'lucide-react';
import { CATEGORY_TEMPLATES, CATEGORY_TEMPLATE_KEYS } from '@saas/types';
import { Modal } from '@/components/system/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { apiService } from '@/lib/services/api-service';
import { CATEGORY_ICON_MAP, CATEGORY_ICON_NAMES } from '@/lib/category-icons';
import { cn } from '@/lib/utils';
import { slugify, type AdminCategory } from './types';

const SELECT =
  'h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring';

/** Create (no `category`) or edit one category. */
export function CategoryForm({
  category,
  parents,
  onClose,
  onSaved,
}: {
  category: AdminCategory | null;
  /** Active top-level categories a new/edited category may sit under. */
  parents: AdminCategory[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const editing = !!category;
  const [name, setName] = useState(category?.name ?? '');
  const [nameMl, setNameMl] = useState(category?.nameMl ?? '');
  const [slug, setSlug] = useState(category?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState(category?.description ?? '');
  const [icon, setIcon] = useState(category?.icon ?? '');
  const [parentId, setParentId] = useState(category?.parentId ?? '');
  const [template, setTemplate] = useState(category?.template ?? 'GENERIC');
  const [showInSignup, setShowInSignup] = useState(category?.showInSignup ?? true);
  const [isActive, setIsActive] = useState(category?.isActive ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const slugLocked = editing && (category!.isSystem || category!.listingsCount > 0);
  const parentLocked = editing && category!.childCount > 0;
  const tpl =
    CATEGORY_TEMPLATES[template as keyof typeof CATEGORY_TEMPLATES] ?? CATEGORY_TEMPLATES.GENERIC;
  const parentChoices = useMemo(
    () => parents.filter((p) => p.id !== category?.id),
    [parents, category?.id],
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) {
      setError('Enter a category name.');
      return;
    }
    setSaving(true);
    setError(null);
    const body: Record<string, unknown> = {
      name: name.trim(),
      nameMl: nameMl.trim() || (editing ? null : undefined),
      description: description.trim() || undefined,
      icon: icon || undefined,
      template,
      showInSignup,
    };
    const res = editing
      ? await apiService.patch<any>(`/v1/categories/${category!.id}`, {
          ...body,
          ...(slugLocked ? {} : { slug: slug.trim() }),
          ...(parentLocked ? {} : { parentId: parentId || null }),
          isActive,
        })
      : await apiService.post<any>('/v1/categories', {
          ...body,
          slug: (slug || slugify(name)).trim(),
          parentId: parentId || undefined,
          isActive,
        });
    setSaving(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    onSaved();
  };

  return (
    <Modal
      open
      onOpenChange={(o) => !o && onClose()}
      title={editing ? 'Edit category' : 'Add category'}
      description={
        editing
          ? 'Name, icon and order can always change. The slug is the permanent code.'
          : 'It appears on the registration form and the category list straight away.'
      }
      size="lg"
      footer={
        <>
          <Button type="button" variant="outline" className="min-h-11" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="category-form" disabled={saving} className="min-h-11">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
            {editing ? 'Save changes' : 'Add category'}
          </Button>
        </>
      }
    >
      <form id="category-form" onSubmit={submit} className="space-y-5 pb-2">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Name</span>
            <Input
              value={name}
              maxLength={100}
              required
              onChange={(e) => {
                setName(e.target.value);
                if (!editing && !slugTouched) setSlug(slugify(e.target.value));
              }}
              className="h-11 rounded-xl"
              placeholder="e.g. Bakeries"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Malayalam name <span className="font-normal">(optional)</span>
            </span>
            <Input
              value={nameMl}
              maxLength={150}
              onChange={(e) => setNameMl(e.target.value)}
              className="h-11 rounded-xl"
              lang="ml"
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              Slug
              {slugLocked && <Lock className="h-3 w-3" aria-hidden />}
            </span>
            <Input
              value={slug}
              maxLength={60}
              disabled={slugLocked}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value.toLowerCase());
              }}
              className="h-11 rounded-xl font-mono text-sm"
              placeholder="bakeries"
            />
            <span className="block text-xs text-muted-foreground">
              {slugLocked
                ? category!.isSystem
                  ? 'Built-in category: the slug is fixed because the app depends on it.'
                  : 'Locked: businesses use this category. You can still rename it.'
                : 'Lowercase letters, numbers and underscores. Locked once a business uses it.'}
            </span>
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Sits under</span>
            <select
              value={parentId}
              disabled={parentLocked}
              onChange={(e) => setParentId(e.target.value)}
              className={SELECT}
            >
              <option value="">Top level</option>
              {parentChoices.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {parentLocked && (
              <span className="block text-xs text-muted-foreground">
                It has subcategories, so it stays top level.
              </span>
            )}
          </label>
        </div>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Behaves like</span>
          <select value={template} onChange={(e) => setTemplate(e.target.value)} className={SELECT}>
            {CATEGORY_TEMPLATE_KEYS.map((k) => (
              <option key={k} value={k}>
                {CATEGORY_TEMPLATES[k].label}
              </option>
            ))}
          </select>
          <div className="rounded-xl border border-border bg-secondary/40 p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">{tpl.description}</p>
            <p className="mt-1">Status fields: {tpl.attributes.map((a) => a.label).join(', ')}.</p>
            <p className="mt-0.5">
              Verification document: {tpl.document.label}.
              {tpl.isFood ? ' Offers can be Dine-in or Takeaway; menu photos allowed.' : ''}
            </p>
          </div>
        </label>

        <div className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Icon</span>
          <div
            className="grid grid-cols-6 gap-1.5 sm:grid-cols-9"
            role="radiogroup"
            aria-label="Icon"
          >
            {CATEGORY_ICON_NAMES.map((n) => {
              const Icon = CATEGORY_ICON_MAP[n];
              const on = icon === n;
              return (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  aria-label={n}
                  title={n}
                  onClick={() => setIcon(on ? '' : n)}
                  className={cn(
                    'flex h-11 items-center justify-center rounded-xl border transition-colors',
                    on
                      ? 'border-primary bg-brand-soft text-brand-soft-foreground'
                      : 'border-border text-muted-foreground hover:bg-secondary',
                  )}
                >
                  <Icon className="h-5 w-5" aria-hidden />
                </button>
              );
            })}
          </div>
        </div>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            Description <span className="font-normal">(optional)</span>
          </span>
          <textarea
            value={description}
            maxLength={2000}
            rows={2}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </label>

        <div className="space-y-3 rounded-xl border border-border p-3">
          <label className="flex items-center justify-between gap-4">
            <span>
              <span className="block text-sm font-medium text-foreground">
                Show on the registration form
              </span>
              <span className="block text-xs text-muted-foreground">
                Off keeps it listed and browsable but not offered to new businesses.
              </span>
            </span>
            <Switch checked={showInSignup} onCheckedChange={setShowInSignup} />
          </label>
          {!editing && (
            <label className="flex items-center justify-between gap-4">
              <span className="text-sm font-medium text-foreground">Active</span>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </label>
          )}
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger-soft-foreground"
          >
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
}
