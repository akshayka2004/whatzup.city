'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

const CommandPalette = dynamic(() => import('./command-palette').then((m) => m.CommandPalette), {
  ssr: false,
});

/**
 * Keeps the command palette (cmdk + its search UI) out of every page's first
 * load. The first ⌘K / Ctrl+K or header search click loads it, then re-sends the
 * open request once it is listening; after that the palette handles both itself.
 */
export function CommandPaletteLoader() {
  const [load, setLoad] = useState(false);

  useEffect(() => {
    if (load) return;
    const onKey = (e: Event) => {
      // Password managers and autofill fire synthetic 'keydown' events that are plain Events
      // (no key). Only a real Ctrl/Cmd+K may load the palette.
      if (!(e instanceof KeyboardEvent)) return;
      if (!((e.metaKey || e.ctrlKey) && typeof e.key === 'string' && e.key.toLowerCase() === 'k')) {
        return;
      }
      e.preventDefault();
      setLoad(true);
    };
    const onOpen = () => setLoad(true);
    document.addEventListener('keydown', onKey);
    window.addEventListener('open-command-palette', onOpen);
    return () => {
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('open-command-palette', onOpen);
    };
  }, [load]);

  if (!load) return null;
  return <CommandPalette autoOpen />;
}
