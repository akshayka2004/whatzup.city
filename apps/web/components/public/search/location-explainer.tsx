'use client';

import { Loader2, MapPin, Navigation } from 'lucide-react';

export type GeoState = 'idle' | 'asking' | 'denied' | 'unavailable' | 'error';

const COPY: Record<GeoState, { title: string; body: string; allow?: string }> = {
  idle: {
    title: 'Find businesses near you',
    body: "Allow your location and we'll show the closest places first, with how far each one is. Your location stays in your browser and is never saved.",
    allow: 'Allow location',
  },
  asking: {
    title: 'Waiting for permission…',
    body: 'Choose “Allow” in your browser’s prompt to continue.',
  },
  denied: {
    title: 'Location is turned off',
    body: 'To see what’s near you, allow location for this site in your browser settings, then try again.',
    allow: 'Try again',
  },
  error: {
    title: "We couldn't find you",
    body: 'Your position took too long or was not available. Check your GPS or connection and try again.',
    allow: 'Try again',
  },
  unavailable: {
    title: "Location isn't available",
    body: "This browser can't share your position. You can still browse by city below.",
  },
};

/**
 * Friendly card shown *before* the browser's own permission prompt, so the
 * prompt never appears out of the blue. CSS-only radar rings, no map library.
 */
export function LocationExplainer({
  state,
  onAllow,
  onDismiss,
}: {
  state: GeoState;
  onAllow: () => void;
  onDismiss: () => void;
}) {
  const c = COPY[state];
  const asking = state === 'asking';

  return (
    <section
      aria-live="polite"
      className="ui-fade-up relative mb-6 overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-5 sm:p-7"
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-7">
        {/* Radar */}
        <div className="relative mx-auto flex h-28 w-28 shrink-0 items-center justify-center sm:mx-0" aria-hidden>
          <span className="absolute inset-0 rounded-full border border-primary/15" />
          <span className="absolute inset-3 rounded-full border border-primary/25" />
          <span className="absolute inset-6 rounded-full border border-primary/35" />
          <span className="ui-glow absolute inset-8 rounded-full bg-primary/20 blur-md" />
          <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md">
            {asking ? <Loader2 className="h-5 w-5 animate-spin" /> : <MapPin className="h-5 w-5" />}
          </span>
        </div>

        <div className="min-w-0 flex-1 text-center sm:text-left">
          <h2 className="text-lg font-bold text-foreground sm:text-xl">{c.title}</h2>
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted-foreground">{c.body}</p>
          {!asking && (
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5 sm:justify-start">
              {c.allow && (
                <button
                  type="button"
                  onClick={onAllow}
                  className="ui-press inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <Navigation className="h-4 w-4" />
                  {c.allow}
                </button>
              )}
              <button
                type="button"
                onClick={onDismiss}
                className="ui-press inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-border bg-card px-5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
              >
                {c.allow ? 'Browse by city instead' : 'Okay'}
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
