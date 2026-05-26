'use client';

import { BusinessLayout } from '@/components/layouts/business-layout';
import { Card } from '@/components/ui/card';
import { Megaphone, CalendarDays, Sparkles } from 'lucide-react';

export default function CampaignsPage() {
  return (
    <BusinessLayout>
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md p-10 rounded-2xl border-white/5 bg-card/40 backdrop-blur-xl text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
            <Megaphone className="h-8 w-8 text-primary" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold mb-4">
            <CalendarDays className="h-3.5 w-3.5" />
            Coming Soon
          </div>
          <h2 className="text-2xl font-extrabold text-foreground mb-3">Campaigns</h2>
          <p className="text-muted-foreground text-sm leading-relaxed mb-6">
            Notice &amp; Engagement Campaigns — broadcast promotions, push notifications, and targeted alerts
            to your audience — will be available from <span className="font-semibold text-foreground">June 2025</span>.
          </p>
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            We&apos;re building something great. Check back in June.
          </div>
        </Card>
      </div>
    </BusinessLayout>
  );
}
