/** Largest picture storage accepts is 5 MB; stay under it with room for the upload envelope. */
const MAX_BYTES = 4.5 * 1024 * 1024;
const ALLOWED = /^image\/(jpeg|png|webp)$/;

/**
 * Makes a picture small enough to upload. A phone photo is often 6-12 MB; this redraws it at a
 * sensible size as a JPEG so heavy pictures just work instead of failing at the storage limit.
 * Pictures already small enough are sent untouched.
 */
export async function prepareImage(
  file: File,
  opts: { maxSide?: number; quality?: number } = {},
): Promise<File> {
  if (!ALLOWED.test(file.type)) throw new Error('Use a JPG, PNG or WebP picture.');
  const maxSide = opts.maxSide ?? 1600;

  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) {
    if (file.size > MAX_BYTES) throw new Error('This picture is too large. Choose a smaller one.');
    return file;
  }
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size <= MAX_BYTES) {
    bitmap.close?.();
    return file;
  }

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close?.();
    if (file.size > MAX_BYTES) throw new Error('This picture is too large. Choose a smaller one.');
    return file;
  }
  // Transparent areas of a PNG would turn black as a JPEG; paint white first.
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();

  const name = file.name.replace(/\.[^.]+$/, '') + '.jpg';
  for (const q of [opts.quality ?? 0.88, 0.75, 0.6]) {
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', q));
    if (blob && blob.size <= MAX_BYTES) return new File([blob], name, { type: 'image/jpeg' });
  }
  throw new Error('This picture is too large even after shrinking. Choose a smaller one.');
}
