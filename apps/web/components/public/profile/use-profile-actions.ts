'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FAVORITES_KEY,
  directionsUrl,
  getFavIds,
  phoneOf,
  telHref,
  trackBizEvent,
  whatsappUrl,
} from './profile-utils';

/**
 * Everything the hero buttons and the mobile action bar share: save/unsave
 * (same localStorage list + `favoritesUpdated` event the favourites page reads),
 * share with a clipboard fallback, and the call / directions / WhatsApp links.
 */
export function useProfileActions(businessId: string, biz: any) {
  const [isSaved, setIsSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!businessId) return;
    setIsSaved(getFavIds().includes(businessId));
    const handler = () => setIsSaved(getFavIds().includes(businessId));
    window.addEventListener('favoritesUpdated', handler);
    return () => window.removeEventListener('favoritesUpdated', handler);
  }, [businessId]);

  useEffect(
    () => () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
    },
    [],
  );

  const toggleSave = useCallback(() => {
    if (!biz) return;
    try {
      const existing: any[] = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
      const idx = existing.findIndex((b: any) => b.id === businessId);
      let updated: any[];
      if (idx >= 0) {
        updated = existing.filter((b: any) => b.id !== businessId);
      } else {
        updated = [
          {
            id: businessId,
            name: biz.name,
            category: biz.category?.name || '',
            rating: String(biz.averageRating || 0),
            reviews: biz._count?.reviews || 0,
            savedAt: new Date().toLocaleDateString(),
            isVerified: biz.isVerified,
          },
          ...existing,
        ];
      }
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
      setIsSaved(!isSaved);
      window.dispatchEvent(new Event('favoritesUpdated'));
    } catch (_) {}
  }, [biz, businessId, isSaved]);

  const share = useCallback(async () => {
    if (!biz) return;
    // Share the clean link — never the ?src=qr one, which would gate the offers for the recipient.
    const url = `${window.location.origin}${window.location.pathname}`;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: biz.name, url });
      } catch {
        /* dismissed by the user */
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopied(false), 2200);
    } catch {
      /* clipboard blocked — nothing sensible to fall back to */
    }
  }, [biz]);

  const phone = phoneOf(biz);
  const callHref = phone ? telHref(phone) : null;
  const directionsHref = directionsUrl(biz);
  const whatsappHref = whatsappUrl(biz);

  return {
    isSaved,
    copied,
    toggleSave,
    share,
    phone,
    callHref,
    directionsHref,
    whatsappHref,
    onCall: () => trackBizEvent(biz, 'PHONE_CLICK'),
    onDirections: () => trackBizEvent(biz, 'DIRECTIONS_CLICK'),
    onWhatsapp: () => trackBizEvent(biz, 'WHATSAPP_CLICK'),
  };
}

export type ProfileActions = ReturnType<typeof useProfileActions>;
