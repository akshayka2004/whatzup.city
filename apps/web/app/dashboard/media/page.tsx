'use client';

import { useState, useRef, useEffect } from 'react';
import { BusinessLayout } from '@/components/layouts/business-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Image as ImageIcon, Trash2, Eye, X, AlertTriangle, Loader2, CheckCircle2, Tag } from 'lucide-react';
import { Input } from '@/components/ui/input';
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

  // ── Upload form state ──────────────────────────────────────
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDesc, setUploadDesc] = useState('');
  const [uploadTagsStr, setUploadTagsStr] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    setUploadError('');
    setUploadSuccess(false);
    if (file && !uploadTitle) {
      // Pre-fill title from filename (without extension)
      setUploadTitle(file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !businessId) return;
    setUploading(true);
    setUploadError('');

    try {
      // Step 1: Get signed upload URL
      const urlRes = await apiService.post<{ uploadUrl: string; fileKey: string; bucket: string }>(
        '/v1/media/upload-url',
        {
          businessId,
          filename: selectedFile.name,
          mimeType: selectedFile.type,
        },
      );

      if (urlRes.error || !urlRes.data?.uploadUrl) {
        throw new Error(urlRes.error || 'Failed to get upload URL');
      }

      const { uploadUrl, fileKey } = urlRes.data;

      // Step 2: PUT file directly to Supabase signed URL
      const putRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': selectedFile.type },
        body: selectedFile,
      });

      if (!putRes.ok) {
        throw new Error(`Storage upload failed: ${putRes.status} ${putRes.statusText}`);
      }

      // Step 3: Register media record in API
      const tags = uploadTagsStr
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      const createRes = await apiService.post<any>('/v1/media', {
        businessId,
        url: fileKey,
        type: selectedFile.type.startsWith('image/') ? 'IMAGE' : 'DOCUMENT',
        filename: selectedFile.name,
        size: selectedFile.size,
        mimeType: selectedFile.type,
        title: uploadTitle.trim() || undefined,
        description: uploadDesc.trim() || undefined,
        tags: tags.length ? tags : undefined,
      });

      if (createRes.error) {
        throw new Error(createRes.error || 'Failed to register media record');
      }

      setUploadSuccess(true);

      // Refresh media list
      const refreshRes = await apiService.get<any[]>(`/v1/media/business/${businessId}`);
      if (refreshRes.data && !refreshRes.error) {
        setMedia(Array.isArray(refreshRes.data) ? refreshRes.data : []);
      }

      // Close modal after short delay
      setTimeout(() => {
        setIsUploadOpen(false);
        setSelectedFile(null);
        setUploadTitle('');
        setUploadDesc('');
        setUploadTagsStr('');
        setUploadSuccess(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }, 1200);
    } catch (err: any) {
      setUploadError(err.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingMedia) return;
    setMedia(media.filter((m) => m.id !== deletingMedia.id));
    setDeletingMedia(null);
    await apiService.delete(`/v1/media/${deletingMedia.id}`);
  };

  const resolveMediaUrl = (item: any): string => {
    const raw = item.url || item.fileUrl || item.path || '';
    // If stored as JSON ref, build public URL
    if (raw.startsWith('{')) {
      try {
        const parsed = JSON.parse(raw);
        const base = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        return `${base}/storage/v1/object/public/${parsed.bucket}/${parsed.path}`;
      } catch {}
    }
    // Full URL already
    if (raw.startsWith('http')) return raw;
    // Relative key — build public URL
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    return raw ? `${base}/storage/v1/object/public/business-media/${raw}` : '';
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
            onClick={() => { setIsUploadOpen(true); setUploadError(''); setUploadSuccess(false); }}
            className="rounded-xl gap-2 font-medium bg-gradient-to-r from-primary to-accent text-primary-foreground cursor-pointer"
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
          <Card className="p-10 rounded-2xl border-dashed border-border bg-secondary text-center">
            <ImageIcon className="h-10 w-10 mx-auto text-muted-foreground mb-3 opacity-40" />
            <p className="text-foreground font-semibold mb-1">No media files yet</p>
            <p className="text-sm text-muted-foreground">Upload your first image to build your gallery.</p>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {media.map((item) => {
              const itemName = item.name || item.altText || item.filename || 'Untitled';
              const itemUrl = resolveMediaUrl(item);
              const itemSize = item.size
                ? `${(item.size / 1024).toFixed(0)} KB`
                : item.fileSize || '—';
              return (
                <Card
                  key={item.id}
                  className="rounded-2xl overflow-hidden border-border bg-card/40 backdrop-blur-xl group hover:shadow-lg transition-all duration-300"
                >
                  <div className="h-48 w-full relative overflow-hidden bg-secondary">
                    {itemUrl ? (
                      <img
                        src={itemUrl}
                        alt={itemName}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="h-10 w-10 text-muted-foreground opacity-40" />
                      </div>
                    )}
                  </div>
                  <div className="p-4 flex items-center justify-between">
                    <div className="min-w-0 flex-1 mr-4">
                      <h3 className="font-semibold text-foreground truncate">{item.title || itemName}</h3>
                      <p className="text-xs text-muted-foreground">{itemSize}</p>
                      {item.tags && item.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {item.tags.slice(0, 3).map((t: string) => (
                            <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">{t}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => setViewingMedia({ ...item, name: itemName, url: itemUrl, size: itemSize })}
                        size="icon"
                        variant="outline"
                        className="h-8 w-8 rounded-lg border-border text-foreground hover:bg-secondary cursor-pointer"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={() => setDeletingMedia({ ...item, name: itemName })}
                        size="icon"
                        variant="outline"
                        className="h-8 w-8 rounded-lg border-destructive/20 text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
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
            <Card className="w-full max-w-md p-6 rounded-2xl border-border bg-card shadow-2xl relative">
              <button
                onClick={() => { setIsUploadOpen(false); setSelectedFile(null); setUploadTitle(''); setUploadDesc(''); setUploadTagsStr(''); setUploadError(''); setUploadSuccess(false); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
              <h3 className="text-xl font-bold text-foreground mb-4">Upload Media Asset</h3>

              {uploadSuccess ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <CheckCircle2 className="h-12 w-12 text-success" />
                  <p className="text-success font-semibold text-lg">Uploaded successfully!</p>
                </div>
              ) : (
                <form onSubmit={handleUpload} className="space-y-4">
                  {/* File picker */}
                  <div>
                    <label className="text-sm font-medium text-foreground block mb-2">Select File</label>
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                    >
                      {selectedFile ? (
                        <div className="flex items-center justify-center gap-2 text-success">
                          <CheckCircle2 className="h-5 w-5" />
                          <span className="text-sm font-medium truncate max-w-xs">{selectedFile.name}</span>
                          <span className="text-xs text-muted-foreground">({(selectedFile.size / 1024).toFixed(0)} KB)</span>
                        </div>
                      ) : (
                        <>
                          <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">Click to browse or drag and drop</p>
                          <p className="text-xs text-muted-foreground mt-1">PNG, JPG, WebP up to 5MB</p>
                        </>
                      )}
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </div>

                  {/* Metadata fields */}
                  <div>
                    <label className="text-xs font-medium text-foreground block mb-1.5">Title</label>
                    <Input
                      value={uploadTitle}
                      onChange={(e) => setUploadTitle(e.target.value)}
                      placeholder="Image title (optional)"
                      className="rounded-xl border-border bg-secondary"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-foreground block mb-1.5">Description</label>
                    <textarea
                      value={uploadDesc}
                      onChange={(e) => setUploadDesc(e.target.value)}
                      placeholder="Short description (optional)"
                      rows={2}
                      className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-foreground block mb-1.5 flex items-center gap-1">
                      <Tag className="h-3 w-3" /> Tags (comma separated)
                    </label>
                    <Input
                      value={uploadTagsStr}
                      onChange={(e) => setUploadTagsStr(e.target.value)}
                      placeholder="interior, product, team"
                      className="rounded-xl border-border bg-secondary"
                    />
                  </div>

                  {uploadError && (
                    <div className="flex items-start gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                      <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                      {uploadError}
                    </div>
                  )}

                  <div className="flex justify-end gap-3 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => { setIsUploadOpen(false); setSelectedFile(null); setUploadTitle(''); setUploadDesc(''); setUploadTagsStr(''); setUploadError(''); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                      className="rounded-xl border-border hover:bg-secondary text-foreground cursor-pointer"
                      disabled={uploading}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold cursor-pointer gap-2"
                      disabled={!selectedFile || uploading}
                    >
                      {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
                      {uploading ? 'Uploading…' : 'Upload'}
                    </Button>
                  </div>
                </form>
              )}
            </Card>
          </div>
        )}

        {/* ── VIEW MODAL ─────────────────────────────────── */}
        {viewingMedia && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <Card className="w-full max-w-2xl p-2 rounded-2xl border-border bg-card shadow-2xl relative">
              <button
                onClick={() => setViewingMedia(null)}
                className="absolute top-3 right-3 z-10 bg-black/50 rounded-full p-1 text-white hover:bg-black/70 cursor-pointer"
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
            <Card className="w-full max-w-sm p-6 rounded-2xl border-border bg-card shadow-2xl relative text-center">
              <button
                onClick={() => setDeletingMedia(null)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center text-destructive mb-4">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">Delete Media Asset</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Delete <span className="font-semibold text-foreground">"{deletingMedia.name}"</span>? This cannot be undone.
              </p>
              <div className="flex justify-center gap-3">
                <Button
                  onClick={() => setDeletingMedia(null)}
                  variant="outline"
                  className="rounded-xl border-border hover:bg-secondary text-foreground px-4 cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDelete}
                  className="rounded-xl bg-destructive hover:bg-destructive text-white px-4 cursor-pointer"
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
