import {
  ArrayMaxSize,
  IsArray,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class TrackEventDto {
  /** Ignored: the tenant is derived from the business server-side. Kept so old clients don't 400. */
  @ApiProperty({ required: false, deprecated: true })
  @IsUUID()
  @IsOptional()
  tenantId?: string;

  @ApiProperty({
    description: 'Optional User ID (overridden by the signed-in user when present)',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  userId?: string;

  @ApiProperty({ description: 'Business the event belongs to', required: false })
  @IsUUID()
  @IsOptional()
  businessId?: string;

  @ApiProperty({ description: 'Event name from the allowlist (e.g. BUSINESS_VIEW, PHONE_CLICK)' })
  @IsString()
  @MaxLength(100)
  event!: string;

  @ApiProperty({ description: 'Small JSON payload (offerId, query, position…)', required: false })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  /** Ignored: captured server-side. */
  @ApiProperty({ required: false, deprecated: true })
  @IsString()
  @IsOptional()
  ipAddress?: string;

  /** Ignored: captured server-side. */
  @ApiProperty({ required: false, deprecated: true })
  @IsString()
  @IsOptional()
  userAgent?: string;

  @ApiProperty({ description: 'Browser session id (30-min inactivity window)', required: false })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  sessionId?: string;

  @ApiProperty({ description: 'Anonymous first-party visitor id (localStorage)', required: false })
  @IsString()
  @MaxLength(64)
  @IsOptional()
  visitorId?: string;

  @ApiProperty({ description: 'Where the visit came from (home, search, qr…)', required: false })
  @IsString()
  @MaxLength(30)
  @IsOptional()
  source?: string;
}

export class TrackBatchDto {
  @ApiProperty({ type: [TrackEventDto] })
  @IsArray()
  @ArrayMaxSize(25)
  @ValidateNested({ each: true })
  @Type(() => TrackEventDto)
  events!: TrackEventDto[];
}
