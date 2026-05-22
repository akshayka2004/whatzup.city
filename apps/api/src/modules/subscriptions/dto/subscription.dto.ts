import { IsString, IsNotEmpty, IsNumber, IsEnum } from 'class-validator';
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
