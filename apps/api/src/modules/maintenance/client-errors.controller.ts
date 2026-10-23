import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { Public } from '../../common/decorators/public.decorator';
import { captureError } from '../../common/observability/error-tracking';

export class ClientErrorDto {
  @IsString()
  @MaxLength(500)
  message!: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  stack?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  digest?: string;

  /** Route pattern or pathname; the web client strips the query string. */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  path?: string;
}

/**
 * Browser error reports, forwarded to Sentry from here so the web bundle doesn't
 * carry an SDK. Public and tightly throttled; a no-op when SENTRY_DSN is unset.
 */
@ApiTags('Health Check')
@Controller('client-errors')
export class ClientErrorsController {
  @Public()
  @Post()
  @HttpCode(204)
  @Throttle({ short: { limit: 2, ttl: 1000 }, long: { limit: 20, ttl: 60000 } })
  @ApiOperation({ summary: 'Report a browser-side error' })
  report(@Body() dto: ClientErrorDto) {
    const err = new Error(dto.message);
    err.name = 'ClientError';
    if (dto.stack) err.stack = dto.stack;
    captureError(err, {
      source: 'web',
      path: dto.path?.split('?')[0],
      extra: dto.digest ? { digest: dto.digest } : undefined,
    });
  }
}
