'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { BusinessLayout } from '@/components/layouts/business-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Edit, Trash2, Eye, X, AlertTriangle, Box, Tag, Loader2 } from 'lucide-react';
import { apiService } from '@/lib/services/api-service';
import { useAuth } from '@/hooks/use-auth';

interface Product {
  id: string;
  name: string;
  description: string;
  price: string;
  isAvailable: boolean;
}

// ── Tag input lives OUTSIDE parent — stable component identity, no remount bug ──
function TagInput({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
  const [inputVal, setInputVal] = useState('');
  const ref = useRef<HTMLInputElement>(null);

  const add = (val: string) => {
    const t = val.trim().toLowerCase().replace(/\s+/g, '-');
    if (t && !tags.includes(t) && tags.length < 10) onChange([...tags, t]);
    setInputVal('');
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(inputVal); }
    else if (e.key === 'Backspace' && !inputVal && tags.length > 0) onChange(tags.slice(0, -1));
  };

  return (
    <div
      className="min-h-[42px] flex flex-wrap gap-1.5 items-center border border-white/10 bg-white/5 rounded-xl px-3 py-2 cursor-text focus-within:border-primary transition-colors"
      onClick={() => ref.current?.focus()}
    >
      {tags.map((tag) => (
        <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20 text-xs font-medium">
          <Tag className="h-2.5 w-2.5" />{tag}
          <button type="button" onClick={(e) => { e.stopPropagation(); onChange(tags.filter((t) => t !== tag)); }} className="ml-0.5 text-violet-400/60 hover:text-violet-400 cursor-pointer">
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        ref={ref}
        value={inputVal}
        onChange={(e) => setInputVal(e.target.value)}
        onKeyDown={handleKey}
        onBlur={() => { if (inputVal.trim()) add(inputVal); }}
        placeholder={tags.length === 0 ? 'e.g. premium, wireless...' : ''}
        className="flex-1 min-w-[120px] bg-transparent text-foreground text-sm outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}

export default function ProductsPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);

  // Form state — shared between add/edit modals
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [isAvailable, setIsAvailable] = useState(true);

  const businessId = user?.businessId || user?.entity?.id;

  useEffect(() => {
    if (!businessId) { setLoading(false); return; }
    setLoading(true);
    apiService
      .get<any>(`/v1/products/business/${businessId}`)
      .then((res) => {
        if (res.data && !res.error) {
          // Handle both raw array and PaginatedResult { data: [...], meta: {...} }
          const raw = res.data;
          const list: any[] = Array.isArray(raw) ? raw : raw?.data ?? raw?.items ?? [];
          setProducts(
            list.map((p: any) => ({
              id: p.id,
              name: p.name || '',
              description: p.description || '',
              price: p.price != null ? String(p.price) : '0',
              isAvailable: p.isAvailable !== false,
            })),
          );
        }
      })
      .finally(() => setLoading(false));
  }, [businessId]);

  const resetForm = () => { setName(''); setDescription(''); setPrice(''); setIsAvailable(true); };

  const handleOpenAdd = () => { resetForm(); setIsAddOpen(true); };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setDescription(p.description);
    setPrice(p.price.replace('$', ''));
    setIsAvailable(p.isAvailable);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !businessId) return;
    setSubmitting(true);
    try {
      const res = await apiService.post<any>('/v1/products', {
        businessId,
        name: name.trim(),
        description: description.trim(),
        price: parseFloat(price) || 0,
        isAvailable,
      });
      if (res.data && !res.error) {
        const p = res.data;
        setProducts((prev) => [{
          id: p.id,
          name: p.name || name,
          description: p.description || description,
          price: p.price != null ? String(p.price) : price,
          isAvailable: p.isAvailable !== false,
        }, ...prev]);
        setIsAddOpen(false);
        resetForm();
      }
    } catch (_) {}
    setSubmitting(false);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !editingProduct) return;
    setSubmitting(true);
    try {
      const res = await apiService.patch<any>(`/v1/products/${editingProduct.id}`, {
        name: name.trim(),
        description: description.trim(),
        price: parseFloat(price) || 0,
        isAvailable,
      });
      const updated = res.data && !res.error ? res.data : null;
      setProducts((prev) =>
        prev.map((p) =>
          p.id === editingProduct.id
            ? {
                ...p,
                name: updated?.name || name,
                description: updated?.description || description,
                price: updated?.price != null ? String(updated.price) : price,
                isAvailable: updated?.isAvailable !== false,
              }
            : p,
        ),
      );
      setEditingProduct(null);
    } catch (_) {}
    setSubmitting(false);
  };

  const handleDelete = async () => {
    if (!deletingProduct) return;
    setSubmitting(true);
    try {
      await apiService.delete(`/v1/products/${deletingProduct.id}`);
      setProducts((prev) => prev.filter((p) => p.id !== deletingProduct.id));
    } catch (_) {}
    setSubmitting(false);
    setDeletingProduct(null);
  };

  return (
    <BusinessLayout>
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Products</h1>
            <p className="text-muted-foreground">Manage your product catalog</p>
          </div>
          <Button
            onClick={handleOpenAdd}
            className="rounded-xl gap-2 font-medium bg-gradient-to-r from-primary to-accent text-primary-foreground cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Add Product
          </Button>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : products.length === 0 ? (
          <Card className="p-10 rounded-2xl border-dashed border-white/10 bg-white/5 text-center">
            <Box className="h-10 w-10 mx-auto text-muted-foreground mb-3 opacity-40" />
            <p className="text-foreground font-semibold mb-1">No products yet</p>
            <p className="text-sm text-muted-foreground">Add your first product to build your catalog.</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {products.map((product) => (
              <Card key={product.id} className="p-6 rounded-2xl hover:shadow-md transition-all duration-300 border-white/5 bg-card/40 backdrop-blur-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1 flex-wrap">
                      <h3 className="font-semibold text-foreground text-lg">{product.name}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${
                        product.isAvailable
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-white/5 text-muted-foreground border-white/10'
                      }`}>
                        {product.isAvailable ? 'Available' : 'Unavailable'}
                      </span>
                    </div>
                    <div className="flex items-center gap-6 text-sm mt-2">
                      <div>
                        <p className="text-muted-foreground text-xs">Price</p>
                        <p className="font-semibold text-foreground">
                          {parseFloat(product.price) > 0 ? `$${parseFloat(product.price).toFixed(2)}` : '—'}
                        </p>
                      </div>
                    </div>
                    {product.description && (
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-1">{product.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0 ml-4">
                    <Button onClick={() => setViewingProduct(product)} size="icon" variant="outline" className="rounded-xl border-white/10 hover:bg-white/5 text-slate-300 h-9 w-9 cursor-pointer">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button onClick={() => handleOpenEdit(product)} size="icon" variant="outline" className="rounded-xl border-white/10 hover:bg-white/5 text-slate-300 h-9 w-9 cursor-pointer">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button onClick={() => setDeletingProduct(product)} size="icon" variant="outline" className="rounded-xl border-rose-500/20 hover:bg-rose-500/10 text-rose-400 hover:text-rose-300 h-9 w-9 cursor-pointer">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* ── ADD MODAL ── */}
        {isAddOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <Card className="w-full max-w-md p-6 rounded-2xl border-white/10 bg-zinc-900 shadow-2xl relative max-h-[90vh] overflow-y-auto">
              <button onClick={() => setIsAddOpen(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="h-5 w-5" />
              </button>
              <h3 className="text-xl font-bold text-foreground mb-4">Add Product</h3>
              <form onSubmit={handleAdd} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-300 block mb-2">Product Name *</label>
                  <Input
                    placeholder="e.g. Premium Speakers"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="rounded-xl border-white/10 bg-white/5 focus:border-primary text-foreground"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-300 block mb-2">Description</label>
                  <Input
                    placeholder="Short product description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="rounded-xl border-white/10 bg-white/5 focus:border-primary text-foreground"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-300 block mb-2">Price ($) *</label>
                  <Input
                    placeholder="e.g. 99.99"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    required
                    className="rounded-xl border-white/10 bg-white/5 focus:border-primary text-foreground"
                  />
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <input type="checkbox" id="add-available" checked={isAvailable} onChange={(e) => setIsAvailable(e.target.checked)} className="rounded bg-white/5 border-white/10 h-4 w-4" />
                  <label htmlFor="add-available" className="text-sm text-slate-300">Available immediately</label>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)} className="rounded-xl border-white/10 hover:bg-white/5 text-slate-300 cursor-pointer">Cancel</Button>
                  <Button type="submit" disabled={submitting} className="rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold cursor-pointer flex items-center gap-1.5">
                    {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Add Product
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}

        {/* ── EDIT MODAL ── */}
        {editingProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <Card className="w-full max-w-md p-6 rounded-2xl border-white/10 bg-zinc-900 shadow-2xl relative max-h-[90vh] overflow-y-auto">
              <button onClick={() => setEditingProduct(null)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="h-5 w-5" />
              </button>
              <h3 className="text-xl font-bold text-foreground mb-4">Edit Product</h3>
              <form onSubmit={handleEdit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-300 block mb-2">Product Name *</label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="rounded-xl border-white/10 bg-white/5 focus:border-primary text-foreground"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-300 block mb-2">Description</label>
                  <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="rounded-xl border-white/10 bg-white/5 focus:border-primary text-foreground"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-300 block mb-2">Price ($) *</label>
                  <Input
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    required
                    className="rounded-xl border-white/10 bg-white/5 focus:border-primary text-foreground"
                  />
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <input type="checkbox" id="edit-available" checked={isAvailable} onChange={(e) => setIsAvailable(e.target.checked)} className="rounded bg-white/5 border-white/10 h-4 w-4" />
                  <label htmlFor="edit-available" className="text-sm text-slate-300">Available</label>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setEditingProduct(null)} className="rounded-xl border-white/10 hover:bg-white/5 text-slate-300 cursor-pointer">Cancel</Button>
                  <Button type="submit" disabled={submitting} className="rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold cursor-pointer flex items-center gap-1.5">
                    {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Save Changes
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}

        {/* ── DELETE MODAL ── */}
        {deletingProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <Card className="w-full max-w-sm p-6 rounded-2xl border-white/10 bg-zinc-900 shadow-2xl relative text-center">
              <button onClick={() => setDeletingProduct(null)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="h-5 w-5" />
              </button>
              <div className="mx-auto w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 mb-4">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">Delete Product</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Delete <span className="font-semibold text-foreground">"{deletingProduct.name}"</span>? This is permanent.
              </p>
              <div className="flex justify-center gap-3">
                <Button onClick={() => setDeletingProduct(null)} variant="outline" className="rounded-xl border-white/10 hover:bg-white/5 text-slate-300 px-4 cursor-pointer">Cancel</Button>
                <Button onClick={handleDelete} disabled={submitting} className="rounded-xl bg-rose-600 hover:bg-rose-500 text-white px-4 cursor-pointer flex items-center gap-1.5">
                  {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Delete
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* ── VIEW MODAL ── */}
        {viewingProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <Card className="w-full max-w-md p-6 rounded-2xl border-white/10 bg-zinc-900 shadow-2xl relative">
              <button onClick={() => setViewingProduct(null)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-primary/10 text-primary rounded-xl">
                  <Box className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">{viewingProduct.name}</h3>
                  <span className={`inline-block px-2 py-0.5 mt-1 rounded-full text-xs font-semibold border ${
                    viewingProduct.isAvailable
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-white/5 text-muted-foreground border-white/10'
                  }`}>
                    {viewingProduct.isAvailable ? 'Available' : 'Unavailable'}
                  </span>
                </div>
              </div>
              <div className="bg-white/5 p-4 rounded-xl border border-white/5 mb-4">
                <p className="text-xs text-muted-foreground mb-1">Price</p>
                <p className="text-2xl font-extrabold text-foreground">
                  {parseFloat(viewingProduct.price) > 0 ? `$${parseFloat(viewingProduct.price).toFixed(2)}` : '—'}
                </p>
              </div>
              {viewingProduct.description && (
                <p className="text-sm text-muted-foreground mb-5">{viewingProduct.description}</p>
              )}
              <div className="flex justify-end">
                <Button onClick={() => setViewingProduct(null)} className="rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold cursor-pointer">Close</Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </BusinessLayout>
  );
}
