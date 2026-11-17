/** What a suggestion is about. The web form shows these in plain words. */
export const SUGGESTION_TOPICS = [
  'GENERAL',
  'FEATURE',
  'EVENTS',
  'OFFERS',
  'SEARCH',
  'APP',
  'OTHER',
] as const;

/** Where a suggestion is in the team's review. */
export const SUGGESTION_STATUSES = ['NEW', 'REVIEWED', 'PLANNED', 'DECLINED'] as const;

export const SUGGESTION_LIMITS = {
  /** Shortest message worth reading. */
  min: 10,
  /** Longest message kept. */
  max: 2000,
  /** Most suggestions one person can send in a day. */
  perDay: 5,
} as const;

export const THANK_YOU =
  'Thank you for your suggestion! Our team reads every one and uses them to make Whtzup.city better.';
