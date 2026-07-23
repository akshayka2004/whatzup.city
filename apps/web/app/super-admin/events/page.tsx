'use client';

import { useState, useEffect, useCallback } from 'react';
import { SuperAdminLayout } from '@/components/layouts/super-admin-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CalendarDays, ExternalLink, Ticket, Loader2, Users, Plus, Pencil, Trash2, X } from 'lucide-react';
import { apiService } from '@/lib/services/api-service';
import { KERALA_CITIES } from '@/lib/constants';

const empty = {
  businessId: '', title: '', description: '', posterImage: '', venue: '', city: '',
  startDate: '', endDate: '', registrationUrl: '', ticketUrl: '',
};

export default function SuperAdminEventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [regs, setRegs] = useState<any[]>([]);
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(empty);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      apiService.get<any>('/v1/events/admin/all'),
      apiService.get<any>('/v1/events/admin/registrations'),
    ]).then(([evRes, regRes]) => {
      setEvents(evRes.data?.data ?? []);
      setRegs(regRes.data?.data ?? []);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    apiService.get<any>('/v1/businesses/admin/all?limit=100').then((res) => {
      setBusinesses(res.data?.data ?? []);
    });
  }, []);

  const fmt = (d?: string) => (d ? new Date(d).toLocaleString('en-IN') : '');
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const openCreate = () => { setEditing(null); setForm(empty); setErr(''); setOpen(true); };
  const openEdit = (e: any) => {
    setEditing(e);
    setForm({
      businessId: e.business?.id || e.businessId || '',
      title: e.title || '', description: e.description || '', posterImage: e.posterImage || '',
      venue: e.venue || '', city: e.city || '',
      startDate: e.startDate?.slice(0, 16) || '', endDate: e.endDate?.slice(0, 16) || '',
      registrationUrl: e.registrationUrl || '', ticketUrl: e.ticketUrl || '',
    });
    setErr(''); setOpen(true);
  };

  const save = async () => {
    if (!form.title || !form.startDate || !form.endDate) { setErr('Title, start and end date/time are required.'); return; }
    if (!editing && !form.businessId) { setErr('Pick a business to host the event.'); return; }
    setSaving(true); setErr('');
    const payload = {
      ...form,
      startDate: new Date(form.startDate).toISOString(),
      endDate: new Date(form.endDate).toISOString(),
    };
    const res = editing
      ? await apiService.patch<any>(`/v1/events/admin/${editing.id}`, payload)
      : await apiService.post<any>('/v1/events/admin', payload);
    setSaving(false);
    if (res.error) { setErr(res.error); return; }
    setOpen(false);
    load();
  };

  const remove = async (e: any) => {
    if (!confirm(`Delete event "${e.title}"?`)) return;
    await apiService.delete<any>(`/v1/events/admin/${e.id}`);
    load();
  };

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Events</h1>
            <p className="text-muted-foreground text-sm mt-1">Create, edit and remove platform events; track clicks.</p>
          </div>
          <Button onClick={openCreate} className="rounded-xl bg-primary text-primary-foreground font-semibold gap-1.5 cursor-pointer">
            <Plus className="h-4 w-4" /> New Event
          </Button>
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
                <p className="text-sm text-muted-foreground p-6">No events yet. Create one.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-secondary/40">
                        <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground">Event</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground">Business</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground">When</th>
                        <th className="px-5 py-3 text-right text-xs font-semibold text-muted-foreground">Reg</th>
                        <th className="px-5 py-3 text-right text-xs font-semibold text-muted-foreground">Tickets</th>
                        <th className="px-5 py-3 text-right text-xs font-semibold text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {events.map((e) => (
                        <tr key={e.id} className="border-b border-border last:border-0 hover:bg-secondary/20">
                          <td className="px-5 py-3 font-semibold text-foreground">{e.title}</td>
                          <td className="px-5 py-3 text-muted-foreground text-xs">{e.business?.name || '—'}</td>
                          <td className="px-5 py-3 text-muted-foreground text-xs whitespace-nowrap">{fmt(e.startDate)} → {fmt(e.endDate)}</td>
                          <td className="px-5 py-3 text-right"><span className="inline-flex items-center gap-1 text-foreground font-semibold"><ExternalLink className="h-3 w-3 text-primary" /> {e.registrationClicks ?? 0}</span></td>
                          <td className="px-5 py-3 text-right"><span className="inline-flex items-center gap-1 text-foreground font-semibold"><Ticket className="h-3 w-3 text-success" /> {e.ticketClicks ?? 0}</span></td>
                          <td className="px-5 py-3 text-right whitespace-nowrap">
                            <Button onClick={() => openEdit(e)} variant="outline" size="icon" className="h-8 w-8 rounded-lg border-border mr-1 cursor-pointer"><Pencil className="h-3.5 w-3.5" /></Button>
                            <Button onClick={() => remove(e)} variant="outline" size="icon" className="h-8 w-8 rounded-lg border-destructive/30 text-destructive cursor-pointer"><Trash2 className="h-3.5 w-3.5" /></Button>
                          </td>
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
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${r.type === 'TICKET' ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'}`}>{r.type}</span>
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

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card className="w-full max-w-lg p-6 rounded-2xl border-border bg-card shadow-2xl relative max-h-[88vh] overflow-y-auto">
            <button onClick={() => setOpen(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer"><X className="h-5 w-5" /></button>
            <h3 className="text-lg font-bold text-foreground mb-4">{editing ? 'Edit Event' : 'New Event'}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] text-muted-foreground">Host business</label>
                <select value={form.businessId} onChange={(e) => set('businessId', e.target.value)} disabled={!!editing}
                  className="w-full h-10 px-3 bg-background border border-input rounded-xl text-sm text-foreground disabled:opacity-60">
                  <option value="">Select business…</option>
                  {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}{b.city ? ` — ${b.city}` : ''}</option>)}
                </select>
              </div>
              <Input placeholder="Event title" value={form.title} onChange={(e) => set('title', e.target.value)} className="h-10 bg-background border-input rounded-xl text-foreground" />
              <textarea placeholder="Description" value={form.description} onChange={(e) => set('description', e.target.value)} className="w-full min-h-20 p-3 bg-background border border-input rounded-xl text-sm text-foreground" />
              <Input placeholder="Poster image URL (optional)" value={form.posterImage} onChange={(e) => set('posterImage', e.target.value)} className="h-10 bg-background border-input rounded-xl text-foreground" />
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="Venue / location" value={form.venue} onChange={(e) => set('venue', e.target.value)} className="h-10 bg-background border-input rounded-xl text-foreground" />
                <select value={form.city} onChange={(e) => set('city', e.target.value)} className="h-10 px-3 bg-background border border-input rounded-xl text-sm text-foreground">
                  <option value="">City</option>
                  {KERALA_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-[11px] text-muted-foreground">Start date &amp; time</label><Input type="datetime-local" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} className="h-10 bg-background border-input rounded-xl text-foreground" /></div>
                <div><label className="text-[11px] text-muted-foreground">End date &amp; time</label><Input type="datetime-local" value={form.endDate} onChange={(e) => set('endDate', e.target.value)} className="h-10 bg-background border-input rounded-xl text-foreground" /></div>
              </div>
              <Input placeholder="Registration URL (external)" value={form.registrationUrl} onChange={(e) => set('registrationUrl', e.target.value)} className="h-10 bg-background border-input rounded-xl text-foreground" />
              <Input placeholder="Ticket / booking URL (external)" value={form.ticketUrl} onChange={(e) => set('ticketUrl', e.target.value)} className="h-10 bg-background border-input rounded-xl text-foreground" />
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
    </SuperAdminLayout>
  );
}
