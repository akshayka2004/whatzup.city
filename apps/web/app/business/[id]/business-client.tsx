'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SearchX } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { PublicLayout } from '@/components/layouts/public-layout';
import { EmptyState } from '@/components/common/empty-state';
import { useCachedGet } from '@/lib/use-cached-get';
import { useOtherOutlets } from '@/components/business/brand-public-section';
import { ProfileHero } from '@/components/public/profile/profile-hero';
import {
  ProfileTabs,
  scrollToSection,
  type ProfileTab,
} from '@/components/public/profile/profile-tabs';
import { MobileActionBar } from '@/components/public/profile/profile-actions';
import { AboutSection, hasAboutContent } from '@/components/public/profile/about-section';
import { InfoCard } from '@/components/public/profile/info-card';
import { OffersSection } from '@/components/public/profile/offers-section';
import { MenuSection } from '@/components/public/profile/menu-section';
import { ReviewsSection } from '@/components/public/profile/reviews-section';
import { OutletsSection, hasBranchList } from '@/components/public/profile/outlets-section';
import { RelatedStrip } from '@/components/public/profile/related-strip';
import { ProfileSkeleton } from '@/components/public/profile/profile-skeletons';
import { useProfileActions } from '@/components/public/profile/use-profile-actions';
import { asList, toNum, trackBizEvent } from '@/components/public/profile/profile-utils';
import { inferSource } from '@/lib/analytics/track';

export interface BusinessClientProps {
  /** The route param — a UUID or a slug; the API accepts both. */
  businessId: string;
  /** Server-rendered copy of /v1/businesses/:id (null when the server fetch failed). */
  initialBusiness?: any | null;
}

