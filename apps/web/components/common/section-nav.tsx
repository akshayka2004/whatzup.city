'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export interface SectionLink {
  id: string;
  label: string;
}

/**
 * Sticky chip bar that jumps to the sections of a long page (Settings, etc.) and highlights the one in view.
 * Sections need `id` and `className="scroll-mt-28"`. The app scrolls inside <main>, so the observer
 * is rooted there. Falls back to plain anchors when IntersectionObserver is unavailable.
 */
export function SectionNav({ sections, className }: { sections: SectionLink[]; className?: string }) {
  const [active, setActive] = useState(sections[0]?.id);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const root = document.getElementById('main-content');
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { root, rootMargin: '-96px 0px -60% 0px', threshold: 0 },
    );
    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, [sections]);

  return (
    <nav
      aria-label="Sections"
      className={cn('sticky top-0 z-20 -mx-4 border-b border-border/60 bg-background/90 px-4 py-2 backdrop-blur', className)}
    >
      <div className="ui-scroll-x flex gap-2">
        {sections.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            aria-current={active === s.id ? 'true' : undefined}
            className={cn(
              'ui-press inline-flex min-h-10 shrink-0 items-center rounded-full border px-4 text-sm font-medium transition-colors',
              active === s.id
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-card text-muted-foreground hover:text-foreground',
            )}
          >
            {s.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
