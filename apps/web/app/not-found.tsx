import Link from 'next/link';
import { Compass, Home, Search } from 'lucide-react';

export const metadata = { title: 'Page not found' };

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-16">
      <div className="ui-pop relative w-full max-w-md overflow-hidden text-center">
        <div
          className="ui-drift pointer-events-none absolute -top-10 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
          aria-hidden
        />
        <p className="relative text-7xl font-black tracking-tighter text-primary/90 sm:text-8xl">
          404
        </p>
        <div className="relative mx-auto -mt-1 mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand-soft-foreground">
          <Compass className="h-6 w-6" />
        </div>
        <h1 className="relative text-2xl font-bold tracking-tight text-foreground">
          We couldn&apos;t find that page
        </h1>
        <p className="relative mt-2 text-sm text-muted-foreground">
          The link may be old or the page may have moved. Try searching, or start from the home
          page.
        </p>
        <div className="relative mt-6 flex flex-col items-stretch gap-2.5 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="ui-press inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <Home className="h-4 w-4" /> Back to home
          </Link>
          <Link
            href="/search"
            className="ui-press inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 text-sm font-semibold text-foreground hover:bg-secondary"
          >
            <Search className="h-4 w-4" /> Search listings
          </Link>
        </div>
      </div>
    </div>
  );
}
