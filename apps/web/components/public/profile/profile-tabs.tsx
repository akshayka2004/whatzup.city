'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export type ProfileTab = { id: string; label: string };

/** Smooth-scroll to a section anchor (instant for reduced-motion users). */
export function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
}

/**
 * Sticky section tabs. They are plain `#anchor` links (work without JS); a
 * click smooth-scrolls instead, and a rAF-throttled scroll listener on the
 * app's scroller (<main>) keeps the active pill in sync.
 */
export function ProfileTabs({ tabs }: { tabs: ProfileTab[] }) {
  const ids = tabs.map((t) => t.id).join('|');
  const [active, setActive] = useState(tabs[0]?.id ?? '');
  const barRef = useRef<HTMLElement>(null);
  const lockUntil = useRef(0);

  useEffect(() => {
    const list = ids ? ids.split('|') : [];
    if (list.length === 0) return;
    const scroller = document.getElementById('main-content');
    const target: HTMLElement | Window = scroller ?? window;
    let raf = 0;

    const compute = () => {
      raf = 0;
      if (Date.now() < lockUntil.current) return; // a click is mid-scroll — let it land first
      const base = scroller ? scroller.getBoundingClientRect().top : 0;
      let current = list[0];
      for (const id of list) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top - base <= 130) current = id;
      }
      if (
        scroller &&
        scroller.scrollTop > 40 &&
        scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 4
      ) {
        current = list[list.length - 1];
      }
      setActive((prev) => (prev === current ? prev : current));
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(compute);
    };
    target.addEventListener('scroll', onScroll, { passive: true });
    compute();
    return () => {
      target.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [ids]);

  // Keep the active pill visible inside the horizontally scrolling bar.
  useEffect(() => {
    const bar = barRef.current;
    const el = bar?.querySelector<HTMLElement>(`[data-tab="${active}"]`);
    if (!bar || !el) return;
    bar.scrollTo({
      left: el.offsetLeft - (bar.clientWidth - el.offsetWidth) / 2,
      behavior: 'smooth',
    });
  }, [active]);

  return (
    <nav
      ref={barRef}
      aria-label="Business sections"
      className="ui-scroll-x sticky top-0 z-10 mb-5 mt-4 flex gap-1.5 border-b border-border bg-background/90 py-2 backdrop-blur-md [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {tabs.map((t) => (
        <a
          key={t.id}
          href={`#${t.id}`}
          data-tab={t.id}
          aria-current={active === t.id ? 'location' : undefined}
          onClick={(e) => {
            e.preventDefault();
            lockUntil.current = Date.now() + 700;
            setActive(t.id);
            scrollToSection(t.id);
          }}
          className={cn(
            'ui-press inline-flex min-h-11 shrink-0 items-center rounded-full px-4 text-sm font-semibold whitespace-nowrap transition-colors',
            active === t.id
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
          )}
        >
          {t.label}
        </a>
      ))}
    </nav>
  );
}
