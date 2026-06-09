'use client';

import { ThemeProvider } from 'next-themes';
import { ReactNode } from 'react';

export function ThemeProviderClient({ children }: { children: ReactNode }) {
  // Dark-first default, but the header toggle must work, so do NOT force a theme.
  // `enableSystem` is off so the OS can't silently flip the app to light; the
  // user explicitly switches light/dark via the header and the choice persists.
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  );
}
