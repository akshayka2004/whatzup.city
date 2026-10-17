// ============================================================
// Where offers apply and how bills were paid.
// One definition for API validation, analytics and the web pickers.
// ============================================================

export const OFFER_CHANNELS = ['INSTORE', 'TAKEAWAY', 'ONLINE'] as const;
export type OfferChannel = (typeof OFFER_CHANNELS)[number];

export const OFFER_CHANNEL_LABEL: Record<OfferChannel, string> = {
  INSTORE: 'Instore',
  TAKEAWAY: 'Takeaway',
  ONLINE: 'Online',
};

export function isOfferChannel(v: unknown): v is OfferChannel {
  return typeof v === 'string' && (OFFER_CHANNELS as readonly string[]).includes(v);
}

/** An offer valid on every channel carries no restriction (the UI shows no chip). */
export function isAllChannels(channels?: readonly string[] | null): boolean {
  return !channels || channels.length === 0 || OFFER_CHANNELS.every((c) => channels.includes(c));
}

/** Legacy single `fulfilment` value kept in step with channels for old readers. */
export function channelsToFulfilment(
  channels: readonly string[],
): 'DINE_IN' | 'TAKEAWAY' | 'BOTH' {
  if (channels.length === 1 && channels[0] === 'INSTORE') return 'DINE_IN';
  if (channels.length === 1 && channels[0] === 'TAKEAWAY') return 'TAKEAWAY';
  return 'BOTH';
}

export function fulfilmentToChannels(f?: string | null): OfferChannel[] {
  if (f === 'DINE_IN') return ['INSTORE'];
  if (f === 'TAKEAWAY') return ['TAKEAWAY'];
  return [...OFFER_CHANNELS];
}

/** Old filter values (DINE_IN) and new ones (INSTORE) both resolve to a channel. */
export function parseChannelFilter(v?: string | null): OfferChannel | '' {
  const s = (v || '').toUpperCase().replace(/[-\s]/g, '_');
  if (s === 'DINE_IN' || s === 'INSTORE' || s === 'IN_STORE') return 'INSTORE';
  if (s === 'TAKEAWAY') return 'TAKEAWAY';
  if (s === 'ONLINE') return 'ONLINE';
  return '';
}

// ── Bills ─────────────────────────────────────────────────────

export const BILL_ORDER_CHANNELS = ['IN_STORE', 'TAKEAWAY', 'DELIVERY'] as const;
export type BillOrderChannel = (typeof BILL_ORDER_CHANNELS)[number];
export const BILL_ORDER_CHANNEL_LABEL: Record<BillOrderChannel, string> = {
  IN_STORE: 'In-store',
  TAKEAWAY: 'Takeaway',
  DELIVERY: 'Delivery app',
};

export const BILL_PAYMENT_MODES = ['CASH', 'UPI', 'DEBIT_CARD', 'CREDIT_CARD'] as const;
export type BillPaymentMode = (typeof BILL_PAYMENT_MODES)[number];
export const BILL_PAYMENT_MODE_LABEL: Record<BillPaymentMode, string> = {
  CASH: 'Cash',
  UPI: 'UPI',
  DEBIT_CARD: 'Debit card',
  CREDIT_CARD: 'Credit card',
};

/** Delivery apps offered at upload. OTHER lets the customer type any other agent. */
export const DELIVERY_PARTNERS = ['SWIGGY', 'ZOMATO', 'PLENTI', 'OTHER'] as const;
export type DeliveryPartner = (typeof DELIVERY_PARTNERS)[number];
export const DELIVERY_PARTNER_LABEL: Record<DeliveryPartner, string> = {
  SWIGGY: 'Swiggy',
  ZOMATO: 'Zomato',
  PLENTI: 'Plenti',
  OTHER: 'Other',
};

/** Label for a stored partner code + typed name (analytics, admin tables). */
export function deliveryPartnerLabel(code?: string | null, name?: string | null): string {
  if (!code) return '';
  if (code === 'OTHER') return (name || '').trim() || 'Other';
  return DELIVERY_PARTNER_LABEL[code as DeliveryPartner] ?? code;
}
