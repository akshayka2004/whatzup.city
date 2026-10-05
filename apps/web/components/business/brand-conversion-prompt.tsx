'use client';

import { useState, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { apiService } from '@/lib/services/api-service';
import { invalidateActiveBusinessCache } from '@/hooks/use-active-business';
import { cn } from '@/lib/utils';

export type BillSeriesMode = 'SHARED' | 'PER_OUTLET';

/** "Is the bill number series the same across all your outlets?" with the prefix input for Yes. */
export function BillSeriesQuestion({
  mode,
  prefix,
  onModeChange,
  onPrefixChange,
}: {
  mode: BillSeriesMode | null;
  prefix: string;
  onModeChange: (m: BillSeriesMode) => void;
  onPrefixChange: (p: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">
        Is the bill number series the same across all your outlets? <span className="text-destructive">*</span>
      </p>
      <div className="inline-flex rounded-xl border border-border p-0.5" role="radiogroup">
        {([
          { l: 'Yes', v: 'SHARED' },
          { l: 'No', v: 'PER_OUTLET' },
        ] as const).map((o) => (
          <button
            key={o.v}
            type="button"
            role="radio"
            aria-checked={mode === o.v}
            onClick={() => onModeChange(o.v)}
            className={cn(
              'h-10 min-w-20 rounded-lg px-5 text-sm font-medium transition-colors cursor-pointer',
              mode === o.v ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {o.l}
          </button>
        ))}
      </div>
      {mode === 'SHARED' && (
        <div className="space-y-1.5">
          <Input
            value={prefix}
            onChange={(e) => onPrefixChange(e.target.value)}
            maxLength={30}
            placeholder="SC/2026/"
            aria-label="Bill series prefix"
            className="h-11 rounded-xl bg-background"
          />
          <p className="text-[11px] text-muted-foreground">e.g. SC/2026/ — every outlet's bills start with this.</p>
        </div>
      )}
      {mode === 'PER_OUTLET' && (
        <p className="text-[11px] text-muted-foreground">
          Each outlet sets its own bill prefix in its details.
        </p>
      )}
    </div>
  );
}

export interface BrandConvertFormProps {
  businessId: string;
  businessName?: string;
  onDone?: () => void;
  /** Extra buttons rendered under the primary action (e.g. "Not now"). */
  secondaryActions?: (state: { submitting: boolean }) => ReactNode;
  submitLabel?: string;
}

/** Turns an existing business into the head outlet of a new brand account. */
export function BrandConvertForm({
  businessId,
  businessName,
  onDone,
  secondaryActions,
  submitLabel = 'Create brand account',
}: BrandConvertFormProps) {
  const [brandName, setBrandName] = useState(businessName ?? '');
  const [outletLabel, setOutletLabel] = useState('');
  const [mode, setMode] = useState<BillSeriesMode | null>(null);
  const [prefix, setPrefix] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!brandName.trim()) return setError('Brand name is required.');
    if (!mode) return setError('Tell us whether the bill number series is the same across outlets.');
    if (mode === 'SHARED' && !prefix.trim()) return setError('Enter the shared bill series prefix, e.g. SC/2026/.');

    setSubmitting(true);
    const res = await apiService.post<any>('/v1/brands/convert', {
      businessId,
      brandName: brandName.trim(),
      ...(outletLabel.trim() ? { outletLabel: outletLabel.trim() } : {}),
      billSeriesMode: mode,
      ...(mode === 'SHARED' ? { billSeriesPrefix: prefix.trim() } : {}),
    });
    if (res.error) {
      setError(res.error);
      setSubmitting(false);
      return;
    }
    invalidateActiveBusinessCache();
    onDone?.();
    // Header switcher, sidebar and pages all cache the single-business shape — a reload makes them all pick up the brand.
    if (typeof window !== 'undefined') window.location.reload();
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          Brand name <span className="text-destructive">*</span>
        </label>
        <Input
          value={brandName}
          onChange={(e) => setBrandName(e.target.value)}
          maxLength={255}
          placeholder="e.g. Sunrise Cafe"
          className="h-11 rounded-xl bg-background"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          This outlet&apos;s label <span className="text-muted-foreground/70">(optional)</span>
        </label>
        <Input
          value={outletLabel}
          onChange={(e) => setOutletLabel(e.target.value)}
          maxLength={100}
          placeholder="Kozhikode - Mavoor Road"
          className="h-11 rounded-xl bg-background"
        />
        <p className="text-[11px] text-muted-foreground">e.g. Kozhikode - Mavoor Road</p>
      </div>

      <BillSeriesQuestion mode={mode} prefix={prefix} onModeChange={setMode} onPrefixChange={setPrefix} />

      {error && (
        <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-2 pt-1">
        <Button type="submit" disabled={submitting} className="h-11 w-full rounded-xl font-semibold cursor-pointer">
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Creating...
            </>
          ) : (
            submitLabel
          )}
        </Button>
        {secondaryActions?.({ submitting })}
      </div>
    </form>
  );
}

/**
 * "Do you run more than one outlet?" dialog. With `promptActions` (the default) it behaves as the
 * nudge: closing or "Not now" snoozes, "No, I have a single business" declines. Settings opens it
 * with `promptActions={false}` so it is a plain converter that records nothing on dismiss.
 */
export function BrandConversionPrompt({
  businessId,
  businessName,
  onDone,
  open = true,
  onOpenChange,
  promptActions = true,
}: {
  businessId: string;
  businessName: string;
  onDone: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  promptActions?: boolean;
}) {
  const [responding, setResponding] = useState<'SNOOZE' | 'DECLINE' | null>(null);

  const respond = async (response: 'SNOOZE' | 'DECLINE') => {
    setResponding(response);
    // Best effort: a failed write only means the prompt may come back sooner.
    await apiService.post('/v1/brands/prompt-response', { businessId, response });
    setResponding(null);
    onDone();
  };

  const handleOpenChange = (next: boolean) => {
    if (next) return onOpenChange?.(true);
    if (promptActions) void respond('SNOOZE');
    else onOpenChange?.(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{promptActions ? 'Do you run more than one outlet?' : 'Create a brand account'}</DialogTitle>
          <DialogDescription>
            Put all your outlets under one brand. Each outlet keeps its own address, hours, offers, QR and plan;
            you switch between them from one login and share one invoice profile.
          </DialogDescription>
        </DialogHeader>
        <BrandConvertForm
          businessId={businessId}
          businessName={businessName}
          onDone={onDone}
          secondaryActions={
            promptActions
              ? ({ submitting }) => (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={submitting || responding !== null}
                      onClick={() => respond('SNOOZE')}
                      className="h-11 w-full rounded-xl cursor-pointer"
                    >
                      {responding === 'SNOOZE' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Not now'}
                    </Button>
                    <button
                      type="button"
                      disabled={submitting || responding !== null}
                      onClick={() => respond('DECLINE')}
                      className="h-11 w-full rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer disabled:opacity-50"
                    >
                      No, I have a single business
                    </button>
                  </>
                )
              : undefined
          }
        />
      </DialogContent>
    </Dialog>
  );
}
