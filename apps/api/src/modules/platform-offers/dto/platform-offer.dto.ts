import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsObject,
  MaxLength,
  IsDateString,
  ValidateIf,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum PlatformOfferCategoryEnum {
  SADYA = 'SADYA',
  PAYASAM = 'PAYASAM',
  CLOTHING = 'CLOTHING',
  ELECTRONICS = 'ELECTRONICS',
  STAYCATION = 'STAYCATION',
  FESTIVE = 'FESTIVE',
  DINE_IN = 'DINE_IN',
  TAKEAWAY = 'TAKEAWAY',
  HYPERMARKET = 'HYPERMARKET',
  JEWELLERY = 'JEWELLERY',
  STATIONERY = 'STATIONERY',
  FOOD = 'FOOD',
}

export enum PlatformOfferStatusEnum {
  UNPUBLISHED = 'UNPUBLISHED',
  PUBLISHED = 'PUBLISHED',
}

/** Staycation: PROPERTY | DAYOUT. The newer categories use DINE_IN | TAKEAWAY | ONLINE | OFFLINE. */
export enum StaycationSubTypeEnum {
  PROPERTY = 'PROPERTY',
  DAYOUT = 'DAYOUT',
  DINE_IN = 'DINE_IN',
  TAKEAWAY = 'TAKEAWAY',
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
}

/** Categories whose sub category is how the offer is used (dine in, takeaway, online, offline). */
export const MODE_CATEGORIES = [
  'FESTIVE',
  'DINE_IN',
  'TAKEAWAY',
  'HYPERMARKET',
  'JEWELLERY',
  'STATIONERY',
  'FOOD',
];
export const MODE_SUBTYPES = ['DINE_IN', 'TAKEAWAY', 'ONLINE', 'OFFLINE'];

/** The sub type a category may carry: staycation kind, a usage mode, or none. */
export function validSubType(category: string, subType?: string | null): string | null {
  if (!subType) return null;
  if (category === 'STAYCATION')
    return subType === 'PROPERTY' || subType === 'DAYOUT' ? subType : null;
  if (MODE_CATEGORIES.includes(category)) return MODE_SUBTYPES.includes(subType) ? subType : null;
  return null;
}

export class CreatePlatformOfferDto {
  @ApiProperty({ enum: PlatformOfferCategoryEnum })
  @IsEnum(PlatformOfferCategoryEnum)
  category!: PlatformOfferCategoryEnum;

  @ApiProperty({ enum: StaycationSubTypeEnum, required: false })
  @IsOptional()
  @IsEnum(StaycationSubTypeEnum)
  subType?: StaycationSubTypeEnum;

  @ApiProperty({ example: 'Grand Hyatt Onam Sadya' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @ApiProperty({ example: 'Kochi, Kerala' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  location!: string;

  @ApiProperty({ example: '₹850 per head', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  price?: string;

  @ApiProperty({ example: '+91 98470 12345', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiProperty({ required: false, description: 'JSON {bucket,path} of the uploaded poster' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false, description: 'Category-specific fields' })
  @IsOptional()
  @IsObject()
  details?: Record<string, any>;

  @ApiProperty({ enum: PlatformOfferStatusEnum, required: false })
  @IsOptional()
  @IsEnum(PlatformOfferStatusEnum)
  status?: PlatformOfferStatusEnum;

  /** Last day shown publicly (ISO date). null clears it. */
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsDateString()
  endsAt?: string | null;
}

export class UpdatePlatformOfferDto extends CreatePlatformOfferDto {
  @ApiProperty({ enum: PlatformOfferCategoryEnum, required: false })
  @IsOptional()
  @IsEnum(PlatformOfferCategoryEnum)
  declare category: PlatformOfferCategoryEnum;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  declare title: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  declare location: string;
}

export class SetPlatformOfferStatusDto {
  @ApiProperty({ enum: PlatformOfferStatusEnum })
  @IsEnum(PlatformOfferStatusEnum)
  status!: PlatformOfferStatusEnum;
}
