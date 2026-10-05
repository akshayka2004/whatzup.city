/**
 * Invoice numbers are typed by customers and read by OCR, so "sc/2026/001 ", "SC/2026/001" and
 * "SC / 2026 / 001" must all count as the same number. Whitespace is dropped and case folded;
 * punctuation (`-`, `/`) is kept because it is part of how businesses write their series.
 */
export function normalizeBillNumber(input?: string | null): string | null {
  if (typeof input !== 'string') return null;
  const cleaned = input.replace(/\s+/g, '').toUpperCase();
  return cleaned.length > 0 ? cleaned : null;
}

/** True when the (normalised) bill number starts with the (normalised) series prefix. */
export function billNumberMatchesSeries(prefix?: string | null, billNumber?: string | null): boolean {
  const p = normalizeBillNumber(prefix);
  const n = normalizeBillNumber(billNumber);
  if (!p || !n) return false;
  return n.startsWith(p);
}
