import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';

/** Promo card for the lucky-wheel feature (/spin-it). Static, no data needed. */
export function SpinPromo() {
  return (
    <section className="ui-reveal mb-10 md:mb-14">
      <Link
        href="/spin-it"
        className="ui-hairline ui-lift ui-press group relative flex items-center gap-4 overflow-hidden rounded-3xl p-5 sm:gap-6 sm:p-7"
      >
        <div
          aria-hidden
          className="ui-drift-slow pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-primary/15 blur-3xl"
        />

        <div className="relative shrink-0">
          <span
            aria-hidden
            className="ui-glow absolute inset-0 rounded-2xl bg-primary/30 blur-lg"
          />
          <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground sm:h-16 sm:w-16">
            <Sparkles className="h-7 w-7 sm:h-8 sm:w-8" />
          </span>
        </div>

        <div className="relative min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wider text-primary">Spin &amp; Win</p>
          <h2 className="text-lg font-black leading-tight text-foreground sm:text-xl">
            Try your luck at a local lucky wheel
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">
            Spin a business&apos;s wheel, win a discount voucher and use it in store.
          </p>
        </div>

        <span className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-transform group-hover:translate-x-0.5 sm:w-auto sm:gap-2 sm:px-5">
          <span className="hidden sm:inline">Spin now</span>
          <ArrowRight className="h-4 w-4" />
        </span>
      </Link>
    </section>
  );
}
