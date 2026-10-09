import {
  ALLOWED_EVENTS,
  deviceOf,
  eventsFor,
  groupOf,
  isBotUserAgent,
  normaliseSource,
} from './event-taxonomy';

const CHROME_ANDROID =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36';
const CHROME_WIN =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

describe('event taxonomy', () => {
  it('keeps legacy aliases in the same group', () => {
    expect(groupOf('BUSINESS_VIEW')).toBe('profileView');
    expect(groupOf('PROFILE_VIEW')).toBe('profileView');
    expect(groupOf('PHONE_CLICK')).toBe('call');
    expect(eventsFor('call')).toEqual(['PHONE_CLICK', 'CALL_CLICK']);
  });

  it('allows known events only', () => {
    expect(ALLOWED_EVENTS.has('DIRECTIONS_CLICK')).toBe(true);
    expect(ALLOWED_EVENTS.has('DROP TABLE')).toBe(false);
  });

  it('flags bots and empty user agents, not real browsers', () => {
    expect(isBotUserAgent('Googlebot/2.1 (+http://www.google.com/bot.html)')).toBe(true);
    expect(isBotUserAgent('WhatsApp/2.23.20.0')).toBe(true);
    expect(isBotUserAgent('Mozilla/5.0 HeadlessChrome/126.0')).toBe(true);
    expect(isBotUserAgent('')).toBe(true);
    expect(isBotUserAgent(CHROME_ANDROID)).toBe(false);
    expect(isBotUserAgent(CHROME_WIN)).toBe(false);
  });

  it('detects device class', () => {
    expect(deviceOf(CHROME_ANDROID)).toBe('mobile');
    expect(deviceOf(CHROME_WIN)).toBe('desktop');
    expect(deviceOf('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)')).toBe('tablet');
  });

  it('normalises sources', () => {
    expect(normaliseSource('Search')).toBe('search');
    expect(normaliseSource('evil<script>')).toBe('other');
    expect(normaliseSource(undefined)).toBe('direct');
  });
});
