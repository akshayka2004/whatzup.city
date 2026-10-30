'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import QrScanner from 'qr-scanner';
import { BOOKING_LIMITS } from '@saas/types';
import {
  CameraOff,
  Check,
  Keyboard,
  LogOut,
  Loader2,
  Search,
  TriangleAlert,
  Undo2,
  Users,
  WifiOff,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  CrewError,
  clearSession,
  crewApi,
  crewLogin,
  loadSession,
  saveSession,
  type CrewSearchHit,
  type CrewSession,
  type CrewStats,
  type ScanResponse,
} from '@/lib/crew-client';
import { fmtClock, prettyCode } from '@/lib/event-booking';

type Overlay = {
  tone: 'ok' | 'dup' | 'bad' | 'net';
  title: string;
  lines: string[];
  ticketId?: string;
  /** Green results close by themselves; problems stay until the crew tap, so they are read. */
  auto: boolean;
};

const OVERLAY_STYLE: Record<Overlay['tone'], string> = {
  ok: 'bg-success text-success-foreground',
  dup: 'bg-warning text-warning-foreground',
  bad: 'bg-destructive text-destructive-foreground',
  net: 'bg-warning text-warning-foreground',
};

function beep(ok: boolean) {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = ok ? 880 : 220;
    gain.gain.value = 0.15;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + (ok ? 0.12 : 0.35));
    osc.onended = () => ctx.close();
  } catch {
    /* sound is a bonus */
  }
  try {
    navigator.vibrate?.(ok ? 60 : [120, 60, 120]);
  } catch {
    /* ignore */
  }
}

function overlayFor(r: ScanResponse): Overlay {
  const t = r.ticket;
  if (r.result === 'VALID') {
    return {
      tone: 'ok',
      title: t?.holderName ?? 'Welcome in',
      lines: [t?.isGuest ? 'Guest' : 'Registered', t ? `Ticket ${prettyCode(t.code)}` : ''].filter(
        Boolean,
      ),
      ticketId: t?.id,
      auto: true,
    };
  }
  if (r.result === 'DUPLICATE') {
    return {
      tone: 'dup',
      title: 'Already checked in',
      lines: [
        t?.holderName ?? '',
        t?.checkedInAt
          ? `at ${fmtClock(t.checkedInAt)}${t.checkedInBy ? ` · ${t.checkedInBy}` : ''}`
          : '',
      ].filter(Boolean),
      auto: false,
    };
  }
  const titles: Record<string, string> = {
    INVALID: 'Not a valid ticket',
    WRONG_EVENT: 'Wrong event',
    CANCELLED: 'Ticket cancelled',
    OUTSIDE_WINDOW: 'Check-in is not open',
  };
  return {
    tone: 'bad',
    title: titles[r.result] ?? 'Not admitted',
    lines: [r.message],
    auto: false,
  };
}

/** Phone-first gate scanner for crew. Sign in with a pass code, then point the camera at tickets. */
export function CrewScanner({ initialCode = '' }: { initialCode?: string }) {
  const [session, setSession] = useState<CrewSession | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSession(loadSession());
    setReady(true);
  }, []);

  if (!ready) return <Splash />;
  if (!session) {
    return (
      <SignIn
        initialCode={initialCode}
        onSignedIn={(s) => {
          saveSession(s);
          setSession(s);
        }}
      />
    );
  }
  return (
    <Scanner
      session={session}
      onSignOut={async () => {
        await crewApi(session.token)
          .logout()
          .catch(() => undefined);
        clearSession();
        setSession(null);
      }}
      onLost={() => {
        clearSession();
        setSession(null);
      }}
    />
  );
}

function Splash() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background">
      <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden />
    </div>
  );
}

// ── sign in ───────────────────────────────────────────────────────────────

