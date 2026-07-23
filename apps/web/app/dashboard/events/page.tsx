'use client';

import { useState, useEffect, useCallback } from 'react';
import { BusinessLayout } from '@/components/layouts/business-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, CalendarDays, Trash2, Edit, X, Loader2, ExternalLink, Ticket, Users, MapPin } from 'lucide-react';
import { apiService } from '@/lib/services/api-service';
import { useAuth } from '@/hooks/use-auth';
import { KERALA_CITIES } from '@/lib/constants';

interface Ev {
  id: string;
  title: string;
  description?: string;
  posterImage?: string | null;
  venue?: string | null;
  city?: string | null;
  targetCities?: string[];
  startDate: string;
  endDate: string;
  registrationUrl?: string | null;
  ticketUrl?: string | null;
  registrationClicks?: number;
  ticketClicks?: number;
  status?: string;
}

const empty = {
  title: '', description: '', posterImage: '', venue: '', city: '',
  startDate: '', endDate: '', registrationUrl: '', ticketUrl: '',
};

export default function DashboardEventsPage() {
  const { user } = useAuth();
  const businessId = user?.businessId || user?.entity?.id;

  const [events, setEvents] = useState<Ev[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Ev | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [form, setForm] = useState<any>(empty);
  const [targetCities, setTargetCities] = useState<string[]>([]);

  const fetchEvents = useCallback(async () => {
    if (!businessId) { setLoading(false); return; }
    setLoading(true);
    const res = await apiService.get<any>(`/v1/events/mine/${businessId}`);
    setEvents(res.error ? [] : (Array.isArray(res.data) ? res.data : []));
    setLoading(false);
  }, [businessId]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const openCreate = () => { setEditing(null); setForm(empty); setTargetCities([]); setErr(''); setOpen(true); };
  const openEdit = (ev: Ev) => {
    setEditing(ev);
    setForm({
      title: ev.title, description: ev.description || '', posterImage: ev.posterImage || '',
      venue: ev.venue || '', city: ev.city || '',
      startDate: ev.startDate?.slice(0, 16) || '', endDate: ev.endDate?.slice(0, 16) || '',
      registrationUrl: ev.registrationUrl || '', ticketUrl: ev.ticketUrl || '',
    });
    setTargetCities(ev.targetCities || []);
    setErr('');
    setOpen(true);
  };

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  const toggleCity = (c: string) =>
    setTargetCities((cs) => (cs.includes(c) ? cs.filter((x) => x !== c) : [...cs, c]));

  const save = async () => {
    if (!businessId) return;
    if (!form.title || !form.startDate || !form.endDate) { setErr('Title, start and end dates are required.'); return; }
    setSaving(true); setErr('');
    const payload = {
      businessId,
      ...form,
      targetCities,
      startDate: new Date(form.startDate).toISOString(),
      endDate: new Date(form.endDate).toISOString(),
    };
    const res = editing
      ? await apiService.patch<any>(`/v1/events/${editing.id}`, payload)
      : await apiService.post<any>('/v1/events', payload);
    setSaving(false);
    if (res.error) { setErr(res.error); return; }
    setOpen(false);
    fetchEvents();
  };

  const remove = async (ev: Ev) => {
    if (!businessId) return;
    if (!confirm(`Delete event "${ev.title}"?`)) return;
    await apiService.delete<any>(`/v1/events/${ev.id}?businessId=${businessId}`);
    fetchEvents();
  };

  return (
    <BusinessLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Events</h1>
            <p className="text-muted-foreground text-sm mt-1">Publish events and track registration & ticket clicks.</p>
          </div>
          <Button onClick={openCreate} className="rounded-xl bg-primary text-primary-foreground font-semibold gap-1.5 cursor-pointer">
            <Plus className="h-4 w-4" /> New Event
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : events.length === 0 ? (
          <Card className="p-12 rounded-2xl text-center border-dashed border-border bg-card/40">
            <CalendarDays className="h-10 w-10 mx-auto text-muted-foreground mb-3 opacity-50" />
            <p className="text-sm text-muted-foreground">No events yet. Publish your first one.</p>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {events.map((ev) => (
              <Card key={ev.id} className="p-5 rounded-2xl border-border bg-card">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-foreground">{ev.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {[ev.venue, ev.city].filter(Boolean).join(', ') || '—'}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {ev.startDate?.slice(0, 10)} → {ev.endDate?.slice(0, 10)}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button onClick={() => openEdit(ev)} variant="outline" size="icon" className="h-8 w-8 rounded-lg border-border cursor-pointer"><Edit className="h-3.5 w-3.5" /></Button>
                    <Button onClick={() => remove(ev)} variant="outline" size="icon" className="h-8 w-8 rounded-lg border-destructive/30 text-destructive cursor-pointer"><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
                <div className="flex gap-3 mt-3">
                  <span className="inline-flex items-center gap-1 text-xs text-foreground"><ExternalLink className="h-3.5 w-3.5 text-primary" /> {ev.registrationClicks ?? 0} registrations</span>
                  <span className="inline-flex items-center gap-1 text-xs text-foreground"><Ticket className="h-3.5 w-3.5 text-success" /> {ev.ticketClicks ?? 0} ticket clicks</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card className="w-full max-w-lg p-6 rounded-2xl border-border bg-card shadow-2xl relative max-h-[88vh] overflow-y-auto">
            <button onClick={() => setOpen(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer"><X className="h-5 w-5" /></button>
            <h3 className="text-lg font-bold text-foreground mb-4">{editing ? 'Edit Event' : 'New Event'}</h3>

            <div className="space-y-3">
              <Input placeholder="Event title" value={form.title} onChange={(e) => set('title', e.target.value)} className="h-10 bg-background border-input rounded-xl text-foreground" />
              <textarea placeholder="Description" value={form.description} onChange={(e) => set('description', e.target.value)} className="w-full min-h-20 p-3 bg-background border border-input rounded-xl text-sm text-foreground" />
              <Input placeholder="Poster image URL (optional)" value={form.posterImage} onChange={(e) => set('posterImage', e.target.value)} className="h-10 bg-background border-input rounded-xl text-foreground" />
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="Venue" value={form.venue} onChange={(e) => set('venue', e.target.value)} className="h-10 bg-background border-input rounded-xl text-foreground" />
                <select value={form.city} onChange={(e) => set('city', e.target.value)} className="h-10 px-3 bg-background border border-input rounded-xl text-sm text-foreground">
                  <option value="">City (location)</option>
                  {KERALA_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-[11px] text-muted-foreground">Start date &amp; time</label><Input type="datetime-local" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} className="h-10 bg-background border-input rounded-xl text-foreground" /></div>
                <div><label className="text-[11px] text-muted-foreground">End date &amp; time</label><Input type="datetime-local" value={form.endDate} onChange={(e) => set('endDate', e.target.value)} className="h-10 bg-background border-input rounded-xl text-foreground" /></div>
              </div>
              <Input placeholder="Registration URL (external)" value={form.registrationUrl} onChange={(e) => set('registrationUrl', e.target.value)} className="h-10 bg-background border-input rounded-xl text-foreground" />
              <Input placeholder="Ticket / booking URL (external)" value={form.ticketUrl} onChange={(e) => set('ticketUrl', e.target.value)} className="h-10 bg-background border-input rounded-xl text-foreground" />

              <div>
                <label className="text-[11px] text-muted-foreground">Show in cities (none = all cities)</label>
                <div className="flex flex-wrap gap-1.5 mt-1 max-h-28 overflow-y-auto">
                  {KERALA_CITIES.map((c) => (
                    <button key={c} type="button" onClick={() => toggleCity(c)}
                      className={`px-2 py-1 rounded-lg text-[11px] border cursor-pointer ${targetCities.includes(c) ? 'bg-primary/20 border-primary text-primary' : 'bg-background border-input text-muted-foreground'}`}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {err && <p className="text-xs text-destructive">{err}</p>}
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <Button onClick={() => setOpen(false)} variant="outline" className="rounded-xl border-border text-muted-foreground">Cancel</Button>
              <Button onClick={save} disabled={saving} className="rounded-xl bg-primary text-primary-foreground font-semibold gap-1.5">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarDays className="h-4 w-4" />} {editing ? 'Save' : 'Publish'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </BusinessLayout>
  );
}
