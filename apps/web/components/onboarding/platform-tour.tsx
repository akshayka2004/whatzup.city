'use client';

import { useEffect, useState, useCallback } from 'react';
import { X, ArrowRight, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface TourStep {
  /** CSS selector for the element to highlight. Omit for a centered welcome/closing slide. */
  selector?: string;
  title: string;
  description: string;
}

interface OnboardingTourProps {
  steps: TourStep[];
  /** localStorage key — once set, the tour never auto-starts again. */
  storageKey: string;
  /** Delay before the tour auto-starts, so the page has time to render its targets. */
  startDelayMs?: number;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PADDING = 8;

export function OnboardingTour({ steps, storageKey, startDelayMs = 600 }: OnboardingTourProps) {
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || steps.length === 0) return;
    let seen = false;
    try {
      seen = localStorage.getItem(storageKey) === '1';
    } catch {
      /* storage unavailable — never block the tour on this */
    }
    if (seen) return;
    const t = setTimeout(() => setActive(true), startDelayMs);
    return () => clearTimeout(t);
  }, [storageKey, startDelayMs, steps.length]);

  const measure = useCallback(() => {
    const step = steps[stepIndex];
    if (!step?.selector) {
      setRect(null);
      return;
    }
    const el = document.querySelector(step.selector);
    if (!el) {
      // Target not on this page (e.g. mobile layout) — skip straight past it.
      setStepIndex((i) => (i < steps.length - 1 ? i + 1 : i));
      return;
    }
    const r = el.getBoundingClientRect();
    setRect({
      top: r.top - PADDING,
      left: r.left - PADDING,
      width: r.width + PADDING * 2,
      height: r.height + PADDING * 2,
    });
    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [stepIndex, steps]);

  useEffect(() => {
    if (!active) return;
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [active, measure]);

  useEffect(() => {
    if (!active) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [active]);

  const finish = useCallback(() => {
    setActive(false);
    try {
      localStorage.setItem(storageKey, '1');
    } catch {
      /* non-fatal */
    }
  }, [storageKey]);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish();
      if (e.key === 'ArrowRight') setStepIndex((i) => Math.min(i + 1, steps.length - 1));
      if (e.key === 'ArrowLeft') setStepIndex((i) => Math.max(i - 1, 0));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, finish, steps.length]);

  if (!active || steps.length === 0) return null;

  const step = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;

  // Tooltip placement: below the highlight if there's room, else above; falls
  // back to viewport-centered when there's no target (welcome/closing slide).
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const cardWidth = Math.min(340, vw - 32);
  let cardStyle: React.CSSProperties;
  if (rect) {
    const spaceBelow = vh - (rect.top + rect.height);
    const placeBelow = spaceBelow > 200 || spaceBelow > rect.top;
    const top = placeBelow ? rect.top + rect.height + 14 : undefined;
    const bottom = !placeBelow ? vh - rect.top + 14 : undefined;
    const left = Math.min(Math.max(rect.left, 16), vw - cardWidth - 16);
    cardStyle = { position: 'fixed', top, bottom, left, width: cardWidth };
  } else {
    cardStyle = {
      position: 'fixed', top: '50%', left: '50%',
      transform: 'translate(-50%, -50%)', width: cardWidth,
    };
  }

  return (
    <div className="fixed inset-0" style={{ zIndex: 300 }} role="dialog" aria-modal="true" aria-label="Platform guide">
      {/* Spotlight cutout — dark everywhere except a lit box around the target */}
      <div
        className="fixed rounded-2xl transition-all duration-300 pointer-events-none"
        style={
          rect
            ? { top: rect.top, left: rect.left, width: rect.width, height: rect.height, boxShadow: '0 0 0 9999px rgba(0,0,0,0.65)', outline: '2px solid var(--primary, #6e41db)' }
            : { inset: 0, boxShadow: '0 0 0 9999px rgba(0,0,0,0.65)' }
        }
      />

      {/* Tooltip card */}
      <div
        style={cardStyle}
        className="rounded-2xl border border-border bg-card p-5 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 mb-1">
          <h3 className="text-sm font-bold text-foreground">{step.title}</h3>
          <button
            onClick={finish}
            aria-label="Close guide"
            className="text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">{step.description}</p>

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            {steps.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === stepIndex ? 'w-4 bg-primary' : 'w-1.5 bg-border'
                }`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {stepIndex > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStepIndex((i) => i - 1)}
                className="h-8 px-2.5 gap-1 cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
              </Button>
            )}
            {!isLast ? (
              <Button
                size="sm"
                onClick={() => setStepIndex((i) => i + 1)}
                className="h-8 px-3 gap-1 text-xs cursor-pointer"
              >
                Next <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button size="sm" onClick={finish} className="h-8 px-3 text-xs cursor-pointer">
                Got it
              </Button>
            )}
          </div>
        </div>
        {!isLast && (
          <button
            onClick={finish}
            className="mt-3 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
          >
            Skip tour
          </button>
        )}
      </div>
    </div>
  );
}
