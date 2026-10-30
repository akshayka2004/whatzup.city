// ============================================================
// JWT Auth Guard — Protects routes requiring authentication
// ============================================================

import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // The guard is global (deny by default) and many controllers still name it as well. The
    // first run authenticates; later runs on the same request must not verify the token again.
    if (context.getType() !== 'http') return true;
    if (context.switchToHttp().getRequest()?.user) return true;

    return super.canActivate(context);
  }

  /** Routes still open to someone who must replace a temporary password first. */
  private static readonly PASSWORD_CHANGE_OPEN = [
    /\/users\/me\/change-password$/,
    /\/users\/me$/,
    /\/auth\/(me|logout|logout-all|refresh)$/,
  ];

  handleRequest(err: any, user: any, info: any, context?: ExecutionContext) {
    if (err || !user) {
      throw err || new UnauthorizedException('Invalid or expired token');
    }
    if (user.mustChangePassword && context) {
      const req = context.switchToHttp().getRequest();
      const path = String(req.originalUrl || req.url || '').split('?')[0];
      if (!JwtAuthGuard.PASSWORD_CHANGE_OPEN.some((re) => re.test(path))) {
        throw new ForbiddenException({
          statusCode: 403,
          code: 'PASSWORD_CHANGE_REQUIRED',
          message: 'Choose a new password before continuing.',
        });
      }
    }
    return user;
  }
}
