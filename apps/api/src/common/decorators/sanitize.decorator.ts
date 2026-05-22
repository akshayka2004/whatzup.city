import { Transform } from 'class-transformer';
import { sanitizeHtml, stripHtml } from '../utils/sanitizer';

/**
 * Decorator that completely strips all HTML tags from a string property.
 */
export function StripHtmlInput() {
  return Transform(({ value }) => {
    if (typeof value === 'string') {
      return stripHtml(value);
    }
    if (Array.isArray(value)) {
      return value.map((val) => (typeof val === 'string' ? stripHtml(val) : val));
    }
    return value;
  });
}

/**
 * Decorator that sanitizes HTML text by removing scripts, iframes, and on* events.
 */
export function SanitizeHtmlInput() {
  return Transform(({ value }) => {
    if (typeof value === 'string') {
      return sanitizeHtml(value);
    }
    if (Array.isArray(value)) {
      return value.map((val) => (typeof val === 'string' ? sanitizeHtml(val) : val));
    }
    return value;
  });
}
