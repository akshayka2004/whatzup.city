import Link from 'next/link';
import { QrCode, RefreshCw, Search } from 'lucide-react';

export const metadata = { title: 'QR code not available', robots: { index: false } };

export default async function QrUnavailable({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;
  const down = reason === 'down';

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-16">
      <div className="ui-pop w-full max-w-md text-center">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand-soft-foreground">
          <QrCode className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {down ? 'We couldn’t open that business' : 'This business isn’t listed right now'}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {down
            ? 'Something went wrong on our side. Scan the code again in a moment.'
            : 'The shop may have been removed or is waiting for approval. You can still find other places near you.'}
        </p>
        <div className="mt-6 flex flex-col items-stretch gap-2.5 sm:flex-row sm:justify-center">
          <Link
            href="/search"
            className="ui-press inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <Search className="h-4 w-4" /> Search businesses
          </Link>
          <Link
            href="/"
            className="ui-press inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 text-sm font-semibold text-foreground hover:bg-secondary"
          >
            {down ? <RefreshCw className="h-4 w-4" /> : null} Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
