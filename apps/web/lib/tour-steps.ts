import type { TourStep } from '@/components/onboarding/onboarding-tour';

export const CUSTOMER_TOUR_STEPS: TourStep[] = [
  {
    title: 'Welcome to whtzup.city 👋',
    description: "Quick 30-second tour of what's where. Skip anytime.",
  },
  {
    selector: '[data-tour="nav-browse"]',
    title: 'Browse',
    description: 'Explore every verified business on the platform by category.',
  },
  {
    selector: '[data-tour="nav-search"]',
    title: 'Search',
    description: 'Look up a specific business, offer, or event by name.',
  },
  {
    selector: '[data-tour="nav-offers"]',
    title: 'Offers',
    description: 'Deals from local businesses — filter by city and category.',
  },
  {
    selector: '[data-tour="nav-events"]',
    title: 'Events',
    description: 'Happenings around your city, from local businesses and organizers.',
  },
  {
    selector: '[data-tour="nav-favorites"]',
    title: 'Favorites',
    description: 'Businesses you save show up here for quick access later.',
  },
  {
    selector: '[data-tour="nav-settings"]',
    title: 'Your Profile',
    description: 'Manage your details, submitted bills, referrals, and reward points.',
  },
];

export const BUSINESS_TOUR_STEPS: TourStep[] = [
  {
    title: 'Welcome to your dashboard 👋',
    description: "Here's what each section does. Skip anytime.",
  },
  {
    selector: '[data-tour="nav-overview"]',
    title: 'Overview',
    description: 'Your business at a glance — key stats and recent activity.',
  },
  {
    selector: '[data-tour="nav-moderation"]',
    title: 'Bill Moderation',
    description: 'Review customer-submitted bills to verify their purchases.',
  },
  {
    selector: '[data-tour="nav-customers"]',
    title: 'Customers',
    description: 'See who has engaged with your business and submitted bills.',
  },
  {
    selector: '[data-tour="nav-offers"]',
    title: 'Offers',
    description: 'Publish deals that show up in the public Offers page.',
  },
  {
    selector: '[data-tour="nav-vouchers"]',
    title: 'Vouchers',
    description: 'Reward customers who spend above a threshold with a claimable code.',
  },
  {
    selector: '[data-tour="nav-settings"]',
    title: 'Settings',
    description: 'Update your business details, team, and account settings.',
  },
];

export const CUSTOMER_MOBILE_TOUR_STEPS: TourStep[] = [
  {
    title: 'Welcome to whtzup.city 👋',
    description: "Quick tour of the app. Skip anytime.",
  },
  {
    selector: '[data-tour="mnav-home"]',
    title: 'Home',
    description: 'Trending businesses, offers, and city announcements.',
  },
  {
    selector: '[data-tour="mnav-search"]',
    title: 'Search',
    description: 'Look up a specific business, offer, or event by name.',
  },
  {
    selector: '[data-tour="mnav-saved"]',
    title: 'Saved',
    description: 'Businesses you favorite show up here for quick access.',
  },
  {
    selector: '[data-tour="mnav-menu"]',
    title: 'Menu',
    description: 'Browse, Offers, Events, Announcements, and your Profile — all here.',
  },
];

export const BUSINESS_MOBILE_TOUR_STEPS: TourStep[] = [
  {
    title: 'Welcome to your dashboard 👋',
    description: "Here's a quick tour. Skip anytime.",
  },
  {
    selector: '[data-tour="mnav-overview"]',
    title: 'Overview',
    description: 'Your business at a glance — key stats and recent activity.',
  },
  {
    selector: '[data-tour="mnav-offers"]',
    title: 'Offers',
    description: 'Publish deals that show up in the public Offers page.',
  },
  {
    selector: '[data-tour="mnav-menu"]',
    title: 'Menu',
    description: 'Bill Moderation, Customers, Vouchers, Settings, and more — all here.',
  },
];
