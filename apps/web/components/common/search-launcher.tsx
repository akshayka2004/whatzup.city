'use client';

import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';

/** Header search buttons carry this attribute so the launcher knows search is already on screen. */
export const SEARCH_TRIGGER_ATTR = 'data-search-trigger';

/**
 * Search must be reachable from every page. Pages inside the app frame get it from the header;
 * pages without one (login, register, legal, report…) get this floating button instead.
 * It only shows while no header search trigger exists in the document.
 */
export function SearchLauncher() {
  const [needed, setNeeded] = useState(false);

  useEffect(() => {
    let frame = 0;
    const check = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        setNeeded(!document.querySelector(`[${SEARCH_TRIGGER_ATTR}]`));
      });
    };
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);

  if (!needed) return null;
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event('open-command-palette'))}
      aria-label="Search"
      className="ui-press fixed right-3 top-3 z-40 flex size-11 items-center justify-center rounded-full border border-border bg-card/90 text-foreground shadow-e2 backdrop-blur-md hover:bg-secondary print:hidden"
    >
      <Search className="size-5" aria-hidden />
    </button>
  );
}
