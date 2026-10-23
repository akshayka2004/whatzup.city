// Movies are dormant (code kept, UI hidden). Set NEXT_PUBLIC_MOVIES_ENABLED=true
// at build time — and MOVIES_ENABLED=true on the API — to bring them back.
export const MOVIES_ENABLED = process.env.NEXT_PUBLIC_MOVIES_ENABLED === 'true';

// Payments are dormant (code kept, UI hidden): one included plan, nothing to buy. Set
// NEXT_PUBLIC_PAYMENTS_ENABLED=true at build time — and PAYMENTS_ENABLED=true on the API — to bring
// plans, checkout and billing back.
export const PAYMENTS_ENABLED = process.env.NEXT_PUBLIC_PAYMENTS_ENABLED === 'true';

// Sign in with a mobile number and an SMS code. Off until an SMS provider is configured: set
// NEXT_PUBLIC_OTP_LOGIN_ENABLED=true at build time and OTP_LOGIN_ENABLED=true on the API.
export const OTP_LOGIN_ENABLED = process.env.NEXT_PUBLIC_OTP_LOGIN_ENABLED === 'true';
