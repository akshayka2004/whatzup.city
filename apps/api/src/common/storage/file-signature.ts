/**
 * File type verification by magic bytes.
 *
 * The client-supplied MIME type and the filename extension are both trivially
 * forged, so anything that reaches storage is checked against the actual bytes.
 * This is what stops "invoice.png" from really being a script or an HTML file
 * that would execute if it were ever served from our origin.
 */

export type SniffResult = { mime: string | null; ext: string | null };

/** Longest signature we inspect; callers only need to read this many bytes. */
export const SIGNATURE_BYTES = 16;

function startsWith(buf: Buffer, sig: number[], offset = 0): boolean {
  if (buf.length < offset + sig.length) return false;
  return sig.every((b, i) => buf[offset + i] === b);
}

/** Identify a file from its leading bytes. Returns nulls when unrecognised. */
export function sniffFileType(buf: Buffer): SniffResult {
  // JPEG — FF D8 FF
  if (startsWith(buf, [0xff, 0xd8, 0xff])) return { mime: 'image/jpeg', ext: 'jpg' };

  // PNG — 89 50 4E 47 0D 0A 1A 0A
  if (startsWith(buf, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { mime: 'image/png', ext: 'png' };
  }

  // GIF — "GIF87a" / "GIF89a"
  if (startsWith(buf, [0x47, 0x49, 0x46, 0x38])) return { mime: 'image/gif', ext: 'gif' };

  // WEBP — "RIFF"...."WEBP"
  if (startsWith(buf, [0x52, 0x49, 0x46, 0x46]) && startsWith(buf, [0x57, 0x45, 0x42, 0x50], 8)) {
    return { mime: 'image/webp', ext: 'webp' };
  }

  // PDF — "%PDF-"
  if (startsWith(buf, [0x25, 0x50, 0x44, 0x46, 0x2d])) return { mime: 'application/pdf', ext: 'pdf' };

  return { mime: null, ext: null };
}

/**
 * SVG is an image by MIME but a script host in practice — it can carry
 * <script> and event handlers, so it is never accepted where an image is
 * expected. Detected textually since it has no binary magic number.
 */
export function looksLikeSvgOrHtml(buf: Buffer): boolean {
  const head = buf.subarray(0, 512).toString('utf8').trim().toLowerCase();
  return (
    head.startsWith('<?xml') ||
    head.startsWith('<svg') ||
    head.includes('<svg') ||
    head.startsWith('<!doctype html') ||
    head.startsWith('<html') ||
    head.includes('<script')
  );
}

/**
 * Strip anything that could escape the intended storage prefix or confuse a
 * downstream consumer: path separators, traversal, control characters, and
 * leading dots. Also caps the length.
 */
export function sanitizeFilename(name: string): string {
  const base = (name || 'file')
    .replace(/[\\/]/g, '_')        // path separators
    .replace(/\.{2,}/g, '.')        // traversal sequences
    // eslint-disable-next-line no-control-regex
    .replace(new RegExp('[\\u0000-\\u001f\\u007f]', 'g'), '') // control chars, incl. null byte
    .replace(/[^A-Za-z0-9._-]/g, '_')      // anything else non-portable
    .replace(/^\.+/, '')                    // leading dots (hidden files)
    .slice(0, 120);
  return base || 'file';
}
