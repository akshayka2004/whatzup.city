'use client';

import { useState, useRef, useEffect, useCallback, KeyboardEvent } from 'react';
import { SuperAdminLayout } from '@/components/layouts/super-admin-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Bell, Eye, Trash2, X, AlertTriangle, Tag, Loader2 } from 'lucide-react';
import { apiService } from '@/lib/services/api-service';

interface Notice {
  id: number | string;
  title: string;
  sender: string;
  status: string;
  date: string;
  body: string;
  tags: string[];
}

type NoticeCategory = 'NOTICE' | 'ALERT' | 'ANNOUNCEMENT';
const PRIORITY_BY_CATEGORY: Record<NoticeCategory, string> = {
  ALERT: 'HIGH',
  ANNOUNCEMENT: 'MEDIUM',
  NOTICE: 'LOW',
};

function TagInput({ tags, onChange }: { tags: string[]; onChange: (tags: string[]) => void }) {
  const [inputVal, setInputVal] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const addTag = (val: string) => {
    const trimmed = val.trim().toLowerCase().replace(/\s+/g, '-');
    if (trimmed && !tags.includes(trimmed) && tags.length < 10) onChange([...tags, trimmed]);
    setInputVal('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(inputVal); }
    else if (e.key === 'Backspace' && !inputVal && tags.length > 0) onChange(tags.slice(0, -1));
  };

  return (
    <div
      className="min-h-[42px] flex flex-wrap gap-1.5 items-center border border-white/10 bg-white/5 rounded-xl px-3 py-2 cursor-text focus-within:border-primary transition-colors"
      onClick={() => inputRef.current?.focus()}
    >
      {tags.map((tag) => (
        <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-medium">
          <Tag className="h-2.5 w-2.5" />
          {tag}
          <button type="button" onClick={(e) => { e.stopPropagation(); onChange(tags.filter((t) => t !== tag)); }} className="ml-0.5 text-amber-400/60 hover:text-amber-400 cursor-pointer">
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        value={inputVal}
        onChange={(e) => setInputVal(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => { if (inputVal.trim()) addTag(inputVal); }}
        placeholder={tags.length === 0 ? 'e.g. emergency, weather...' : ''}
        className="flex-1 min-w-[140px] bg-transparent text-foreground text-sm outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}

export default function SuperAdminNoticesPage() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotices = useCallback(async () => {
    setLoading(true);
    const res = await apiService.get<any>('/v1/government-alerts');
    if (res.data && !res.error) {
      const list = Array.isArray(res.data) ? res.data : (res.data as any)?.data ?? [];
      setNotices(
        list.map((n: any) => ({
          id: n.id,
          title: n.title || '',
          sender: n.targetAudience?.sender || n.publishedBy || n.sender || n.issuedBy || 'Platform Admin',
          status: n.isActive !== false ? 'BROADCASTING' : 'EXPIRED',
          date: n.createdAt
            ? new Date(n.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : n.date || '—',
          body: n.body || n.content || n.message || '',
          tags: Array.isArray(n.targetAudience?.tags) ? n.targetAudience.tags : Array.isArray(n.tags) ? n.tags : [],
        })),
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchNotices(); }, [fetchNotices]);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [viewingNotice, setViewingNotice] = useState<Notice | null>(null);
  const [deletingNotice, setDeletingNotice] = useState<Notice | null>(null);
  const [title, setTitle] = useState('');
  const [sender, setSender] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState<NoticeCategory>('ANNOUNCEMENT');
  const [formTags, setFormTags] = useState<string[]>([]);
  const [formStartAt, setFormStartAt] = useState('');
  const [formExpiresAt, setFormExpiresAt] = useState('');
  const [formLink, setFormLink] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;
    setSubmitting(true);
    const res = await apiService.post<any>('/v1/government-alerts', {
      title,
      body,
      category,
      priority: PRIORITY_BY_CATEGORY[category],
      startAt: formStartAt ? new Date(formStartAt).toISOString() : undefined,
      expiresAt: formExpiresAt ? new Date(formExpiresAt).toISOString() : undefined,
      linkUrl: formLink || undefined,
      targetAudience: { sender: sender || 'Platform Admin', tags: formTags },
    });
    setSubmitting(false);
    if (res.error) {
      alert(`Failed to publish: ${res.error}`);
      return;
    }
    setIsCreateOpen(false);
    setTitle(''); setSender(''); setBody(''); setCategory('ANNOUNCEMENT'); setFormTags([]); setFormStartAt(''); setFormExpiresAt(''); setFormLink('');
    fetchNotices();
  };

  const handleDelete = async () => {
    if (!deletingNotice) return;
    const res = await apiService.delete<any>(`/v1/government-alerts/${deletingNotice.id}`);
    if (res.error) {
      alert(`Failed to delete: ${res.error}`);
      return;
    }
    setNotices(notices.filter((n) => n.id !== deletingNotice.id));
    setDeletingNotice(null);
  };

  return (
    <SuperAdminLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Civic Notices & Announcements</h1>
            <p className="text-muted-foreground">Broadcast official notices, government safety alerts, and system bulletin news</p>
          </div>
          <Button
            onClick={() => { setTitle(''); setSender(''); setBody(''); setCategory('ANNOUNCEMENT'); setFormTags([]); setFormStartAt(''); setFormExpiresAt(''); setFormLink(''); setIsCreateOpen(true); }}
            className="rounded-xl gap-2 font-medium bg-gradient-to-r from-primary to-accent text-primary-foreground cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Create Alert
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : notices.length === 0 ? (
          <Card className="p-10 rounded-2xl border-dashed border-white/10 bg-white/5 text-center">
            <Bell className="h-10 w-10 mx-auto text-muted-foreground mb-3 opacity-40" />
            <p className="text-foreground font-semibold mb-1">No notices yet</p>
            <p className="text-sm text-muted-foreground">Published alerts and notices will appear here.</p>
          </Card>
        ) : null}

        <div className="space-y-4">
          {notices.map((note) => (
            <Card key={note.id} className="p-6 rounded-2xl border-white/5 bg-card/40 backdrop-blur-xl hover:bg-card/50 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className={`p-3 rounded-xl h-11 w-11 flex items-center justify-center shrink-0 ${note.status === 'BROADCASTING' ? 'bg-amber-500/10 text-amber-400' : 'bg-white/5 text-slate-400'}`}>
                    <Bell className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-foreground text-base">{note.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Sender: {note.sender} • Date: {note.date}</p>
                    {note.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {note.tags.map((tag) => (
                          <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-medium">
                            <Tag className="h-2.5 w-2.5" />{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm shrink-0">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${note.status === 'BROADCASTING' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-white/5 text-muted-foreground border border-white/10'}`}>
                    {note.status}
                  </span>
                  <div className="flex gap-2">
                    <Button onClick={() => setViewingNotice(note)} size="icon" variant="outline" className="h-8 w-8 rounded-lg border-white/10 text-slate-300 hover:bg-white/5 cursor-pointer">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button onClick={() => setDeletingNotice(note)} size="icon" variant="outline" className="h-8 w-8 rounded-lg border-rose-500/20 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 cursor-pointer">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* VIEW MODAL */}
        {viewingNotice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <Card className="w-full max-w-md p-6 rounded-2xl border-white/10 bg-zinc-900 shadow-2xl relative">
              <button onClick={() => setViewingNotice(null)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl"><Bell className="h-6 w-6" /></div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">{viewingNotice.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{viewingNotice.sender} • {viewingNotice.date}</p>
                </div>
              </div>
              <div className="bg-white/5 p-4 rounded-xl border border-white/5 mb-4">
                <p className="text-sm text-slate-300 leading-relaxed">{viewingNotice.body}</p>
              </div>
              {viewingNotice.tags.length > 0 && (
                <div className="mb-5">
                  <p className="text-xs text-muted-foreground uppercase font-semibold mb-2">Tags</p>
                  <div className="flex flex-wrap gap-1.5">
                    {viewingNotice.tags.map((tag) => (
                      <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium">
                        <Tag className="h-2.5 w-2.5" />{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex justify-end">
                <Button onClick={() => setViewingNotice(null)} className="rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold cursor-pointer">
                  Close
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* CREATE MODAL */}
        {isCreateOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <Card className="w-full max-w-md p-6 rounded-2xl border-white/10 bg-zinc-900 shadow-2xl relative max-h-[90vh] overflow-y-auto">
              <button onClick={() => setIsCreateOpen(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="h-5 w-5" />
              </button>
              <h3 className="text-xl font-bold text-foreground mb-4">Create New Alert</h3>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-300 block mb-2">Alert Title</label>
                  <Input placeholder="e.g. Weather Advisory" value={title} onChange={(e) => setTitle(e.target.value)} required className="rounded-xl border-white/10 bg-white/5 focus:border-primary text-foreground" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-300 block mb-2">Type</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as NoticeCategory)}
                    className="w-full h-10 px-3 rounded-xl border border-white/10 bg-white/5 text-foreground text-sm focus:border-primary focus:outline-none cursor-pointer"
                  >
                    <option value="ANNOUNCEMENT">Announcement</option>
                    <option value="ALERT">Alert</option>
                    <option value="NOTICE">Notice</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-300 block mb-2">Sender Authority</label>
                  <Input placeholder="e.g. Civic Authority" value={sender} onChange={(e) => setSender(e.target.value)} className="rounded-xl border-white/10 bg-white/5 focus:border-primary text-foreground" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-300 block mb-2">Alert Body</label>
                  <textarea
                    placeholder="Describe the alert..."
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={4}
                    className="w-full rounded-xl border border-white/10 bg-white/5 text-foreground px-3 py-2 text-sm focus:border-primary focus:outline-none resize-none"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-300 block mb-2">
                    Tags <span className="ml-1 text-xs text-muted-foreground font-normal">(press Enter or comma to add)</span>
                  </label>
                  <TagInput tags={formTags} onChange={setFormTags} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-slate-300 block mb-2">Start / Issue date</label>
                    <Input type="date" value={formStartAt} onChange={(e) => setFormStartAt(e.target.value)} className="rounded-xl border-white/10 bg-white/5 text-foreground text-sm" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-300 block mb-2">Expires On</label>
                    <Input type="date" value={formExpiresAt} onChange={(e) => setFormExpiresAt(e.target.value)} className="rounded-xl border-white/10 bg-white/5 text-foreground text-sm" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-300 block mb-2">Link (optional)</label>
                  <Input placeholder="https://…" value={formLink} onChange={(e) => setFormLink(e.target.value)} className="rounded-xl border-white/10 bg-white/5 text-foreground" />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} className="rounded-xl border-white/10 hover:bg-white/5 text-slate-300 cursor-pointer">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting} className="rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold cursor-pointer gap-1.5">
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    Publish Alert
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}

        {/* DELETE MODAL */}
        {deletingNotice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <Card className="w-full max-w-sm p-6 rounded-2xl border-white/10 bg-zinc-900 shadow-2xl relative text-center">
              <button onClick={() => setDeletingNotice(null)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="h-5 w-5" />
              </button>
              <div className="mx-auto w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 mb-4">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">Delete Notice</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Delete <span className="font-semibold text-foreground">"{deletingNotice.title}"</span>?
              </p>
              <div className="flex justify-center gap-3">
                <Button onClick={() => setDeletingNotice(null)} variant="outline" className="rounded-xl border-white/10 hover:bg-white/5 text-slate-300 px-4 cursor-pointer">
                  Cancel
                </Button>
                <Button onClick={handleDelete} className="rounded-xl bg-rose-600 hover:bg-rose-500 text-white px-4 cursor-pointer">
                  Delete
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </SuperAdminLayout>
  );
}
