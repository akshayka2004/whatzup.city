'use client';

import { AdminLayout } from '@/components/layouts/admin-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Eye, Trash2 } from 'lucide-react';

const reports = [
  {
    id: 1,
    type: 'Inappropriate Content',
    reported: 'Business A',
    date: '2024-05-16',
    status: 'Pending',
  },
  {
    id: 2,
    type: 'Fraudulent Activity',
    reported: 'User B',
    date: '2024-05-15',
    status: 'Under Review',
  },
  {
    id: 3,
    type: 'Policy Violation',
    reported: 'Business C',
    date: '2024-05-14',
    status: 'Resolved',
  },
  { id: 4, type: 'Spam', reported: 'Review D', date: '2024-05-13', status: 'Pending' },
];

const statusColors: Record<string, string> = {
  Pending: 'bg-yellow-500/10 text-yellow-700',
  'Under Review': 'bg-blue-500/10 text-blue-700',
  Resolved: 'bg-green-500/10 text-green-700',
};

export default function ReportsPage() {
  return (
    <AdminLayout>
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Reports</h1>
        <p className="text-muted-foreground mb-8">Manage user and content reports</p>

        <div className="space-y-4">
          {reports.map((report) => (
            <Card key={report.id} className="p-6 rounded-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <div className="rounded-lg bg-red-500/10 p-3">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{report.type}</h3>
                    <p className="text-sm text-muted-foreground">
                      Reported: {report.reported} • {report.date}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ml-auto ${statusColors[report.status]}`}
                  >
                    {report.status}
                  </span>
                </div>
                <div className="flex gap-2 ml-4">
                  <Button size="icon" variant="outline" className="rounded-lg">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="outline" className="rounded-lg text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