function SignIn({
  initialCode,
  onSignedIn,
}: {
  initialCode: string;
  onSignedIn: (s: CrewSession) => void;
}) {
  const [code, setCode] = useState(initialCode.toUpperCase());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      setBusy(true);
      setError('');
      try {
        onSignedIn(await crewLogin(code));
      } catch (err) {
        setError(err instanceof CrewError ? err.message : 'Could not sign in. Try again.');
        setBusy(false);
      }
    },
    [code, onSignedIn],
  );

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 bg-background px-4 py-10">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">Whtzup.city</p>
        <h1 className="mt-1 text-2xl font-bold text-foreground">Gate scanner</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter the pass code the organiser gave you. It works on this phone for this event only.
        </p>
      </div>
      <form onSubmit={submit} className="space-y-3">
        <label htmlFor="pass-code" className="text-sm font-medium text-foreground">
          Pass code
        </label>
        <Input
          id="pass-code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="ABCD-EFGH"
          autoCapitalize="characters"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          inputMode="text"
          maxLength={12}
          className="h-14 text-center font-mono text-2xl tracking-widest"
          aria-invalid={!!error}
          aria-describedby={error ? 'pass-error' : undefined}
        />
        {error && (
          <p id="pass-error" role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button
          type="submit"
          size="lg"
          className="w-full"
          loading={busy}
          disabled={code.replace(/[\s-]/g, '').length < 8}
        >
          Start scanning
        </Button>
      </form>
    </main>
  );
}

// ── scanning ──────────────────────────────────────────────────────────────

