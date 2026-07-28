import { IsString, IsNotEmpty, IsNumber, IsEnum, IsInt, Min, Max, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum PackageNameEnum {
  FREE = 'FREE',
  LISTING_BASIC = 'LISTING_BASIC',
  LISTING_PREMIUM = 'LISTING_PREMIUM',
  FEATURED = 'FEATURED',
  SOCIAL_HIGHLIGHT = 'SOCIAL_HIGHLIGHT',
  MAGAZINE_LISTING = 'MAGAZINE_LISTING',
  ADVERTISEMENT = 'ADVERTISEMENT',
  ENTERPRISE = 'ENTERPRISE',
}

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
}
