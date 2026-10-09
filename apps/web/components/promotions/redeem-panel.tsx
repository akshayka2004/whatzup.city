'use client';

import { useState } from 'react';
import { CheckCircle2, ScanLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';

/**
 * The "customer shows a code at the counter" box, shared by vouchers, platform vouchers
 * and discount-wheel tickets. `onRedeem` returns an error string or a success message.
 */
export function RedeemPanel({
  title,
  description,
  placeholder,
  onRedeem,
  className,
}: {
  title: string;
  description?: string;
  placeholder: string;
  onRedeem: (code: string) => Promise<{ error?: string; message?: string }>;
  className?: string;
}) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<{ ok: boolean; text: string } | null>(null);
  const id = `redeem-${title.replace(/\W+/g, '-').toLowerCase()}`;

  const submit = async () => {
    const c = code.trim();
    if (!c || busy) return;
    setBusy(true);
    const res = await onRedeem(c);
    setBusy(false);
    if (res.error) {
      setLast({ ok: false, text: res.error });
      toast.error(res.error);
      return;
    }
    const text = res.message || 'Redeemed';
    setLast({ ok: true, text });
    toast.success(text);
    setCode('');
  };

  return (
    <section
      className={cn('rounded-card border border-border bg-card p-4 shadow-e1 sm:p-5', className)}
      aria-labelledby={`${id}-title`}
    >
      <div className="flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-full bg-brand-soft text-brand-soft-foreground">
          <ScanLine className="size-4" aria-hidden />
        </span>
        <h2 id={`${id}-title`} className="text-sm font-semibold">
          {title}
        </h2>
      </div>
      {description && <p className="mt-2 text-caption text-muted-foreground">{description}</p>}
      <form
        className="mt-3 flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <label htmlFor={id} className="sr-only">
          Code
        </label>
        <Input
          id={id}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          className="flex-1 font-mono uppercase"
        />
        <Button type="submit" loading={busy} disabled={!code.trim()}>
          <CheckCircle2 /> Mark redeemed
        </Button>
      </form>
      {last && (
        <p
          className={cn(
            'mt-2 text-caption font-medium',
            last.ok ? 'text-success' : 'text-destructive',
          )}
          role="status"
        >
          {last.text}
        </p>
      )}
    </section>
  );
}
