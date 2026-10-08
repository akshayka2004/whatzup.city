'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Globe, Tag } from 'lucide-react';
import { PublicLayout } from '@/components/layouts/public-layout';
import { setViewerCity, getViewerCity } from '@/lib/constants';
import { HomeHero, MobileNotice } from '@/components/public/home/hero';
import { TrustStats, type HomeStat } from '@/components/public/home/trust-stats';
import { CategoryRow } from '@/components/public/home/category-row';
import {
  NowShowing, TrendingBusinesses, TrendingOffers, UpcomingEvents,
} from '@/components/public/home/strips';
import { SpinPromo } from '@/components/public/home/spin-promo';
import { HomeCta } from '@/components/public/home/home-cta';
import { listOf, sumListings, type HomeCategory } from '@/components/public/home/home-data';
import { useFeed } from '@/components/public/home/use-feed';

// Base (city-less) paths — exactly what page.tsx prefetches on the server.
const CATEGORIES = '/v1/categories';
const OFFERS = '/v1/trending/offers?limit=8';
const BUSINESSES = '/v1/trending/businesses?limit=8';
const EVENTS = '/v1/events?limit=6';
const MOVIES = '/v1/movies?status=NOW_SHOWING&limit=6';
const NOTICE = '/v1/announcements?limit=1';

export type HomeClientProps = {
  /** Raw API bodies fetched on the server. null/undefined = fetch in the browser as before. */
  initialCategories?: unknown;
  initialOffers?: unknown;
  initialBusinesses?: unknown;
  initialEvents?: unknown;
  initialMovies?: unknown;
  initialAnnouncement?: unknown;
};

export function HomeClient({
  initialCategories,
  initialOffers,
  initialBusinesses,
  initialEvents,
  initialMovies,
  initialAnnouncement,
}: HomeClientProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [city, setCity] = useState('');

  useEffect(() => {
    setCity(getViewerCity());
  }, []);

  const handleCityChange = (v: string) => {
    const next = v === 'all' ? '' : v;
    setCity(next);
    setViewerCity(next);
  };

  const handleSearch = () => {
    router.push(searchQuery.trim() ? `/search?q=${encodeURIComponent(searchQuery)}` : '/search');
  };

  // City-aware feeds re-request with the viewer's city; the rest are global.
  // Empty targetCities = shown everywhere, so the city-less server data is a valid first paint.
  const cityQ = city ? `&city=${encodeURIComponent(city)}` : '';

  const cats = useFeed(CATEGORIES, CATEGORIES, initialCategories);
  const offers = useFeed(OFFERS, OFFERS, initialOffers);
  const businesses = useFeed(BUSINESSES, BUSINESSES, initialBusinesses);
  const events = useFeed(`${EVENTS}${cityQ}`, EVENTS, initialEvents);
  const movies = useFeed(`${MOVIES}${cityQ}`, MOVIES, initialMovies);
  // Latest civic announcement — refetched when the viewer's city changes so the
  // hero notice reflects their location (empty targetCities = shown everywhere).
  const notice = useFeed(`${NOTICE}${cityQ}`, NOTICE, initialAnnouncement);

  const categoryTree = useMemo(() => listOf(cats.body), [cats.body]);
  const categories = useMemo<HomeCategory[]>(
    () => categoryTree.filter((c: any) => c && c.slug && c.name && c.isActive !== false),
    [categoryTree],
  );
  const offerList = useMemo(() => listOf(offers.body), [offers.body]);
  const businessList = useMemo(() => listOf(businesses.body), [businesses.body]);

  const featuredBusiness = businessList[0] ?? null;
  const featuredOffer = offerList[0] ?? null;
  const latestAnnouncement = listOf(notice.body)[0] ?? null;

  // Counters only show once they are big enough to impress (see TrustStats).
  const stats: HomeStat[] = [
    {
      label: 'Registered Businesses',
      value: Math.max(sumListings(categoryTree), businessList.length),
      icon: Building2,
    },
    { label: 'Active Promotions', value: offerList.length, icon: Tag },
    { label: 'Active Categories', value: categories.length, icon: Globe },
  ];

  return (
    <PublicLayout>
      <HomeHero
        city={city}
        onCityChange={handleCityChange}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        onSearch={handleSearch}
        featuredBusiness={featuredBusiness}
        featuredOffer={featuredOffer}
        announcement={latestAnnouncement}
        panelLoading={(offers.loading || businesses.loading) && !featuredBusiness && !featuredOffer}
      />

      <MobileNotice announcement={latestAnnouncement} />

      <CategoryRow categories={categories} loading={cats.loading} />

      <TrendingOffers body={offers.body} loading={offers.loading} />
      <TrendingBusinesses body={businesses.body} loading={businesses.loading} />
      <SpinPromo />
      <UpcomingEvents body={events.body} loading={events.loading} />
      <NowShowing body={movies.body} loading={movies.loading} />

      <TrustStats stats={stats} />
      <HomeCta />
    </PublicLayout>
  );
}
