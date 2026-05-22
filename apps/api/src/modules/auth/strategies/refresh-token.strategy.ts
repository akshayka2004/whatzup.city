import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => {
          let token = null;
          if (req && req.cookies) {
            token = req.cookies['refresh_token'];
          }
          return token || ExtractJwt.fromAuthHeaderAsBearerToken()(req);
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_REFRESH_SECRET', 'dev-refresh-secret-change-me'),
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: any) {
    let refreshToken = req.cookies?.['refresh_token'];
    if (!refreshToken) {
      const authorization = req.get('Authorization');
      if (authorization && authorization.startsWith('Bearer ')) {
        refreshToken = authorization.replace('Bearer ', '');
      }
    }

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is missing');
    }

    return {
      userId: payload.sub,
      tenantId: payload.tenantId,
      tokenId: payload.tokenId,
      refreshToken,
    };
  }
}
