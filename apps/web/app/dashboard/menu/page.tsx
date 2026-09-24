'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { BusinessLayout } from '@/components/layouts/business-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Upload,
  Image as ImageIcon,
  Trash2,
  Eye,
  X,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  UtensilsCrossed,
} from 'lucide-react';
import { apiService } from '@/lib/services/api-service';
import { storageUploadError } from '@/lib/upload-error';
import { optimizeImage } from '@/lib/utils/image-optimizer';
import { useOwnerBusiness } from '@/hooks/use-owner-business';

const MAX_PHOTOS = 20;
const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];

interface MenuPhoto {
  id: string;
  title: string | null;
  filename: string;
  publicUrl: string;
}

const prettyName = (filename: string) =>
  filename.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ').trim().slice(0, 80);

export default function MenuPhotosPage() {
  const { business, loading: bizLoading, isFood } = useOwnerBusiness();
  const [photos, setPhotos] = useState<MenuPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');

  const [uploadOpen, setUploadOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [label, setLabel] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [progress, setProgress] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [viewing, setViewing] = useState<MenuPhoto | null>(null);
  const [deleting, setDeleting] = useState<MenuPhoto | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const businessId = business?.id;

  const loadPhotos = useCallback(async () => {
    if (!businessId) return;
    setListError('');
    const res = await apiService.get<MenuPhoto[]>(`/v1/media/menu/business/${businessId}`);
    if (res.error) {
      setListError(`Couldn't load your menu photos. ${res.error}`);
    } else {
      setPhotos(Array.isArray(res.data) ? res.data : []);
    }
    setLoading(false);
  }, [businessId]);

  useEffect(() => {
    if (businessId && isFood) loadPhotos();
    else if (!bizLoading) setLoading(false);
  }, [businessId, isFood, bizLoading, loadPhotos]);

  const closeUpload = () => {
    if (uploading) return;
    setUploadOpen(false);
    setFiles([]);
    setLabel('');
    setUploadErrors([]);
    setProgress('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files || []);
    setUploadErrors([]);
    const room = MAX_PHOTOS - photos.length;
    const problems: string[] = [];
    const ok: File[] = [];
    for (const f of picked) {
      if (!ACCEPTED.includes(f.type)) {
        problems.push(`${f.name}: only JPG, PNG or WebP images are accepted (this file is ${f.type || 'an unknown type'}).`);
      } else {
        ok.push(f);
      }
    }
    if (ok.length > room) {
      problems.push(
        room > 0
          ? `You can add ${room} more photo${room === 1 ? '' : 's'} (limit is ${MAX_PHOTOS}). Only the first ${room} selected will be used.`
          : `You already have ${MAX_PHOTOS} menu photos. Delete one before adding another.`,
      );
    }
    setFiles(ok.slice(0, Math.max(room, 0)));
    setUploadErrors(problems);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId || files.length === 0) return;
    setUploading(true);
    setUploadErrors([]);
    const failures: string[] = [];
    let done = 0;

    for (const original of files) {
      setProgress(`Uploading ${done + 1} of ${files.length}: ${original.name}`);
      try {
        // Phone photos are often >5 MB; resize (still sharp enough to read a menu) before sending.
        let file = original;
        try {
          file = await optimizeImage(original, { maxWidth: 2000, maxHeight: 2000, quality: 0.85, outputType: 'jpeg' });
        } catch {
          file = original;
        }
        if (file.size > MAX_BYTES) {
          throw new Error(
            `is too large (${(file.size / 1024 / 1024).toFixed(1)} MB, the limit is 5 MB). Try a smaller photo.`,
          );
        }

        const photoLabel = files.length === 1 && label.trim() ? label.trim() : prettyName(original.name);

        const urlRes = await apiService.post<{ uploadUrl: string; fileKey: string }>('/v1/media/menu/upload-url', {
          businessId,
          filename: file.name,
          mimeType: file.type,
          size: file.size,
          label: photoLabel || undefined,
        });
        if (urlRes.error || !urlRes.data?.uploadUrl) {
          throw new Error(`could not be prepared for upload. ${urlRes.error || ''}`.trim());
        }

        let putRes: Response;
        try {
          putRes = await fetch(urlRes.data.uploadUrl, {
            method: 'PUT',
            headers: { 'Content-Type': file.type },
            body: file,
          });
        } catch {
          throw new Error("could not be uploaded. Check your internet connection and try again.");
        }
        if (!putRes.ok) throw new Error(`failed to upload. ${await storageUploadError(putRes)}`);

        const createRes = await apiService.post<MenuPhoto>('/v1/media/menu', {
          businessId,
          fileKey: urlRes.data.fileKey,
          filename: file.name,
          mimeType: file.type,
          size: file.size,
          label: photoLabel || undefined,
        });
        if (createRes.error) throw new Error(`was uploaded but could not be saved. ${createRes.error}`);
        done += 1;
      } catch (err: any) {
        failures.push(`${original.name} ${err?.message || 'failed for an unknown reason.'}`);
      }
    }

    setUploading(false);
    setProgress('');
    await loadPhotos();

    if (failures.length === 0) {
      closeUpload();
    } else {
      setFiles(files.filter((f) => failures.some((m) => m.startsWith(f.name))));
      setUploadErrors(
        done > 0 ? [`${done} photo${done === 1 ? '' : 's'} added.`, ...failures] : failures,
      );
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    setDeleteError('');
    const res = await apiService.delete(`/v1/media/${deleting.id}`);
    setDeleteBusy(false);
    if (res.error) {
      setDeleteError(`Couldn't delete this photo. ${res.error}`);
      return;
    }
    setPhotos((list) => list.filter((p) => p.id !== deleting.id));
    setDeleting(null);
  };

  return (
    <BusinessLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
              <UtensilsCrossed className="h-7 w-7 text-primary shrink-0" /> Menu Photos
            </h1>
            <p className="text-muted-foreground">
              Show customers what you serve. Photos of your food menu appear on your public profile.
            </p>
          </div>
          {isFood && (
            <Button
              onClick={() => setUploadOpen(true)}
              disabled={photos.length >= MAX_PHOTOS}
              className="rounded-xl gap-2 font-medium bg-gradient-to-r from-primary to-accent text-primary-foreground cursor-pointer"
            >
              <Upload className="h-4 w-4" />
              Add menu photos
            </Button>
          )}
        </div>

        {bizLoading || (isFood && loading) ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !business ? (
          <Card className="p-10 rounded-2xl border-dashed border-border bg-secondary text-center">
            <AlertTriangle className="h-10 w-10 mx-auto text-muted-foreground mb-3 opacity-50" />
            <p className="text-foreground font-semibold mb-1">We couldn&apos;t load your business</p>
            <p className="text-sm text-muted-foreground">Refresh the page. If this keeps happening, contact support.</p>
          </Card>
        ) : !isFood ? (
          <Card className="p-10 rounded-2xl border-dashed border-border bg-secondary text-center">
            <UtensilsCrossed className="h-10 w-10 mx-auto text-muted-foreground mb-3 opacity-40" />
            <p className="text-foreground font-semibold mb-1">Menu photos are for food businesses</p>
            <p className="text-sm text-muted-foreground">
              Your business is listed under {business.category?.name || 'a non-food category'}, so this section isn&apos;t available.
            </p>
          </Card>
        ) : (
          <>
            {listError && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <span className="break-words min-w-0">{listError}</span>
              </div>
            )}
            {photos.length === 0 && !listError ? (
              <Card className="p-10 rounded-2xl border-dashed border-border bg-secondary text-center">
                <ImageIcon className="h-10 w-10 mx-auto text-muted-foreground mb-3 opacity-40" />
                <p className="text-foreground font-semibold mb-1">No menu photos yet</p>
                <p className="text-sm text-muted-foreground">
                  Add clear photos of each menu page or your signature dishes so customers know what to expect.
                </p>
              </Card>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">
                  {photos.length} of {MAX_PHOTOS} photos
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {photos.map((p) => (
                    <Card key={p.id} className="rounded-2xl overflow-hidden border-border bg-card/40 group">
                      <div className="h-48 w-full overflow-hidden bg-secondary">
                        <img
                          src={p.publicUrl}
                          alt={p.title || 'Menu photo'}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 motion-reduce:transition-none"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                      <div className="p-4 flex items-center justify-between gap-3">
                        <h3 className="min-w-0 flex-1 font-semibold text-foreground truncate">
                          {p.title || p.filename}
                        </h3>
                        <div className="flex gap-2 shrink-0">
                          <Button
                            onClick={() => setViewing(p)}
                            size="icon"
                            variant="outline"
                            aria-label="View photo"
                            className="h-8 w-8 rounded-lg border-border text-foreground hover:bg-secondary cursor-pointer"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={() => {
                              setDeleteError('');
                              setDeleting(p);
                            }}
                            size="icon"
                            variant="outline"
                            aria-label="Delete photo"
                            className="h-8 w-8 rounded-lg border-destructive/20 text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {/* Upload modal */}
        {uploadOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <Card className="w-full max-w-md p-6 rounded-2xl border-border bg-card shadow-2xl relative max-h-[90vh] overflow-y-auto">
              <button
                onClick={closeUpload}
                aria-label="Close"
                disabled={uploading}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer disabled:opacity-40"
              >
                <X className="h-5 w-5" />
              </button>
              <h3 className="text-xl font-bold text-foreground mb-4">Add menu photos</h3>

              <form onSubmit={handleUpload} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-2">Photos</label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  >
                    {files.length > 0 ? (
                      <div className="flex items-center justify-center gap-2 text-success">
                        <CheckCircle2 className="h-5 w-5 shrink-0" />
                        <span className="text-sm font-medium">
                          {files.length} photo{files.length === 1 ? '' : 's'} selected
                        </span>
                      </div>
                    ) : (
                      <>
                        <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">Tap to choose photos</p>
                        <p className="text-xs text-muted-foreground mt-1">JPG, PNG or WebP, up to 5 MB each</p>
                      </>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleFiles}
                  />
                </div>

                {files.length === 1 && (
                  <div>
                    <label className="text-xs font-medium text-foreground block mb-1.5">
                      Label <span className="text-muted-foreground font-normal">(optional, e.g. &quot;Lunch menu&quot;)</span>
                    </label>
                    <Input
                      value={label}
                      onChange={(e) => setLabel(e.target.value)}
                      maxLength={80}
                      placeholder={prettyName(files[0].name) || 'Photo label'}
                      className="rounded-xl border-border bg-secondary"
                    />
                  </div>
                )}

                {progress && <p className="text-xs text-muted-foreground break-words">{progress}</p>}

                {uploadErrors.length > 0 && (
                  <div className="space-y-1.5">
                    {uploadErrors.map((m, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm"
                      >
                        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                        <span className="break-words min-w-0">{m}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closeUpload}
                    disabled={uploading}
                    className="rounded-xl border-border hover:bg-secondary text-foreground cursor-pointer"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={files.length === 0 || uploading}
                    className="rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold cursor-pointer gap-2"
                  >
                    {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
                    {uploading ? 'Uploading…' : 'Upload'}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}

        {/* View modal */}
        {viewing && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={() => setViewing(null)}
          >
            <Card
              className="w-full max-w-2xl p-2 rounded-2xl border-border bg-card shadow-2xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setViewing(null)}
                aria-label="Close"
                className="absolute top-3 right-3 z-10 bg-black/50 rounded-full p-1 text-white hover:bg-black/70 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
              <img src={viewing.publicUrl} alt={viewing.title || 'Menu photo'} className="w-full rounded-xl object-contain max-h-[70vh]" />
              {viewing.title && <p className="p-3 font-semibold text-foreground break-words">{viewing.title}</p>}
            </Card>
          </div>
        )}

        {/* Delete modal */}
        {deleting && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <Card className="w-full max-w-sm p-6 rounded-2xl border-border bg-card shadow-2xl relative text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center text-destructive mb-4">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">Delete menu photo</h3>
              <p className="text-sm text-muted-foreground mb-4 break-words">
                Delete <span className="font-semibold text-foreground">&quot;{deleting.title || deleting.filename}&quot;</span>? This can&apos;t be undone.
              </p>
              {deleteError && (
                <p className="text-xs text-destructive mb-4 break-words">{deleteError}</p>
              )}
              <div className="flex justify-center gap-3">
                <Button
                  onClick={() => setDeleting(null)}
                  disabled={deleteBusy}
                  variant="outline"
                  className="rounded-xl border-border hover:bg-secondary text-foreground px-4 cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDelete}
                  disabled={deleteBusy}
                  className="rounded-xl bg-destructive hover:bg-destructive text-white px-4 cursor-pointer gap-2"
                >
                  {deleteBusy && <Loader2 className="h-4 w-4 animate-spin" />} Delete
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </BusinessLayout>
  );
}