export default function BusinessClient({
  businessId,
  initialBusiness = null,
}: BusinessClientProps) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [mounted, setMounted] = useState(false);
  // QR-scan deep link (?src=qr): gates the offers behind sign-in, then scrolls to them.
  // Read after mount (not via useSearchParams) so the page can stay statically cached + server-rendered.
  const [fromQr, setFromQr] = useState<boolean | null>(null);
  useEffect(() => {
    setFromQr(new URLSearchParams(window.location.search).get('src') === 'qr');
    setMounted(true);
  }, [businessId]);

  // ── Data. The business is seeded from the server render, then refreshed in the background.
  // (Skipped during SSR: the hook's cache is module-level and would be shared between requests.)
  const bizKey = typeof window === 'undefined' ? null : `/v1/businesses/${businessId}`;
  const bizQ = useCachedGet<any>(bizKey, { ttlMs: 0, initialData: initialBusiness });
  const offersQ = useCachedGet<any>(businessId ? `/v1/offers/business/${businessId}` : null, {
    ttlMs: 30_000,
  });
  const reviewsQ = useCachedGet<any>(businessId ? `/v1/reviews/business/${businessId}` : null, {
    ttlMs: 30_000,
  });
  const menuQ = useCachedGet<any>(businessId ? `/v1/media/menu/business/${businessId}` : null, {
    ttlMs: 60_000,
  });

  const biz = bizQ.data;
  const offers = useMemo(
    () =>
      asList(offersQ.data)
        .filter((o: any) => o.isActive !== false)
        .slice(0, 5),
    [offersQ.data],
  );
  const reviews = useMemo(() => asList(reviewsQ.data), [reviewsQ.data]);
  const menuPhotos = useMemo<any[]>(
    () => (Array.isArray(menuQ.data) ? menuQ.data : []),
    [menuQ.data],
  );

  const { outlets: otherOutlets } = useOtherOutlets(biz?.brandId, biz?.id || businessId);
  const actions = useProfileActions(businessId, biz);

  // Impression tracking — fire-and-forget, never blocks render.
  const tracked = useRef<string | null>(null);
  useEffect(() => {
    if (!biz?.id || fromQr === null || tracked.current === businessId) return;
    tracked.current = businessId;
    trackBizEvent(biz, 'BUSINESS_VIEW', { source: fromQr ? 'qr' : inferSource() });
    if (fromQr) trackBizEvent(biz, 'QR_SCAN');
  }, [biz, fromQr, businessId]);

  // QR scans land signed-in users straight on the offers section.
  const qrScrolled = useRef(false);
  useEffect(() => {
    if (qrScrolled.current || !fromQr || !user || !biz || offersQ.loading) return;
    qrScrolled.current = true;
    document
      .getElementById('offers-section')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [fromQr, user, biz, offersQ.loading]);

  const onReviewPosted = useCallback(
    () => Promise.all([bizQ.refresh(), reviewsQ.refresh()]),
    [bizQ.refresh, reviewsQ.refresh], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const productCount = Number(biz?._count?.products) || 0;
  const hasMenu = menuPhotos.length > 0 || productCount > 0;
  const hasOutlets = hasBranchList(biz) || otherOutlets.length > 0;
  const hasAbout = !!biz && hasAboutContent(biz);

  const tabs = useMemo<ProfileTab[]>(
    () => [
      hasAbout ? { id: 'about', label: 'About' } : { id: 'details', label: 'Info' },
      { id: 'offers-section', label: 'Offers' },
      ...(hasMenu ? [{ id: 'menu', label: menuPhotos.length > 0 ? 'Menu' : 'Products' }] : []),
      { id: 'reviews', label: 'Reviews' },
      ...(hasOutlets ? [{ id: 'outlets', label: 'Outlets' }] : []),
    ],
    [hasAbout, hasMenu, hasOutlets, menuPhotos.length],
  );

  // ── Loading / not found
  if (!biz) {
    const notFound = mounted && !bizQ.loading;
    return (
      <PublicLayout>
        {notFound ? (
          <div className="flex min-h-[50vh] items-center justify-center">
            <EmptyState
              icon={SearchX}
              title="Business not found"
              description="This listing may have been removed or the ID is invalid."
              action={{ label: 'Browse businesses', href: '/search' }}
              secondary={{ label: 'Go back', onClick: () => router.back() }}
              className="w-full max-w-md"
            />
          </div>
        ) : (
          <ProfileSkeleton />
        )}
      </PublicLayout>
    );
  }

  const avgRating = toNum(biz.averageRating ?? biz.rating);
  const reviewCount = biz._count?.reviews ?? reviews.length ?? 0;

  return (
    <PublicLayout>
      <div className="ui-scroll-progress" aria-hidden />

      {/* Extra bottom room on phones so the sticky action bar never covers the last section. */}
      <div className="pb-14 md:pb-0">
        <ProfileHero
          biz={biz}
          menuPhotos={menuPhotos}
          actions={actions}
          avgRating={avgRating}
          reviewCount={reviewCount}
          onBack={() => router.back()}
          onJump={scrollToSection}
        />

        <ProfileTabs tabs={tabs} />

        <div className="grid lg:grid-cols-[minmax(0,1fr)_21rem] lg:gap-x-8">
          <AboutSection biz={biz} />

          <aside
            id="details"
            aria-label="Contact and opening hours"
            className="mb-6 scroll-mt-16 lg:sticky lg:top-16 lg:col-start-2 lg:row-span-6 lg:row-start-1 lg:self-start"
          >
            <InfoCard biz={biz} />
          </aside>

          <OffersSection
            biz={biz}
            businessId={businessId}
            offers={offers}
            loading={offersQ.loading}
            user={user}
            authLoading={authLoading}
            fromQr={fromQr}
          />

          {hasMenu && (
            <MenuSection
              biz={biz}
              businessId={businessId}
              menuPhotos={menuPhotos}
              productCount={productCount}
            />
          )}

          <ReviewsSection
            biz={biz}
            businessId={businessId}
            reviews={reviews}
            loading={reviewsQ.loading}
            avgRating={avgRating}
            reviewCount={reviewCount}
            user={user}
            authLoading={authLoading}
            onReviewPosted={onReviewPosted}
          />

          {hasOutlets && <OutletsSection biz={biz} businessId={businessId} />}
        </div>

        <RelatedStrip
          categoryId={biz.categoryId || biz.category?.id}
          categoryName={biz.category?.name}
          currentIds={[biz.id, businessId, biz.slug]}
        />
      </div>

      <MobileActionBar actions={actions} />
    </PublicLayout>
  );
}

export { BusinessClient };
