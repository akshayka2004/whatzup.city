import { useSyncExternalStore } from 'react';

/**
 * One shared 1-second ticker for every live countdown on the page. The interval
 * only exists while at least one offer expiring within 24h is mounted, and it
 * skips work while the tab is hidden. Offers further out never subscribe.
 */
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;
let current = 0;

function subscribeTick(cb: () => void) {
  listeners.add(cb);
  current = Date.now();
  if (!timer) {
    timer = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      current = Date.now();
      listeners.forEach((l) => l());
    }, 1000);
  }
  return () => {
    listeners.delete(cb);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

const subscribeNone = () => () => {};
const getTick = () => current;
const getNone = () => 0;
const getServer = () => 0;

/** Returns the latest tick time (ms) while `enabled`, otherwise 0 and no subscription. */
export function useSecondTick(enabled: boolean): number {
  return useSyncExternalStore(
    enabled ? subscribeTick : subscribeNone,
    enabled ? getTick : getNone,
    getServer,
  );
}
