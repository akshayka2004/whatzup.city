/**
 * Strips all HTML tags completely. Useful for plain-text inputs.
 */
export function stripHtml(text: string): string {
  if (!text) return '';
  return text.replace(/<[^>]*>/g, '');
}

/**
 * Strips dangerous HTML tags and attributes (e.g. scripts, iframes, styles, events).
 * Permitting only basic formatting tags if needed, or stripping out scripts/on* handlers completely.
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';

  let sanitized = html;

  // 1. Remove script tags and their content
  sanitized = sanitized.replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '');

  // 2. Remove inline event handlers (onmouseover, onload, onclick, onerror, etc.)
  sanitized = sanitized.replace(/on\w+\s*=\s*(['"][^'"]*['"]|[^\s>]+)/gi, '');

  // 3. Remove javascript: and data: URIs in src or href
  sanitized = sanitized.replace(/href\s*=\s*(['"]\s*javascript:[^'"]*['"]|['"]\s*data:[^'"]*['"])/gi, 'href="#"');
  sanitized = sanitized.replace(/src\s*=\s*(['"]\s*javascript:[^'"]*['"]|['"]\s*data:[^'"]*['"])/gi, 'src=""');

  // 4. Remove dangerous tags completely
  const dangerousTags = [
    'iframe',
    'object',
    'embed',
    'link',
    'style',
    'meta',
    'frame',
    'frameset',
    'applet',
    'base',
    'svg',
    'math',
    'form',
    'input',
    'button',
  ];

  for (const tag of dangerousTags) {
    const doubleTagRegex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\/${tag}>`, 'gi');
    sanitized = sanitized.replace(doubleTagRegex, '');
    const singleTagRegex = new RegExp(`<${tag}[^>]*\/?>`, 'gi');
    sanitized = sanitized.replace(singleTagRegex, '');
  }

  return sanitized.trim();
}
