'use client';

import Link from 'next/link';
import { ArrowLeft, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="sm" className="rounded-xl text-muted-foreground hover:text-foreground cursor-pointer">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <Shield className="h-5 w-5 text-primary" />
          <span className="font-bold text-foreground">Privacy Policy</span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10 space-y-8 text-sm text-muted-foreground leading-relaxed">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground mb-2">Privacy Policy</h1>
          <p className="text-xs text-muted-foreground">Effective Date: June 1, 2025 &nbsp;·&nbsp; Last updated: June 1, 2025</p>
        </div>

        <p>
          Welcome to <strong className="text-foreground">whtzup.city</strong>, operated by <strong className="text-foreground">Lifeart Group</strong>.
          This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform.
          By accessing our services, you agree to the practices described here.
        </p>

        {[
          {
            title: '1. Information We Collect',
            body: `We collect information you provide directly — such as your name, email address, phone number, and business details when you register or update your profile. We also collect usage data including pages visited, searches performed, offers claimed, and interactions with business listings. Technical data such as IP address, browser type, device identifiers, and cookie data may also be collected automatically.`,
          },
          {
            title: '2. How We Use Your Information',
            body: `We use your information to: provide and improve our services; personalise your experience; send transactional communications (e.g. verification emails); administer business listings and offer redemptions; detect and prevent fraud; comply with legal obligations; and analyse platform usage. We do not sell your personal information to third parties.`,
          },
          {
            title: '3. Sharing of Information',
            body: `We may share your information with: business owners when you claim an offer or submit a bill; service providers who assist in operating the platform (under strict confidentiality); government or regulatory authorities when required by law; and other users only to the extent necessary (e.g. your first name visible on a review).`,
          },
          {
            title: '4. Data Retention',
            body: `We retain your data for as long as your account is active or as needed to provide services. If you delete your account, we will soft-delete your data immediately and permanently purge it within 30 days, except where retention is required by law.`,
          },
          {
            title: '5. Security',
            body: `We implement industry-standard security measures including encryption in transit (TLS), hashed passwords, JWT-based authentication, and role-based access control. However, no system is completely secure — you are responsible for keeping your credentials confidential.`,
          },
          {
            title: '6. Cookies',
            body: `We use cookies and similar technologies to maintain your session, remember preferences, and measure platform performance. You may disable cookies in your browser settings, though some features may not function correctly.`,
          },
          {
            title: '7. Your Rights',
            body: `You have the right to access, correct, or delete your personal data at any time. You may also opt out of non-essential communications. To exercise these rights, contact us at support@lifeartgroup.in or use the account deletion option in your profile settings.`,
          },
          {
            title: '8. Children\'s Privacy',
            body: `Our platform is not directed to children under 13. We do not knowingly collect personal information from children. If you believe a child has provided us with information, please contact us and we will promptly delete it.`,
          },
          {
            title: '9. Changes to This Policy',
            body: `We may update this Privacy Policy from time to time. We will notify you of material changes by posting the updated policy on this page with a revised effective date. Continued use of the platform after changes constitutes your acceptance of the updated policy.`,
          },
          {
            title: '10. Contact Us',
            body: `For any privacy-related concerns or requests, please contact us at:\n\nLifeart Group · support@lifeartgroup.in`,
          },
        ].map((section) => (
          <section key={section.title} className="space-y-2">
            <h2 className="text-base font-bold text-foreground">{section.title}</h2>
            <p className="whitespace-pre-line">{section.body}</p>
          </section>
        ))}

        <div className="pt-4 border-t border-border text-xs text-center text-muted-foreground">
          <p>© 2025 Lifeart Group · <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link> · support@lifeartgroup.in</p>
        </div>
      </div>
    </div>
  );
}
