'use client';

import { useState, useEffect } from 'react';
import { SuperAdminLayout } from '@/components/layouts/super-admin-layout';
import { Card } from '@/components/ui/card';
import { CalendarDays, ExternalLink, Ticket, Loader2, Users } from 'lucide-react';
import { apiService } from '@/lib/services/api-service';

export default function SuperAdminEventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [regs, setRegs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiService.get<any>('/v1/events/admin/all'),
      apiService.get<any>('/v1/events/admin/registrations'),
    ]).then(([evRes, regRes]) => {
      setEvents(evRes.data?.data ?? []);
      setRegs(regRes.data?.data ?? []);
    }).finally(() => setLoading(false));
  }, []);

  const fmt = (d?: string) => (d ? new Date(d).toLocaleString('en-IN') : '');

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Events</h1>
          <p className="text-muted-foreground text-sm mt-1">Platform events and their registration / ticket clicks.</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <>
            <Card className="rounded-2xl border-border bg-card overflow-hidden">
              <div className="px-6 py-4 border-b border-border flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-primary" />
                <h2 className="font-bold text-foreground">All Events ({events.length})</h2>
              </div>
              {events.length === 0 ? (
                <p className="text-sm text-muted-foreground p-6">No events published.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-secondary/40">
                        <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground">Event</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground">Business</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground">Dates</th>
                        <th className="px-5 py-3 text-right text-xs font-semibold text-muted-foreground">Registrations</th>
                        <th className="px-5 py-3 text-right text-xs font-semibold text-muted-foreground">Tickets</th>
                      </tr>
                    </thead>
                    <tbody>
                      {events.map((e) => (
                        <tr key={e.id} className="border-b border-border last:border-0 hover:bg-secondary/20">
                          <td className="px-5 py-3 font-semibold text-foreground">{e.title}</td>
                          <td className="px-5 py-3 text-muted-foreground text-xs">{e.business?.name || '—'}</td>
                          <td className="px-5 py-3 text-muted-foreground text-xs whitespace-nowrap">{e.startDate?.slice(0, 10)} → {e.endDate?.slice(0, 10)}</td>
                          <td className="px-5 py-3 text-right"><span className="inline-flex items-center gap-1 text-foreground font-semibold"><ExternalLink className="h-3 w-3 text-primary" /> {e.registrationClicks ?? 0}</span></td>
                          <td className="px-5 py-3 text-right"><span className="inline-flex items-center gap-1 text-foreground font-semibold"><Ticket className="h-3 w-3 text-emerald-400" /> {e.ticketClicks ?? 0}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            <Card className="rounded-2xl border-border bg-card overflow-hidden">
              <div className="px-6 py-4 border-b border-border flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <h2 className="font-bold text-foreground">Recent Registrations ({regs.length})</h2>
              </div>
              {regs.length === 0 ? (
                <p className="text-sm text-muted-foreground p-6">No registration activity yet.</p>
              ) : (
                <div className="divide-y divide-border max-h-[420px] overflow-y-auto">
                  {regs.map((r) => (
                    <div key={r.id} className="px-6 py-3 flex items-center justify-between text-sm">
                      <div className="min-w-0">
                        <p className="text-foreground font-medium truncate">{r.event?.title || 'Event'}</p>
                        <p className="text-xs text-muted-foreground">{r.event?.business?.name || ''}</p>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${r.type === 'TICKET' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-primary/10 text-primary'}`}>{r.type}</span>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{fmt(r.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </>
        )}
      </div>
    </SuperAdminLayout>
  );
}
