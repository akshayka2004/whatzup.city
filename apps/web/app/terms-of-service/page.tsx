import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, FileText } from 'lucide-react';
import { LegalFooter } from '@/components/common/legal-footer';

export const metadata: Metadata = {
  title: 'Terms of Service — Whtzup.city',
  description:
    'Read the Terms of Service for Whtzup.city, operated by Lifeart Business Services Private Limited. Governs access to platform services, business registration, subscriptions, and user obligations.',
  alternates: { canonical: 'https://whtzup.city/terms-of-service' },
  openGraph: {
    title: 'Terms of Service — Whtzup.city',
    description:
      'Terms of Service for Whtzup.city — the digital city ecosystem platform by Lifeart Business Services Private Limited.',
    url: 'https://whtzup.city/terms-of-service',
    siteName: 'Whtzup.city',
    type: 'website',
  },
};

const SECTIONS = [
  { id: 'about', label: '1. About the Platform' },
  { id: 'eligibility', label: '2. Eligibility' },
  { id: 'accounts', label: '3. User Accounts' },
  { id: 'business-verification', label: '4. Business Registration' },
  { id: 'government', label: '5. Government Accounts' },
  { id: 'reviews', label: '6. Reviews & Verified Purchases' },
  { id: 'bills', label: '7. Bill Uploads & Verification' },
  { id: 'subscriptions', label: '8. Subscription Plans' },
  { id: 'prohibited', label: '9. Prohibited Activities' },
  { id: 'third-party', label: '10. Third-Party Services' },
  { id: 'social-login', label: '11. Social Login Services' },
  { id: 'privacy', label: '12. Privacy & Data Protection' },
  { id: 'retention', label: '13. Data Retention' },
  { id: 'ip', label: '14. Intellectual Property' },
  { id: 'liability', label: '15. Limitation of Liability' },
  { id: 'availability', label: '16. Platform Availability' },
  { id: 'termination', label: '17. Account Suspension' },
  { id: 'children', label: '18. Children\'s Privacy' },
  { id: 'changes', label: '19. Changes to Terms' },
  { id: 'governing-law', label: '20. Governing Law' },
  { id: 'contact', label: '21. Contact Information' },
  { id: 'acceptance', label: '22. Acceptance of Terms' },
];

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Sticky header */}
      <header className="sticky top-0 z-20 border-b border-border bg-card/90 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back</span>
          </Link>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <span className="font-semibold text-foreground text-sm">Terms of Service</span>
          </div>
          <div className="ml-auto flex gap-3 text-xs text-muted-foreground">
            <Link href="/privacy-policy" className="hover:text-foreground transition-colors hidden sm:inline">
              Privacy Policy
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 flex gap-10 flex-1 w-full">
        {/* Sticky TOC — desktop only */}
        <aside className="hidden lg:block w-56 shrink-0">
          <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto pr-2 space-y-0.5">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-3 px-2">
              Contents
            </p>
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="block px-2 py-1 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors leading-snug"
              >
                {s.label}
              </a>
            ))}
          </div>
        </aside>

        {/* Main content */}
        <article className="flex-1 min-w-0 space-y-10 text-[15px] leading-relaxed text-muted-foreground">
          {/* Title block */}
          <div className="pb-6 border-b border-border">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight mb-3">
              Terms of Service
            </h1>
            <p className="text-sm font-semibold text-foreground mb-1">Whtzup.city</p>
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span>Effective Date: <strong className="text-foreground">May 27, 2026</strong></span>
              <span>Last Updated: <strong className="text-foreground">May 27, 2026</strong></span>
            </div>
            <p className="mt-4">
              Welcome to <strong className="text-foreground">Whtzup.city</strong>, a digital city ecosystem platform operated by{' '}
              <strong className="text-foreground">Lifeart Business Services Private Limited</strong> ("Company", "we", "us", or "our"). These Terms of Service ("Terms") govern your access to and use of the Whtzup.city website, mobile applications, APIs, dashboards, and all related services ("Services").
            </p>
            <p className="mt-3">
              By accessing or using the Services, you agree to comply with and be bound by these Terms. If you do not agree with these Terms, please do not use the Services.
            </p>
          </div>

          {/* Section 1 */}
          <Section id="about" title="1. About the Platform">
            <p>
              Whtzup.city is a multi-service city ecosystem platform designed to connect Businesses, Customers, Government &amp; Public Sector Bodies, Service Providers, and Local Communities through:
            </p>
            <List items={[
              'Business listings',
              'Offers and promotions',
              'Customer engagement',
              'Government alerts',
              'Notifications',
              'Reviews',
              'Analytics',
              'Verified purchase systems',
              'Campaigns',
              'And related digital services',
            ]} />
            <p>
              The platform is intended to improve discoverability for businesses, improve civic communication, and provide a centralized digital experience for users.
            </p>
          </Section>

          {/* Section 2 */}
          <Section id="eligibility" title="2. Eligibility">
            <p>By using the Services, you confirm that:</p>
            <List items={[
              'You are at least 18 years of age, or',
              'You are using the Services under lawful supervision of a parent or guardian.',
            ]} />
            <p>
              Businesses and organizations registering on the platform must provide accurate, lawful, and up-to-date information.
            </p>
          </Section>

          {/* Section 3 */}
          <Section id="accounts" title="3. User Accounts">
            <p>Users may create accounts as:</p>
            <List items={['Customers', 'Business Accounts', 'Government/Public Sector Accounts', 'Authorized Organizational Accounts']} />
            <p>You are responsible for:</p>
            <List items={[
              'Maintaining confidentiality of your credentials',
              'All activities under your account',
              'Ensuring all information provided is accurate',
            ]} />
            <p>We reserve the right to suspend, restrict, verify, or terminate accounts that violate these Terms or provide false or misleading information.</p>
          </Section>

          {/* Section 4 */}
          <Section id="business-verification" title="4. Business Registration & Verification">
            <p>Businesses registering on Whtzup.city may be required to provide:</p>
            <List items={[
              'Business registration information',
              'Identification documents',
              'GST details',
              'Verification documents',
              'Branch details',
              'Contact information',
            ]} />
            <p>Business accounts may remain under Pending Verification, Under Review, Approved, Rejected, or Suspended status until verification is completed. The platform reserves the right to reject applications, request additional documents, suspend businesses, remove listings, or restrict access.</p>
          </Section>

          {/* Section 5 */}
          <Section id="government" title="5. Government & Public Sector Accounts">
            <p>Government and public sector entities may use the platform to:</p>
            <List items={[
              'Publish alerts',
              'Road block notifications',
              'Emergency communications',
              'Subsidy announcements',
              'Public awareness notifications',
              'Civic updates',
            ]} />
            <p>
              The platform acts as a communication medium and does not independently guarantee the accuracy of all governmental communications.
            </p>
          </Section>

          {/* Section 6 */}
          <Section id="reviews" title="6. Customer Reviews & Verified Purchases">
            <p>Customers may submit ratings, write reviews, upload bills, report issues, and engage with offers and promotions. Reviews must:</p>
            <List items={[
              'Be truthful',
              'Avoid abusive language',
              'Avoid defamatory content',
              'Avoid unlawful material',
            ]} />
            <p>
              The platform reserves the right to moderate reviews, remove misleading content, suspend abusive users, and investigate fraudulent activity. Verified Purchase badges are issued based on successful bill verification workflows and are intended to improve platform trust.
            </p>
          </Section>

          {/* Section 7 */}
          <Section id="bills" title="7. Bill Uploads & Verification">
            <p>Users may upload bills/invoices for offer validation, reward systems, verified purchase status, and customer authenticity. Users confirm that:</p>
            <List items={[
              'Uploaded bills are genuine',
              'They have lawful ownership or access to the uploaded documents',
              'Uploads are not fraudulent or manipulated',
            ]} />
            <p>
              The platform may reject suspicious bills, suspend accounts involved in fraud, investigate misuse, and retain moderation records for security purposes. Authorized business moderators and platform administrators may review uploaded bills as part of the moderation process.
            </p>
          </Section>

          {/* Section 8 */}
          <Section id="subscriptions" title="8. Subscription Plans">
            <p>Business accounts may operate under subscription plans such as Basic, Standard, and Premium. Features and limitations vary by plan. The platform reserves the right to modify pricing, alter plan features, introduce new plans, discontinue plans, or limit specific services. Subscription approvals or modifications may require platform administrator approval.</p>
          </Section>

          {/* Section 9 */}
          <Section id="prohibited" title="9. Prohibited Activities">
            <p>Users must not:</p>
            <List items={[
              'Upload unlawful or fraudulent content',
              'Impersonate another person or business',
              'Manipulate reviews or ratings',
              'Distribute malware or harmful software',
              'Attempt unauthorized access',
              'Abuse APIs or platform infrastructure',
              'Scrape platform data',
              'Violate intellectual property rights',
              'Submit fake bills or verification documents',
              'Interfere with platform operations',
              'Conduct spam or abusive campaigns',
            ]} />
            <p>
              Violation of these Terms may result in account suspension, permanent bans, content removal, legal action, or reporting to law enforcement authorities.
            </p>
          </Section>

          {/* Section 10 */}
          <Section id="third-party" title="10. Third-Party Services">
            <p>The platform may integrate with third-party providers including Razorpay, cloud services, map providers, social media platforms, analytics services, and notification providers. Payment data is processed by Razorpay in accordance with their privacy policy. We are not responsible for failures or damages caused by third-party services.</p>
          </Section>

          {/* Section 11 */}
          <Section id="social-login" title="11. Social Login Services">
            <p>
              Users may choose to register or log in using third-party social media accounts such as Facebook, X (Twitter), Google, or other supported providers. By using social login services, you authorize us to access certain profile information from the selected provider as permitted by their policies.
            </p>
          </Section>

          {/* Section 12 */}
          <Section id="privacy" title="12. Privacy & Data Protection">
            <p>We collect and process certain user information including names, email addresses, phone numbers, usernames, passwords, billing addresses, and uploaded content. We implement reasonable technical and organizational safeguards to protect personal information. However, no online platform can guarantee absolute security.</p>
            <p className="mt-3">
              Please refer to our{' '}
              <Link href="/privacy-policy" className="text-primary underline underline-offset-2 hover:opacity-80">
                Privacy Policy
              </Link>{' '}
              for detailed information regarding data collection, storage, sharing, retention, and user rights.
            </p>
          </Section>

          {/* Section 13 */}
          <Section id="retention" title="13. Data Retention">
            <p>We retain information only as long as necessary to provide services, comply with legal obligations, resolve disputes, prevent fraud, and enforce our agreements. When information is no longer required, we may delete, anonymize, or securely archive it.</p>
          </Section>

          {/* Section 14 */}
          <Section id="ip" title="14. Intellectual Property">
            <p>
              All platform technology, branding, software, interfaces, and related assets remain the property of Whtzup.city and Lifeart Business Services Private Limited unless otherwise stated. Users retain ownership of content uploaded by them but grant the platform a non-exclusive license to store, process, display, optimize, and distribute such content for platform functionality and operations.
            </p>
          </Section>

          {/* Section 15 */}
          <Section id="liability" title="15. Limitation of Liability">
            <p>The platform shall not be liable for:</p>
            <List items={[
              'Indirect damages',
              'Business losses',
              'Customer-business disputes',
              'Inaccurate listings',
              'Temporary outages',
              'Third-party failures',
              'Unauthorized access resulting from user negligence',
            ]} />
            <p>
              The platform functions as a digital intermediary and does not guarantee business growth, customer conversions, transaction outcomes, or uninterrupted availability.
            </p>
          </Section>

          {/* Section 16 */}
          <Section id="availability" title="16. Platform Availability">
            <p>
              We strive to maintain stable platform availability but do not guarantee uninterrupted service. Maintenance, upgrades, technical issues, security incidents, or third-party failures may temporarily affect platform functionality.
            </p>
          </Section>

          {/* Section 17 */}
          <Section id="termination" title="17. Account Suspension & Termination">
            <p>We reserve the right to suspend accounts, remove listings, terminate services, or revoke permissions for violations of these Terms or applicable laws. In cases involving fraud, abuse, illegal activity, or security threats, actions may be taken immediately without prior notice.</p>
          </Section>

          {/* Section 18 */}
          <Section id="children" title="18. Children's Privacy">
            <p>
              The platform does not knowingly collect or market data from individuals under 18 years of age. If we become aware of such data collection, we will take reasonable measures to remove the information.
            </p>
          </Section>

          {/* Section 19 */}
          <Section id="changes" title="19. Changes to These Terms">
            <p>
              We may update these Terms periodically to reflect legal requirements, platform improvements, operational changes, or security updates. Updated versions will be published on the platform with revised dates. Continued use of the Services after updates constitutes acceptance of the revised Terms.
            </p>
          </Section>

          {/* Section 20 */}
          <Section id="governing-law" title="20. Governing Law">
            <p>
              These Terms shall be governed by and interpreted in accordance with the laws of India. Any disputes arising from the use of the Services shall be subject to the jurisdiction of the courts located in Kerala, India.
            </p>
          </Section>

          {/* Section 21 */}
          <Section id="contact" title="21. Contact Information">
            <p>For support, legal concerns, or policy inquiries:</p>
            <div className="mt-3 p-4 rounded-xl bg-white/5 border border-white/10 text-sm space-y-1">
              <p className="font-semibold text-foreground">Lifeart Business Services Private Limited</p>
              <p>29/3372, Vazhuthacaud, AIR Road</p>
              <p>Thiruvananthapuram, Kerala 695014, India</p>
              <p className="mt-2">
                Email:{' '}
                <a href="mailto:support@lifeartgroup.in" className="text-primary hover:underline">
                  support@lifeartgroup.in
                </a>
              </p>
              <p>
                Website:{' '}
                <a href="https://whtzup.city" className="text-primary hover:underline">
                  whtzup.city
                </a>
              </p>
            </div>
          </Section>

          {/* Section 22 */}
          <Section id="acceptance" title="22. Acceptance of Terms">
            <p>
              By accessing or using Whtzup.city, you acknowledge that you have read, understood, and agreed to these Terms of Service.
            </p>
          </Section>
        </article>
      </div>

      <LegalFooter />
    </div>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20 space-y-3">
      <h2 className="text-lg font-bold text-foreground border-b border-border pb-2">{title}</h2>
      {children}
    </section>
  );
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5 pl-4">
      {items.map((item) => (
        <li key={item} className="flex gap-2">
          <span className="text-primary mt-1.5 shrink-0">•</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
