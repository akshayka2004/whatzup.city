/** The URL every business QR (printed or scanned in-app) encodes. */
export function businessQrTarget(businessId: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://whtzup.city';
  return `${origin}/business/${businessId}?src=qr`;
}

/** Pulls the business id back out of a decoded QR payload, or null if it isn't one of ours. */
export function extractBusinessIdFromScan(scannedText: string): string | null {
  try {
    const url = new URL(
      scannedText,
      typeof window !== 'undefined' ? window.location.origin : 'https://whtzup.city',
    );
    const match = url.pathname.match(/\/business\/([^/?#]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}
