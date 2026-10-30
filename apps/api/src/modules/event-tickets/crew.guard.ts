import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  createParamDecorator,
} from '@nestjs/common';
import { RedisService } from '../../common/redis/redis.service';
import { CrewContext, EventCrewService } from './event-crew.service';
import { hit } from './event-access';

/**
 * Authenticates scanner requests by the crew token (header x-crew-token), not by a user login.
 * Rate limiting is per pass session, not per IP: a whole venue shares one IP, and the normal
 * per-IP limits would lock the gate out.
 */
@Injectable()
export class CrewGuard implements CanActivate {
  constructor(
    private readonly crew: EventCrewService,
    private readonly redis: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const ctx = await this.crew.authenticate(req.headers['x-crew-token']);
    if (!ctx) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: 'CREW_SESSION_INVALID',
        message: 'This pass is no longer valid. Sign in again.',
      });
    }
    // 30 requests a second per phone is far above what a person can do.
    await hit(this.redis, `rl:crew:${ctx.sessionId}:${Math.floor(Date.now() / 1000)}`, 30, 3);
    req.crew = ctx;
    return true;
  }
}

/** The pass making this scanner request. Only valid on routes behind CrewGuard. */
export const Crew = createParamDecorator((_data: unknown, ctx: ExecutionContext): CrewContext => {
  return ctx.switchToHttp().getRequest().crew;
});
