import type { MetadataRoute } from 'next';

/** Lets phones offer "Add to Home Screen" with the app opening full-screen on the cream/terracotta palette. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Whtzup.city',
    short_name: 'Whtzup',
    description:
      "Kerala's trusted local directory: verified businesses, offers, events and civic updates.",
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#F7F5F2',
    theme_color: '#B86F50',
    categories: ['shopping', 'lifestyle', 'local'],
    icons: [
      { src: '/logo.png', sizes: '1024x1024', type: 'image/png', purpose: 'any' },
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    ],
    shortcuts: [
      { name: 'Search', url: '/search', description: 'Find businesses and services' },
      { name: 'Offers', url: '/offers', description: 'Deals near you' },
      { name: 'Spin it', url: '/spin-it', description: 'Your discount tickets' },
    ],
  };
}
