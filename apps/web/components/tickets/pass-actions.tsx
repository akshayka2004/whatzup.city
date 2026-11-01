'use client';

import { useEffect, useState, type RefObject } from 'react';
import { Download, Loader2, Share2 } from 'lucide-react';
import { toPng } from 'html-to-image';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';
import { PASS_THEMES, type PassTheme } from './boarding-pass';

const KEY = 'pass_theme';

/** The style the person last picked for their passes (a per-device convenience only). */
export function usePassTheme(): [PassTheme, (t: PassTheme) => void] {
  const [theme, setTheme] = useState<PassTheme>('indigo');
  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved && saved in PASS_THEMES) setTheme(saved as PassTheme);
    } catch {
      /* private window: keep the default */
    }
  }, []);
  const choose = (t: PassTheme) => {
    setTheme(t);
    try {
      localStorage.setItem(KEY, t);
    } catch {
      /* ignore */
    }
  };
  return [theme, choose];
}

export function ThemePicker({
  value,
  onChange,
}: {
  value: PassTheme;
  onChange: (t: PassTheme) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Pass style"
      className="flex items-center justify-center gap-2"
    >
      <span className="text-xs font-medium text-muted-foreground">Style</span>
      {(Object.keys(PASS_THEMES) as PassTheme[]).map((k) => {
        const t = PASS_THEMES[k];
        return (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={value === k}
            onClick={() => onChange(k)}
            className={cn(
              'inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full border px-3 text-sm',
              value === k
                ? 'border-primary bg-primary/10 font-semibold text-foreground'
                : 'border-input text-muted-foreground hover:text-foreground',
            )}
          >
            <span
              aria-hidden
              className="size-4 rounded-full border border-black/10"
              style={{ backgroundImage: `linear-gradient(135deg, ${t.bandFrom}, ${t.bandTo})` }}
            />
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

/** Save the pass as a picture, or share that picture straight from the phone. */
export function SavePass({
  target,
  fileName,
}: {
  target: RefObject<HTMLDivElement | null>;
  fileName: string;
}) {
  const [busy, setBusy] = useState<'save' | 'share' | null>(null);

  const render = async () => {
    if (!target.current) throw new Error('The pass is not ready yet.');
    return toPng(target.current, { pixelRatio: 3, cacheBust: true });
  };

  const save = async () => {
    setBusy('save');
    try {
      const url = await render();
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName}.png`;
      a.click();
    } catch {
      toast.error('Could not save the picture. Take a screenshot instead.');
    } finally {
      setBusy(null);
    }
  };

  const share = async () => {
    setBusy('share');
    try {
      const url = await render();
      const blob = await (await fetch(url)).blob();
      const file = new File([blob], `${fileName}.png`, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'My event pass' });
      } else {
        await save();
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') toast.error('Could not share. Save the picture instead.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex gap-2">
      <Button type="button" variant="outline" className="flex-1" onClick={save} disabled={!!busy}>
        {busy === 'save' ? <Loader2 className="animate-spin" /> : <Download />} Save picture
      </Button>
      <Button type="button" className="flex-1" onClick={share} disabled={!!busy}>
        {busy === 'share' ? <Loader2 className="animate-spin" /> : <Share2 />} Share
      </Button>
    </div>
  );
}
