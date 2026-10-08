'use client';

import { useEffect, useState } from 'react';

/**
 * Current time in epoch ms, or null until the component has mounted.
 *
 * Anything that depends on "now" (live badges, Today / This-weekend filters,
 * "New" pills) must wait for this, otherwise the server-rendered HTML and the
 * hydrated output can disagree.
 */
export function useNow(): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
  }, []);
  return now;
}
