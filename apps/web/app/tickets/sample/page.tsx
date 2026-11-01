'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { LayoutGrid, Ticket } from 'lucide-react';
import { PublicLayout } from '@/components/layouts/public-layout';
import { Button } from '@/components/ui/button';
import {
  BoardingPass,
  PASS_THEMES,
  type PassData,
  type PassTheme,
} from '@/components/tickets/boarding-pass';
import { SavePass, ThemePicker, usePassTheme } from '@/components/tickets/pass-actions';

/**
 * A pass with made-up details, for showing what a Whtzup.city event pass looks like. The QR holds
 * nothing real and the pass is stamped SAMPLE, so it can never be mistaken for a working ticket.
 */
export default function SamplePassPage() {
  const [theme, setTheme] = usePassTheme();
  const [all, setAll] = useState(false);
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => setMounted(true), []);

  // Two weeks from today at 6:30 pm India time, so the sample never looks out of date.
  const data = useMemo<PassData>(() => {
    const d = new Date(Date.now() + 14 * 86_400_000);
    const day = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    return {
      title: 'Kochi Food & Music Fest',
      startDate: new Date(`${day}T18:30:00+05:30`).toISOString(),
      endDate: new Date(`${day}T22:30:00+05:30`).toISOString(),
      venue: 'Marine Drive Grounds',
      city: 'Kochi',
      holderName: 'Asha Menon',
      code: 'K7M3Q9',
      isGuest: false,
      qr: 'WHTZUP-SAMPLE-PASS',
      note: 'Sample pass. Not valid for entry.',
    };
  }, []);

  if (!mounted) return <PublicLayout>{null}</PublicLayout>;

  return (
    <PublicLayout>
      <div className="mx-auto max-w-5xl space-y-5">
        <div className="space-y-1 text-center">
          <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
            <Ticket className="size-4" aria-hidden /> Event pass
          </p>
          <h1 className="text-2xl font-bold text-foreground">What your ticket looks like</h1>
          <p className="text-sm text-muted-foreground">
            A sample with made-up details. Pick a style, save it as a picture, or compare all three.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <ThemePicker value={theme} onChange={setTheme} />
          <Button type="button" variant="outline" size="sm" onClick={() => setAll((v) => !v)}>
            <LayoutGrid /> {all ? 'Show one' : 'Compare all three'}
          </Button>
        </div>

        {all ? (
          <div className="grid gap-8 md:grid-cols-3">
            {(Object.keys(PASS_THEMES) as PassTheme[]).map((k) => (
              <div key={k} className="space-y-2">
                <p className="text-center text-sm font-semibold text-foreground">
                  {PASS_THEMES[k].label}
                </p>
                <BoardingPass theme={k} state="SAMPLE" data={data} />
              </div>
            ))}
          </div>
        ) : (
          <div className="mx-auto max-w-sm space-y-4">
            <BoardingPass ref={ref} theme={theme} state="SAMPLE" data={data} />
            <SavePass target={ref} fileName={`whtzup-sample-pass-${theme}`} />
          </div>
        )}

        <p className="text-center text-sm">
          <Link
            href="/events"
            className="inline-flex min-h-10 items-center text-primary hover:underline"
          >
            Find an event and get yours
          </Link>
        </p>
      </div>
    </PublicLayout>
  );
}
