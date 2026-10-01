'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiService } from '@/lib/services/api-service';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, AlertTriangle } from 'lucide-react';
import { DiscountTicket } from './discount-ticket';

interface ActiveDiscount {
  id: string;
  businessId: string;
  businessName: string;
  itemName: string;
  description?: string | null;
  wheelPercentages: number[];
  mySpin: { discountPercent: number; code: string; status: string; itemName: string; expiresAt?: string | null } | null;
}

const SEGMENT_COLORS = ['#f43f5e', '#f59e0b', '#10b981', '#06b6d4', '#6366f1', '#ec4899', '#84cc16'];
const CONFETTI_COLORS = ['#f43f5e', '#f59e0b', '#10b981', '#06b6d4', '#6366f1', '#ec4899', '#facc15'];
const SPIN_DURATION_MS = 4200;

function makeConfetti(count = 28) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 0.25,
    duration: 1.1 + Math.random() * 0.7,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    rotate: Math.round(Math.random() * 360),
  }));
}

interface LuckyWheelProps {
  businessId: string;
  /** Only render once we know the viewer is signed in — matches the Vouchers section's own gate. */
  enabled: boolean;
}

export function LuckyWheel({ businessId, enabled }: LuckyWheelProps) {
  const [discount, setDiscount] = useState<ActiveDiscount | null>(null);
  const [loading, setLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<{ discountPercent: number; code: string; status: string; expiresAt?: string | null } | null>(null);
  const [error, setError] = useState('');
  const [confetti, setConfetti] = useState<ReturnType<typeof makeConfetti>>([]);

  useEffect(() => {
    if (!enabled || !businessId) return;
    let alive = true;
    apiService.get<ActiveDiscount>(`/v1/discounts/business/${businessId}/active`).then((res) => {
      if (!alive) return;
      if (!res.error && res.data) setDiscount(res.data);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [enabled, businessId]);

  const segments = discount?.wheelPercentages || [];
  const segmentDeg = segments.length ? 360 / segments.length : 0;

  const wheelBackground = useMemo(() => {
    if (!segments.length) return undefined;
    const stops = segments.map((_, i) => {
      const color = SEGMENT_COLORS[i % SEGMENT_COLORS.length];
      return `${color} ${i * segmentDeg}deg ${(i + 1) * segmentDeg}deg`;
    });
    return `conic-gradient(${stops.join(', ')})`;
  }, [segments, segmentDeg]);

  // Thin separator lines at each segment boundary, layered on top of the colors.
  const dividerOverlay = useMemo(() => {
    if (!segments.length) return undefined;
    return `repeating-conic-gradient(from 0deg, rgba(255,255,255,0.3) 0deg 1deg, transparent 1deg ${segmentDeg}deg)`;
  }, [segments, segmentDeg]);

  const handleSpin = async () => {
    if (!discount || spinning) return;
    setSpinning(true);
    setError('');
    const res = await apiService.post<any>(`/v1/discounts/${discount.id}/spin`, {});
    if (res.error || !res.data) {
      setError(res.error || "Couldn't spin the wheel. Please try again.");
      setSpinning(false);
      return;
    }
    const { winningIndex, discountPercent, code, status, expiresAt } = res.data;
    const landedCenter = (winningIndex ?? 0) * segmentDeg + segmentDeg / 2;
    const extraSpins = 6;
    setRotation((prev) => prev + extraSpins * 360 + (360 - landedCenter) - (prev % 360));
    setTimeout(() => {
      setResult({ discountPercent, code, status: status || 'UNLOCKED', expiresAt });
      setSpinning(false);
      setConfetti(makeConfetti());
      setTimeout(() => setConfetti([]), 1700);
    }, SPIN_DURATION_MS);
  };

  if (!enabled || loading || !discount) return null;

  const ticket = result || discount.mySpin;

  return (
    <div className="disc-fade-up relative mb-8 overflow-hidden rounded-2xl border border-border bg-gradient-to-b from-primary/[0.04] to-transparent p-6">
      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-bold text-foreground">Spin & win a discount</h2>
      </div>

      {/* Confetti burst on a fresh win */}
      {confetti.length > 0 && (
        <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
          {confetti.map((c) => (
            <span
              key={c.id}
              className="disc-confetti"
              style={{
                left: `${c.left}%`,
                backgroundColor: c.color,
                animationDelay: `${c.delay}s`,
                animationDuration: `${c.duration}s`,
                transform: `rotate(${c.rotate}deg)`,
              }}
            />
          ))}
        </div>
      )}

      {ticket ? (
        <div className="disc-pop">
          <DiscountTicket
            businessName={discount.businessName}
            itemName={discount.itemName}
            discountPercent={ticket.discountPercent}
            code={ticket.code}
            status={ticket.status}
            expiresAt={ticket.expiresAt}
          />
        </div>
      ) : (
        <div className="flex flex-col items-center gap-5">
          <p className="text-sm text-muted-foreground text-center max-w-xs">
            Spin for a discount on <span className="font-semibold text-foreground">{discount.itemName}</span>.
            {discount.description && <span className="block mt-1 text-xs">{discount.description}</span>}
          </p>

          <div className="relative" style={{ width: 264, height: 264 }}>
            {/* Ambient glow ring inviting a spin */}
            <div
              className="disc-glow absolute inset-0 rounded-full blur-xl"
              style={{ background: wheelBackground }}
            />

            {/* Ambient sparkles around the rim */}
            {!spinning && [0, 1, 2].map((i) => (
              <span
                key={i}
                className="disc-sparkle h-1.5 w-1.5 rounded-full bg-primary"
                style={{
                  left: `${18 + i * 32}%`,
                  top: i % 2 === 0 ? '-2px' : 'auto',
                  bottom: i % 2 !== 0 ? '-2px' : 'auto',
                  animationDelay: `${i * 0.5}s`,
                }}
              />
            ))}

            {/* Pointer */}
            <div
              className={`absolute left-1/2 -top-2 z-10 w-0 h-0 border-l-[11px] border-l-transparent border-r-[11px] border-r-transparent border-t-[18px] border-t-foreground drop-shadow-md ${!spinning ? 'disc-pointer-idle' : ''}`}
              style={{ transform: 'translateX(-50%)' }}
            />

            <div
              className="relative h-full w-full rounded-full border-[5px] border-border shadow-[0_8px_30px_rgba(0,0,0,0.25)] overflow-hidden"
              style={{
                background: wheelBackground,
                transform: `rotate(${rotation}deg)`,
                transition: spinning ? `transform ${SPIN_DURATION_MS}ms cubic-bezier(0.17,0.67,0.12,0.99)` : 'transform .3s ease-out',
              }}
            >
              {/* Segment dividers */}
              <div className="absolute inset-0 rounded-full" style={{ background: dividerOverlay }} />

              {segments.map((pct, i) => {
                const angle = i * segmentDeg + segmentDeg / 2;
                return (
                  <div
                    key={i}
                    className="absolute left-1/2 top-1/2 text-sm font-extrabold text-white"
                    style={{
                      transform: `rotate(${angle}deg) translate(0, -96px) rotate(${-angle}deg) translate(-50%, -50%)`,
                      textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                    }}
                  >
                    {pct}%
                  </div>
                );
              })}
            </div>

            {/* Center hub */}
            <div className="absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-background border-[3px] border-border shadow-md">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" /> <span className="break-words min-w-0">{error}</span>
            </div>
          )}

          <Button
            onClick={handleSpin}
            disabled={spinning}
            className="relative overflow-hidden gap-1.5 px-8 shadow-lg shadow-primary/25 transition-transform hover:scale-[1.03] active:scale-[0.98] disabled:hover:scale-100"
          >
            <span className="disc-shimmer pointer-events-none absolute inset-0" />
            <span className="relative flex items-center gap-1.5">
              {spinning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {spinning ? 'Spinning…' : 'Spin the wheel'}
            </span>
          </Button>
        </div>
      )}
    </div>
  );
}
