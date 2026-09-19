import { IsString, IsNotEmpty, IsNumber, IsEnum, IsInt, Min, Max, IsObject, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum PackageNameEnum {
  // ── Current plans ────────────────────────────────────────────
  WHTZUP = 'WHTZUP',
  WHTZUP_PLUS = 'WHTZUP_PLUS',
  WHTZUP_X = 'WHTZUP_X',
  WHTZUP_XL = 'WHTZUP_XL',
  WHTZUP_LUXE = 'WHTZUP_LUXE',

  // ── Retired ──────────────────────────────────────────────────
  // Not offered to new signups. Kept so existing subscription rows
  // still validate and render in dashboards//history.
  FREE = 'FREE',
  LISTING_BASIC = 'LISTING_BASIC',
  LISTING_PREMIUM = 'LISTING_PREMIUM',
  FEATURED = 'FEATURED',
  SOCIAL_HIGHLIGHT = 'SOCIAL_HIGHLIGHT',
  MAGAZINE_LISTING = 'MAGAZINE_LISTING',
  ADVERTISEMENT = 'ADVERTISEMENT',
  ENTERPRISE = 'ENTERPRISE',
}

/** Plans offered to new signups (retired ones excluded). */
export const ACTIVE_PACKAGES = [
  PackageNameEnum.WHTZUP,
  PackageNameEnum.WHTZUP_PLUS,
  PackageNameEnum.WHTZUP_X,
  PackageNameEnum.WHTZUP_XL,
  PackageNameEnum.WHTZUP_LUXE,
];

export class AssignPackageDto {
  @ApiProperty({ enum: PackageNameEnum, example: 'PREMIUM' })
  @IsEnum(PackageNameEnum)
  packageName!: PackageNameEnum;

  @ApiProperty({ example: 30, description: 'Duration in days' })
  @IsNumber()
  duration!: number;
}

export class AssignHotelPackageDto {
  @ApiProperty({ example: 4, description: '1-5 star classification' })
  @IsInt()
  @Min(1)
  @Max(5)
  starRating!: number;

  @ApiProperty({
    example: { spa: { selected: true }, cafe: { selected: true } },
    description: 'Selected top-level amenities keyed by amenity key',
  })
  @IsObject()
  amenities!: Record<string, { selected?: boolean; subChoices?: string[] }>;

  @ApiProperty({
    required: false,
    description: 'Structured detail entries (halls, rooms, menu sections, etc.) keyed by amenity key. Omit to leave the business\'s existing details untouched — e.g. on a renewal call that only resends amenities.',
  })
  @IsOptional()
  @IsObject()
  amenityDetails?: Record<string, any[]>;
}

/** Home Chef category only — three fixed annual tiers, not the standard packages. */
export enum HomeChefTierEnum {
  STARTER = 'STARTER',
  GROWTH = 'GROWTH',
  PREMIUM = 'PREMIUM',
}

export class AssignHomeChefPackageDto {
  @ApiProperty({ enum: HomeChefTierEnum, example: 'GROWTH' })
  @IsEnum(HomeChefTierEnum)
  tier!: HomeChefTierEnum;
}
