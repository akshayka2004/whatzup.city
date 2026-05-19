'use client';

import { PublicLayout } from '@/components/layouts/public-layout';
import { Card } from '@/components/ui/card';
import { Bell, Calendar, AlertCircle } from 'lucide-react';

const notices = [
  {
    id: 1,
    title: 'New Tax Regulations Announced',
    description: 'Important changes to business tax policies',
    date: '2024-05-16',
    type: 'Announcement',
  },
  {
    id: 2,
    title: 'Public Health Advisory',
    description: 'Health and safety guidelines update',
    date: '2024-05-15',
    type: 'Health',
  },
  {
    id: 3,
    title: 'Infrastructure Maintenance',
    description: 'Road construction and temporary closures',
    date: '2024-05-14',
    type: 'Infrastructure',
  },
  {
    id: 4,
    title: 'License Renewal Deadline',
    description: 'Business license renewal period closing soon',
    date: '2024-05-13',
    type: 'Legal',
  },
  {
    id: 5,
    title: 'Community Event Alert',
    description: 'Major events happening in your area',
    date: '2024-05-12',
    type: 'Event',
  },
];

const typeColors: Record<string, string> = {
  Announcement: 'bg-blue-500/10 text-blue-700',
  Health: 'bg-red-500/10 text-red-700',
  Infrastructure: 'bg-orange-500/10 text-orange-700',
  Legal: 'bg-purple-500/10 text-purple-700',
  Event: 'bg-green-500/10 text-green-700',
};

export default function GovernmentPage() {
  return (
    <PublicLayout>
      <div>
        <h1 className="text-3xl font-bold mb-2">Government Announcements</h1>
        <p className="text-muted-foreground mb-8">
          Stay informed with official notices and announcements
        </p>

        <div className="space-y-4">
          {notices.map((notice) => (
            <Card
              key={notice.id}
              className="p-6 rounded-2xl hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-secondary p-3">
                  <AlertCircle className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-foreground text-lg">{notice.title}</h3>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${typeColors[notice.type] || typeColors.Announcement}`}
                    >
                      {notice.type}
                    </span>
                  </div>
                  <p className="text-muted-foreground mb-3">{notice.description}</p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {notice.date}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </PublicLayout>
  );
}
