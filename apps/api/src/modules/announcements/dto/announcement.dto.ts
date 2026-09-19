import {
  IsString, IsOptional, IsDateString, IsObject, IsEnum, IsArray, MaxLength, ArrayMaxSize,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AlertPriority } from '../../government-alerts/dto/create-alert.dto';

/**
 * `create`/`update` used to spread the raw request body straight into
 * Prisma (`{ tenantId, agencyId, ...data }`) — a body containing its own
 * `tenantId` key would override the one set just before it in that object
 * literal, since object-literal keys are last-write-wins. This DTO is now
 * the actual whitelist: with the global ValidationPipe's
 * `forbidNonWhitelisted: true`, any field not declared here (tenantId,
 * agencyId, viewCount, deletedAt, id, ...) is rejected with a 400 instead
 * of silently applying.
 */
export class AnnouncementDto {
  @ApiProperty({ required: false, maxLength: 500 })
  @IsOptional() @IsString() @MaxLength(500)
  title?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString()
  body?: string;

  @ApiProperty({ required: false, maxLength: 100, description: 'e.g. EMERGENCY, ROAD_BLOCK, WEATHER' })
  @IsOptional() @IsString() @MaxLength(100)
  category?: string;

  @ApiProperty({ required: false, enum: AlertPriority })
  @IsOptional() @IsEnum(AlertPriority)
  priority?: AlertPriority;

  @ApiProperty({ required: false })
  @IsOptional() @IsDateString()
  publishAt?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsDateString()
  expiresAt?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsDateString()
  startAt?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsObject()
  targetAudience?: Record<string, any>;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional() @IsArray() @ArrayMaxSize(50)
  @IsString({ each: true }) @MaxLength(100, { each: true })
  targetCities?: string[];

  @ApiProperty({ required: false })
  @IsOptional() @IsString() @MaxLength(2048)
  linkUrl?: string;
}
