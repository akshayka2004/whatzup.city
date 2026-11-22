'use client';

import { BusinessLayout } from '@/components/layouts/business-layout';
import { MonthlyReportView } from '@/components/reports/monthly-report-view';

export default function BusinessMonthlyReportPage() {
  return (
    <BusinessLayout>
      <MonthlyReportView scope="mine" />
    </BusinessLayout>
  );
}
