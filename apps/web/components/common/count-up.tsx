'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Number that eases up from 0 the first time it scrolls into view.
 * Renders the final value immediately for reduced-motion users and when
 * IntersectionObserver is unavailable, so the real number is never hidden.
 */
export function CountUp({
  value,
  duration = 1200,
  className,
  format = (n: number) => n.toLocaleString('en-IN'),
}: {
  value: number;
  duration?: number;
  className?: string;
  format?: (n: number) => string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [n, setN] = useState(value);
  const done = useRef(false);

  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const el = ref.current;
    if (reduce || !el || typeof IntersectionObserver === 'undefined') {
      setN(value);
      return;
    }
    done.current = false;
    setN(0);
    let raf = 0;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || done.current) return;
        done.current = true;
        io.disconnect();
        const start = performance.now();
        const tick = (t: number) => {
          const p = Math.min((t - start) / duration, 1);
          setN(Math.round(value * (1 - Math.pow(1 - p, 3))));
          if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value, duration]);

  return (
    <span ref={ref} className={className}>
      {format(n)}
    </span>
  );
}