function Scanner({
  session,
  onSignOut,
  onLost,
}: {
  session: CrewSession;
  onSignOut: () => void;
  onLost: () => void;
}) {
  const api = useRef(crewApi(session.token));
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const busy = useRef(false);
  const lastText = useRef({ text: '', at: 0 });
  const dismissTimer = useRef<number | null>(null);

  const [overlay, setOverlay] = useState<Overlay | null>(null);
  const [panel, setPanel] = useState<null | 'code' | 'search'>(null);
  const [cameraError, setCameraError] = useState('');
  const [stats, setStats] = useState<CrewStats | null>(null);
  const [lastAdmit, setLastAdmit] = useState<{ id: string; until: number; name: string } | null>(
    null,
  );
  const [now, setNow] = useState(Date.now());
  const isDesk = session.pass.level === 'DESK';

  const refreshStats = useCallback(async () => {
    try {
      setStats(await api.current.stats());
    } catch (err) {
      if (err instanceof CrewError && err.sessionLost) onLost();
    }
  }, [onLost]);

  useEffect(() => {
    refreshStats();
    const t = window.setInterval(refreshStats, 6000);
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      window.clearInterval(t);
      window.clearInterval(tick);
    };
  }, [refreshStats]);

  const show = useCallback((o: Overlay) => {
    if (dismissTimer.current) window.clearTimeout(dismissTimer.current);
    setOverlay(o);
    beep(o.tone === 'ok');
    if (o.auto) dismissTimer.current = window.setTimeout(() => close(), 1800);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const close = useCallback(() => {
    if (dismissTimer.current) window.clearTimeout(dismissTimer.current);
    setOverlay(null);
    busy.current = false;
  }, []);

  /** Runs one check-in request and turns the answer into a full-screen result. */
  const handle = useCallback(
    async (run: () => Promise<ScanResponse>) => {
      busy.current = true;
      try {
        const r = await run();
        const o = overlayFor(r);
        show(o);
        if (r.result === 'VALID' && r.ticket) {
          setLastAdmit({
            id: r.ticket.id,
            until: Date.now() + BOOKING_LIMITS.undoSeconds * 1000,
            name: r.ticket.holderName,
          });
        }
        refreshStats();
      } catch (err) {
        if (err instanceof CrewError && err.sessionLost) return onLost();
        const net = err instanceof CrewError && err.code === 'NETWORK';
        show({
          tone: net ? 'net' : 'bad',
          title: net ? 'No connection' : 'Could not check in',
          lines: [err instanceof Error ? err.message : 'Try again.'],
          auto: false,
        });
      }
    },
    [onLost, refreshStats, show],
  );

  // Camera: runs while nothing is covering it.
  const scanning = !overlay && !panel;
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (!scannerRef.current) {
      scannerRef.current = new QrScanner(
        video,
        (result) => {
          const text = result.data;
          const t = Date.now();
          // The same code seen again within a couple of seconds is the same scan.
          if (busy.current || (text === lastText.current.text && t - lastText.current.at < 2500))
            return;
          lastText.current = { text, at: t };
          handle(() => api.current.scan(text));
        },
        {
          returnDetailedScanResult: true,
          preferredCamera: 'environment',
          highlightScanRegion: true,
          highlightCodeOutline: true,
          maxScansPerSecond: 8,
        },
      );
    }
    const s = scannerRef.current;
    if (scanning) {
      s.start()
        .then(() => setCameraError(''))
        .catch(() =>
          setCameraError(
            'The camera is not available. Allow camera access, or type the ticket code instead.',
          ),
        );
    } else {
      s.pause();
    }
  }, [scanning, handle]);

  useEffect(
    () => () => {
      scannerRef.current?.destroy();
      scannerRef.current = null;
      if (dismissTimer.current) window.clearTimeout(dismissTimer.current);
    },
    [],
  );

  const undo = async (ticketId: string) => {
    try {
      const r = await api.current.undo(ticketId);
      if (r.undone) setLastAdmit(null);
      show({
        tone: r.undone ? 'dup' : 'bad',
        title: r.undone ? 'Check-in undone' : 'Cannot undo',
        lines: [r.message],
        auto: r.undone,
      });
      refreshStats();
    } catch (err) {
      if (err instanceof CrewError && err.sessionLost) onLost();
    }
  };

  const undoLeft = lastAdmit ? Math.max(0, Math.ceil((lastAdmit.until - now) / 1000)) : 0;

  return (
    <main className="fixed inset-0 flex flex-col bg-background text-foreground">
      {/* header and counts */}
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold">{session.event.title}</h1>
          <p className="truncate text-xs text-muted-foreground">
            {session.pass.label} · {isDesk ? 'Desk' : 'Scan'} · {stats?.mine ?? 0} by you
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onSignOut} aria-label="Sign out of this pass">
          <LogOut /> Sign out
        </Button>
      </header>

      <section
        className="grid grid-cols-3 border-b border-border text-center"
        aria-label="Attendance"
      >
        <Stat label="In" value={stats?.checkedIn} accent />
        <Stat label="Still expected" value={stats?.remaining} />
        <Stat label="Last minute" value={stats?.perMinute} />
      </section>
      {stats?.overVenueCapacity && (
        <p
          role="alert"
          className="flex items-center justify-center gap-1.5 bg-destructive px-3 py-1.5 text-center text-xs font-semibold text-destructive-foreground"
        >
          <TriangleAlert className="size-3.5" aria-hidden /> More people are in than the venue limit
          ({stats.venueCapacity}).
        </p>
      )}

      {/* camera */}
      <div className="relative min-h-0 flex-1 bg-foreground">
        <video ref={videoRef} className="size-full object-cover" playsInline muted />
        {cameraError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background p-6 text-center">
            <CameraOff className="size-8 text-muted-foreground" aria-hidden />
            <p className="max-w-xs text-sm text-muted-foreground">{cameraError}</p>
            <Button onClick={() => setPanel('code')}>
              <Keyboard /> Type a ticket code
            </Button>
          </div>
        )}
        {!cameraError && scanning && (
          <p className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-xs font-medium text-background drop-shadow">
            Point the camera at the ticket QR
          </p>
        )}

        {/* undo chip */}
        {lastAdmit && undoLeft > 0 && !overlay && (
          <button
            type="button"
            onClick={() => undo(lastAdmit.id)}
            className="absolute right-3 top-3 inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full bg-background px-4 text-sm font-medium text-foreground shadow-e2"
          >
            <Undo2 className="size-4" aria-hidden /> Undo {lastAdmit.name.split(' ')[0]} ({undoLeft}
            s)
          </button>
        )}

        {/* result */}
        {overlay && (
          <button
            type="button"
            role="alert"
            onClick={close}
            className={cn(
              'absolute inset-0 z-20 flex cursor-pointer flex-col items-center justify-center gap-3 px-6 text-center',
              OVERLAY_STYLE[overlay.tone],
            )}
          >
            {overlay.tone === 'ok' ? (
              <Check className="size-20" aria-hidden />
            ) : overlay.tone === 'net' ? (
              <WifiOff className="size-16" aria-hidden />
            ) : (
              <X className="size-20" aria-hidden />
            )}
            <span className="text-3xl font-extrabold leading-tight">{overlay.title}</span>
            {overlay.lines.map((l, i) => (
              <span key={i} className="text-lg font-medium opacity-90">
                {l}
              </span>
            ))}
            {!overlay.auto && <span className="mt-4 text-sm opacity-80">Tap to continue</span>}
          </button>
        )}
      </div>

      {/* actions */}
      <footer className="flex gap-2 border-t border-border p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <Button variant="outline" size="lg" className="flex-1" onClick={() => setPanel('code')}>
          <Keyboard /> Type code
        </Button>
        {isDesk && (
          <Button variant="outline" size="lg" className="flex-1" onClick={() => setPanel('search')}>
            <Search /> Find name
          </Button>
        )}
      </footer>

      {panel && (
        <Sheet
          onClose={() => setPanel(null)}
          title={panel === 'code' ? 'Type the ticket code' : 'Find a person'}
        >
          {panel === 'code' ? (
            <CodeEntry
              onSubmit={async (code) => {
                setPanel(null);
                await handle(() => api.current.byCode(code));
              }}
            />
          ) : (
            <NameSearch
              search={(q) => api.current.search(q)}
              onPick={async (hit) => {
                setPanel(null);
                await handle(() => api.current.manual(hit.id));
              }}
              onLost={onLost}
            />
          )}
        </Sheet>
      )}
    </main>
  );
}

