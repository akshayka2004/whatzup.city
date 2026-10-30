'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import QRCode from 'qrcode';
import { Loader2, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiService } from '@/lib/services/api-service';
import { fmtWhen } from '@/lib/event-booking';
import { SITE_URL } from '@/lib/site-url';
import type { CrewPass, HostSummary } from '@/lib/event-host';

/** One printable card per active crew pass: name, code, and a QR that opens the scanner with the code filled in. */
export default function CrewSheetPage() {
  const { id } = useParams<{ id: string }>();
  const [passes, setPasses] = useState<CrewPass[] | null>(null);
  const [event, setEvent] = useState<HostSummary | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      apiService.get<CrewPass[]>(`/v1/events/${id}/host/crew`, { fresh: true }),
      apiService.get<HostSummary>(`/v1/events/${id}/host`, { fresh: true }),
    ]).then(([c, e]) => {
      if (c.error || e.error) setError(c.error || e.error || 'Could not load the passes.');
      else {
        setPasses(c.data.filter((p) => p.status === 'ACTIVE' || p.status === 'UPCOMING'));
        setEvent(e.data);
      }
    });
  }, [id]);

  if (error)
    return (
      <p role="alert" className="p-6 text-sm text-destructive">
        {error}
      </p>
    );
  if (!passes || !event) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" aria-label="Loading" />
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-4xl p-4 sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-xl font-bold text-foreground">Crew pass sheet</h1>
          <p className="text-sm text-muted-foreground">
            {event.title}. Print and cut, or share each code privately. {passes.length} pass
            {passes.length === 1 ? '' : 'es'}.
          </p>
        </div>
        <Button onClick={() => window.print()}>
          <Printer /> Print
        </Button>
      </div>
      {passes.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          No active passes. Create some on the Crew tab.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 print:grid-cols-2 print:gap-3">
          {passes.map((p) => (
            <PassCard key={p.id} pass={p} event={event} />
          ))}
        </ul>
      )}
    </main>
  );
}

function PassCard({ pass, event }: { pass: CrewPass; event: HostSummary }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    QRCode.toCanvas(ref.current, `${SITE_URL}/scan?c=${pass.code}`, {
      width: 150,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#111111', light: '#FFFFFF' },
    }).catch(() => undefined);
  }, [pass.code]);

  return (
    <li className="break-inside-avoid rounded-card border border-border bg-card p-4 print:border-black print:bg-white print:text-black">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground print:text-black">
        Crew pass · {event.title}
      </p>
      <p className="mt-1 text-xl font-bold">{pass.label}</p>
      <div className="mt-3 flex items-center gap-4">
        <canvas
          ref={ref}
          className="size-[150px] shrink-0 rounded-md bg-white"
          aria-label={`QR code for ${pass.label}`}
        />
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground print:text-black">Code</p>
          <p className="font-mono text-2xl font-bold tracking-widest">{pass.codeDisplay}</p>
          <p className="mt-2 text-xs text-muted-foreground print:text-black">
            Scan this QR with your phone camera, or open{' '}
            <span className="font-mono">{SITE_URL.replace(/^https?:\/\//, '')}/scan</span> and type
            the code.
          </p>
          <p className="mt-2 text-xs text-muted-foreground print:text-black">
            {pass.level === 'DESK'
              ? 'Desk pass: scan, find names, check in by hand.'
              : 'Scan-only pass.'}{' '}
            Valid until {fmtWhen(pass.validUntil)}.
          </p>
        </div>
      </div>
      <p className="mt-3 border-t border-border pt-2 text-[11px] text-muted-foreground print:border-black print:text-black">
        Keep this private. Anyone with the code can scan for this event until it expires.
      </p>
    </li>
  );
}
