'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Clapperboard, Loader2, Plus, Pencil, Trash2, X, ImagePlus } from 'lucide-react';
import { apiService } from '@/lib/services/api-service';
import { KERALA_CITIES } from '@/lib/constants';

const STATUSES = [
  { value: 'UPCOMING', label: 'Upcoming' },
  { value: 'NOW_SHOWING', label: 'Now Showing' },
  { value: 'ENDED', label: 'Ended' },
];
const CERTIFICATIONS = ['U', 'U/A', 'A', 'S'];

const empty = {
  name: '', posterImage: '', language: '', genres: '', durationMinutes: '',
  certification: '', releaseDate: '', synopsis: '', cast: '',
  trailerUrl: '', bookingUrl: '', status: 'UPCOMING',
};

// Shared by /super-admin/movies and /staff/movies — same CRUD, different Layout wrapper.
export function MoviesManager() {
  const [movies, setMovies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [targetCities, setTargetCities] = useState<string[]>([]);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(empty);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [posterUploading, setPosterUploading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    apiService.get<any>('/v1/movies/admin/all').then((res) => {
      setMovies(res.data?.data ?? []);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  const toggleCity = (c: string) =>
    setTargetCities((cs) => (cs.includes(c) ? cs.filter((x) => x !== c) : [...cs, c]));

  const openCreate = () => { setEditing(null); setForm(empty); setTargetCities([]); setErr(''); setOpen(true); };
  const openEdit = (m: any) => {
    setEditing(m);
    setForm({
      name: m.name || '', posterImage: m.posterImage || '', language: m.language || '',
      genres: Array.isArray(m.genres) ? m.genres.join(', ') : '',
      durationMinutes: m.durationMinutes ? String(m.durationMinutes) : '',
      certification: m.certification || '', releaseDate: m.releaseDate?.slice(0, 10) || '',
      synopsis: m.synopsis || '', cast: Array.isArray(m.cast) ? m.cast.join(', ') : '',
      trailerUrl: m.trailerUrl || '', bookingUrl: m.bookingUrl || '', status: m.status || 'UPCOMING',
    });
    setTargetCities(m.targetCities || []);
    setErr(''); setOpen(true);
  };

  const handlePosterUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) { setErr('Poster must be an image.'); return; }
    setPosterUploading(true); setErr('');
    try {
      const signed = await apiService.post<{ uploadUrl: string; fileKey: string; bucket: string }>(
        '/v1/storage/upload-url',
        { category: 'movie', filename: file.name, mimeType: file.type, entityId: editing?.id || 'new' },
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
    if (!form.name.trim()) { setErr('Movie name is required.'); return; }
    setSaving(true); setErr('');
    const payload = {
      ...form,
      genres: form.genres.split(',').map((s: string) => s.trim()).filter(Boolean),
      cast: form.cast.split(',').map((s: string) => s.trim()).filter(Boolean),
      durationMinutes: form.durationMinutes ? Number(form.durationMinutes) : undefined,
      releaseDate: form.releaseDate || undefined,
      targetCities,
    };
    const res = editing
      ? await apiService.patch<any>(`/v1/movies/admin/${editing.id}`, payload)
      : await apiService.post<any>('/v1/movies/admin', payload);
    setSaving(false);
    if (res.error) { setErr(res.error); return; }
    setOpen(false);
    load();
  };

  const remove = async (m: any) => {
    if (!confirm(`Delete "${m.name}"?`)) return;
    await apiService.delete<any>(`/v1/movies/admin/${m.id}`);
    load();
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Movies</h1>
            <p className="text-muted-foreground text-sm mt-1">Publish movie listings shown on the public Movies page.</p>
          </div>
          <Button onClick={openCreate} className="rounded-xl bg-primary text-primary-foreground font-semibold gap-1.5 cursor-pointer">
            <Plus className="h-4 w-4" /> New Movie
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <Card className="rounded-2xl border-border bg-card overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center gap-2">
              <Clapperboard className="h-5 w-5 text-primary" />
              <h2 className="font-bold text-foreground">All Movies ({movies.length})</h2>
            </div>
            {movies.length === 0 ? (
              <p className="text-sm text-muted-foreground p-6">No movies yet. Publish one.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-secondary/40">
                      <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground">Movie</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground">Language</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground">Status</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground">Release</th>
                      <th className="px-5 py-3 text-right text-xs font-semibold text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movies.map((m) => (
                      <tr key={m.id} className="border-b border-border last:border-0 hover:bg-secondary/20">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            {m.posterImage ? (
                              <img src={m.posterImage} alt={m.name} className="h-10 w-10 rounded-lg object-cover border border-border shrink-0" />
                            ) : (
                              <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center shrink-0"><Clapperboard className="h-4 w-4 text-muted-foreground" /></div>
                            )}
                            <span className="font-semibold text-foreground">{m.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-muted-foreground text-xs">{m.language || '—'}</td>
                        <td className="px-5 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${m.status === 'NOW_SHOWING' ? 'bg-success/10 text-success' : m.status === 'ENDED' ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'}`}>
                            {STATUSES.find((s) => s.value === m.status)?.label || m.status}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-muted-foreground text-xs">{m.releaseDate ? new Date(m.releaseDate).toLocaleDateString('en-IN') : '—'}</td>
                        <td className="px-5 py-3 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-2">
                            <Button onClick={() => openEdit(m)} variant="outline" size="icon" className="h-9 w-9 rounded-lg border-border cursor-pointer"><Pencil className="h-3.5 w-3.5" /></Button>
                            <Button onClick={() => remove(m)} variant="outline" size="icon" className="h-9 w-9 rounded-lg border-destructive/30 text-destructive cursor-pointer"><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card className="w-full max-w-lg p-6 rounded-2xl border-border bg-card shadow-2xl relative max-h-[88vh] overflow-y-auto">
            <button onClick={() => setOpen(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer"><X className="h-5 w-5" /></button>
            <h3 className="text-lg font-bold text-foreground mb-4">{editing ? 'Edit Movie' : 'New Movie'}</h3>
            <div className="space-y-3">
              <Input placeholder="Movie name" value={form.name} onChange={(e) => set('name', e.target.value)} className="h-10 bg-background border-input rounded-xl text-foreground" />

              <div>
                <label className="text-[11px] text-muted-foreground">Poster</label>
                <div className="flex items-center gap-3 mt-1">
                  {form.posterImage && (
                    <img src={form.posterImage} alt="Poster" className="h-16 w-16 rounded-lg object-cover border border-border shrink-0" />
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
                <Input placeholder="Language" value={form.language} onChange={(e) => set('language', e.target.value)} className="h-10 bg-background border-input rounded-xl text-foreground" />
                <select value={form.certification} onChange={(e) => set('certification', e.target.value)} className="h-10 px-3 bg-background border border-input rounded-xl text-sm text-foreground">
                  <option value="">Certification</option>
                  {CERTIFICATIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <Input placeholder="Genres (comma separated, e.g. Action, Drama)" value={form.genres} onChange={(e) => set('genres', e.target.value)} className="h-10 bg-background border-input rounded-xl text-foreground" />
              <div className="grid grid-cols-2 gap-3">
                <Input type="number" placeholder="Duration (minutes)" value={form.durationMinutes} onChange={(e) => set('durationMinutes', e.target.value)} className="h-10 bg-background border-input rounded-xl text-foreground" />
                <Input type="date" placeholder="Release date" value={form.releaseDate} onChange={(e) => set('releaseDate', e.target.value)} className="h-10 bg-background border-input rounded-xl text-foreground" />
              </div>
              <textarea placeholder="Synopsis" value={form.synopsis} onChange={(e) => set('synopsis', e.target.value)} className="w-full min-h-20 p-3 bg-background border border-input rounded-xl text-sm text-foreground" />
              <Input placeholder="Cast (comma separated)" value={form.cast} onChange={(e) => set('cast', e.target.value)} className="h-10 bg-background border-input rounded-xl text-foreground" />
              <Input placeholder="Trailer URL (optional)" value={form.trailerUrl} onChange={(e) => set('trailerUrl', e.target.value)} className="h-10 bg-background border-input rounded-xl text-foreground" />
              <Input placeholder="Booking URL (optional)" value={form.bookingUrl} onChange={(e) => set('bookingUrl', e.target.value)} className="h-10 bg-background border-input rounded-xl text-foreground" />
              <select value={form.status} onChange={(e) => set('status', e.target.value)} className="w-full h-10 px-3 bg-background border border-input rounded-xl text-sm text-foreground">
                {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>

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
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clapperboard className="h-4 w-4" />} {editing ? 'Save' : 'Publish'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
