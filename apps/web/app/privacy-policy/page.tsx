import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Shield } from 'lucide-react';
import { LegalFooter } from '@/components/common/legal-footer';

export const metadata: Metadata = {
  title: 'Privacy Policy — Whtzup.city',
  description:
    'Whtzup.city Privacy Policy — how Lifeart Business Services Private Limited collects, uses, stores, and protects your personal information on the platform.',
  alternates: { canonical: 'https://whtzup.city/privacy-policy' },
  openGraph: {
    title: 'Privacy Policy — Whtzup.city',
    description:
      'Privacy Policy for Whtzup.city — the digital city ecosystem platform by Lifeart Business Services Private Limited.',
    url: 'https://whtzup.city/privacy-policy',
    siteName: 'Whtzup.city',
    type: 'website',
  },
};

const SECTIONS = [
  { id: 'intro', label: '1. Introduction' },
  { id: 'collection', label: '2. Information We Collect' },
  { id: 'usage', label: '3. How We Use Your Information' },
  { id: 'sharing', label: '4. Information Sharing' },
  { id: 'storage', label: '5. Data Storage & Security' },
  { id: 'cookies', label: '6. Cookies & Sessions' },
  { id: 'uploads', label: '7. User-Uploaded Content' },
  { id: 'third-party', label: '8. Third-Party Services' },
  { id: 'rights', label: '9. Your Rights' },
  { id: 'retention', label: '10. Data Retention' },
  { id: 'children', label: '11. Children\'s Privacy' },
  { id: 'changes', label: '12. Policy Updates' },
  { id: 'contact', label: '13. Contact Us' },
];

