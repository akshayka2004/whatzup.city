import {
  OFFER_CHANNELS,
  OFFER_CHANNEL_LABEL,
  fulfilmentToChannels,
  isAllChannels,
  type OfferChannel,
} from '@saas/types';

/** Channels of an offer payload; older payloads that only carry `fulfilment` are translated. */
export function channelsOf(
  o: { channels?: unknown; fulfilment?: unknown } | null | undefined,
): OfferChannel[] {
  if (Array.isArray(o?.channels)) {
    const list = OFFER_CHANNELS.filter((c) => (o!.channels as string[]).includes(c));
    if (list.length) return list;
  }
  return fulfilmentToChannels(typeof o?.fulfilment === 'string' ? o.fulfilment : undefined);
}

/** "Instore · Online", or null when the offer is valid everywhere (no chip needed). */
export function channelChipLabel(channels?: readonly string[] | null): string | null {
  if (!channels || isAllChannels(channels)) return null;
  return OFFER_CHANNELS.filter((c) => channels.includes(c))
    .map((c) => OFFER_CHANNEL_LABEL[c])
    .join(' · ');
}
