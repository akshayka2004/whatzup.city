/**
 * Payments are dormant: the code, routes and database rows stay in place, but nothing is sold or
 * charged and every business runs on the single included plan (3 offers, 3 vouchers, analytics).
 * Set PAYMENTS_ENABLED=true (API) and NEXT_PUBLIC_PAYMENTS_ENABLED=true (web, at build time) to bring
 * plans, checkout and billing back.
 */
export const paymentsEnabled = () => process.env.PAYMENTS_ENABLED === 'true';
