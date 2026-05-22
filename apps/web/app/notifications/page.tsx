'use client';

import { useState } from 'react';
import { PublicLayout } from '@/components/layouts/public-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, CheckCircle, AlertCircle, Info, X } from 'lucide-react';

const initialNotifications = [
  {
    id: 1,
    type: 'offer',
    title: 'New Offer Available',
    description: 'Your favorite restaurant has a new 40% off offer',
    timestamp: '2 hours ago',
    read: false,
    icon: Bell,
  },
  {
    id: 2,
    type: 'review',
    title: 'Your Review Posted',
    description: 'Your review for Bella Restaurant has been published',
    timestamp: '5 hours ago',
    read: false,
    icon: CheckCircle,
  },
  {
    id: 3,
    type: 'alert',
    title: 'Business Alert',
    description: 'A business you follow has updated their hours',
    timestamp: '1 day ago',
    read: true,
    icon: AlertCircle,
  },
  {
    id: 4,
    type: 'info',
    title: 'Government Notice',
    description: 'New business tax regulations announced',
    timestamp: '2 days ago',
    read: true,
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
  const [notifications, setNotifications] = useState(initialNotifications);

  const handleMarkAllRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, read: true })));
  };

  const handleDismiss = (id: number) => {
    setNotifications(notifications.filter((n) => n.id !== id));
  };

  const handleToggleRead = (id: number) => {
    setNotifications(notifications.map((n) => (n.id === id ? { ...n, read: !n.read } : n)));
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <PublicLayout>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-foreground">Notifications</h1>
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary text-primary-foreground">
                {unreadCount} new
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              className="rounded-xl border-white/10 text-slate-300 hover:bg-white/5"
              onClick={handleMarkAllRead}
            >
              Mark all as read
            </Button>
          )}
        </div>

        <div className="space-y-3">
          {notifications.map((notification) => {
            const Icon = notification.icon;
            return (
              <Card
                key={notification.id}
                onClick={() => handleToggleRead(notification.id)}
                className={`p-4 rounded-2xl hover:shadow-md transition-all cursor-pointer border border-white/5 ${
                  notification.read ? 'bg-card/20 opacity-70' : 'bg-card/60 font-semibold'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="rounded-xl bg-white/5 p-3 flex-shrink-0 border border-white/5">
                    <Icon className={`h-6 w-6 ${iconColors[notification.type]}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-foreground truncate">
                        {notification.title}
                      </h3>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {notification.timestamp}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {notification.description}
                    </p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="rounded-xl flex-shrink-0 text-muted-foreground hover:text-foreground hover:bg-white/5"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDismiss(notification.id);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>

        {notifications.length === 0 && (
          <Card className="p-12 rounded-2xl text-center border-dashed border-white/10 bg-white/5">
            <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Notifications</h3>
            <p className="text-muted-foreground">You're all caught up!</p>
          </Card>
        )}
      </div>
    </PublicLayout>
  );
}
