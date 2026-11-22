'use client';

import { AdminLayout } from '@/components/layouts/admin-layout';
import { MonthlyReportView } from '@/components/reports/monthly-report-view';

export default function AdminMonthlyReportPage() {
  return (
    <AdminLayout>
      <MonthlyReportView scope="platform" />
    </AdminLayout>
  );
}
