/** What a suggestion is about, in the words people see. Values match the API's topics. */
export const SUGGESTION_TOPICS = [
  { value: 'GENERAL', label: 'Anything' },
  { value: 'FEATURE', label: 'A new feature' },
  { value: 'EVENTS', label: 'Events and tickets' },
  { value: 'OFFERS', label: 'Offers and vouchers' },
  { value: 'SEARCH', label: 'Search and browsing' },
  { value: 'APP', label: 'How the site looks and works' },
  { value: 'OTHER', label: 'Something else' },
] as const;

export const TOPIC_LABEL: Record<string, string> = Object.fromEntries(
  SUGGESTION_TOPICS.map((t) => [t.value, t.label]),
);

/** Where a suggestion is in the team's review. */
export const SUGGESTION_STATUS = [
  { value: 'NEW', label: 'New' },
  { value: 'REVIEWED', label: 'Reviewed' },
  { value: 'PLANNED', label: 'Planned' },
  { value: 'DECLINED', label: 'Declined' },
] as const;

export const STATUS_LABEL: Record<string, string> = Object.fromEntries(
  SUGGESTION_STATUS.map((s) => [s.value, s.label]),
);
