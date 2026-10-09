'use client';

import { Flag, Globe, Receipt, Settings2 } from 'lucide-react';
import { SuperAdminLayout } from '@/components/layouts/super-admin-layout';
import { PageHeader } from '@/components/system/page-header';
import { SectionCard } from '@/components/system/section-card';
import { StatusPill } from '@/components/common/status-pill';
import { MOVIES_ENABLED } from '@/lib/feature-flags';
import { TAX_PERCENT } from '@/lib/subscription-plans';
import { SITE_URL } from '@/lib/server-api';

const FLAGS = [
  {
    name: 'Movies',
    on: MOVIES_ENABLED,
    env: 'NEXT_PUBLIC_MOVIES_ENABLED (web) + MOVIES_ENABLED (API)',
    effect: 'Shows the Movies section, home strip and admin editors.',
  },
];

/**
 * Read-only view of how this deployment is configured. Flags are build-time environment
 * variables, so they change with a redeploy, not from this screen.
 */
export default function ConfigurationPage() {
  return (
    <SuperAdminLayout>
      <PageHeader
        title="Configuration"
        description="How this deployment is set up. Values come from environment variables and change on redeploy."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard icon={Flag} title="Feature flags" padded={false}>
          <ul className="divide-y divide-border/60">
            {FLAGS.map((f) => (
              <li key={f.name} className="flex items-start justify-between gap-4 px-5 py-4 sm:px-6">
                <div className="min-w-0">
                  <p className="font-medium">{f.name}</p>
                  <p className="text-caption text-muted-foreground">{f.effect}</p>
                  <p className="mt-1 font-mono text-caption text-subtle-foreground">{f.env}</p>
                </div>
                <StatusPill tone={f.on ? 'success' : 'neutral'} label={f.on ? 'On' : 'Off'} />
              </li>
            ))}
          </ul>
        </SectionCard>

        <div className="space-y-6">
          <SectionCard icon={Globe} title="Site">
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-caption text-muted-foreground">Public URL</dt>
                <dd className="mt-0.5 break-all font-medium">{SITE_URL}</dd>
              </div>
              <div>
                <dt className="text-caption text-muted-foreground">Timezone for reports</dt>
                <dd className="mt-0.5 font-medium">Asia/Kolkata (IST)</dd>
              </div>
            </dl>
          </SectionCard>
          <SectionCard icon={Receipt} title="Billing">
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-caption text-muted-foreground">GST on plans</dt>
                <dd className="mt-0.5 font-medium">{TAX_PERCENT}%</dd>
              </div>
              <div>
                <dt className="text-caption text-muted-foreground">Payment method</dt>
                <dd className="mt-0.5 font-medium">UPI QR + proof, admin-verified</dd>
              </div>
            </dl>
          </SectionCard>
          <SectionCard icon={Settings2} title="Changing these">
            <p className="text-body text-muted-foreground">
              Update the environment variable on the server, then rebuild and restart the web and
              API apps.
            </p>
          </SectionCard>
        </div>
      </div>
    </SuperAdminLayout>
  );
}
