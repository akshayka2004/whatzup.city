'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { RegistrationCategory } from '@/lib/registration-categories';

/**
 * Searchable category tiles with subcategory chips, in place of two long dropdowns.
 * On a phone the list scrolls inside its own box so the form below stays within reach.
 */
export function CategoryPicker({
  categories,
  categorySlug,
  subcategorySlug,
  onCategory,
  onSubcategory,
}: {
  categories: RegistrationCategory[];
  categorySlug: string;
  subcategorySlug: string;
  onCategory: (slug: string) => void;
  onSubcategory: (slug: string) => void;
}) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();

  const shown = useMemo(() => {
    if (!q) return categories;
    return categories.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.subcategories.some((s) => s.label.toLowerCase().includes(q)),
    );
  }, [categories, q]);

  const selected = categories.find((c) => c.slug === categorySlug);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search, e.g. bakery, clinic, salon"
          aria-label="Search categories"
          autoComplete="off"
          enterKeyHint="search"
          className="h-11 rounded-xl border-input bg-background pl-10 text-sm text-foreground"
        />
      </div>

      <div
        role="radiogroup"
        aria-label="Category"
        className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto rounded-xl sm:grid-cols-3"
      >
        {shown.map((c) => {
          const active = c.slug === categorySlug;
          return (
            <button
              key={c.slug}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onCategory(c.slug)}
              className={cn(
                'flex min-h-11 cursor-pointer items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-sm transition',
                active
                  ? 'border-primary bg-primary/10 font-semibold text-foreground'
                  : 'border-input bg-background text-muted-foreground hover:bg-muted/40',
              )}
            >
              <span className="leading-snug">{c.label}</span>
              {active && <Check className="h-4 w-4 shrink-0 text-primary" />}
            </button>
          );
        })}
        {shown.length === 0 && (
          <p className="col-span-full rounded-xl bg-muted/40 px-3 py-3 text-xs text-muted-foreground">
            Nothing matches &ldquo;{query}&rdquo;. Pick the closest one, or{' '}
            <Link href="/support" target="_blank" className="text-primary underline">
              tell us what is missing
            </Link>
            .
          </p>
        )}
      </div>

      {selected && selected.subcategories.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">
            What kind of {selected.label.toLowerCase()}?
          </p>
          <div role="radiogroup" aria-label="Subcategory" className="flex flex-wrap gap-2">
            {selected.subcategories.map((s) => {
              const active = s.slug === subcategorySlug;
              return (
                <button
                  key={s.slug}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => onSubcategory(s.slug)}
                  className={cn(
                    'min-h-9 cursor-pointer rounded-full border px-3.5 text-xs transition',
                    active
                      ? 'border-primary bg-primary/10 font-semibold text-foreground'
                      : 'border-input bg-background text-muted-foreground hover:bg-muted/40',
                  )}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
