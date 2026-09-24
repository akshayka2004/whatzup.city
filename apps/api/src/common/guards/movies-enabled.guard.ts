import { CanActivate, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Movies are dormant: code, routes and DB rows stay in place, but every
 * endpoint 404s unless MOVIES_ENABLED=true. Flip the env var to bring it back.
 */
@Injectable()
export class MoviesEnabledGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(): boolean {
    if (this.config.get<string>('MOVIES_ENABLED') === 'true') return true;
    throw new NotFoundException('The Movies feature is currently unavailable.');
  }
}
