import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional, IsString, IsArray, IsIn, IsNumber, IsDateString, MaxLength, ArrayMaxSize,
} from 'class-validator';
import { TICKET_TYPES, EVENT_CATEGORIES } from '../events.service';

/**
 * Shared shape for the owner-side and admin-side create/update endpoints.
 * All fields optional here — required-ness (title/startDate/endDate, or
 * hostLabel when there's no business) is enforced in EventsService, same as
 * before this DTO existed. What this adds is length/type validation so a
 * value that doesn't fit its DB column is rejected with a clear 400 instead
 * of reaching Postgres and crashing as a raw DB error.
 */
export class EventDto {
  @ApiProperty({ required: false })
  @IsOptional() @IsString()
  businessId?: string;

  @ApiProperty({ required: false, description: 'Tenant override for platform-hosted events with no business' })
  @IsOptional() @IsString()
  tenantId?: string;

  @ApiProperty({ required: false, maxLength: 255 })
  @IsOptional() @IsString() @MaxLength(255)
  hostLabel?: string;

  @ApiProperty({ required: false, maxLength: 255 })
  @IsOptional() @IsString() @MaxLength(255)
  title?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString()
  posterImage?: string;

  @ApiProperty({ required: false, maxLength: 255 })
  @IsOptional() @IsString() @MaxLength(255)
  venue?: string;

  @ApiProperty({ required: false, maxLength: 100 })
  @IsOptional() @IsString() @MaxLength(100)
  city?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional() @IsArray() @ArrayMaxSize(20)
  @IsString({ each: true }) @MaxLength(100, { each: true })
  targetCities?: string[];

  @ApiProperty({ required: false, enum: EVENT_CATEGORIES })
  @IsOptional() @IsIn(EVENT_CATEGORIES)
  category?: string;

  @ApiProperty({ required: false, enum: TICKET_TYPES })
  @IsOptional() @IsIn(TICKET_TYPES)
  ticketType?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsNumber()
  ticketPrice?: number;

  @ApiProperty({ required: false, description: 'Named tiers, e.g. [{ name: "Gold", price: 999 }]' })
  @IsOptional() @IsArray() @ArrayMaxSize(20)
  ticketTiers?: { name: string; price: number }[];

  @ApiProperty({ required: false })
  @IsOptional() @IsDateString()
  startDate?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsDateString()
  endDate?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString()
  registrationUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString()
  ticketUrl?: string;

  @ApiProperty({ required: false, maxLength: 30 })
  @IsOptional() @IsString() @MaxLength(30)
  status?: string;
}
