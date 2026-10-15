'use client';

import { ThemeProvider } from 'next-themes';
import { ReactNode } from 'react';

export function ThemeProviderClient({ children }: { children: ReactNode }) {
  // First visits follow the device's light/dark setting. Users can still pick
  // light, dark or "system" from the account menu; the choice persists.
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </ThemeProvider>
  );
}
