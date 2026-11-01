'use client';

import { useState, type RefObject } from 'react';
import { Download, Loader2, Share2 } from 'lucide-react';
import { toPng } from 'html-to-image';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';

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
