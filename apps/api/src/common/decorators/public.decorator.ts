// ============================================================
// Custom Decorators — Route metadata & request helpers
// ============================================================

import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Mark a route as publicly accessible (bypasses JWT guard)
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
