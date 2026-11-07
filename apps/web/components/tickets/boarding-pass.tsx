'use client';

import { forwardRef, useEffect, useRef, type ReactNode } from 'react';
import QRCode from 'qrcode';
import { CheckCircle2, Plane, Ticket } from 'lucide-react';
import { fmtClock, prettyCode } from '@/lib/event-booking';

/**
 * The event ticket, laid out like a flight boarding pass: brand band, a date → city "route", the
 * details in a grid, a perforated tear line, and a stub with the QR. It keeps its own colours (it
 * is a printed object, so it looks the same in light and dark mode and saves as a picture).
 */

const PASS = {
  bandFrom: '#3730A3',
  bandTo: '#6D5BF0',
  accent: '#34D399',
  paper: '#FFFFFF',
  stub: '#F3F2FF',
  ink: '#1C1B2E',
  muted: '#5E5D75',
  line: '#D9D7F5',
  chip: 'rgba(255,255,255,0.18)',
} as const;

export type PassState = 'VALID' | 'USED' | 'PENDING' | 'CANCELLED' | 'SAMPLE';

export interface PassData {
  title: string;
  startDate: string;
  endDate: string;
  venue: string | null;
  city: string | null;
  holderName: string;
  code: string;
  isGuest: boolean;
  /** What the QR holds. Null while there is no QR to show (waiting for payment, cancelled). */
  qr: string | null;
  checkedInAt?: string | null;
  note?: string | null;
  /** Events booked by day: which day this pass admits to. Start and end are then that day's hours. */
  dayLabel?: string | null;
}

/** The mark, drawn with fixed colours so it also works on the coloured band and in a saved picture. */
function PassMark({ size = 36 }: { size?: number }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} role="img" aria-label="Whtzup.city">
      <rect width="32" height="32" rx="9" fill="#FFFFFF" />
      <path
        d="M7.5 11.5 L11.6 22 L16 13.8 L20.4 22 L24.5 11.5"
        fill="none"
        stroke="#4338CA"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="24.5" cy="7.5" r="2.6" fill="#34D399" />
    </svg>
  );
}

/** Looks like a barcode, but is only decoration: the bars come from the ticket code. */
function BarStrip({ seed, color }: { seed: string; color: string }) {
  let h = 7;
  const bars: { x: number; w: number }[] = [];
  let x = 0;
  for (let i = 0; i < 46; i++) {
    h = (h * 31 + seed.charCodeAt(i % seed.length) + i * 17) % 9973;
    const w = 1 + (h % 3);
    bars.push({ x, w });
    x += w + 1 + (h % 2);
  }
  return (
    <svg viewBox={`0 0 ${x} 28`} className="h-7 w-full" preserveAspectRatio="none" aria-hidden>
      {bars.map((b, i) => (
        <rect key={i} x={b.x} y={0} width={b.w} height={28} fill={color} />
      ))}
    </svg>
  );
}

const MONTH_DAY = (iso: string) => {
  const d = new Date(iso);
  const tz = 'Asia/Kolkata';
  return {
    day: d.toLocaleDateString('en-IN', { day: '2-digit', timeZone: tz }),
    month: d.toLocaleDateString('en-IN', { month: 'short', timeZone: tz }).toUpperCase(),
    weekday: d.toLocaleDateString('en-IN', { weekday: 'long', timeZone: tz }),
    year: d.toLocaleDateString('en-IN', { year: 'numeric', timeZone: tz }),
  };
};

/** A three-letter place code for the "route": KOC for Kochi, like an airport code. */
const placeCode = (city: string | null) =>
  (city ?? 'EVT')
    .replace(/[^A-Za-z]/g, '')
    .slice(0, 3)
    .toUpperCase()
    .padEnd(3, 'X');

