'use client';

import Link from 'next/link';
import { ArrowLeft, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="sm" className="rounded-xl text-muted-foreground hover:text-foreground cursor-pointer">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <FileText className="h-5 w-5 text-primary" />
          <span className="font-bold text-foreground">Terms of Service</span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10 space-y-8 text-sm text-muted-foreground leading-relaxed">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground mb-2">Terms of Service</h1>
          <p className="text-xs text-muted-foreground">Effective Date: June 1, 2025 &nbsp;·&nbsp; Last updated: June 1, 2025</p>
        </div>

        <p>
          These Terms of Service ("Terms") govern your access to and use of the <strong className="text-foreground">whtzup.city</strong> platform
          operated by <strong className="text-foreground">Lifeart Group</strong>. By registering or using our services,
          you agree to be bound by these Terms.
        </p>

        {[
          {
            title: '1. Eligibility',
            body: 'You must be at least 18 years old and capable of entering a legally binding agreement to use whtzup.city. By creating an account, you represent and warrant that you meet these requirements.',
          },
          {
            title: '2. Account Registration',
            body: 'You agree to provide accurate, current, and complete information during registration. You are responsible for maintaining the confidentiality of your credentials and for all activity that occurs under your account. Notify us immediately of any unauthorized use at support@lifeartgroup.in.',
          },
          {
            title: '3. Use of the Platform',
            body: 'You agree to use the platform only for lawful purposes and in accordance with these Terms. You must not: post false or misleading content; impersonate any person or entity; submit fraudulent bills or reviews; attempt to reverse-engineer or hack the platform; or use automated tools to scrape or abuse the service.',
          },
          {
            title: '4. Business Listings',
            body: 'Business owners are responsible for the accuracy of their listing information, offers, and pricing. whtzup.city reserves the right to remove or suspend listings that violate our policies, contain false information, or harm users.',
          },
          {
            title: '5. Offers and Redemptions',
            body: 'Offers posted on whtzup.city are subject to the terms set by the respective business. whtzup.city is not responsible for the availability, accuracy, or fulfillment of any offer. Disputes between users and businesses regarding offers must be resolved directly between the parties.',
          },
          {
            title: '6. Subscriptions and Payments',
            body: 'Businesses may subscribe to paid plans (Basic, Standard, Premium) to unlock additional features. Subscription fees are charged in advance and are non-refundable except where required by applicable law. We reserve the right to change pricing with 30 days notice.',
          },
          {
            title: '7. Intellectual Property',
            body: 'All content, design, trademarks, and technology on whtzup.city are owned by Lifeart Group or its licensors. You may not reproduce, distribute, or create derivative works without express written permission.',
          },
          {
            title: '8. User Content',
            body: 'By submitting reviews, photos, or other content, you grant whtzup.city a non-exclusive, royalty-free license to use, display, and distribute that content on the platform. You represent that you have the right to submit such content.',
          },
          {
            title: '9. Termination',
            body: 'We may suspend or terminate your account at any time for violation of these Terms, fraudulent activity, or at our sole discretion. You may delete your account at any time through your profile settings. Termination does not relieve you of obligations incurred prior to the termination date.',
          },
          {
            title: '10. Disclaimers and Limitation of Liability',
            body: 'The platform is provided "as is" without warranties of any kind. To the fullest extent permitted by law, Lifeart Group shall not be liable for any indirect, incidental, or consequential damages arising from your use of the platform.',
          },
          {
            title: '11. Governing Law',
            body: 'These Terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts in Kerala, India.',
          },
          {
            title: '12. Changes to Terms',
            body: 'We may modify these Terms at any time. Material changes will be communicated via email or a notice on the platform. Continued use after the effective date constitutes acceptance of the revised Terms.',
          },
          {
            title: '13. Contact',
            body: 'For questions about these Terms, contact us at:\n\nLifeart Group · support@lifeartgroup.in',
          },
        ].map((section) => (
          <section key={section.title} className="space-y-2">
            <h2 className="text-base font-bold text-foreground">{section.title}</h2>
            <p className="whitespace-pre-line">{section.body}</p>
          </section>
        ))}

        <div className="pt-4 border-t border-border text-xs text-center text-muted-foreground">
          <p>© 2025 Lifeart Group · <Link href="/privacy-policy" className="text-primary hover:underline">Privacy Policy</Link> · support@lifeartgroup.in</p>
        </div>
      </div>
    </div>
  );
}
