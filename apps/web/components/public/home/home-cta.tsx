import Link from 'next/link';
import { ArrowRight, Globe, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Closing call-to-action with two slow-drifting background blobs. */
export function HomeCta() {
  return (
    <section className="ui-reveal relative mb-6 overflow-hidden rounded-3xl border border-primary/20 bg-primary/8">
      <div
        aria-hidden
        className="ui-drift pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-primary/20 blur-3xl"
      />
      <div
        aria-hidden
        className="ui-drift-slow pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-primary/15 blur-3xl"
      />

      <div className="relative px-6 py-12 text-center md:px-10 md:py-16">
        <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/25 bg-primary/15">
          <Globe className="h-7 w-7 text-primary" />
        </div>
        <h2 className="mb-3 text-balance text-2xl font-black text-foreground md:text-4xl">
          Expand Your Local Reach Today
        </h2>
        <p className="mx-auto mb-8 max-w-md text-pretty text-sm leading-relaxed text-muted-foreground md:text-base">
          Join Kerala&apos;s growing local network — discover businesses, claim deals, verify
          invoices and stay informed on Whtzup.city.
        </p>
        <div className="mx-auto flex max-w-sm flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
          <Button
            asChild
            className="ui-press h-12 cursor-pointer rounded-xl bg-primary px-7 font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <Link href="/search">
              <Search className="mr-2 h-4 w-4" />
              Explore listings
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="ui-press h-12 cursor-pointer rounded-xl border-primary/30 px-7 font-semibold text-foreground hover:bg-primary/10"
          >
            <Link href="/register">
              Register your business
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
