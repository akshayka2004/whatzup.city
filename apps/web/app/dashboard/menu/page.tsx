'use client';

import { ResponsiveImage } from '@/components/common/responsive-image';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  GripVertical,
  Image as ImageIcon,
  Maximize2,
  Trash2,
  Upload,
  UtensilsCrossed,
} from 'lucide-react';
import { BusinessLayout } from '@/components/layouts/business-layout';
import { PageHeader } from '@/components/system/page-header';
import { Modal } from '@/components/system/modal';
import { EmptyState } from '@/components/common/empty-state';
import { useConfirm } from '@/components/common/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';
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
  filename
    .replace(/\.[^/.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .trim()
    .slice(0, 80);

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
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);
  const confirm = useConfirm();

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
        problems.push(
          `${f.name}: only JPG, PNG or WebP images are accepted (this file is ${f.type || 'an unknown type'}).`,
        );
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
          file = await optimizeImage(original, {
            maxWidth: 2000,
            maxHeight: 2000,
            quality: 0.85,
            outputType: 'jpeg',
          });
        } catch {
          file = original;
        }
        if (file.size > MAX_BYTES) {
          throw new Error(
            `is too large (${(file.size / 1024 / 1024).toFixed(1)} MB, the limit is 5 MB). Try a smaller photo.`,
          );
        }

        const photoLabel =
          files.length === 1 && label.trim() ? label.trim() : prettyName(original.name);

        const urlRes = await apiService.post<{ uploadUrl: string; fileKey: string }>(
          '/v1/media/menu/upload-url',
          {
            businessId,
            filename: file.name,
            mimeType: file.type,
            size: file.size,
            label: photoLabel || undefined,
          },
        );
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
          throw new Error('could not be uploaded. Check your internet connection and try again.');
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
        if (createRes.error)
          throw new Error(`was uploaded but could not be saved. ${createRes.error}`);
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

  const remove = async (p: MenuPhoto) => {
    const ok = await confirm({
      title: `Delete “${p.title || p.filename}”?`,
      description: 'It disappears from your public menu right away.',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) return;
    const res = await apiService.delete(`/v1/media/${p.id}`);
    if (res.error) return toast.error(`Couldn't delete this photo. ${res.error}`);
    setPhotos((list) => list.filter((x) => x.id !== p.id));
    toast.success('Photo deleted');
  };

  /** Optimistic reorder; reverts if the server rejects it. */
  const saveOrder = async (next: MenuPhoto[]) => {
    if (!businessId) return;
    const prev = photos;
    setPhotos(next);
    setSavingOrder(true);
    const res = await apiService.put(`/v1/media/menu/business/${businessId}/order`, {
      ids: next.map((p) => p.id),
    });
    setSavingOrder(false);
    if (res.error) {
      setPhotos(prev);
      toast.error(res.error);
    }
  };

  const move = (from: number, to: number) => {
    if (to < 0 || to >= photos.length || from === to) return;
    const next = [...photos];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    saveOrder(next);
  };

  const onDrop = (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    move(
      photos.findIndex((p) => p.id === dragId),
      photos.findIndex((p) => p.id === targetId),
    );
  };

  return (
    <BusinessLayout>
      <PageHeader
        title="Menu photos"
        description="Photos of your menu and signature dishes, shown on your public profile in this order."
        actions={
          isFood ? (
            <Button onClick={() => setUploadOpen(true)} disabled={photos.length >= MAX_PHOTOS}>
              <Upload /> Add photos
            </Button>
          ) : undefined
        }
      />

      {bizLoading || (isFood && loading) ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="ui-skeleton aspect-[4/5] rounded-card" />
          ))}
        </div>
      ) : !business ? (
        <EmptyState
          icon={AlertTriangle}
          title="We couldn’t load your business"
          description="Refresh the page. If this keeps happening, contact support."
        />
      ) : !isFood ? (
        <EmptyState
          icon={UtensilsCrossed}
          title="Menu photos are for food businesses"
          description={`Your business is listed under ${business.category?.name || 'a non-food category'}, so this section isn’t available.`}
        />
      ) : (
        <>
          {listError && (
            <p
              className="mb-4 flex items-start gap-2 rounded-control bg-danger-soft p-3 text-sm text-danger-soft-foreground"
              role="alert"
            >
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
              {listError}
            </p>
          )}
          {photos.length === 0 && !listError ? (
            <EmptyState
              icon={ImageIcon}
              title="No menu photos yet"
              description="Add clear photos of each menu page or your signature dishes so customers know what to expect."
              action={{ label: 'Add photos', onClick: () => setUploadOpen(true) }}
            />
          ) : (
            <>
              <p className="mb-3 text-caption text-muted-foreground" aria-live="polite">
                {photos.length} of {MAX_PHOTOS} photos ·{' '}
                {savingOrder ? 'Saving order…' : 'Drag to reorder, or use the arrows.'}
              </p>
              <ul
                className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4"
                aria-label="Menu photos, in display order"
              >
                {photos.map((p, i) => (
                  <li
                    key={p.id}
                    draggable
                    onDragStart={(e) => {
                      setDragId(p.id);
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (overId !== p.id) setOverId(p.id);
                    }}
                    onDragLeave={() => setOverId((o) => (o === p.id ? null : o))}
                    onDrop={(e) => {
                      e.preventDefault();
                      onDrop(p.id);
                      setDragId(null);
                      setOverId(null);
                    }}
                    onDragEnd={() => {
                      setDragId(null);
                      setOverId(null);
                    }}
                    className={cn(
                      'group overflow-hidden rounded-card border bg-card shadow-e1 transition-[box-shadow,opacity,border-color]',
                      dragId === p.id && 'opacity-40',
                      overId === p.id && dragId !== p.id
                        ? 'border-primary ring-2 ring-primary/30'
                        : 'border-border',
                    )}
                  >
                    <div className="relative aspect-[4/5] cursor-grab bg-surface-sunken active:cursor-grabbing">
                      <ResponsiveImage
                        src={p.publicUrl}
                        alt={p.title || 'Menu photo'}
                        ratio="4 / 5"
                        sizes="(max-width: 768px) 50vw, 25vw"
                        className="size-full"
                      />
                      <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-card/90 px-2 py-0.5 text-caption font-semibold shadow-e1">
                        <GripVertical className="size-3.5" aria-hidden /> {i + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => setViewing(p)}
                        aria-label={`View ${p.title || 'photo'} full size`}
                        className="absolute right-2 top-2 flex size-9 items-center justify-center rounded-full bg-card/90 shadow-e1"
                      >
                        <Maximize2 className="size-4" />
                      </button>
                    </div>
                    <div className="flex items-center gap-1 p-2">
                      <p className="min-w-0 flex-1 truncate px-1 text-sm font-medium">
                        {p.title || p.filename}
                      </p>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label="Move earlier"
                        disabled={i === 0 || savingOrder}
                        onClick={() => move(i, i - 1)}
                      >
                        <ArrowLeft />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label="Move later"
                        disabled={i === photos.length - 1 || savingOrder}
                        onClick={() => move(i, i + 1)}
                      >
                        <ArrowRight />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label="Delete photo"
                        className="text-destructive"
                        onClick={() => remove(p)}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}

      <Modal
        open={uploadOpen}
        onOpenChange={(o) => !o && closeUpload()}
        title="Add menu photos"
        description="JPG, PNG or WebP, up to 5 MB each. Large phone photos are resized for you."
        footer={
          <>
            <Button variant="outline" onClick={closeUpload} disabled={uploading}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="menu-upload"
              disabled={files.length === 0}
              loading={uploading}
            >
              {uploading ? 'Uploading…' : 'Upload'}
            </Button>
          </>
        }
      >
        <form id="menu-upload" onSubmit={handleUpload} className="space-y-4">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full flex-col items-center justify-center gap-1 rounded-card border-2 border-dashed border-border p-6 text-center transition-colors hover:border-primary/50"
          >
            {files.length > 0 ? (
              <span className="flex items-center gap-2 text-sm font-medium text-success">
                <CheckCircle2 className="size-5" aria-hidden /> {files.length} photo
                {files.length === 1 ? '' : 's'} selected
              </span>
            ) : (
              <>
                <Upload className="size-7 text-muted-foreground" aria-hidden />
                <span className="text-sm text-muted-foreground">Tap to choose photos</span>
              </>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFiles}
            aria-label="Choose menu photos"
          />

          {files.length === 1 && (
            <div>
              <label htmlFor="menu-label" className="mb-1.5 block text-sm font-medium">
                Label{' '}
                <span className="font-normal text-muted-foreground">
                  (optional, e.g. “Lunch menu”)
                </span>
              </label>
              <Input
                id="menu-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                maxLength={80}
                placeholder={prettyName(files[0].name) || 'Photo label'}
              />
            </div>
          )}

          {progress && (
            <p className="break-words text-caption text-muted-foreground" aria-live="polite">
              {progress}
            </p>
          )}

          {uploadErrors.length > 0 && (
            <ul className="space-y-1.5" role="alert">
              {uploadErrors.map((m, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 rounded-control bg-danger-soft p-3 text-sm text-danger-soft-foreground"
                >
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
                  <span className="min-w-0 break-words">{m}</span>
                </li>
              ))}
            </ul>
          )}
        </form>
      </Modal>

      <Modal
        open={!!viewing}
        onOpenChange={(o) => !o && setViewing(null)}
        title={viewing?.title || 'Menu photo'}
        size="xl"
      >
        {viewing && (
          // eslint-disable-next-line @next/next/no-img-element -- signed storage URL
          <img
            src={viewing.publicUrl}
            alt={viewing.title || 'Menu photo'}
            className="max-h-[70dvh] w-full rounded-control object-contain"
          />
        )}
      </Modal>
    </BusinessLayout>
  );
}
