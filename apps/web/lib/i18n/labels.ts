/**
 * Maps the English label already used in the nav arrays to its message key, so the
 * sidebar / bottom nav can translate without rewriting every menu definition.
 * Labels not listed here simply render as written (dashboard/admin menus stay English).
 */
export const LABEL_KEYS: Record<string, string> = {
  Home: 'nav.home',
  Search: 'nav.search',
  Map: 'nav.map',
  Saved: 'nav.saved',
  Menu: 'nav.menu',
  Browse: 'nav.browse',
  Nearby: 'nav.nearby',
  Offers: 'nav.offers',
  'Spin it': 'nav.spinIt',
  Events: 'nav.events',
  Movies: 'nav.movies',
  Announcements: 'nav.announcements',
  Favorites: 'nav.favorites',
  Notifications: 'nav.notifications',
  'Report Issue': 'nav.reportIssue',
  'Profile Settings': 'nav.profileSettings',
  'Help & Support': 'nav.help',
  'Sign In / Register': 'nav.signInRegister',
};
