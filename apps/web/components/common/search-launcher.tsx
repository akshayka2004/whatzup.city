'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Search } from 'lucide-react';

/** Header search buttons carry this attribute so the launcher knows search is already on screen. */
export const SEARCH_TRIGGER_ATTR = 'data-search-trigger';

/**
 * Search must be reachable from every page. Pages inside the app frame get it from the header;
 * pages without one (login, register, legal, report…) get this floating button instead. It sits
 * bottom-right, away from where header links (Log in) are, and appears a moment after navigation.
 * It only shows while no header search trigger exists in the document.
 */
/** Sign-in and sign-up are focused flows: nothing floats over the form there. */
// The gate scanner and printable pass sheets are full-screen tools: nothing floats over them.
const AUTH_ROUTE =
  /^\/(login|register|forgot-password|reset-password|change-password|scan|crew-sheet)(\/|$)/;

export function SearchLauncher() {
  const [needed, setNeeded] = useState(false);
  // Held back briefly after a page change so a second click on the link that brought you here
  // (e.g. header "Log in") can never land on it.
  const [settled, setSettled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setSettled(false);
    const t = setTimeout(() => setSettled(true), 900);
    return () => clearTimeout(t);
  }, [pathname]);

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

  if (!needed || !settled || AUTH_ROUTE.test(pathname)) return null;
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event('open-command-palette'))}
      aria-label="Search"
      className="ui-press fixed bottom-4 right-4 z-40 flex size-11 items-center justify-center rounded-full border border-border bg-card/90 text-foreground shadow-e2 backdrop-blur-md hover:bg-secondary print:hidden"
    >
      <Search className="size-5" aria-hidden />
    </button>
  );
}
