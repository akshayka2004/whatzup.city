'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { BusinessLayout } from '@/components/layouts/business-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Edit, Trash2, Eye, X, AlertTriangle, Box, Tag, Sliders, Loader2 } from 'lucide-react';
import { apiService } from '@/lib/services/api-service';
import { useAuth } from '@/hooks/use-auth';

interface ProductAttribute {
  key: string;
  value: string;
}

interface Product {
  id: number;
  name: string;
  category: string;
  price: string;
  stock: number;
  sales: number;
  tags: string[];
  attributes: ProductAttribute[];
}


// ── Reusable tag input ───────────────────────────────────────────────
function TagInput({ tags, onChange }: { tags: string[]; onChange: (tags: string[]) => void }) {
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

  return (
    <div
      className="min-h-[42px] flex flex-wrap gap-1.5 items-center border border-white/10 bg-white/5 rounded-xl px-3 py-2 cursor-text focus-within:border-primary transition-colors"
      onClick={() => inputRef.current?.focus()}
    >
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20 text-xs font-medium"
        >
          <Tag className="h-2.5 w-2.5" />
          {tag}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onChange(tags.filter((t) => t !== tag)); }}
            className="ml-0.5 text-violet-400/60 hover:text-violet-400 cursor-pointer"
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

  const businessId = user?.businessId || user?.entity?.id;

  useEffect(() => {
    if (!businessId) return;
    setLoading(true);
    apiService
      .get<any[]>(`/v1/products/business/${businessId}`)
      .then((res) => {
        if (res.data && !res.error) {
          const list = Array.isArray(res.data) ? res.data : [];
          setProducts(
            list.map((p: any) => ({
              id: p.id,
              name: p.name || '',
              category: p.category || p.categoryName || '',
              price: p.price ? `$${p.price}` : p.priceFormatted || '—',
              stock: p.stockCount ?? p.stock ?? 0,
              sales: p.salesCount ?? p.sales ?? 0,
              tags: Array.isArray(p.tags) ? p.tags : [],
              attributes: Array.isArray(p.attributes) ? p.attributes : [],
            })),
          );
        }
      })
      .finally(() => setLoading(false));
  }, [businessId]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState(0);
  const [formTags, setFormTags] = useState<string[]>([]);
  const [formAttrs, setFormAttrs] = useState<ProductAttribute[]>([]);

  const addAttr = () => setFormAttrs([...formAttrs, { key: '', value: '' }]);
  const removeAttr = (i: number) => setFormAttrs(formAttrs.filter((_, idx) => idx !== i));
  const updateAttr = (i: number, field: 'key' | 'value', val: string) => {
    const updated = [...formAttrs];
    updated[i] = { ...updated[i], [field]: val };
    setFormAttrs(updated);
  };

  const handleOpenAdd = () => {
    setName('');
    setCategory('');
    setPrice('');
    setStock(0);
    setFormTags([]);
    setFormAttrs([]);
    setIsAddOpen(true);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !businessId) return;
    setSubmitting(true);
    try {
      const priceNum = parseFloat(price.replace('$', '')) || 0;
      const res = await apiService.post<any>('/v1/products', {
        businessId,
        name,
        category,
        price: priceNum,
        stock: Number(stock),
        tags: formTags,
        attributes: formAttrs.filter((a) => a.key.trim()),
      });
      if (res.data && !res.error) {
        const p = res.data;
        setProducts((prev) => [{
          id: p.id,
          name: p.name || name,
          category: p.category || category,
          price: p.price != null ? `$${p.price}` : `$${price}`,
          stock: p.stockCount ?? p.stock ?? Number(stock),
          sales: p.salesCount ?? p.sales ?? 0,
          tags: Array.isArray(p.tags) ? p.tags : formTags,
          attributes: Array.isArray(p.attributes) ? p.attributes : formAttrs.filter((a) => a.key.trim()),
        }, ...prev]);
      }
    } catch (_) {}
    setSubmitting(false);
    setIsAddOpen(false);
  };

  const handleOpenEdit = (product: Product) => {
    setEditingProduct(product);
    setName(product.name);
    setCategory(product.category);
    setPrice(product.price.replace('$', ''));
    setStock(product.stock);
    setFormTags(product.tags);
    setFormAttrs(product.attributes || []);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !editingProduct) return;
    setSubmitting(true);
    try {
      const priceNum = parseFloat(price.replace('$', '')) || 0;
      const res = await apiService.patch<any>(`/v1/products/${editingProduct.id}`, {
        name,
        category,
        price: priceNum,
        stock: Number(stock),
        tags: formTags,
        attributes: formAttrs.filter((a) => a.key.trim()),
      });
      const updated = res.data && !res.error ? res.data : null;
      setProducts((prev) => prev.map((p) =>
        p.id === editingProduct.id
          ? {
              ...p,
              name: updated?.name || name,
              category: updated?.category || category,
              price: updated?.price != null ? `$${updated.price}` : `$${price}`,
              stock: updated?.stockCount ?? updated?.stock ?? Number(stock),
              tags: Array.isArray(updated?.tags) ? updated.tags : formTags,
              attributes: Array.isArray(updated?.attributes) ? updated.attributes : formAttrs.filter((a) => a.key.trim()),
            }
          : p,
      ));
    } catch (_) {}
    setSubmitting(false);
    setEditingProduct(null);
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

  const FormFields = () => (
    <>
      <div>
        <label className="text-sm font-medium text-slate-300 block mb-2">Product Name</label>
        <Input
          placeholder="e.g. Premium Speakers"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="rounded-xl border-white/10 bg-white/5 focus:border-primary text-foreground"
        />
      </div>
      <div>
        <label className="text-sm font-medium text-slate-300 block mb-2">Category</label>
        <Input
          placeholder="e.g. Electronics"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          required
          className="rounded-xl border-white/10 bg-white/5 focus:border-primary text-foreground"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-slate-300 block mb-2">Price ($)</label>
          <Input
            placeholder="e.g. 99.99"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
            className="rounded-xl border-white/10 bg-white/5 focus:border-primary text-foreground"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-300 block mb-2">Stock</label>
          <Input
            type="number"
            min="0"
            value={stock || ''}
            onChange={(e) => setStock(Number(e.target.value))}
            required
            className="rounded-xl border-white/10 bg-white/5 focus:border-primary text-foreground"
          />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium text-slate-300 block mb-2">
          Tags
          <span className="ml-1 text-xs text-muted-foreground font-normal">(Enter or comma to add)</span>
        </label>
        <TagInput tags={formTags} onChange={setFormTags} />
        <p className="text-[10px] text-muted-foreground mt-1">
          Add searchable tags (e.g. wireless, eco-friendly, limited-edition)
        </p>
      </div>

      {/* Dynamic Custom Attributes */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-slate-300 flex items-center gap-1.5">
            <Sliders className="h-3.5 w-3.5 text-cyan-400" />
            Custom Attributes
            <span className="text-xs text-muted-foreground font-normal">(optional)</span>
          </label>
          <button
            type="button"
            onClick={addAttr}
            className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
          >
            <Plus className="h-3 w-3" /> Add
          </button>
        </div>
        {formAttrs.length === 0 && (
          <p className="text-[10px] text-muted-foreground px-1">
            Add specs like Size, Color, Material, Warranty, Brand, Weight, etc.
          </p>
        )}
        <div className="space-y-2">
          {formAttrs.map((attr, i) => (
            <div key={i} className="flex gap-2 items-center">
              <Input
                placeholder="Attribute (e.g. Color)"
                value={attr.key}
                onChange={(e) => updateAttr(i, 'key', e.target.value)}
                className="rounded-xl border-white/10 bg-white/5 text-foreground text-sm flex-1"
              />
              <Input
                placeholder="Value (e.g. Black)"
                value={attr.value}
                onChange={(e) => updateAttr(i, 'value', e.target.value)}
                className="rounded-xl border-white/10 bg-white/5 text-foreground text-sm flex-1"
              />
              <button
                type="button"
                onClick={() => removeAttr(i)}
                className="text-rose-400 hover:text-rose-300 cursor-pointer shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </>
  );

  return (
    <BusinessLayout>
      <div>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Products</h1>
            <p className="text-muted-foreground">Manage your product catalog</p>
          </div>
          <Button
            onClick={handleOpenAdd}
            className="rounded-xl gap-2 font-medium bg-gradient-to-r from-primary to-accent text-primary-foreground cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Add Product
          </Button>
        </div>

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
        ) : null}

        <div className="space-y-4">
          {products.map((product) => (
            <Card
              key={product.id}
              className="p-6 rounded-2xl hover:shadow-md transition-all duration-300 border-white/5 bg-card/40 backdrop-blur-xl relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground text-lg mb-2">{product.name}</h3>
                  <div className="flex items-center gap-6 text-sm mb-3">
                    <div>
                      <p className="text-muted-foreground text-xs">Category</p>
                      <p className="font-medium text-foreground">{product.category}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Price</p>
                      <p className="font-medium text-foreground">{product.price}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Stock</p>
                      <p className="font-medium text-foreground">{product.stock} units</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Sales</p>
                      <p className="font-medium text-foreground">{product.sales}</p>
                    </div>
                  </div>
                  {product.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {product.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-[10px] font-medium"
                        >
                          <Tag className="h-2.5 w-2.5" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 shrink-0 ml-4">
                  <Button
                    onClick={() => setViewingProduct(product)}
                    size="icon"
                    variant="outline"
                    className="rounded-xl border-white/10 hover:bg-white/5 text-slate-300 h-9 w-9 cursor-pointer"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() => handleOpenEdit(product)}
                    size="icon"
                    variant="outline"
                    className="rounded-xl border-white/10 hover:bg-white/5 text-slate-300 h-9 w-9 cursor-pointer"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() => setDeletingProduct(product)}
                    size="icon"
                    variant="outline"
                    className="rounded-xl border-rose-500/20 hover:bg-rose-500/10 text-rose-400 hover:text-rose-300 h-9 w-9 cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* ADD MODAL */}
        {isAddOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <Card className="w-full max-w-md p-6 rounded-2xl border-white/10 bg-zinc-900 shadow-2xl relative max-h-[90vh] overflow-y-auto">
              <button onClick={() => setIsAddOpen(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="h-5 w-5" />
              </button>
              <h3 className="text-xl font-bold text-foreground mb-4">Add Product</h3>
              <form onSubmit={handleAdd} className="space-y-4">
                <FormFields />
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

        {/* EDIT MODAL */}
        {editingProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <Card className="w-full max-w-md p-6 rounded-2xl border-white/10 bg-zinc-900 shadow-2xl relative max-h-[90vh] overflow-y-auto">
              <button onClick={() => setEditingProduct(null)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="h-5 w-5" />
              </button>
              <h3 className="text-xl font-bold text-foreground mb-4">Edit Product</h3>
              <form onSubmit={handleEdit} className="space-y-4">
                <FormFields />
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

        {/* DELETE MODAL */}
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
                Delete <span className="font-semibold text-foreground">"{deletingProduct.name}"</span>? This action is permanent.
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

        {/* VIEW MODAL */}
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
                  <p className="text-xs text-muted-foreground mt-1">Category: {viewingProduct.category}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-white/5 p-4 rounded-xl text-center border border-white/5">
                  <p className="text-xs text-muted-foreground mb-1">Price</p>
                  <p className="text-lg font-extrabold text-foreground">{viewingProduct.price}</p>
                </div>
                <div className="bg-white/5 p-4 rounded-xl text-center border border-white/5">
                  <p className="text-xs text-muted-foreground mb-1">Stock</p>
                  <p className="text-lg font-extrabold text-foreground">{viewingProduct.stock}</p>
                </div>
                <div className="bg-white/5 p-4 rounded-xl text-center border border-white/5">
                  <p className="text-xs text-muted-foreground mb-1">Sales</p>
                  <p className="text-lg font-extrabold text-foreground">{viewingProduct.sales}</p>
                </div>
              </div>
              {viewingProduct.tags.length > 0 && (
                <div className="mb-5">
                  <p className="text-xs text-muted-foreground uppercase font-semibold mb-2">Tags</p>
                  <div className="flex flex-wrap gap-1.5">
                    {viewingProduct.tags.map((tag) => (
                      <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-medium">
                        <Tag className="h-2.5 w-2.5" />
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {viewingProduct.attributes && viewingProduct.attributes.length > 0 && (
                <div className="mb-5">
                  <p className="text-xs text-muted-foreground uppercase font-semibold mb-2 flex items-center gap-1">
                    <Sliders className="h-3 w-3" /> Specifications
                  </p>
                  <div className="space-y-1.5">
                    {viewingProduct.attributes.map((attr, i) => (
                      <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/5 border border-white/5 text-xs">
                        <span className="text-muted-foreground font-medium">{attr.key}</span>
                        <span className="text-foreground font-semibold">{attr.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex justify-end pt-2">
                <Button onClick={() => setViewingProduct(null)} className="rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold cursor-pointer">Close</Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </BusinessLayout>
  );
}
