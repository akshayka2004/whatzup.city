'use client';

import { ThemeProvider } from 'next-themes';
import { ReactNode } from 'react';

export function ThemeProviderClient({ children }: { children: ReactNode }) {
  // App is dark-first: all surfaces (cards, modals/popups) are styled for the
  // dark palette. `enableSystem` previously let a light OS flip the app to the
  // light theme, which left popup text (hardcoded light colors) unreadable on
  // the now-light backgrounds. Force dark so every popup renders as designed.
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark" disableTransitionOnChange>
      {children}
    </ThemeProvider>
  );
}
