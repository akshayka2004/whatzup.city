import { CanActivate, ExecutionContext, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { clientIp } from '../utils/client-ip';

export const TURNSTILE_HEADER = 'cf-turnstile-response';
const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/**
 * Cloudflare Turnstile check for endpoints bots target (sign-up, login, password
 * reset). Off until TURNSTILE_SECRET_KEY is set. The browser sends the token in
 * the `cf-turnstile-response` header. A missing or rejected token is refused; if
 * Cloudflare itself can't be reached we let the request through, since throttles
 * and account lockout still apply and an outage there must not lock everyone out.
 */
@Injectable()
export class TurnstileGuard implements CanActivate {
  private readonly logger = new Logger(TurnstileGuard.name);

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const secret = process.env.TURNSTILE_SECRET_KEY;
    if (!secret) return true;

    const req = context.switchToHttp().getRequest();
    const raw = req.headers?.[TURNSTILE_HEADER];
    const token = (Array.isArray(raw) ? raw[0] : raw)?.trim();
    if (!token || token.length > 2048) throw this.refuse();

    const form = new URLSearchParams({ secret, response: token });
    const ip = clientIp(req);
    if (ip) form.set('remoteip', ip);

    let result: { success?: boolean; 'error-codes'?: string[] };
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    try {
      const res = await fetch(VERIFY_URL, { method: 'POST', body: form, signal: ctrl.signal });
      if (!res.ok) throw new Error(`siteverify HTTP ${res.status}`);
      result = await res.json();
    } catch (e: any) {
      this.logger.warn(`Turnstile unavailable, allowing request: ${e?.message}`);
      return true;
    } finally {
      clearTimeout(timer);
    }

    if (!result.success) {
      this.logger.warn(`Turnstile rejected: ${(result['error-codes'] ?? []).join(',')}`);
      throw this.refuse();
    }
    return true;
  }

  private refuse() {
    return new ForbiddenException({
      message: 'We could not confirm you are not a bot. Refresh the page and try again.',
      code: 'CAPTCHA_FAILED',
    });
  }
}
