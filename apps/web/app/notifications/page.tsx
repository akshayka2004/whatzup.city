'use client';

import { useState, useEffect } from 'react';
import { PublicLayout } from '@/components/layouts/public-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, CheckCircle, AlertCircle, Info, X, Loader2 } from 'lucide-react';
import { apiService } from '@/lib/services/api-service';

interface ApiNotification {
  id: string;
  type?: string;
  title: string;
  body?: string;
  message?: string;
  read?: boolean;
  isRead?: boolean;
  createdAt: string;
  metadata?: any;
}

interface UiNotification {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
}

const iconColors: Record<string, string> = {
  offer: 'text-blue-600 dark:text-blue-400',
  review: 'text-green-600 dark:text-green-400',
  alert: 'text-orange-600 dark:text-orange-400',
  info: 'text-purple-600 dark:text-purple-400',
  default: 'text-muted-foreground',
};

function getIcon(type: string) {
  if (type.includes('OFFER')) return Bell;
  if (type.includes('REVIEW') || type.includes('APPROVED')) return CheckCircle;
  if (type.includes('ALERT') || type.includes('REJECTED')) return AlertCircle;
  return Info;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'Just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  return new Date(iso).toLocaleDateString();
}

function typeBucket(t?: string): string {
  if (!t) return 'info';
  const u = t.toUpperCase();
  if (u.includes('OFFER')) return 'offer';
  if (u.includes('REVIEW') || u.includes('APPROVED')) return 'review';
  if (u.includes('ALERT') || u.includes('REJECTED')) return 'alert';
  return 'info';
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<UiNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    setLoading(true);
    const res = await apiService.get<any>('/v1/notifications');
    if (res.data && !res.error) {
      const raw = Array.isArray(res.data) ? res.data : res.data?.data ?? res.data?.items ?? [];
      setNotifications(
        raw.map((n: ApiNotification) => ({
          id: n.id,
          type: typeBucket(n.type),
          title: n.title || 'Notification',
          description: n.body || n.message || '',
          timestamp: relativeTime(n.createdAt),
          read: n.isRead ?? n.read ?? false,
        })),
      );
    } else {
      setNotifications([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAllRead = async () => {
    await apiService.patch('/v1/notifications/mark-all-read');
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleDismiss = async (id: string) => {
    await apiService.patch(`/v1/notifications/${id}/read`);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleToggleRead = async (id: string) => {
    await apiService.patch(`/v1/notifications/${id}/read`);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: !n.read } : n)),
    );
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
              className="rounded-xl border-border text-muted-foreground hover:bg-muted/40"
              onClick={handleMarkAllRead}
            >
              Mark all as read
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
          </div>
        ) : notifications.length === 0 ? (
          <Card className="p-12 rounded-2xl text-center border-dashed border-border bg-muted/40">
            <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Notifications</h3>
            <p className="text-muted-foreground">You're all caught up!</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => {
              const Icon = getIcon(notification.type.toUpperCase());
              return (
                <Card
                  key={notification.id}
                  onClick={() => handleToggleRead(notification.id)}
                  className={`p-4 rounded-2xl hover:shadow-md transition-all cursor-pointer border border-border ${
                    notification.read ? 'bg-card/20 opacity-70' : 'bg-card/60 font-semibold'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="rounded-xl bg-muted/40 p-3 flex-shrink-0 border border-border">
                      <Icon className={`h-6 w-6 ${iconColors[notification.type] || iconColors.default}`} />
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
                      className="rounded-xl flex-shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted/40"
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
        )}
      </div>
    </PublicLayout>
  );
}
