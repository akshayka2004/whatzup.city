import { FEATURES } from './home-data';

/** Static capability cards. The reveal sits on the wrapper; hover-lift on the card (animations would otherwise pin the transform). */
export function FeatureGrid() {
  return (
    <section className="mb-10 md:mb-14">
      <div className="mb-6 text-center md:mb-8">
        <h2 className="mb-2 text-2xl font-black text-foreground">Platform Capabilities</h2>
        <p className="mx-auto max-w-lg text-sm leading-relaxed text-muted-foreground">
          A complete trust-oriented suite serving local customers, verified sellers, and civic administrators.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, description }) => (
          <div key={title} className="ui-reveal">
            <div className="ui-hairline ui-lift group flex h-full items-start gap-4 rounded-2xl p-5 sm:block sm:p-6">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/12 transition-colors group-hover:bg-primary/20 sm:mb-4">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <h3 className="mb-1.5 text-sm font-bold text-foreground">{title}</h3>
                <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
