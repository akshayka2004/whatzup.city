import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { clientIp, forwardedIp, isLocalPeer } from '../utils/client-ip';

/**
 * ThrottlerGuard keyed on the real visitor instead of the proxy in front of us.
 * Without this every visitor shared one bucket (the Next.js server's 127.0.0.1),
 * so a handful of page loads site-wide tripped 429s for everyone.
 */
@Injectable()
export class ClientThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    return clientIp(req as any) || 'unknown';
  }

  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') return super.shouldSkip(context);
    const req = context.switchToHttp().getRequest();
    // Server-side rendering calls from our own web process: local peer and no
    // proxy headers. They are already cached per page and must not starve visitors.
    if (isLocalPeer(req) && !forwardedIp(req)) return true;
    return super.shouldSkip(context);
  }
}
