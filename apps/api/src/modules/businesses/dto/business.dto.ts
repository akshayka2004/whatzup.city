import {
  IsOptional, IsString, IsNumber, IsInt, IsBoolean, IsObject, IsArray, IsEmail,
  Min, Max, MaxLength, ArrayMaxSize,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Shared across the owner-side create/update and the super-admin adminUpdate
 * endpoints — all optional here, since each caller's service method already
 * whitelists which of these fields it actually applies. This DTO's job is
 * catching a value that doesn't fit its VarChar column before it reaches
 * Postgres, not re-deciding which fields each route may touch.
 */
export class BusinessDto {
  @ApiProperty({ required: false, maxLength: 255 })
  @IsOptional() @IsString() @MaxLength(255)
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString()
  categoryId?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString()
  address?: string;

  @ApiProperty({ required: false, maxLength: 100 })
  @IsOptional() @IsString() @MaxLength(100)
  city?: string;

  @ApiProperty({ required: false, maxLength: 100 })
  @IsOptional() @IsString() @MaxLength(100)
  state?: string;

  @ApiProperty({ required: false, maxLength: 20 })
  @IsOptional() @IsString() @MaxLength(20)
  zipCode?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsNumber()
  latitude?: number;

  @ApiProperty({ required: false })
  @IsOptional() @IsNumber()
  longitude?: number;

  @ApiProperty({ required: false, maxLength: 50 })
  @IsOptional() @IsString() @MaxLength(50)
  phone?: string;

  @ApiProperty({ required: false, maxLength: 255 })
  @IsOptional() @IsEmail() @MaxLength(255)
  email?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString()
  website?: string;

  @ApiProperty({ required: false, maxLength: 255 })
  @IsOptional() @IsString() @MaxLength(255)
  ownerName?: string;

  @ApiProperty({ required: false, maxLength: 100 })
  @IsOptional() @IsString() @MaxLength(100)
  district?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString()
  googleMapsUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsObject()
  socialLinks?: Record<string, string>;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional() @IsArray() @ArrayMaxSize(50)
  @IsString({ each: true }) @MaxLength(50, { each: true })
  tags?: string[];

  @ApiProperty({ required: false, type: [String] })
  @IsOptional() @IsArray() @ArrayMaxSize(20)
  @IsString({ each: true }) @MaxLength(100, { each: true })
  subcategoryIds?: string[];

  @ApiProperty({ required: false, maxLength: 20 })
  @IsOptional() @IsString() @MaxLength(20)
  halalStatus?: string;

  @ApiProperty({ required: false, maxLength: 255 })
  @IsOptional() @IsString() @MaxLength(255)
  brandName?: string;

  @ApiProperty({ required: false, maxLength: 255 })
  @IsOptional() @IsString() @MaxLength(255)
  companyName?: string;

  @ApiProperty({ required: false, maxLength: 50 })
  @IsOptional() @IsString() @MaxLength(50)
  companyType?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsObject()
  compliance?: Record<string, any>;

  @ApiProperty({ required: false })
  @IsOptional() @IsObject()
  ownerContact?: Record<string, any>;

  @ApiProperty({ required: false })
  @IsOptional() @IsObject()
  billingContact?: Record<string, any>;

  @ApiProperty({ required: false })
  @IsOptional() @IsObject()
  supportContact?: Record<string, any>;

  @ApiProperty({ required: false })
  @IsOptional() @IsObject()
  branchHead?: Record<string, any>;

  @ApiProperty({ required: false })
  @IsOptional() @IsObject()
  categoryAttributes?: Record<string, any>;

  @ApiProperty({ required: false, maxLength: 30 })
  @IsOptional() @IsString() @MaxLength(30)
  billSeriesPrefix?: string;

  @ApiProperty({ required: false, minimum: 1, maximum: 5, description: 'Hotel category only' })
  @IsOptional() @IsInt() @Min(1) @Max(5)
  hotelStarRating?: number;

  @ApiProperty({ required: false, description: 'Hotel category only' })
  @IsOptional() @IsObject()
  hotelAmenities?: Record<string, any>;

  @ApiProperty({ required: false, description: 'Hotel category only' })
  @IsOptional() @IsObject()
  amenityDetails?: Record<string, any>;

  @ApiProperty({ required: false })
  @IsOptional() @IsObject()
  operatingHours?: Record<string, any>;

  @ApiProperty({ required: false })
  @IsOptional() @IsString()
  logo?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString()
  coverImage?: string;

  // ── admin/adminUpdate only ──────────────────────────────────
  @ApiProperty({ required: false, maxLength: 50, description: 'Admin only' })
  @IsOptional() @IsString() @MaxLength(50)
  status?: string;

  @ApiProperty({ required: false, description: 'Admin only' })
  @IsOptional() @IsBoolean()
  isVerified?: boolean;
}
