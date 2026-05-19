'use client';

import { PublicLayout } from '@/components/layouts/public-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, CheckCircle, AlertCircle, Info, X } from 'lucide-react';

const notifications = [
  {
    id: 1,
    type: 'offer',
    title: 'New Offer Available',
    description: 'Your favorite restaurant has a new 40% off offer',
    timestamp: '2 hours ago',
    icon: Bell,
  },
  {
    id: 2,
    type: 'review',
    title: 'Your Review Posted',
    description: 'Your review for Bella Restaurant has been published',
    timestamp: '5 hours ago',
    icon: CheckCircle,
  },
  {
    id: 3,
    type: 'alert',
    title: 'Business Alert',
    description: 'A business you follow has updated their hours',
    timestamp: '1 day ago',
    icon: AlertCircle,
  },
  {
    id: 4,
    type: 'info',
    title: 'Government Notice',
    description: 'New business tax regulations announced',
    timestamp: '2 days ago',
    icon: Info,
  },
];

const iconColors: Record<string, string> = {
  offer: 'text-blue-600 dark:text-blue-400',
  review: 'text-green-600 dark:text-green-400',
  alert: 'text-orange-600 dark:text-orange-400',
  info: 'text-purple-600 dark:text-purple-400',
};

export default function NotificationsPage() {
  return (
    <PublicLayout>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-foreground">Notifications</h1>
          <Button variant="outline" className="rounded-lg">
            Mark all as read
          </Button>
        </div>

        <div className="space-y-3">
          {notifications.map((notification) => {
            const Icon = notification.icon;
            return (
              <Card
                key={notification.id}
                className="p-4 rounded-2xl hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-start gap-4">
                  <div className="rounded-xl bg-secondary p-3 flex-shrink-0">
                    <Icon className={`h-6 w-6 ${iconColors[notification.type]}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground mb-1">{notification.title}</h3>
                    <p className="text-sm text-muted-foreground mb-2">{notification.description}</p>
                    <p className="text-xs text-muted-foreground">{notification.timestamp}</p>
                  </div>
                  <Button size="icon" variant="ghost" className="rounded-lg flex-shrink-0">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Empty state alternative */}
        {notifications.length === 0 && (
          <Card className="p-12 rounded-2xl text-center">
            <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Notifications</h3>
            <p className="text-muted-foreground">You're all caught up!</p>
          </Card>
        )}
      </div>
    </PublicLayout>
  );
}
