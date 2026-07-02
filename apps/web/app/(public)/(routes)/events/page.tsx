'use client';

import { useState, useEffect } from 'react';
import { PublicLayout } from '@/components/layouts/public-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Ticket, ExternalLink, Loader2, CalendarDays } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { apiService } from '@/lib/services/api-service';
import { KERALA_CITIES, getViewerCity, setViewerCity } from '@/lib/constants';

interface Ev {
  id: string;
  title: string;
  description: string;
  posterImage?: string | null;
  venue?: string | null;
  city?: string | null;
  startDate: string;
  endDate: string;
  registrationUrl?: string | null;
  ticketUrl?: string | null;
  business?: { name?: string; logo?: string | null } | null;
}

function fmt(d?: string) {
  return d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
}

export default function EventsPage() {
  const [events, setEvents] = useState<Ev[]>([]);
  const [loading, setLoading] = useState(true);
  const [city, setCity] = useState('');

  useEffect(() => {
    setCity(getViewerCity());
  }, []);

  useEffect(() => {
    setLoading(true);
    apiService
      .get<any>(`/v1/events${city ? `?city=${encodeURIComponent(city)}` : ''}`)
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
        setEvents(res.error ? [] : list);
      })
      .finally(() => setLoading(false));
  }, [city]);

  const handleCityChange = (v: string) => {
    const next = v === 'all' ? '' : v;
    setCity(next);
    setViewerCity(next);
  };

  // Record the outbound click, then open the publisher's page in a new tab.
  const go = async (ev: Ev, type: 'REGISTER' | 'TICKET') => {
    const res = await apiService.post<any>(`/v1/events/${ev.id}/click`, { type });
    const url = res.data?.url;
    if (url) {
      window.open(url.startsWith('http') ? url : `https://${url}`, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <PublicLayout>
      <div>
        <h1 className="text-3xl font-bold mb-2">Events</h1>
        <p className="text-muted-foreground mb-6">Discover events near you — register or grab tickets.</p>

        <div className="mb-8">
          <Select value={city || 'all'} onValueChange={handleCityChange}>
            <SelectTrigger className="w-52 rounded-xl border-white/10">
              <SelectValue placeholder="Filter by city" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cities</SelectItem>
              {KERALA_CITIES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
          </div>
        ) : events.length === 0 ? (
          <Card className="p-12 rounded-2xl text-center border-dashed border-white/10 bg-white/5">
            <CalendarDays className="h-10 w-10 mx-auto text-muted-foreground mb-3 opacity-50" />
            <h3 className="text-base font-semibold text-foreground mb-1">No upcoming events</h3>
            <p className="text-sm text-muted-foreground">Check back soon.</p>
          </Card>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((ev) => (
              <Card key={ev.id} className="rounded-2xl overflow-hidden border-white/5 bg-card/40 backdrop-blur-xl flex flex-col">
                <div className="h-40 bg-white/5 relative">
                  {ev.posterImage ? (
                    <img src={ev.posterImage} alt={ev.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <CalendarDays className="h-10 w-10 text-muted-foreground opacity-40" />
                    </div>
                  )}
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <h3 className="font-semibold text-foreground text-lg leading-tight">{ev.title}</h3>
                  {ev.business?.name && <p className="text-xs text-muted-foreground mt-0.5">by {ev.business.name}</p>}
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2 flex-1">{ev.description}</p>

                  <div className="flex flex-col gap-1.5 mt-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> {fmt(ev.startDate)}{ev.endDate && ev.endDate !== ev.startDate ? ` – ${fmt(ev.endDate)}` : ''}</span>
                    {(ev.venue || ev.city) && (
                      <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {[ev.venue, ev.city].filter(Boolean).join(', ')}</span>
                    )}
                  </div>

                  <div className="flex gap-2 mt-4">
                    {ev.registrationUrl && (
                      <Button onClick={() => go(ev, 'REGISTER')} size="sm" className="flex-1 rounded-xl bg-primary text-primary-foreground font-semibold gap-1.5 cursor-pointer">
                        <ExternalLink className="h-3.5 w-3.5" /> Register
                      </Button>
                    )}
                    {ev.ticketUrl && (
                      <Button onClick={() => go(ev, 'TICKET')} size="sm" variant="outline" className="flex-1 rounded-xl border-primary/30 text-primary hover:bg-primary/10 gap-1.5 cursor-pointer">
                        <Ticket className="h-3.5 w-3.5" /> Tickets
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
