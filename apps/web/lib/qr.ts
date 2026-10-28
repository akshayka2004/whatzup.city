import { SITE_URL } from '@/lib/site-url';
import { apiService } from '@/lib/services/api-service';

/**
 * What every business QR encodes: a short permanent link on the fixed public address
 * (https://platform.whtzup.city/b/K7M3Q9). The server redirects it to the business's public page,
 * so a printed QR keeps working even if page addresses change later.
 */
export function businessQrUrl(publicCode: string): string {
  return `${SITE_URL}/b/${publicCode}`;
}

const ORIGIN_FALLBACK = 'https://platform.whtzup.city';

function pathOf(scannedText: string): string | null {
  try {
    const origin = typeof window !== 'undefined' ? window.location.origin : ORIGIN_FALLBACK;
    return new URL(scannedText, origin).pathname;
  } catch {
    return null;
  }
}

/** Business id from an older QR (/business/<id>), or null. */
export function extractBusinessIdFromScan(scannedText: string): string | null {
  const match = pathOf(scannedText)?.match(/\/business\/([^/?#]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/** Short code from a current QR (/b/CODE), or null. */
export function extractBusinessCodeFromScan(scannedText: string): string | null {
  const match = pathOf(scannedText)?.match(/^\/b\/([A-Za-z0-9]{4,12})\/?$/);
  return match ? match[1].toUpperCase() : null;
}

/** Business id behind a scanned QR, old or new form. Null when it is not one of ours or is not listed. */
export async function resolveBusinessFromScan(scannedText: string): Promise<string | null> {
  const id = extractBusinessIdFromScan(scannedText);
  if (id) return id;
  const code = extractBusinessCodeFromScan(scannedText);
  if (!code) return null;
  const res = await apiService.get<any>(`/v1/businesses/by-code/${code}`);
  const body = res.data;
  return !res.error && (body?.id ?? body?.data?.id) ? (body.id ?? body.data.id) : null;
}
