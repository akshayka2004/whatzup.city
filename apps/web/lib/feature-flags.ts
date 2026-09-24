// Movies are dormant (code kept, UI hidden). Set NEXT_PUBLIC_MOVIES_ENABLED=true
// at build time — and MOVIES_ENABLED=true on the API — to bring them back.
export const MOVIES_ENABLED = process.env.NEXT_PUBLIC_MOVIES_ENABLED === 'true';
