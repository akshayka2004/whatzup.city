import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { ThemeProviderClient } from '@/components/theme-provider-client';
import { AuthProvider } from '@/hooks/use-auth';
import { CommandPalette } from '@/components/common/command-palette';

const _geist = Geist({ subsets: ['latin'] });
const _geistMono = Geist_Mono({ subsets: ['latin'] });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1.0,
  maximumScale: 5.0,
  themeColor: '#09090b',
};

export const metadata: Metadata = {
  title: 'Whtzup.city',
  description: 'Discover local businesses, services, and civic updates in your city',
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
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased bg-background text-foreground">
        <AuthProvider>
          <ThemeProviderClient>
            <CommandPalette />
            {children}
          </ThemeProviderClient>
        </AuthProvider>
      </body>
    </html>
  );
}
