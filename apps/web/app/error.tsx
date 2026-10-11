'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { startTransition, useEffect } from 'react';
import { RefreshCw, Home, TriangleAlert } from 'lucide-react';
import { isChunkError, reloadForChunkError } from '@/lib/chunk-error';

/**
 * Catches render/runtime errors in any route segment (instead of Next's bare
 * "This page couldn't load") and offers a retry that re-renders just that segment.
 */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  const chunk = isChunkError(error);

  useEffect(() => {
    console.error('[route error]', error);
    // Stale tab after a deploy: pick up the new build instead of showing an error.
    if (chunk) reloadForChunkError();
  }, [error, chunk]);

  const retry = () => {
    if (chunk) {
      window.location.reload();
      return;
    }
    // Re-fetch server data too, not just re-render the client segment.
    startTransition(() => {
      router.refresh();
      reset();
    });
  };

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-16">
      <div className="ui-pop w-full max-w-md text-center">
        <div className="relative mx-auto mb-6 h-20 w-20">
          <span
            className="ui-glow absolute inset-0 rounded-3xl bg-destructive/20 blur-2xl"
            aria-hidden
          />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-danger-soft text-danger-soft-foreground">
            <TriangleAlert className="h-9 w-9" />
          </div>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This page hit a problem loading. Your data is safe — try again, or head back home.
        </p>
        {error.digest && (
          <p className="mt-2 text-xs text-muted-foreground/70">Reference: {error.digest}</p>
        )}
        <div className="mt-6 flex flex-col-reverse items-stretch gap-2.5 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="ui-press inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 text-sm font-semibold text-foreground hover:bg-secondary"
          >
            <Home className="h-4 w-4" /> Go home
          </Link>
          <button
            type="button"
            onClick={retry}
            className="ui-press inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <RefreshCw className="h-4 w-4" /> Try again
          </button>
        </div>
      </div>
    </div>
  );
}
