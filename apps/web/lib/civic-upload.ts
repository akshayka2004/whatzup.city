// ============================================================
// Civic image upload — direct REST upload to Supabase Storage.
// No SDK dependency: uses the public Storage REST endpoint with the
// publishable (anon) key. Buckets must be public for the returned
// URL to render. Falls back gracefully (throws) so the UI can offer
// manual URL entry.
// ============================================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const BUCKET = process.env.NEXT_PUBLIC_SUPABASE_BUCKET || 'civic';

export function isUploadConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_KEY);
}

function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, '_').slice(-80);
}

/**
 * Upload an image file to Supabase Storage and return its public URL.
 * @param file  The image file
 * @param folder  Logical sub-folder (e.g. "logos", "banners")
 */
export async function uploadCivicImage(file: File, folder: string): Promise<string> {
  if (!isUploadConfigured()) {
    throw new Error('Image upload not configured.');
  }
  if (!file.type.startsWith('image/')) {
    throw new Error('Only image files are allowed.');
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Image must be under 5 MB.');
  }

  const path = `${folder}/${Date.now()}-${safeName(file.name)}`;
  const res = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SUPABASE_KEY}`,
        apikey: SUPABASE_KEY as string,
        'x-upsert': 'true',
        'Content-Type': file.type,
      },
      body: file,
    },
  );

  if (!res.ok) {
    let msg = `Upload failed (HTTP ${res.status})`;
    try {
      const body = await res.json();
      msg = body.message || body.error || msg;
    } catch {}
    throw new Error(msg);
  }

  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
}
