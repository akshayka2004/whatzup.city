'use client';

import Link from 'next/link';
import { StaffLayout } from '@/components/layouts/staff-layout';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { CalendarDays, Clapperboard, Tag, Megaphone, Building2 } from 'lucide-react';

const LINKS = [
  { label: 'Events', href: '/staff/events', icon: CalendarDays, desc: 'Publish and manage platform events.' },
  { label: 'Movies', href: '/staff/movies', icon: Clapperboard, desc: 'Publish movie listings.' },
  { label: 'Platform Offers', href: '/staff/platform-offers', icon: Tag, desc: 'Publish curated platform deals.' },
  { label: 'Announcements', href: '/staff/announcements', icon: Megaphone, desc: 'Broadcast civic notices and alerts.' },
  { label: 'Businesses', href: '/staff/businesses', icon: Building2, desc: 'Look up registered businesses (read-only).' },
];

export default function StaffOverviewPage() {
  const { user } = useAuth();

  return (
    <StaffLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Welcome{user?.name ? `, ${user.name}` : ''}</h1>
          <p className="text-muted-foreground text-sm mt-1">Platform data-entry workspace.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {LINKS.map((l) => {
            const Icon = l.icon;
            return (
              <Link key={l.href} href={l.href}>
                <Card className="p-5 rounded-2xl border-border bg-card hover:border-primary/30 hover:bg-secondary/40 transition-colors cursor-pointer h-full">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-3">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold text-foreground">{l.label}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{l.desc}</p>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </StaffLayout>
  );
}