/** The two half-circle bites out of the tear line, cut with a mask so they show the page behind. */
const topMask = {
  WebkitMaskImage:
    'radial-gradient(circle 11px at 0 100%, transparent 98%, #000), radial-gradient(circle 11px at 100% 100%, transparent 98%, #000)',
  WebkitMaskComposite: 'source-in',
  maskImage:
    'radial-gradient(circle 11px at 0 100%, transparent 98%, #000), radial-gradient(circle 11px at 100% 100%, transparent 98%, #000)',
  maskComposite: 'intersect',
} as const;
const stubMask = {
  WebkitMaskImage:
    'radial-gradient(circle 11px at 0 0, transparent 98%, #000), radial-gradient(circle 11px at 100% 0, transparent 98%, #000)',
  WebkitMaskComposite: 'source-in',
  maskImage:
    'radial-gradient(circle 11px at 0 0, transparent 98%, #000), radial-gradient(circle 11px at 100% 0, transparent 98%, #000)',
  maskComposite: 'intersect',
} as const;

export const BoardingPass = forwardRef<
  HTMLDivElement,
  {
    data: PassData;
    state: PassState;
    /** Shown in place of the QR while the seat waits for payment. */
    pendingSlot?: ReactNode;
  }
>(function BoardingPass({ data, state, pendingSlot }, ref) {
  const t = PASS;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const start = MONTH_DAY(data.startDate);
  const where = [data.venue, data.city].filter(Boolean).join(', ');
  const live = state === 'VALID' || state === 'USED' || state === 'SAMPLE';
  const dim = state === 'USED' || state === 'CANCELLED';

  useEffect(() => {
    if (!data.qr || !live || !canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, data.qr, {
      width: 480,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#111111', light: '#FFFFFF' },
    })
      .then(() => {
        // The QR library pins the canvas to its pixel width; keep it at the size the layout wants.
        if (canvasRef.current) {
          canvasRef.current.style.width = '200px';
          canvasRef.current.style.height = '200px';
        }
      })
      .catch(() => undefined);
  }, [data.qr, live]);

  const stamp =
    state === 'USED'
      ? { text: 'ADMITTED', color: '#15803D' }
      : state === 'CANCELLED'
        ? { text: 'CANCELLED', color: '#B91C1C' }
        : state === 'SAMPLE'
          ? { text: 'SAMPLE', color: '#B45309' }
          : null;

  return (
    <div
      ref={ref}
      className="relative mx-auto w-full max-w-[380px] select-none font-sans"
      style={{ color: t.ink }}
    >
      {/* ── top half: brand band, route, details ───────────────────────────── */}
      <div className="overflow-hidden rounded-t-[22px]" style={{ background: t.paper, ...topMask }}>
        <div
          className="relative px-5 pb-5 pt-4 text-white"
          style={{ backgroundImage: `linear-gradient(120deg, ${t.bandFrom}, ${t.bandTo})` }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <PassMark />
              <div className="leading-tight">
                <p className="text-[17px] font-bold tracking-tight">whtzup.city</p>
                <p className="text-xs font-medium opacity-80">Your city, in your pocket</p>
              </div>
            </div>
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.14em]"
              style={{ background: t.chip }}
            >
              <Ticket className="size-3.5" aria-hidden /> Event pass
            </span>
          </div>

          {/* date → place, like origin → destination */}
          <div className="mt-5 flex items-end justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-75">Date</p>
              <p className="text-[44px] font-extrabold leading-none tracking-tight">
                {start.day}
                <span className="ml-1 text-2xl font-bold" style={{ color: t.accent }}>
                  {start.month}
                </span>
              </p>
            </div>
            <div className="mb-2 flex min-w-0 flex-1 items-center gap-1 px-1" aria-hidden>
              <span className="h-px flex-1 border-t border-dashed border-white/60" />
              <Plane className="size-6 text-white" style={{ transform: 'rotate(45deg)' }} />
              <span className="h-px flex-1 border-t border-dashed border-white/60" />
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-75">City</p>
              <p className="text-[44px] font-extrabold leading-none tracking-tight">
                {placeCode(data.city)}
              </p>
            </div>
          </div>
          <div className="mt-1.5 flex justify-between text-xs font-medium opacity-85">
            <span>
              {start.weekday} {start.year}
            </span>
            <span>{data.city ?? 'Online'}</span>
          </div>
        </div>

        <div className="space-y-4 px-5 pb-6 pt-5">
          <div>
            <p
              className="text-xs font-semibold uppercase tracking-[0.16em]"
              style={{ color: t.muted }}
            >
              Event
            </p>
            <h2 className="mt-0.5 line-clamp-2 text-[22px] font-extrabold leading-tight">
              {data.title}
            </h2>
          </div>

          <dl className="grid grid-cols-3 gap-x-3 gap-y-3.5">
            <Field t={t} label="Attendee" value={data.holderName} wide />
            {data.dayLabel && <Field t={t} label="Day" value={data.dayLabel} wide />}
            <Field t={t} label="Starts" value={fmtClock(data.startDate)} />
            <Field t={t} label="Ends" value={fmtClock(data.endDate)} />
            <Field t={t} label="Admits" value={data.isGuest ? 'Guest · 1' : '1 person'} />
            {where && <Field t={t} label="Venue" value={where} wide />}
          </dl>

          {data.note && (
            <p
              className="rounded-xl px-3 py-2 text-xs"
              style={{ background: t.stub, color: t.muted }}
            >
              {data.note}
            </p>
          )}
        </div>
      </div>

      {/* ── tear line ─────────────────────────────────────────────────────── */}
      <div
        aria-hidden
        className="mx-[14px] border-t-2 border-dashed"
        style={{ borderColor: t.line }}
      />

      {/* ── stub: the QR ──────────────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden rounded-b-[22px] px-5 pb-5 pt-6"
        style={{ background: t.stub, ...stubMask }}
      >
        <div className="flex flex-col items-center gap-3">
          {live && data.qr ? (
            <div
              className={`relative rounded-2xl bg-white p-2.5 shadow-sm ${dim ? 'opacity-30' : ''}`}
              style={{ border: `2px solid ${t.line}` }}
            >
              <canvas
                ref={canvasRef}
                className="size-[200px] max-w-full"
                aria-label="Ticket QR code"
              />
            </div>
          ) : state === 'PENDING' ? (
            <div
              className="flex min-h-[200px] w-full max-w-[240px] flex-col items-center justify-center gap-3 rounded-2xl p-4 text-center text-sm font-medium"
              style={{ background: '#FEF3C7', color: '#78350F' }}
            >
              {pendingSlot}
            </div>
          ) : (
            <div
              className="flex size-[200px] items-center justify-center rounded-2xl p-5 text-center text-sm font-medium"
              style={{ background: t.paper, color: t.muted, border: `2px solid ${t.line}` }}
            >
              {data.note ?? 'This ticket cannot be used.'}
            </div>
          )}

          <div className="text-center">
            <p
              className="font-mono text-[26px] font-bold tracking-[0.22em]"
              aria-label="Ticket code"
              style={{ color: t.ink }}
            >
              {prettyCode(data.code)}
            </p>
            <p className="mt-0.5 text-xs" style={{ color: t.muted }}>
              {state === 'USED' && data.checkedInAt ? (
                <span
                  className="inline-flex items-center gap-1 font-semibold"
                  style={{ color: '#15803D' }}
                >
                  <CheckCircle2 className="size-3.5" aria-hidden /> Checked in at{' '}
                  {fmtClock(data.checkedInAt)}
                </span>
              ) : (
                'Show this QR at the gate. If it will not scan, read the code to the crew.'
              )}
            </p>
          </div>

          <div className="w-full opacity-70">
            <BarStrip seed={data.code} color={t.ink} />
          </div>
          <p className="text-xs font-semibold tracking-wide" style={{ color: t.muted }}>
            whtzup.city · one pass, one person
          </p>
        </div>
      </div>

      {/* ── stamp over the whole pass ─────────────────────────────────────── */}
      {stamp && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
        >
          <span
            className="-rotate-[18deg] rounded-xl border-[5px] px-5 py-1.5 text-[38px] font-black uppercase tracking-[0.12em]"
            style={{
              color: stamp.color,
              borderColor: stamp.color,
              opacity: state === 'SAMPLE' ? 0.28 : 0.85,
              background: state === 'SAMPLE' ? 'transparent' : 'rgba(255,255,255,0.55)',
            }}
          >
            {stamp.text}
          </span>
        </div>
      )}
    </div>
  );
});

function Field({
  t,
  label,
  value,
  wide,
}: {
  t: typeof PASS;
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div className={wide ? 'col-span-3' : undefined}>
      <dt className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: t.muted }}>
        {label}
      </dt>
      <dd className="mt-0.5 break-words text-[17px] font-bold leading-snug">{value}</dd>
    </div>
  );
}
