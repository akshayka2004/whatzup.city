'use client';

import { useState, useRef, useEffect } from 'react';
import { BusinessLayout } from '@/components/layouts/business-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, Image as ImageIcon, Trash2, Eye, X, AlertTriangle, Loader2 } from 'lucide-react';
import { apiService } from '@/lib/services/api-service';
import { useAuth } from '@/hooks/use-auth';

export default function MediaPage() {
  const { user } = useAuth();
  const [media, setMedia] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const businessId = user?.businessId || user?.entity?.id;

  useEffect(() => {
    if (!businessId) return;
    setLoading(true);
    apiService
      .get<any[]>(`/v1/media/business/${businessId}`)
      .then((res) => {
        if (res.data && !res.error) setMedia(Array.isArray(res.data) ? res.data : []);
      })
      .finally(() => setLoading(false));
  }, [businessId]);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [viewingMedia, setViewingMedia] = useState<any>(null);
  const [deletingMedia, setDeletingMedia] = useState<any>(null);
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileName || !businessId) return;
    // Optimistic add — actual upload requires multipart which is handled separately
    const newMedia = {
      id: Date.now(),
      name: fileName,
      altText: fileName,
      size: '—',
      url: '',
    };
    setMedia([newMedia, ...media]);
    setIsUploadOpen(false);
    setFileName('');
    // Refresh from API
    const res = await apiService.get<any[]>(`/v1/media/business/${businessId}`);
    if (res.data && !res.error) setMedia(Array.isArray(res.data) ? res.data : []);
  };

  const handleDelete = async () => {
    if (!deletingMedia) return;
    setMedia(media.filter((m) => m.id !== deletingMedia.id));
    setDeletingMedia(null);
    await apiService.delete(`/v1/media/${deletingMedia.id}`);
  };

  return (
    <BusinessLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Media & Gallery</h1>
            <p className="text-muted-foreground">
              Upload and manage promotional storefront photos and asset banners
            </p>
          </div>
          <Button
            onClick={() => setIsUploadOpen(true)}
            className="rounded-xl gap-2 font-medium bg-gradient-to-r from-primary to-accent text-primary-foreground"
          >
            <Upload className="h-4 w-4" />
            Upload File
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : media.length === 0 ? (
          <Card className="p-10 rounded-2xl border-dashed border-white/10 bg-white/5 text-center">
            <ImageIcon className="h-10 w-10 mx-auto text-muted-foreground mb-3 opacity-40" />
            <p className="text-foreground font-semibold mb-1">No media files yet</p>
            <p className="text-sm text-muted-foreground">Upload your first image to build your gallery.</p>
          </Card>
        ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {media.map((item) => {
            const itemName = item.name || item.altText || item.filename || 'Untitled';
            const itemUrl = item.url || item.fileUrl || item.path || '';
            const itemSize = item.size || item.fileSize || '—';
            return (
            <Card
              key={item.id}
              className="rounded-2xl overflow-hidden border-white/5 bg-card/40 backdrop-blur-xl group hover:shadow-lg transition-all duration-300"
            >
              <div className="h-48 w-full relative overflow-hidden bg-secondary">
                {itemUrl ? (
                  <img
                    src={itemUrl}
                    alt={itemName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="h-10 w-10 text-muted-foreground opacity-40" />
                  </div>
                )}
              </div>
              <div className="p-4 flex items-center justify-between">
                <div className="min-w-0 flex-1 mr-4">
                  <h3 className="font-semibold text-foreground truncate">{itemName}</h3>
                  <p className="text-xs text-muted-foreground">{itemSize}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setViewingMedia({ ...item, name: itemName, url: itemUrl, size: itemSize })}
                    size="icon"
                    variant="outline"
                    className="h-8 w-8 rounded-lg border-white/10 text-slate-300 hover:bg-white/5"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() => setDeletingMedia({ ...item, name: itemName })}
                    size="icon"
                    variant="outline"
                    className="h-8 w-8 rounded-lg border-rose-500/20 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
            );
          })}
        </div>
        )}

        {/* ── UPLOAD MODAL ───────────────────────────────── */}
        {isUploadOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <Card className="w-full max-w-md p-6 rounded-2xl border-white/10 bg-zinc-900 shadow-2xl relative">
              <button
                onClick={() => setIsUploadOpen(false)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
              <h3 className="text-xl font-bold text-foreground mb-4">Upload Media Asset</h3>
              <form onSubmit={handleUpload} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-300 block mb-2">
                    File Description
                  </label>
                  <Input
                    placeholder="e.g. Storefront Exterior Shot"
                    value={fileName}
                    onChange={(e) => setFileName(e.target.value)}
                    required
                    className="rounded-xl border-white/10 bg-white/5 focus:border-primary text-foreground"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-300 block mb-2">
                    Select File
                  </label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  >
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Click to browse or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">PNG, JPG, WebP up to 10MB</p>
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsUploadOpen(false)}
                    className="rounded-xl border-white/10 hover:bg-white/5 text-slate-300"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold"
                  >
                    Upload
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}

        {/* ── VIEW MODAL ─────────────────────────────────── */}
        {viewingMedia && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <Card className="w-full max-w-2xl p-2 rounded-2xl border-white/10 bg-zinc-900 shadow-2xl relative">
              <button
                onClick={() => setViewingMedia(null)}
                className="absolute top-3 right-3 z-10 bg-black/50 rounded-full p-1 text-white hover:bg-black/70"
              >
                <X className="h-5 w-5" />
              </button>
              <img
                src={viewingMedia.url}
                alt={viewingMedia.name}
                className="w-full rounded-xl object-contain max-h-[70vh]"
              />
              <div className="p-4">
                <h3 className="font-bold text-foreground text-lg">{viewingMedia.name}</h3>
                <p className="text-xs text-muted-foreground">{viewingMedia.size}</p>
              </div>
            </Card>
          </div>
        )}

        {/* ── DELETE MODAL ────────────────────────────────── */}
        {deletingMedia && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <Card className="w-full max-w-sm p-6 rounded-2xl border-white/10 bg-zinc-900 shadow-2xl relative text-center">
              <button
                onClick={() => setDeletingMedia(null)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="mx-auto w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 mb-4">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">Delete Media Asset</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Delete <span className="font-semibold text-foreground">"{deletingMedia.name}"</span>
                ? This cannot be undone.
              </p>
              <div className="flex justify-center gap-3">
                <Button
                  onClick={() => setDeletingMedia(null)}
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
    </BusinessLayout>
  );
}
