'use client';

import { ThemeProvider } from 'next-themes';
import { ReactNode } from 'react';

export function ThemeProviderClient({ children }: { children: ReactNode }) {
  // Light-first (City Experience Platform: warm neutral bg, white surfaces).
  // The header toggle still switches to dark and the choice persists;
  // `enableSystem` is off so the OS can't silently override the brand default.
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  );
}
