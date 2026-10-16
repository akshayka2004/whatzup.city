import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono, Noto_Sans_Malayalam } from 'next/font/google';
import './globals.css';
import './foundation.css';
import { ThemeProviderClient } from '@/components/theme-provider-client';
import { AuthProvider } from '@/hooks/use-auth';
import { CommandPaletteLoader } from '@/components/common/command-palette-loader';
import { SearchLauncher } from '@/components/common/search-launcher';
import { ConfirmProvider } from '@/components/common/confirm-dialog';
import { Toaster } from '@/components/ui/sonner';
import { I18nProvider } from '@/lib/i18n/provider';
import { SITE_URL } from '@/lib/server-api';

const _geist = Geist({ subsets: ['latin'] });
// Mono is only used for the odd code/ID snippet, so don't preload it on every page.
const _geistMono = Geist_Mono({ subsets: ['latin'], preload: false });
// Malayalam glyphs. Geist has none, so the browser only downloads this (unicode-range subset)
// when Malayalam text is actually on screen; English-only visitors never fetch it.
const malayalam = Noto_Sans_Malayalam({
  subsets: ['malayalam'],
  display: 'swap',
  preload: false,
  variable: '--font-ml',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1.0,
  maximumScale: 5.0,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F7F7FB' },
    { media: '(prefers-color-scheme: dark)', color: '#11111B' },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'Whtzup.city', template: '%s · Whtzup.city' },
  description: 'Discover local businesses, services, and civic updates in your city',
  applicationName: 'Whtzup.city',
  openGraph: {
    type: 'website',
    siteName: 'Whtzup.city',
    title: "Whtzup.city — Kerala's trusted local directory",
    description: 'Discover verified businesses, offers, events and civic updates across Kerala.',
    images: [{ url: '/logo.png' }],
  },
  twitter: { card: 'summary' },
  icons: {
    icon: [
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
      {
        url: '/logo.png',
        type: 'image/png',
      },
    ],
    apple: '/logo.png',
    shortcut: '/logo.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={malayalam.variable}>
      <body className="font-sans antialiased bg-background text-foreground">
        <AuthProvider>
          <ThemeProviderClient>
            <I18nProvider>
              <ConfirmProvider>
                <a href="#main-content" className="ui-skip-link">
                  Skip to content
                </a>
                <CommandPaletteLoader />
                <SearchLauncher />
                {children}
                <Toaster position="top-center" richColors closeButton />
              </ConfirmProvider>
            </I18nProvider>
          </ThemeProviderClient>
        </AuthProvider>
      </body>
    </html>
  );
}
