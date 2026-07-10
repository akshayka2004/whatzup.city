'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { BusinessLayout } from '@/components/layouts/business-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Tag, Eye, Edit, Trash2, X, AlertTriangle, Clock, Calendar, Loader2 } from 'lucide-react';
import { apiService } from '@/lib/services/api-service';
import { useAuth } from '@/hooks/use-auth';
import { KERALA_CITIES } from '@/lib/constants';

interface Offer {
  id: string;
  title: string;
  discount: number;
  discountAmount?: number;
  active: boolean;
  views: number;
  clicks: number;
  tags: string[];
  targetCities: string[];
  startsAt?: string;   // ISO date string
  expiresAt?: string;  // ISO date string — filtered out automatically when past
}

const today = new Date().toISOString().slice(0, 10);

function isExpired(offer: Offer): boolean {
  if (!offer.expiresAt) return false;
  return new Date(offer.expiresAt) < new Date();
}

function isScheduled(offer: Offer): boolean {
  if (!offer.startsAt) return false;
  return new Date(offer.startsAt) > new Date();
}

// ── Reusable tag input component ──────────────────────────────────────────────
function TagInput({
  tags,
  onChange,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
}) {
  const [inputVal, setInputVal] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const addTag = (val: string) => {
    const trimmed = val.trim().toLowerCase().replace(/\s+/g, '-');
    if (trimmed && !tags.includes(trimmed) && tags.length < 10) {
      onChange([...tags, trimmed]);
    }
    setInputVal('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(inputVal);
    } else if (e.key === 'Backspace' && !inputVal && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  };

  const removeTag = (tag: string) => {
    onChange(tags.filter((t) => t !== tag));
  };

  return (
    <div
      className="min-h-[42px] flex flex-wrap gap-1.5 items-center border border-white/10 bg-white/5 rounded-xl px-3 py-2 cursor-text focus-within:border-primary transition-colors"
      onClick={() => inputRef.current?.focus()}
    >
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-medium"
        >
          <Tag className="h-2.5 w-2.5" />
          {tag}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); removeTag(tag); }}
            className="ml-0.5 text-primary/60 hover:text-primary cursor-pointer"
          >
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
        placeholder={tags.length === 0 ? 'Type a tag and press Enter or comma...' : ''}
        className="flex-1 min-w-[140px] bg-transparent text-foreground text-sm outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function OffersPage() {
  const { user } = useAuth();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);

  const businessId = user?.businessId || user?.entity?.id;

  const fetchOffers = async () => {
    if (!businessId) return;
    setLoading(true);
    // Use authenticated route — passes JWT tenantId so resolution is accurate
    const res = await apiService.get<any>(`/v1/offers/my/${businessId}`);
    if (res.data && !res.error) {
      const list = Array.isArray(res.data) ? res.data : res.data?.data ?? res.data?.items ?? [];
      setOffers(
        list.map((o: any) => ({
          id: o.id,
          title: o.title || o.name || '',
          discount: o.discountPercent ?? o.discount ?? 0,
          discountAmount: o.discountAmount != null ? Number(o.discountAmount) : 0,
          active: o.status === 'ACTIVE',
          views: o.views ?? 0,
          clicks: o.clicks ?? 0,
          tags: Array.isArray(o.tags) ? o.tags : [],
          targetCities: Array.isArray(o.targetCities) ? o.targetCities : [],
          startsAt: o.startDate || o.startsAt || undefined,
          expiresAt: o.endDate || o.expiresAt || undefined,
        })),
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOffers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [deletingOffer, setDeletingOffer] = useState<Offer | null>(null);
  const [viewingOffer, setViewingOffer] = useState<Offer | null>(null);
  const [saving, setSaving] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<'PERCENT' | 'AMOUNT'>('PERCENT');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [active, setActive] = useState(true);
  const [formTags, setFormTags] = useState<string[]>([]);
  const [formStartsAt, setFormStartsAt] = useState('');
  const [formExpiresAt, setFormExpiresAt] = useState('');
  const [formCities, setFormCities] = useState<string[]>([]);

  const toggleCity = (c: string) =>
    setFormCities((cs) => (cs.includes(c) ? cs.filter((x) => x !== c) : [...cs, c]));

  const resetForm = () => {
    setTitle(''); setDiscount(0); setDiscountType('PERCENT'); setDiscountAmount(0); setActive(true);
    setFormTags([]); setFormStartsAt(''); setFormExpiresAt(''); setFormCities([]);
  };

  // A reusable discount-type selector + value input for the create/edit modals.
  const DiscountField = () => (
    <div>
      <label className="text-sm font-medium text-muted-foreground block mb-2">Discount</label>
      <div className="flex gap-2">
        <div className="flex rounded-xl border border-input overflow-hidden shrink-0">
          <button type="button" onClick={() => setDiscountType('PERCENT')} className={`px-3 text-sm font-semibold cursor-pointer ${discountType === 'PERCENT' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground'}`}>%</button>
          <button type="button" onClick={() => setDiscountType('AMOUNT')} className={`px-3 text-sm font-semibold cursor-pointer ${discountType === 'AMOUNT' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground'}`}>₹</button>
        </div>
        {discountType === 'PERCENT' ? (
          <Input key="pct" type="number" min="1" max="100" value={discount || ''} onChange={(e) => setDiscount(Number(e.target.value))} placeholder="e.g. 20" className="rounded-xl border-input bg-background focus:border-primary text-foreground" />
        ) : (
          <Input key="amt" type="number" min="1" value={discountAmount || ''} onChange={(e) => setDiscountAmount(Number(e.target.value))} placeholder="e.g. 500" className="rounded-xl border-input bg-background focus:border-primary text-foreground" />
        )}
      </div>
      <p className="text-[10px] text-muted-foreground mt-1">{discountType === 'PERCENT' ? 'Percentage off the bill.' : 'Flat amount (₹) off the bill.'}</p>
    </div>
  );

  const handleOpenCreate = () => {
    resetForm();
    setIsCreateOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !businessId) return;
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const defaultEnd = new Date(Date.now() + 30 * 86_400_000).toISOString();
      // NOTE: Offer schema has no `tags` field — store them in description for now.
      const desc = formTags.length > 0 ? `Tags: ${formTags.join(', ')}` : '';
      const res = await apiService.post<any>('/v1/offers', {
        businessId,
        title,
        description: desc,
        discountPercent: discountType === 'PERCENT' ? Number(discount) : null,
        discountAmount: discountType === 'AMOUNT' ? Number(discountAmount) : null,
        status: active ? 'ACTIVE' : 'PAUSED',
        startDate: formStartsAt ? new Date(formStartsAt).toISOString() : now,
        endDate: formExpiresAt ? new Date(formExpiresAt).toISOString() : defaultEnd,
        targetCities: formCities,
      });
      if (res.data && !res.error) {
        // Refetch to get fresh list with whatever the DB returned
        await fetchOffers();
        setIsCreateOpen(false);
        resetForm();
      } else if (res.error) {
        alert(`Failed to create offer: ${res.error}`);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleOpenEdit = (offer: Offer) => {
    setEditingOffer(offer);
    setTitle(offer.title);
    setDiscount(offer.discount);
    if (offer.discountAmount && !offer.discount) { setDiscountType('AMOUNT'); setDiscountAmount(offer.discountAmount); }
    else { setDiscountType('PERCENT'); setDiscountAmount(offer.discountAmount || 0); }
    setActive(offer.active);
    setFormTags([...offer.tags]);
    setFormStartsAt(offer.startsAt || '');
    setFormExpiresAt(offer.expiresAt || '');
    setFormCities([...(offer.targetCities || [])]);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !editingOffer) return;
    setSaving(true);
    try {
      const desc = formTags.length > 0 ? `Tags: ${formTags.join(', ')}` : '';
      const body: Record<string, unknown> = {
        title,
        description: desc,
        discountPercent: discountType === 'PERCENT' ? Number(discount) : null,
        discountAmount: discountType === 'AMOUNT' ? Number(discountAmount) : null,
        status: active ? 'ACTIVE' : 'PAUSED',
        targetCities: formCities,
      };
      if (formStartsAt) body.startDate = new Date(formStartsAt).toISOString();
      if (formExpiresAt) body.endDate = new Date(formExpiresAt).toISOString();
      const res = await apiService.patch<any>(`/v1/offers/${editingOffer.id}`, body);
      if (!res.error) {
        setOffers(offers.map((o) =>
          o.id === editingOffer.id
            ? { ...o, title, discount: Number(discount), active, tags: formTags,
                targetCities: formCities,
                startsAt: formStartsAt || undefined, expiresAt: formExpiresAt || undefined }
            : o,
        ));
        setEditingOffer(null);
      } else {
        alert(`Failed to update offer: ${res.error}`);
      }
    } finally {
      setSaving(false);
    }
  };

  // Auto-filter: hide expired offers from active view
  const activeOffers = offers.filter((o) => !isExpired(o));
  const expiredOffers = offers.filter(isExpired);

  const handleDelete = async () => {
    if (!deletingOffer) return;
    setSaving(true);
    try {
      const res = await apiService.delete(`/v1/offers/${deletingOffer.id}`);
      if (!res.error) {
        setOffers(offers.filter((o) => o.id !== deletingOffer.id));
        setDeletingOffer(null);
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (id: string) => {
    const offer = offers.find((o) => o.id === id);
    if (!offer) return;
    const newStatus = offer.active ? 'PAUSED' : 'ACTIVE';
    // Optimistic update
    setOffers(offers.map((o) => (o.id === id ? { ...o, active: !o.active } : o)));
    try {
      await apiService.patch(`/v1/offers/${id}`, { status: newStatus });
    } catch {
      // Revert on error
      setOffers(offers.map((o) => (o.id === id ? { ...o, active: offer.active } : o)));
    }
  };

  return (
    <BusinessLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Promotional Offers</h1>
            <p className="text-muted-foreground">
              Manage active deals, discount campaigns, and coupons
            </p>
          </div>
          <Button
            onClick={handleOpenCreate}
            className="rounded-xl gap-2 font-medium bg-gradient-to-r from-primary to-accent text-primary-foreground cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Create Offer
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : activeOffers.length === 0 ? (
          <Card className="p-10 rounded-2xl border-dashed border-white/10 bg-white/5 text-center">
            <Tag className="h-10 w-10 mx-auto text-muted-foreground mb-3 opacity-40" />
            <p className="text-foreground font-semibold mb-1">No active offers</p>
            <p className="text-sm text-muted-foreground">Create your first promotional offer to attract customers.</p>
          </Card>
        ) : null}

        <div className="grid md:grid-cols-2 gap-6">
          {activeOffers.map((offer) => (
            <Card
              key={offer.id}
              className="p-6 rounded-2xl hover:shadow-md transition-all duration-300 border-white/5 bg-card/40 backdrop-blur-xl relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <h3 className="font-semibold text-foreground text-lg truncate">{offer.title}</h3>
                    <button
                      onClick={() => toggleActive(offer.id)}
                      className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold hover:opacity-85 transition-opacity cursor-pointer ${
                        offer.active
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-white/5 text-muted-foreground border border-white/10'
                      }`}
                    >
                      {offer.active ? 'Active' : 'Inactive'}
                    </button>
                    {isScheduled(offer) && (
                      <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" />Scheduled
                      </span>
                    )}
                    {offer.expiresAt && !isExpired(offer) && (
                      <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                        <Calendar className="h-2.5 w-2.5" />Expires {offer.expiresAt}
                      </span>
                    )}
                  </div>

                  {/* Tags */}
                  {offer.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {offer.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] text-slate-400"
                        >
                          <Tag className="h-2.5 w-2.5" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-6 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Discount</p>
                      <p className="font-bold text-foreground text-base">{offer.discount}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Views</p>
                      <p className="font-bold text-foreground text-base">{offer.views}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Clicks</p>
                      <p className="font-bold text-foreground text-base">{offer.clicks}</p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0 ml-3">
                  <Button
                    onClick={() => setViewingOffer(offer)}
                    size="icon"
                    variant="outline"
                    className="rounded-xl border-white/10 hover:bg-white/5 text-slate-300 h-9 w-9 cursor-pointer"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() => handleOpenEdit(offer)}
                    size="icon"
                    variant="outline"
                    className="rounded-xl border-white/10 hover:bg-white/5 text-slate-300 h-9 w-9 cursor-pointer"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() => setDeletingOffer(offer)}
                    size="icon"
                    variant="outline"
                    className="rounded-xl border-white/10 hover:bg-rose-500/10 text-rose-400 hover:text-rose-300 border-rose-500/20 h-9 w-9 cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* ── CREATE MODAL ─────────────────────────────────────────── */}
        {isCreateOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <Card className="w-full max-w-md p-6 rounded-2xl border-border bg-card shadow-2xl relative max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => setIsCreateOpen(false)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
              <h3 className="text-xl font-bold text-foreground mb-4">Create Promotional Offer</h3>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-2">
                    Offer Title
                  </label>
                  <Input
                    placeholder="e.g. Summer Special"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    className="rounded-xl border-input bg-background focus:border-primary text-foreground"
                  />
                </div>
                {DiscountField()}
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-2">
                    Tags
                    <span className="ml-1 text-xs text-muted-foreground font-normal">(type & press Enter or comma to add)</span>
                  </label>
                  <TagInput tags={formTags} onChange={setFormTags} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground block mb-2">Starts On</label>
                    <Input
                      type="date"
                      value={formStartsAt}
                      onChange={(e) => setFormStartsAt(e.target.value)}
                      min={today}
                      className="rounded-xl border-input bg-background text-foreground text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground block mb-2">Expires On</label>
                    <Input
                      type="date"
                      value={formExpiresAt}
                      onChange={(e) => setFormExpiresAt(e.target.value)}
                      min={formStartsAt || today}
                      className="rounded-xl border-input bg-background text-foreground text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-2">
                    Show in cities <span className="text-xs font-normal">(none = all cities)</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                    {KERALA_CITIES.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => toggleCity(c)}
                        className={`px-2 py-1 rounded-lg text-[11px] border cursor-pointer ${
                          formCities.includes(c)
                            ? 'bg-primary/20 border-primary text-primary'
                            : 'bg-background border-input text-muted-foreground'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="active-chk"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                    className="rounded bg-background border-input text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                  />
                  <label htmlFor="active-chk" className="text-sm text-muted-foreground cursor-pointer">
                    Set active immediately
                  </label>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateOpen(false)}
                    className="rounded-xl border-border hover:bg-muted text-foreground cursor-pointer"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold cursor-pointer"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Offer'}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}

        {/* ── EDIT MODAL ───────────────────────────────────────────── */}
        {editingOffer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <Card className="w-full max-w-md p-6 rounded-2xl border-border bg-card shadow-2xl relative max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => setEditingOffer(null)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
              <h3 className="text-xl font-bold text-foreground mb-4">Edit Offer Details</h3>
              <form onSubmit={handleEdit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-2">
                    Offer Title
                  </label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    className="rounded-xl border-input bg-background focus:border-primary text-foreground"
                  />
                </div>
                {DiscountField()}
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-2">
                    Tags
                    <span className="ml-1 text-xs text-muted-foreground font-normal">(type & press Enter or comma)</span>
                  </label>
                  <TagInput tags={formTags} onChange={setFormTags} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground block mb-2">Starts On</label>
                    <Input type="date" value={formStartsAt} onChange={(e) => setFormStartsAt(e.target.value)} className="rounded-xl border-input bg-background text-foreground text-sm" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground block mb-2">Expires On</label>
                    <Input type="date" value={formExpiresAt} onChange={(e) => setFormExpiresAt(e.target.value)} min={formStartsAt || today} className="rounded-xl border-input bg-background text-foreground text-sm" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-2">
                    Show in cities <span className="text-xs font-normal">(none = all cities)</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                    {KERALA_CITIES.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => toggleCity(c)}
                        className={`px-2 py-1 rounded-lg text-[11px] border cursor-pointer ${
                          formCities.includes(c)
                            ? 'bg-primary/20 border-primary text-primary'
                            : 'bg-background border-input text-muted-foreground'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="edit-active-chk"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                    className="rounded bg-background border-input text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                  />
                  <label htmlFor="edit-active-chk" className="text-sm text-muted-foreground cursor-pointer">
                    Active status
                  </label>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditingOffer(null)}
                    className="rounded-xl border-border hover:bg-muted text-foreground cursor-pointer"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold cursor-pointer"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}

        {/* ── DELETE MODAL ─────────────────────────────────────────── */}
        {deletingOffer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <Card className="w-full max-w-sm p-6 rounded-2xl border-border bg-card shadow-2xl relative text-center">
              <button
                onClick={() => setDeletingOffer(null)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="mx-auto w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 mb-4">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">Delete Promotional Offer</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Are you sure you want to delete{' '}
                <span className="font-semibold text-foreground">"{deletingOffer.title}"</span>? This
                action is permanent.
              </p>
              <div className="flex justify-center gap-3">
                <Button
                  onClick={() => setDeletingOffer(null)}
                  variant="outline"
                  className="rounded-xl border-border hover:bg-muted text-foreground px-4 cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDelete}
                  disabled={saving}
                  className="rounded-xl bg-rose-600 hover:bg-rose-500 text-white px-4 cursor-pointer"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* ── DETAIL/VIEW MODAL ────────────────────────────────────── */}
        {viewingOffer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <Card className="w-full max-w-md p-6 rounded-2xl border-border bg-card shadow-2xl relative">
              <button
                onClick={() => setViewingOffer(null)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-primary/10 text-primary rounded-xl">
                  <Tag className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">{viewingOffer.title}</h3>
                  <span
                    className={`inline-block px-2 py-0.5 mt-1 rounded-full text-xs font-semibold ${
                      viewingOffer.active
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-secondary/40 text-muted-foreground border border-border'
                    }`}
                  >
                    {viewingOffer.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              {/* Tags section */}
              {viewingOffer.tags.length > 0 && (
                <div className="mb-5">
                  <p className="text-xs text-muted-foreground uppercase font-semibold mb-2">Tags</p>
                  <div className="flex flex-wrap gap-1.5">
                    {viewingOffer.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium"
                      >
                        <Tag className="h-2.5 w-2.5" />
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-secondary/50 p-4 rounded-xl text-center border border-border">
                  <p className="text-xs text-muted-foreground mb-1">Discount</p>
                  <p className="text-2xl font-extrabold text-foreground">
                    {viewingOffer.discount}%
                  </p>
                </div>
                <div className="bg-secondary/50 p-4 rounded-xl text-center border border-border">
                  <p className="text-xs text-muted-foreground mb-1">Total Views</p>
                  <p className="text-2xl font-extrabold text-foreground">{viewingOffer.views}</p>
                </div>
                <div className="bg-secondary/50 p-4 rounded-xl text-center border border-border">
                  <p className="text-xs text-muted-foreground mb-1">Total Clicks</p>
                  <p className="text-2xl font-extrabold text-foreground">{viewingOffer.clicks}</p>
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <Button
                  onClick={() => setViewingOffer(null)}
                  className="rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold cursor-pointer"
                >
                  Close
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </BusinessLayout>
  );
}
