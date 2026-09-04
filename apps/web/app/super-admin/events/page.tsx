'use client';

import { useState, useEffect, useCallback } from 'react';
import { SuperAdminLayout } from '@/components/layouts/super-admin-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CalendarDays, ExternalLink, Ticket, Loader2, Users, Plus, Pencil, Trash2, X, ImagePlus, Megaphone } from 'lucide-react';
import { apiService } from '@/lib/services/api-service';
import { KERALA_CITIES, EVENT_CATEGORIES } from '@/lib/constants';

const PLATFORM_HOST = '__PLATFORM__';

const empty = {
  businessId: '', hostLabel: 'Special Correspondent', title: '', description: '', posterImage: '', venue: '', city: '',
  category: '', ticketType: 'FREE', ticketPrice: '',
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
  const [posterUploading, setPosterUploading] = useState(false);

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
      businessId: e.business?.id || e.businessId || (e.hostLabel ? PLATFORM_HOST : ''),
      hostLabel: e.hostLabel || 'Special Correspondent',
      title: e.title || '', description: e.description || '', posterImage: e.posterImage || '',
      venue: e.venue || '', city: e.city || '',
      category: e.category || '', ticketType: e.ticketType || 'FREE',
      ticketPrice: e.ticketPrice != null ? String(e.ticketPrice) : '',
      startDate: e.startDate?.slice(0, 16) || '', endDate: e.endDate?.slice(0, 16) || '',
      registrationUrl: e.registrationUrl || '', ticketUrl: e.ticketUrl || '',
    });
    setErr(''); setOpen(true);
  };

  const handlePosterUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) { setErr('Poster must be an image.'); return; }
    setPosterUploading(true); setErr('');
    try {
      const signed = await apiService.post<{ uploadUrl: string; fileKey: string; bucket: string }>(
        '/v1/storage/upload-url',
        { category: 'event', filename: file.name, mimeType: file.type, entityId: editing?.id || 'new' },
      );
      if (signed.error || !signed.data?.uploadUrl) throw new Error(signed.error || 'Upload URL failed');
      const { uploadUrl, fileKey, bucket } = signed.data;
      const put = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
      if (!put.ok) throw new Error(`Storage upload failed (${put.status})`);
      const publicUrl = `${new URL(uploadUrl).origin}/storage/v1/object/public/${bucket}/${fileKey}`;
      set('posterImage', publicUrl);
    } catch (e: any) {
      setErr(e?.message || 'Poster upload failed');
    } finally {
      setPosterUploading(false);
    }
  };

  const save = async () => {
    if (!form.title || !form.startDate || !form.endDate) { setErr('Title, start and end date/time are required.'); return; }
    if (!editing) {
      if (!form.businessId) { setErr('Pick a business to host the event.'); return; }
      if (form.businessId === PLATFORM_HOST && !form.hostLabel.trim()) { setErr('Enter a host label for the platform event.'); return; }
    }
    if (form.ticketType === 'PAID' && !form.ticketPrice) { setErr('Enter a ticket price, or switch to Free.'); return; }
    setSaving(true); setErr('');
    const isPlatform = form.businessId === PLATFORM_HOST;
    const payload = {
      ...form,
      businessId: isPlatform ? undefined : form.businessId,
      hostLabel: isPlatform ? (form.hostLabel.trim() || 'Special Correspondent') : undefined,
      ticketPrice: form.ticketType === 'PAID' ? Number(form.ticketPrice) : undefined,
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
                          <td className="px-5 py-3 font-semibold text-foreground">
                            {e.title}
                            <div className="flex items-center gap-1.5 mt-1">
                              {e.category && (
                                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-secondary text-muted-foreground">
                                  {EVENT_CATEGORIES.find((c) => c.value === e.category)?.label || e.category}
                                </span>
                              )}
                              <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-medium ${e.ticketType === 'PAID' ? 'bg-primary/10 text-primary' : 'bg-success/10 text-success'}`}>
                                {e.ticketType === 'PAID' ? `₹${Number(e.ticketPrice || 0).toLocaleString('en-IN')}` : 'Free'}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-muted-foreground text-xs">
                            {e.business?.name || (e.hostLabel && (
                              <span className="inline-flex items-center gap-1"><Megaphone className="h-3 w-3 text-primary" /> {e.hostLabel}</span>
                            )) || '—'}
                          </td>
                          <td className="px-5 py-3 text-muted-foreground text-xs whitespace-nowrap">{fmt(e.startDate)} → {fmt(e.endDate)}</td>
                          <td className="px-5 py-3 text-right"><span className="inline-flex items-center gap-1 text-foreground font-semibold"><ExternalLink className="h-3 w-3 text-primary" /> {e.registrationClicks ?? 0}</span></td>
                          <td className="px-5 py-3 text-right"><span className="inline-flex items-center gap-1 text-foreground font-semibold"><Ticket className="h-3 w-3 text-success" /> {e.ticketClicks ?? 0}</span></td>
                          <td className="px-5 py-3 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-2">
                              <Button onClick={() => openEdit(e)} variant="outline" size="icon" className="h-9 w-9 rounded-lg border-border cursor-pointer"><Pencil className="h-3.5 w-3.5" /></Button>
                              <Button onClick={() => remove(e)} variant="outline" size="icon" className="h-9 w-9 rounded-lg border-destructive/30 text-destructive cursor-pointer"><Trash2 className="h-3.5 w-3.5" /></Button>
                            </div>
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
                  <option value={PLATFORM_HOST}>✦ Special Correspondent (Platform)</option>
                  {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}{b.city ? ` — ${b.city}` : ''}</option>)}
                </select>
              </div>
              {form.businessId === PLATFORM_HOST && (
                <Input placeholder="Host label (shown to visitors)" value={form.hostLabel} onChange={(e) => set('hostLabel', e.target.value)}
                  disabled={!!editing} className="h-10 bg-background border-input rounded-xl text-foreground disabled:opacity-60" />
              )}
              <Input placeholder="Event title" value={form.title} onChange={(e) => set('title', e.target.value)} className="h-10 bg-background border-input rounded-xl text-foreground" />
              <textarea placeholder="Description" value={form.description} onChange={(e) => set('description', e.target.value)} className="w-full min-h-20 p-3 bg-background border border-input rounded-xl text-sm text-foreground" />

              <div>
                <label className="text-[11px] text-muted-foreground">Poster image</label>
                <div className="flex items-center gap-3 mt-1">
                  {form.posterImage && (
                    <img src={form.posterImage} alt="Poster" className="h-14 w-14 rounded-lg object-cover border border-border shrink-0" />
                  )}
                  <label className="flex-1 h-10 px-3 flex items-center gap-2 bg-background border border-dashed border-input rounded-xl text-sm text-muted-foreground cursor-pointer hover:border-primary/50">
                    {posterUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                    {posterUploading ? 'Uploading…' : form.posterImage ? 'Replace poster' : 'Upload poster'}
                    <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePosterUpload(f); }} />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="Venue / location" value={form.venue} onChange={(e) => set('venue', e.target.value)} className="h-10 bg-background border-input rounded-xl text-foreground" />
                <select value={form.city} onChange={(e) => set('city', e.target.value)} className="h-10 px-3 bg-background border border-input rounded-xl text-sm text-foreground">
                  <option value="">City</option>
                  {KERALA_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <select value={form.category} onChange={(e) => set('category', e.target.value)} className="h-10 px-3 bg-background border border-input rounded-xl text-sm text-foreground">
                  <option value="">Category</option>
                  {EVENT_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <select value={form.ticketType} onChange={(e) => set('ticketType', e.target.value)} className="h-10 px-3 bg-background border border-input rounded-xl text-sm text-foreground">
                    <option value="FREE">Free</option>
                    <option value="PAID">Paid</option>
                  </select>
                  {form.ticketType === 'PAID' && (
                    <Input type="number" placeholder="Price ₹" value={form.ticketPrice} onChange={(e) => set('ticketPrice', e.target.value)} className="h-10 bg-background border-input rounded-xl text-foreground" />
                  )}
                </div>
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
