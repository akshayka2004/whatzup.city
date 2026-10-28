/**
 * Public site origin. Printed QR codes, canonical URLs, the sitemap and share cards all use this,
 * never the address the visitor or owner happens to have open (that can be an IP, a preview
 * link or the launch-page domain). Set NEXT_PUBLIC_SITE_URL at build time to change it.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://platform.whtzup.city'
).replace(/\/$/, '');
