import { apiService } from '@/lib/services/api-service';
import { prepareImage } from '@/lib/image-compress';

export interface UploadedImage {
  fileKey: string;
  bucket: string;
  /** Link that works for public buckets. Private files (payment proofs) are read by signed link on the server. */
  publicUrl: string;
}

/**
 * Shrinks a picture if it is heavy, then sends it straight to storage with a signed link. Throws an
 * Error with a message that can be shown to the person as is.
 */
export async function uploadImage(
  file: File,
  category: 'event' | 'payment',
  entityId: string,
  opts?: { maxSide?: number; quality?: number },
): Promise<UploadedImage> {
  const prepared = await prepareImage(file, opts);
  const signed = await apiService.post<{ uploadUrl: string; fileKey: string; bucket: string }>(
    '/v1/storage/upload-url',
    { category, filename: prepared.name, mimeType: prepared.type, entityId },
  );
  if (signed.error || !signed.data?.uploadUrl) {
    throw new Error(signed.error || 'Could not start the upload. Try again.');
  }
  const { uploadUrl, fileKey, bucket } = signed.data;
  const put = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': prepared.type },
    body: prepared,
  });
  if (!put.ok) {
    throw new Error(
      put.status === 413
        ? 'The picture is too large for storage. Choose a smaller one.'
        : `The upload failed (${put.status}). Try again.`,
    );
  }
  return {
    fileKey,
    bucket,
    publicUrl: `${new URL(uploadUrl).origin}/storage/v1/object/public/${bucket}/${fileKey}`,
  };
}
