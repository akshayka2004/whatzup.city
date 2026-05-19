import './globals.css';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'SaaS Listing Platform - Admin Portal',
  description: 'Enterprise SaaS Admin Operations & Moderation Dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} min-h-screen bg-[#09090b] text-[#fafafa] antialiased`}>
        {children}
      </body>
    </html>
  );
}