export default function PrivacyPolicyPage() {
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
            <Shield className="h-4 w-4 text-primary" />
            <span className="font-semibold text-foreground text-sm">Privacy Policy</span>
          </div>
          <div className="ml-auto flex gap-3 text-xs text-muted-foreground">
            <Link href="/terms-of-service" className="hover:text-foreground transition-colors hidden sm:inline">
              Terms of Service
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 flex gap-10 flex-1 w-full">
        {/* Sticky TOC */}
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
              Privacy Policy
            </h1>
            <p className="text-sm font-semibold text-foreground mb-1">Whtzup.city</p>
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span>Effective Date: <strong className="text-foreground">May 27, 2026</strong></span>
              <span>Last Updated: <strong className="text-foreground">May 27, 2026</strong></span>
            </div>
            <p className="mt-4">
              This Privacy Policy describes how <strong className="text-foreground">Lifeart Business Services Private Limited</strong> ("Company", "we", "us", or "our") collects, uses, stores, shares, and protects your personal information when you use the <strong className="text-foreground">Whtzup.city</strong> platform and its related services.
            </p>
            <p className="mt-3">
              By using the Services, you acknowledge and consent to the practices described in this Privacy Policy. If you do not agree, please discontinue use of the platform.
            </p>
          </div>

          {/* Section 1 */}
          <Section id="intro" title="1. Introduction">
            <p>
              Whtzup.city is a multi-tenant digital city ecosystem platform connecting businesses, customers, government bodies, and local communities in Kerala, India. We are committed to protecting your privacy and ensuring your personal information is handled responsibly, transparently, and in accordance with applicable laws including the Information Technology Act, 2000 and applicable data protection regulations in India.
            </p>
          </Section>

          {/* Section 2 */}
          <Section id="collection" title="2. Information We Collect">
            <p>We collect the following categories of information:</p>

            <h3 className="font-semibold text-foreground mt-4 mb-2">Account Information</h3>
            <List items={[
              'Full name',
              'Email address',
              'Phone number',
              'Password (stored as a cryptographic hash — never in plain text)',
              'Account type (Customer, Business, Government)',
            ]} />

            <h3 className="font-semibold text-foreground mt-4 mb-2">Business Information</h3>
            <List items={[
              'Business name, description, and category',
              'GST registration details',
              'Business registration certificates',
              'Branch addresses, operating hours',
              'Contact information and social media links',
              'Brand logos and media assets',
            ]} />

            <h3 className="font-semibold text-foreground mt-4 mb-2">Transaction & Engagement Data</h3>
            <List items={[
              'Bill and invoice uploads submitted for verification',
              'Reviews, ratings, and comments submitted',
              'Offer redemptions and coupon usage',
              'Bookmark and favorite activity',
            ]} />

            <h3 className="font-semibold text-foreground mt-4 mb-2">Technical Information</h3>
            <List items={[
              'IP address and approximate geolocation',
              'Browser type and device information',
              'Session tokens and authentication data',
              'Platform usage analytics and event logs',
            ]} />
          </Section>

          {/* Section 3 */}
          <Section id="usage" title="3. How We Use Your Information">
            <p>We use collected information to:</p>
            <List items={[
              'Create and manage your account and profile',
              'Verify business registrations and identity documents',
              'Process and moderate bill uploads and verified purchases',
              'Display business listings, offers, and announcements',
              'Send platform notifications, alerts, and communications',
              'Provide analytics and performance insights to business owners',
              'Detect and prevent fraud, abuse, and security threats',
              'Comply with legal obligations and respond to lawful requests',
              'Improve platform features and user experience',
              'Administer referral programs and promotional incentives',
            ]} />
          </Section>

          {/* Section 4 */}
          <Section id="sharing" title="4. Information Sharing">
            <p>We do not sell your personal information. We may share data in the following circumstances:</p>

            <h3 className="font-semibold text-foreground mt-4 mb-2">With Service Providers</h3>
            <p>We engage trusted third-party service providers who process data on our behalf under confidentiality obligations, including cloud infrastructure, database, storage, and payment processors.</p>

            <h3 className="font-semibold text-foreground mt-4 mb-2">With Business Operators</h3>
            <p>Customer review data, verified purchase badges, and engagement metrics may be visible to business owners and authorized staff within the platform for operational purposes.</p>

            <h3 className="font-semibold text-foreground mt-4 mb-2">Legal Disclosures</h3>
            <p>We may disclose information when required by applicable law, court order, regulatory authority, or to protect the rights, property, or safety of the platform, its users, or the public.</p>
          </Section>

          {/* Section 5 */}
          <Section id="storage" title="5. Data Storage & Security">
            <p>
              Your data is stored on secure cloud infrastructure powered by <strong className="text-foreground">Supabase PostgreSQL</strong> (hosted on AWS ap-northeast-1) and <strong className="text-foreground">Supabase Storage</strong> for uploaded files. We implement:
            </p>
            <List items={[
              'Bcrypt password hashing (passwords never stored in plain text)',
              'JWT-based session management with HTTP-only cookies',
              'Refresh token rotation and invalidation on logout',
              'Role-based access control (RBAC) across all resources',
              'Redis-based session caching with defined TTLs',
              'Encrypted data transmission via HTTPS/TLS',
              'Audit logging for sensitive administrative actions',
            ]} />
            <p className="mt-3">
              While we implement industry-standard safeguards, no online platform can guarantee absolute security. You are responsible for protecting your account credentials.
            </p>
          </Section>

          {/* Section 6 */}
          <Section id="cookies" title="6. Cookies & Sessions">
            <p>
              Whtzup.city uses HTTP cookies to maintain authenticated sessions. Session cookies are:
            </p>
            <List items={[
              'HTTP-only (not accessible to JavaScript)',
              'Scoped to the platform domain',
              'Invalidated on logout or session expiry',
            ]} />
            <p className="mt-3">
              We do not use third-party advertising cookies or cross-site tracking cookies. Analytics data is collected internally and anonymized where possible.
            </p>
          </Section>

          {/* Section 7 */}
          <Section id="uploads" title="7. User-Uploaded Content">
            <p>
              Content you upload to the platform — including bills, invoices, business documents, logos, and media — is stored on Supabase Storage. By uploading content, you confirm:
            </p>
            <List items={[
              'You own or have lawful rights to the uploaded content',
              'The content does not violate applicable laws or third-party rights',
              'You grant the platform a non-exclusive license to store, process, and display the content for platform operations',
            ]} />
            <p className="mt-3">
              Uploaded documents submitted for verification are accessible to authorized business moderators and platform administrators as part of the moderation workflow.
            </p>
          </Section>

          {/* Section 8 */}
          <Section id="third-party" title="8. Third-Party Services">
            <p>We integrate with the following third-party services that may process your data under their own privacy policies:</p>
            <div className="mt-3 space-y-2">
              {[
                { name: 'Supabase', desc: 'Database and file storage infrastructure (AWS ap-northeast-1)' },
                { name: 'Razorpay', desc: 'Payment processing for subscription plans' },
                { name: 'Redis / BullMQ', desc: 'Session caching and background job queuing' },
              ].map((item) => (
                <div key={item.name} className="flex gap-3 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10">
                  <span className="font-semibold text-foreground text-sm shrink-0">{item.name}</span>
                  <span className="text-sm">{item.desc}</span>
                </div>
              ))}
            </div>
            <p className="mt-3">
              We are not responsible for the privacy practices of third-party services. We encourage you to review their privacy policies directly.
            </p>
          </Section>

          {/* Section 9 */}
          <Section id="rights" title="9. Your Rights">
            <p>You have the following rights regarding your personal information:</p>
            <List items={[
              'Access — request a copy of the personal data we hold about you',
              'Correction — request correction of inaccurate or incomplete information',
              'Deletion — request deletion of your account and associated personal data',
              'Portability — request your data in a portable format where technically feasible',
              'Objection — object to specific processing activities where permitted by law',
            ]} />
            <p className="mt-3">
              To exercise these rights, use the <strong className="text-foreground">Delete Account</strong> feature in your Profile Settings, or contact us at{' '}
              <a href="mailto:support@lifeartgroup.in" className="text-primary hover:underline">
                support@lifeartgroup.in
              </a>.
            </p>
            <p className="mt-3">
              Account deletion performs a soft-delete of your profile, deactivates associated business entities, and invalidates all active sessions.
            </p>
          </Section>

          {/* Section 10 */}
          <Section id="retention" title="10. Data Retention">
            <p>
              We retain personal information only for as long as necessary to fulfill the purposes outlined in this Policy, comply with legal obligations, resolve disputes, and enforce agreements. When data is no longer required, we delete, anonymize, or securely archive it. Business documents submitted for verification may be retained for compliance and audit purposes as required by law.
            </p>
          </Section>

          {/* Section 11 */}
          <Section id="children" title="11. Children's Privacy">
            <p>
              Whtzup.city is not directed at individuals under 18 years of age. We do not knowingly collect personal information from minors. If we become aware that a minor has provided personal information, we will take prompt steps to delete that information and deactivate the associated account.
            </p>
          </Section>

          {/* Section 12 */}
          <Section id="changes" title="12. Policy Updates">
            <p>
              We may update this Privacy Policy periodically to reflect changes in our practices, legal requirements, or platform operations. Updated versions will be published on this page with a revised "Last Updated" date. Continued use of the platform following a policy update constitutes acceptance of the revised terms. We encourage you to review this page periodically.
            </p>
          </Section>

          {/* Section 13 */}
          <Section id="contact" title="13. Contact Us">
            <p>For privacy-related inquiries, data access requests, or concerns about how your information is handled:</p>
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
            <p className="mt-4">
              Also see our{' '}
              <Link href="/terms-of-service" className="text-primary underline underline-offset-2 hover:opacity-80">
                Terms of Service
              </Link>{' '}
              for the full legal framework governing use of the platform.
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