function Stat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value?: number;
  accent?: boolean;
}) {
  return (
    <div className="px-2 py-2">
      <p className={cn('text-2xl font-bold tabular-nums', accent && 'text-primary')}>
        {value ?? '–'}
      </p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-background">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-base font-semibold">{title}</h2>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
          <X />
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
    </div>
  );
}

function CodeEntry({ onSubmit }: { onSubmit: (code: string) => void }) {
  const [code, setCode] = useState('');
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (code.trim().length >= 4) onSubmit(code.trim());
      }}
    >
      <label htmlFor="ticket-code" className="text-sm text-muted-foreground">
        The 6-character code printed under the QR, for example K7M-3Q9.
      </label>
      <Input
        id="ticket-code"
        autoFocus
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        autoCapitalize="characters"
        autoComplete="off"
        spellCheck={false}
        maxLength={10}
        className="h-14 text-center font-mono text-2xl tracking-widest"
      />
      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={code.replace(/[\s-]/g, '').length < 6}
      >
        Check in
      </Button>
    </form>
  );
}

function NameSearch({
  search,
  onPick,
  onLost,
}: {
  search: (q: string) => Promise<{ data: CrewSearchHit[] }>;
  onPick: (hit: CrewSearchHit) => void;
  onLost: () => void;
}) {
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<CrewSearchHit[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (q.trim().length < 2) return setHits([]);
    setLoading(true);
    const t = window.setTimeout(async () => {
      try {
        setHits((await search(q)).data);
      } catch (err) {
        if (err instanceof CrewError && err.sessionLost) onLost();
      }
      setLoading(false);
    }, 250);
    return () => window.clearTimeout(t);
  }, [q, search, onLost]);

  return (
    <div className="space-y-3">
      <Input
        autoFocus
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Name or ticket code"
        aria-label="Search by name or ticket code"
        className="h-12"
      />
      {loading && (
        <Loader2 className="mx-auto size-4 animate-spin text-muted-foreground" aria-hidden />
      )}
      <ul className="space-y-2">
        {hits.map((h) => (
          <li
            key={h.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-border p-3"
          >
            <div className="min-w-0">
              <p className="truncate font-medium">{h.holderName}</p>
              <p className="truncate text-xs text-muted-foreground">
                {prettyCode(h.code)}
                {h.isGuest ? ` · guest of ${h.registrant}` : ''}
              </p>
            </div>
            {h.status === 'CHECKED_IN' ? (
              <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-success-soft-foreground">
                <Users className="size-3.5" aria-hidden /> In at {fmtClock(h.checkedInAt)}
              </span>
            ) : (
              <Button size="sm" onClick={() => onPick(h)}>
                {' '}
                Check in
              </Button>
            )}
          </li>
        ))}
        {q.trim().length >= 2 && !loading && hits.length === 0 && (
          <li className="py-6 text-center text-sm text-muted-foreground">
            No one with that name has a ticket.
          </li>
        )}
      </ul>
    </div>
  );
}
