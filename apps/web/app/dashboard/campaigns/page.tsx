'use client';

import { Megaphone } from 'lucide-react';
import { BusinessLayout } from '@/components/layouts/business-layout';
import { PageHeader } from '@/components/system/page-header';
import { EmptyState } from '@/components/common/empty-state';

// Not in the menu yet; kept so old links land somewhere honest (no promised date).
export default function CampaignsPage() {
  return (
    <BusinessLayout>
      <PageHeader
        title="Campaigns"
        description="Broadcast promotions and alerts to your customers."
      />
      <EmptyState
        icon={Megaphone}
        title="Campaigns are on the way"
        description="Until then, reach customers with an offer or the spin wheel — they show on your public page and in the offers feed."
        action={{ label: 'Create an offer', href: '/dashboard/offers' }}
        secondary={{ label: 'Set up the spin wheel', href: '/dashboard/discounts' }}
      />
    </BusinessLayout>
  );
}
