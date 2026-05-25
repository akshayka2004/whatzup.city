'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layouts/admin-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Folder, Edit, Trash2, X, AlertTriangle, Loader2 } from 'lucide-react';
import { apiService } from '@/lib/services/api-service';

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiService
      .get<any[]>('/v1/categories?tenantId=default')
      .then((res) => {
        if (res.data && !res.error) {
          const list = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
          setCategories(
            list.map((c: any) => ({
              id: c.id,
              name: c.name || '',
              slug: c.slug || c.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || '',
              listingsCount: c.listingsCount ?? c._count?.businesses ?? 0,
              active: c.isActive !== false,
            })),
          );
        }
      })
      .finally(() => setLoading(false));
  }, []);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [deletingCategory, setDeletingCategory] = useState<any>(null);

  // Form states
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [active, setActive] = useState(true);

  const handleOpenAdd = () => {
    setName('');
    setSlug('');
    setActive(true);
    setIsAddOpen(true);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    const finalSlug =
      slug ||
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    const res = await apiService.post<any>('/v1/categories', { name, slug: finalSlug });
    if (res.data && !res.error) {
      setCategories([
        ...categories,
        { id: res.data.id, name: res.data.name, slug: res.data.slug, listingsCount: 0, active: res.data.isActive !== false },
      ]);
    }
    setIsAddOpen(false);
  };

  const handleOpenEdit = (cat: any) => {
    setEditingCategory(cat);
    setName(cat.name);
    setSlug(cat.slug);
    setActive(cat.active);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !editingCategory) return;
    const finalSlug =
      slug ||
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    const res = await apiService.patch<any>(`/v1/categories/${editingCategory.id}`, {
      name,
      slug: finalSlug,
      isActive: active,
    });
    if (res.data && !res.error) {
      setCategories(
        categories.map((c) =>
          c.id === editingCategory.id ? { ...c, name, slug: finalSlug, active } : c,
        ),
      );
    }
    setEditingCategory(null);
  };

  const handleDelete = async () => {
    if (!deletingCategory) return;
    await apiService.delete<any>(`/v1/categories/${deletingCategory.id}`);
    setCategories(categories.filter((c) => c.id !== deletingCategory.id));
    setDeletingCategory(null);
  };

  const toggleActive = async (id: string | number) => {
    const cat = categories.find((c) => c.id === id);
    if (!cat) return;
    const newActive = !cat.active;
    // Optimistic update + revert on error
    setCategories(categories.map((c) => (c.id === id ? { ...c, active: newActive } : c)));
    const res = await apiService.patch<any>(`/v1/categories/${id}`, { isActive: newActive });
    if (res.error) {
      setCategories(categories.map((c) => (c.id === id ? { ...c, active: !newActive } : c)));
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Category Taxonomy</h1>
            <p className="text-muted-foreground">
              Manage directory category branches, metadata, and listing mappings
            </p>
          </div>
          <Button
            onClick={handleOpenAdd}
            className="rounded-xl gap-2 font-medium bg-gradient-to-r from-primary to-accent text-primary-foreground"
          >
            <Plus className="h-4 w-4" />
            Add Category
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : categories.length === 0 ? (
          <Card className="p-10 rounded-2xl border-dashed border-white/10 bg-white/5 text-center">
            <Folder className="h-10 w-10 mx-auto text-muted-foreground mb-3 opacity-40" />
            <p className="text-foreground font-semibold mb-1">No categories yet</p>
            <p className="text-sm text-muted-foreground">Add your first category to organize listings.</p>
          </Card>
        ) : null}

        <div className="grid md:grid-cols-2 gap-6">
          {categories.map((cat) => (
            <Card
              key={cat.id}
              className="p-6 rounded-2xl hover:shadow-md transition-all duration-300 border-white/5 bg-card/40 backdrop-blur-xl relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none"></div>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="p-2 bg-violet-500/10 text-violet-400 rounded-lg">
                      <Folder className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground text-base">{cat.name}</h3>
                      <p className="text-xs text-muted-foreground">Slug: /{cat.slug}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-xs mt-4">
                    <div>
                      <p className="text-muted-foreground">Active Listings</p>
                      <p className="font-bold text-foreground text-sm mt-0.5">
                        {cat.listingsCount}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Status</p>
                      <button
                        onClick={() => toggleActive(cat.id)}
                        className={`font-semibold mt-0.5 text-xs hover:opacity-80 transition-opacity ${
                          cat.active ? 'text-emerald-400' : 'text-slate-400'
                        }`}
                      >
                        {cat.active ? 'Active' : 'Inactive'}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleOpenEdit(cat)}
                    size="icon"
                    variant="outline"
                    className="h-9 w-9 rounded-xl border-white/10 text-slate-300 hover:bg-white/5"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() => setDeletingCategory(cat)}
                    size="icon"
                    variant="outline"
                    className="h-9 w-9 rounded-xl border-rose-500/20 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* ── ADD MODAL ────────────────────────────────────────────── */}
        {isAddOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <Card className="w-full max-w-md p-6 rounded-2xl border-white/10 bg-zinc-900 shadow-2xl relative">
              <button
                onClick={() => setIsAddOpen(false)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
              <h3 className="text-xl font-bold text-foreground mb-4">Add Directory Category</h3>
              <form onSubmit={handleAdd} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-300 block mb-2">
                    Category Name
                  </label>
                  <Input
                    placeholder="e.g. Food & Dining"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      // Auto-fill slug
                      setSlug(
                        e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9]+/g, '-')
                          .replace(/(^-|-$)/g, ''),
                      );
                    }}
                    required
                    className="rounded-xl border-white/10 bg-white/5 focus:border-primary text-foreground"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-300 block mb-2">
                    Slug URL Path
                  </label>
                  <Input
                    placeholder="e.g. food-dining"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    required
                    className="rounded-xl border-white/10 bg-white/5 focus:border-primary text-foreground"
                  />
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="cat-active-chk"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                    className="rounded bg-white/5 border-white/10 text-primary focus:ring-primary h-4 w-4"
                  />
                  <label htmlFor="cat-active-chk" className="text-sm text-slate-300">
                    Enable category status immediately
                  </label>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddOpen(false)}
                    className="rounded-xl border-white/10 hover:bg-white/5 text-slate-300"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold"
                  >
                    Add Category
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}

        {/* ── EDIT MODAL ───────────────────────────────────────────── */}
        {editingCategory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <Card className="w-full max-w-md p-6 rounded-2xl border-white/10 bg-zinc-900 shadow-2xl relative">
              <button
                onClick={() => setEditingCategory(null)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
              <h3 className="text-xl font-bold text-foreground mb-4">Edit Category Branch</h3>
              <form onSubmit={handleEdit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-300 block mb-2">
                    Category Name
                  </label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="rounded-xl border-white/10 bg-white/5 focus:border-primary text-foreground"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-300 block mb-2">
                    Slug URL Path
                  </label>
                  <Input
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    required
                    className="rounded-xl border-white/10 bg-white/5 focus:border-primary text-foreground"
                  />
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="edit-cat-active-chk"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                    className="rounded bg-white/5 border-white/10 text-primary focus:ring-primary h-4 w-4"
                  />
                  <label htmlFor="edit-cat-active-chk" className="text-sm text-slate-300">
                    Category active status
                  </label>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditingCategory(null)}
                    className="rounded-xl border-white/10 hover:bg-white/5 text-slate-300"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold"
                  >
                    Save Changes
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}

        {/* ── DELETE MODAL ─────────────────────────────────────────── */}
        {deletingCategory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <Card className="w-full max-w-sm p-6 rounded-2xl border-white/10 bg-zinc-900 shadow-2xl relative text-center">
              <button
                onClick={() => setDeletingCategory(null)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="mx-auto w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 mb-4">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">Delete Directory Category</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Are you sure you want to delete{' '}
                <span className="font-semibold text-foreground">"{deletingCategory.name}"</span>?
                This will detach all mapped listings.
              </p>
              <div className="flex justify-center gap-3">
                <Button
                  onClick={() => setDeletingCategory(null)}
                  variant="outline"
                  className="rounded-xl border-white/10 hover:bg-white/5 text-slate-300 px-4"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDelete}
                  className="rounded-xl bg-rose-600 hover:bg-rose-500 text-white px-4"
                >
                  Delete
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
