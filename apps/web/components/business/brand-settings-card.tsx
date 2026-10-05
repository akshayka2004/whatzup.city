'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Layers, Loader2, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { apiService } from '@/lib/services/api-service';
import { invalidateActiveBusinessCache, useActiveBusiness } from '@/hooks/use-active-business';
import {
  BillSeriesQuestion,
  BrandConversionPrompt,
  type BillSeriesMode,
} from '@/components/business/brand-conversion-prompt';

/** Settings card: convert a single business into a brand account, or manage the brand's name and bill series. */
export function BrandSettingsCard() {
  const { brand, outlets, activeBusiness, isBrand, loading, refresh } = useActiveBusiness();

  const [convertOpen, setConvertOpen] = useState(false);
  const [name, setName] = useState('');
  const [mode, setMode] = useState<BillSeriesMode | null>(null);
  const [prefix, setPrefix] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!brand) return;
    setName(brand.name);
    setMode(brand.billSeriesMode);
    setPrefix(brand.billSeriesPrefix ?? '');
  }, [brand]);

  if (loading) {
    return <Card className="h-40 animate-pulse rounded-2xl border-border bg-card" aria-hidden />;
  }

  if (!isBrand || !brand) {
    if (!activeBusiness) return null;
    return (
      <Card className="rounded-2xl border-border bg-card p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Layers className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-foreground">Brand account</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Run more than one outlet? Group them under one brand. Every outlet keeps its own address, hours,
              offers, QR code, plan and bills. You switch between them from one login and share a single invoice
              profile.
            </p>
          </div>
        </div>
        <Button
          type="button"
          onClick={() => setConvertOpen(true)}
          className="h-11 w-full rounded-xl font-semibold cursor-pointer sm:w-auto"
        >
          Convert to brand account
        </Button>
        {convertOpen && (
          <BrandConversionPrompt
            businessId={activeBusiness.id}
            businessName={activeBusiness.name}
            open={convertOpen}
            onOpenChange={setConvertOpen}
            promptActions={false}
            onDone={() => setConvertOpen(false)}
          />
        )}
      </Card>
    );
  }

  const seriesChanged = mode !== brand.billSeriesMode || (mode === 'SHARED' && prefix.trim() !== (brand.billSeriesPrefix ?? ''));
  const dirty = name.trim() !== brand.name || seriesChanged;

  const validate = (): string => {
    if (!name.trim()) return 'Brand name is required.';
    if (!mode) return 'Choose whether the bill number series is shared.';
    if (mode === 'SHARED' && !prefix.trim()) return 'Enter the shared bill series prefix, e.g. SC/2026/.';
    return '';
  };

  const onSaveClick = () => {
    setSaved(false);
    const problem = validate();
    setError(problem);
    if (problem) return;
    if (seriesChanged) setConfirmOpen(true);
    else void save();
  };

  const save = async () => {
    setConfirmOpen(false);
    setSaving(true);
    setError('');
    const res = await apiService.patch<any>(`/v1/brands/${brand.id}`, {
      name: name.trim(),
      billSeriesMode: mode,
      ...(mode === 'SHARED' ? { billSeriesPrefix: prefix.trim() } : {}),
    });
    setSaving(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    invalidateActiveBusinessCache();
    await refresh();
    setSaved(true);
  };

  return (
    <Card className="rounded-2xl border-border bg-card p-5 space-y-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Store className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-foreground">Brand account</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {outlets.length} outlet{outlets.length === 1 ? '' : 's'} under {brand.name}.
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Brand name</label>
        <Input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setSaved(false);
          }}
          maxLength={255}
          className="h-11 rounded-xl bg-background"
        />
      </div>

      <BillSeriesQuestion
        mode={mode}
        prefix={prefix}
        onModeChange={(m) => {
          setMode(m);
          setSaved(false);
        }}
        onPrefixChange={(p) => {
          setPrefix(p);
          setSaved(false);
        }}
      />
      <p className="rounded-xl bg-muted/50 px-3 py-2 text-[11px] text-muted-foreground">
        Bill checks at every outlet follow this setting.
      </p>

      {error && (
        <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      )}
      {saved && !dirty && (
        <p className="flex items-center gap-1.5 text-xs text-success">
          <CheckCircle2 className="h-4 w-4" /> Brand settings saved.
        </p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Button
          type="button"
          onClick={onSaveClick}
          disabled={saving || !dirty}
          className="h-11 rounded-xl font-semibold cursor-pointer sm:min-w-36"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Saving...
            </>
          ) : (
            'Save brand settings'
          )}
        </Button>
        <Link
          href="/dashboard/outlets"
          className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl text-sm font-medium text-primary hover:underline"
        >
          Manage outlets <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change the bill series?</DialogTitle>
            <DialogDescription>
              Bill checks at all {outlets.length} outlet{outlets.length === 1 ? '' : 's'} will follow the new
              series.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} className="h-11 rounded-xl cursor-pointer">
              Cancel
            </Button>
            <Button onClick={save} className="h-11 rounded-xl cursor-pointer">
              Yes, change it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
