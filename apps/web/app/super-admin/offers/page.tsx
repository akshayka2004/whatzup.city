'use client';

import { SuperAdminLayout } from '@/components/layouts/super-admin-layout';
import { Card } from '@/components/ui/card';
import { Tag, CalendarDays, Sparkles } from 'lucide-react';

export default function SuperAdminOffersPage() {
  return (
    <SuperAdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Platform Offers</h1>
        <p className="text-muted-foreground text-sm mt-1">Post exclusive offers for dedicated users across the platform</p>
      </div>

      <div className="flex items-center justify-center min-h-[55vh]">
        <Card className="w-full max-w-md p-10 rounded-2xl border-border bg-card text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
            <Tag className="h-8 w-8 text-primary" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold mb-4">
            <CalendarDays className="h-3.5 w-3.5" />
            Work in Progress
          </div>
          <h2 className="text-2xl font-extrabold text-foreground mb-3">Platform Offers</h2>
          <p className="text-muted-foreground text-sm leading-relaxed mb-6">
            This section will allow super admins to create and post exclusive offers directly to
            specific users or user segments across the entire platform. Coming soon.
          </p>
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Feature under active development
          </div>
        </Card>
      </div>
    </SuperAdminLayout>
  );
}
