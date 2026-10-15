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
    const trigger = (e?: Event) => {
      if (e instanceof KeyboardEvent) {
        if (!((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')) return;
        e.preventDefault();
      }
      setLoad(true);
    };
    document.addEventListener('keydown', trigger);
    window.addEventListener('open-command-palette', trigger);
    return () => {
      document.removeEventListener('keydown', trigger);
      window.removeEventListener('open-command-palette', trigger);
    };
  }, [load]);

  if (!load) return null;
  return <CommandPalette autoOpen />;
}
