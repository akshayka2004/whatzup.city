// ============================================================
// Civic image upload. The API checks the type and issues a signed upload URL
// for the public business-media bucket; the browser PUTs the file there.
// No storage key ships in the page, so nobody can write to storage directly.
// ============================================================

import { apiService } from './services/api-service';
import { storageUploadError } from './upload-error';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

export function isUploadConfigured(): boolean {
  return Boolean(SUPABASE_URL);
}

/**
 * Upload an image file and return its public URL.
 * @param file  The image file
 * @param folder  Logical use ("logos" or "banners")
 */
export async function uploadCivicImage(file: File, folder: string): Promise<string> {
  if (!isUploadConfigured()) {
    throw new Error('Image upload not configured.');
  }
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('Use a JPG, PNG or WebP image.');
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Image must be under 5 MB.');
  }

  const presign = await apiService.post<{ uploadUrl: string; fileKey: string; bucket: string }>(
    '/v1/storage/upload-url',
    {
      filename: file.name,
      mimeType: file.type,
      category: /banner/i.test(folder) ? 'banner' : 'logo',
    },
  );
  if (presign.error || !presign.data?.uploadUrl) {
    throw new Error(presign.error || 'Could not start the upload. Please try again.');
  }

  const res = await fetch(presign.data.uploadUrl, {
    method: 'PUT',
    headers: { 'content-type': file.type, 'cache-control': 'max-age=3600' },
    body: file,
  });
  if (!res.ok) {
    throw new Error(await storageUploadError(res));
  }

  return `${SUPABASE_URL}/storage/v1/object/public/${presign.data.bucket}/${presign.data.fileKey}`;
}
